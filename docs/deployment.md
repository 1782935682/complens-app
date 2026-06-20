# Deployment Runbook

本文档用于在另一台机器上从零部署 CompCheck 当前可运行服务。当前可完整跑通的形态是开发/内测部署：PostgreSQL、后端 API、前端 Vite 服务、本机 RapidOCR。正式生产还需要替换生产数据库、配置 Aliyun OCR 后端凭证、域名、HTTPS 和反向代理。

## 服务清单

| 服务 | 默认地址 | 说明 |
|---|---|---|
| PostgreSQL | `localhost:15432` | Docker 容器内端口 `5432` 映射到宿主机 `15432` |
| Backend API | `http://0.0.0.0:3000` | Hono Node API，连接 Postgres 和 OCR |
| Frontend | `http://0.0.0.0:5173` | Vite dev server，代理 `/api` 到后端 |
| Local RapidOCR | `http://127.0.0.1:18080` | 本机 OCR 服务，生产后替换为 Aliyun OCR |

## 前置依赖

目标机器需要：

- Node.js `>=20.19`
- npm
- Docker 和 Docker Compose plugin
- Git
- Python 3.9+，用于本机 RapidOCR
- 可选：`poppler-utils`，仅在重新生成 GB2760 PDF 派生数据时需要

Ubuntu/Debian 参考：

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-plugin python3 python3-venv python3-pip poppler-utils
```

Node.js 请安装 20.19 或更高版本。不要使用低于 20.19 的 Node 运行 Vite 8。

## 拉取代码

```bash
git clone https://github.com/1782935682/complens-app.git compcheck
cd compcheck
npm install
cd backend
npm install
```

## 配置环境变量

后端配置：

```bash
cd backend
cp .env.example .env
```

开发/内测部署建议值：

```env
DATABASE_URL=postgres://postgres:password@localhost:15432/compcheck
POSTGRES_PORT=15432
HOST=0.0.0.0
PORT=3000
CORS_ORIGIN=http://<server-ip>:5173
JWT_SECRET=<replace-with-at-least-32-random-characters>
GB2760_INTERNAL_REVIEWERS=<internal-reviewer-email-or-user-id>
OCR_PROVIDER=rapidocr
OCR_LOCAL_URL=http://127.0.0.1:18080/ocr
OCR_API_KEY=
AI_PROVIDER=anthropic
AI_API_KEY=
```

说明：

- `DATABASE_URL=localhost:15432` 给宿主机上的后端进程、Drizzle 和 seed 脚本使用。
- Docker Compose 里的 API 容器会覆盖为 `postgres://postgres:password@postgres:5432/compcheck`，这是同一个数据库的容器网络地址。
- `JWT_SECRET` 必须在每台机器上单独生成，不要使用模板值。
- `GB2760_INTERNAL_REVIEWERS` 控制 GB2760 staging 写接口权限；需要复核/签核时必须填写。

前端公开配置可以使用根目录 `.env.example` 作为参考；当前前端主要通过 Vite dev server 的 `/api` proxy 访问后端。

## 启动数据库并初始化

```bash
cd backend
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run validate:gb2760
```

数据库设计、表字段和初始化 SQL 清单见 [`database.md`](database.md)。

## 安装并启动本机 RapidOCR

当前本机 OCR 服务目录约定为 `/home/downloads/tools/complens-ocr`。如果目标机器没有这个目录，按下面创建：

```bash
mkdir -p /home/downloads/tools/complens-ocr
cd /home/downloads/tools/complens-ocr
python3 -m venv .venv
.venv/bin/pip install fastapi uvicorn rapidocr-onnxruntime pillow python-multipart
```

创建 `/home/downloads/tools/complens-ocr/app.py`：

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from rapidocr_onnxruntime import RapidOCR
from PIL import Image, ImageOps
from io import BytesIO
import tempfile
import os
import statistics

app = FastAPI(title="CompLens OCR Service", version="0.1.0")

ocr_engine = RapidOCR()

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_IMAGE_SIDE = 1600


