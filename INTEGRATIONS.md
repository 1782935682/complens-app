# External Integrations

本文件记录 CompCheck 当前对接的外部组件、本机目录、配置项和常用命令。以后新增数据库、OCR、AI、部署平台或其他外部系统时，必须同步更新本文件。

完整文档分类见 [`docs/README.md`](./docs/README.md)；新机器部署见 [`docs/deployment.md`](./docs/deployment.md)；数据库设计、字段含义和初始化 SQL 见 [`docs/database.md`](./docs/database.md)。

## PostgreSQL

- 用途：后端业务数据库、GB2760 staging / promote / 审计表。
- 项目目录：`backend/`
- 配置文件：`backend/.env`（本机，不提交）、`backend/.env.example`（模板）、`backend/docker-compose.yml`
- 本机连接：`DATABASE_URL=postgres://postgres:password@localhost:15432/compcheck`
- 容器内连接：`postgres://postgres:password@postgres:5432/compcheck`
- 端口：`POSTGRES_PORT=15432`
- 设计文档：[`docs/database.md`](./docs/database.md)
- 部署步骤：[`docs/deployment.md`](./docs/deployment.md)

说明：当前不是两个数据库。`localhost:15432` 是宿主机访问同一个 Postgres 容器的地址；`postgres:5432` 是 Docker Compose 内部服务地址。

启动与初始化：

```bash
cd backend
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

校验：

```bash
npm run validate:gb2760
```

## Backend API

- 用途：鉴权、成分 API、GB2760 API、OCR 代理、用户同步。
- 项目目录：`backend/`
- 入口：`backend/src/index.ts`
- 默认地址：`http://127.0.0.1:3000`
- 关键配置：`HOST`、`PORT`、`CORS_ORIGIN`、`JWT_SECRET`、`DATABASE_URL`、`GB2760_INTERNAL_REVIEWERS`

启动：

```bash
cd backend
npm run dev
```

健康检查：

```bash
curl http://127.0.0.1:3000/health
```

## Local RapidOCR

- 用途：本机开发 OCR 识别服务，作为当前真实 OCR provider。
- 外部目录：`/home/downloads/tools/complens-ocr`
- 服务入口：`/home/downloads/tools/complens-ocr/app.py`
- Python 环境：`/home/downloads/tools/complens-ocr/.venv`
- 默认地址：`http://127.0.0.1:8000`
- 健康检查：`GET /health`
- 识别接口：`POST /ocr`，multipart 字段名 `file`
- 后端配置：`OCR_PROVIDER=rapidocr`、`OCR_SERVICE_URL=http://127.0.0.1:8000`、`OCR_API_KEY=` 留空

启动：

```bash
cd /home/downloads/tools/complens-ocr
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

直接调用 OCR 服务：

```bash
curl -X POST "http://127.0.0.1:8000/ocr" \
  -F "file=@/path/to/ingredient-label.jpg"
```

通过 CompCheck 后端代理调用：

```bash
curl -X POST "http://127.0.0.1:3000/api/ocr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"imageBase64":"<base64>","mimeType":"image/jpeg","category":"food"}'
```

生产替换计划：

- 生产环境切换为阿里云 OCR。
- 生产配置改为 `OCR_PROVIDER=aliyun`，配置 `OCR_API_KEY=<aliyun-key>`。
- 生产不依赖 `/home/downloads/tools/complens-ocr`，也不使用 `OCR_SERVICE_URL`。

## AI Provider

- 用途：后续真实 AI 解释层；当前仍是外部依赖阻塞项。
- 配置项：`AI_PROVIDER`、`AI_API_KEY`
- 当前默认模板：`AI_PROVIDER=anthropic`
- 约束：AI 只能作为解释层，不能生成或伪造原始数据来源。

## Documentation Rule

新增或替换任何外部系统时，至少记录：

- 组件用途。
- 本机或项目目录。
- 配置变量和示例值。
- 启动命令。
- 验证命令。
- 生产环境替换方式。