@app.get("/health")
def health():
    return {"ok": True, "provider": "rapidocr-onnxruntime"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="empty file")

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    try:
        image = Image.open(BytesIO(content))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid image: {e}")

    w, h = image.size
    max_side = max(w, h)
    if max_side > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / max_side
        image = image.resize((int(w * scale), int(h * scale)))

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp_path = tmp.name
            image.save(tmp_path, format="JPEG", quality=90)

        result, elapsed = ocr_engine(tmp_path)

        blocks = []
        scores = []

        if result:
            for item in result:
                box = item[0] if len(item) > 0 else None
                text = item[1] if len(item) > 1 else ""
                score = float(item[2]) if len(item) > 2 and item[2] is not None else None

                if text:
                    blocks.append({
                        "text": text,
                        "confidence": score,
                        "box": box,
                    })

                if score is not None:
                    scores.append(score)

        raw_text = "\n".join([b["text"] for b in blocks])
        avg_confidence = statistics.mean(scores) if scores else None

        return JSONResponse({
            "provider": "rapidocr-onnxruntime",
            "rawText": raw_text,
            "confidence": avg_confidence,
            "elapsed": elapsed,
            "blocks": blocks,
        })

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
```

启动：

```bash
cd /home/downloads/tools/complens-ocr
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 18080
```

验证：

```bash
curl http://127.0.0.1:18080/health
curl -X POST "http://127.0.0.1:18080/ocr" -F "file=@/path/to/ingredient-label.jpg"
```

预期健康检查：

```json
{"ok":true,"provider":"rapidocr-onnxruntime"}
```

## 启动后端 API

开发/内测模式：

```bash
cd backend
HOST=0.0.0.0 PORT=3000 npm run dev
```

构建后运行：

```bash
cd backend
npm run build
HOST=0.0.0.0 PORT=3000 node dist/index.js
```

验证：

```bash
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/ingredients?q=苯甲酸"
```

如果从外部机器访问，把 `127.0.0.1` 换成服务器 IP。

## 启动前端

当前最稳的内测方式是 Vite dev server 暴露到局域网/公网，并让 Vite proxy 把 `/api` 转发到后端：

```bash
cd /home/downloads/git/compcheck
HOST=0.0.0.0 PORT=5173 API_ORIGIN=http://127.0.0.1:3000 npm run dev
```

访问：

```text
http://<server-ip>:5173
```

如果端口被占用，可以改成：

```bash
HOST=0.0.0.0 PORT=5174 API_ORIGIN=http://127.0.0.1:3000 npm run dev
```

并同步修改后端 `CORS_ORIGIN=http://<server-ip>:5174` 后重启后端。

## 外部访问检查

在服务器上检查监听：

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:5173
curl http://127.0.0.1:18080/health
```

在外部机器检查：

```bash
curl http://<server-ip>:3000/health
curl http://<server-ip>:5173
```

如果外部不能访问：

- 确认后端和前端使用 `HOST=0.0.0.0` 启动。
- 确认云服务器安全组或防火墙开放 `3000` 和 `5173`。
- OCR 默认只监听 `127.0.0.1:18080`，只给后端本机调用，不建议直接暴露公网。
- 确认后端 `CORS_ORIGIN` 与前端访问地址一致。

## 常用运行顺序

四个终端分别运行：

```bash
# Terminal 1: PostgreSQL
cd /home/downloads/git/compcheck/backend
docker compose up -d postgres
```

```bash
# Terminal 2: OCR
cd /home/downloads/tools/complens-ocr
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 18080
```

```bash
# Terminal 3: Backend
cd /home/downloads/git/compcheck/backend
HOST=0.0.0.0 PORT=3000 npm run dev
```

```bash
# Terminal 4: Frontend
cd /home/downloads/git/compcheck
HOST=0.0.0.0 PORT=5173 API_ORIGIN=http://127.0.0.1:3000 npm run dev
```

首次部署或 schema 变更后再执行：

```bash
cd /home/downloads/git/compcheck/backend
npm run db:migrate
npm run db:seed
npm run validate:gb2760
```

## 生产替换项

正式生产前至少需要补齐：

| 项 | 当前内测值 | 生产要求 |
|---|---|---|
| 数据库 | Docker 本机 Postgres | 独立生产 PostgreSQL，提供生产 `DATABASE_URL`，配置备份和权限 |
| OCR | 本机 RapidOCR | `OCR_PROVIDER=aliyun`，配置 Aliyun AccessKeyId/Secret，不依赖本机 `/home/downloads/tools/complens-ocr` |
| 前端访问 | Vite dev server | 静态资源托管或 Nginx/Caddy，同源反代 `/api` |
| 后端运行 | `npm run dev` 或 `node dist/index.js` | systemd/PM2/container 编排，配置日志和重启策略 |
| HTTPS | 未配置 | 域名和 TLS 证书 |
| 密钥 | `.env` 本机文件 | 密钥管理，不提交仓库 |

生产切换 OCR：

```env
OCR_PROVIDER=aliyun
ALIYUN_ACCESS_KEY_ID=<aliyun-access-key-id>
ALIYUN_ACCESS_KEY_SECRET=<aliyun-access-key-secret>
ALIYUN_OCR_ENDPOINT=https://ocr-api.cn-hangzhou.aliyuncs.com
ALIYUN_OCR_ACTION=RecognizeAdvanced
OCR_LOCAL_URL=
```

生产数据库迁移应仍使用：

```bash
cd backend
DATABASE_URL=<prod-database-url> npm run db:migrate
```

执行生产 seed 前必须确认数据源、备份和目标库，避免覆盖人工审核状态。
