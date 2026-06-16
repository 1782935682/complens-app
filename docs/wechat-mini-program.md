# 微信小程序对接说明

本文记录 `user-uniapp` 微信小程序形态的构建、导入、后端域名配置和真机验收清单。

## 1. Codex 已覆盖的工程项

- `user-uniapp` 可构建 `mp-weixin` 产物，输出目录为 `user-uniapp/dist/build/mp-weixin`。
- 构建脚本支持通过 `WEIXIN_MP_APPID` 临时注入 AppID，不把真实 AppID 写死到源码。
- 小程序端拍照/相册入口统一走 `uni.chooseImage`，不会使用浏览器 file input。
- 小程序端图片读取走平台文件路径和文件系统；大图 OCR 前优先使用 `uni.compressImage` 压缩。
- 小程序端 API 请求必须配置绝对 `USER_API_BASE_URL`，前端不保存 OCR Key、AI Key，也不直连 OCR/AI/数据库。
- 报告页支持微信原生转发菜单；按钮操作仍保留复制摘要降级。
- `manifest.json` 已声明相机用途说明，最终隐私政策仍需在微信公众平台配置和人工确认。

## 2. 需要你提供或确认

| 项目 | 用途 | 是否必须 |
|---|---|---|
| 微信小程序 AppID | 构建可导入并绑定真实项目 | 已配置本机 `.env.local`：`wx4fbc4f0e40e4068d` |
| 微信开发者工具登录账号 | 导入 `dist/build/mp-weixin`、预览和真机调试 | 必须 |
| 后端 API 域名 | 小程序 `wx.request` 调用后端 | 已配置：`https://api.yxl123.xyz/api` |
| request 合法域名 | 在微信公众平台配置后端域名，正式真机和提交审核需要 | 待在微信公众平台确认：`https://api.yxl123.xyz` |
| HTTPS 证书和域名备案状态 | 小程序正式环境通常要求 HTTPS 合法域名 | HTTPS 已由 Caddy 接通；备案/微信后台校验待确认 |
| 隐私政策最终文本 | 披露拍照/相册、OCR、后端处理和第三方 OCR 供应商 | 提审前必须 |
| 生产 OCR Provider/Key | 真实 OCR 质量；无 Key 时仍走手动输入降级 | 可后置 |

## 2.1 当前测试环境

| 项目 | 当前值 |
|---|---|
| API 域名 | `https://api.yxl123.xyz` |
| API base path | `https://api.yxl123.xyz/api` |
| Caddy 反代 | `api.yxl123.xyz` → `127.0.0.1:3010` |
| 后端服务 | `compcheck-api.service` |
| 健康检查 | `curl https://api.yxl123.xyz/health` |
| 数据接口检查 | `curl "https://api.yxl123.xyz/api/ingredients?limit=1"` |

当前已验证：

- `https://api.yxl123.xyz/health` 返回 `200`。
- `https://api.yxl123.xyz/api/ingredients?limit=1` 能返回数据库数据。
- `compcheck-api.service` 为 `active`。

## 3. 命令总表

以下命令默认在仓库根目录 `/home/downloads/git/compcheck` 执行；进入子目录的命令会显式写出 `cd`。

### 3.0 Windows / Git Bash 快速运行

如果在 Windows Git Bash 中运行，先进入本地仓库根目录，例如：

```bash
cd ~/Desktop/complens/complens-app
```

如果刚拉完代码，先安装依赖：

```bash
npm install
cd user-uniapp
npm install
cd ..
```

创建小程序本地配置：

```bash
cat > user-uniapp/.env.local <<'EOF'
WEIXIN_MP_APPID=wx4fbc4f0e40e4068d
USER_API_BASE_URL=https://api.yxl123.xyz/api
WEIXIN_MP_URL_CHECK=false
EOF
```

从仓库根目录构建小程序：

```bash
npm run user:build:mp-weixin
```

也可以进入 `user-uniapp` 后构建：

```bash
cd user-uniapp
npm run build:mp-weixin
```

构建成功后，微信开发者工具导入：

```text
C:\Users\刘亚星\Desktop\complens\complens-app\user-uniapp\dist\build\mp-weixin
```

如果 `npm run build:mp-weixin` 只输出脚本名但没有 `Compiling...`，先确认当前分支包含 Windows 修复：

```bash
git switch main
git pull --ff-only
cd user-uniapp
npm run build:mp-weixin
```

如果在仓库根目录误跑 `npm run build:mp-weixin` 并提示缺少脚本，改用：

```bash
npm run user:build:mp-weixin
```

如果提示找不到 `uni` 或依赖缺失：

```bash
cd user-uniapp
npm install
npm run build:mp-weixin
```

### 3.1 小程序本地配置

本机配置文件：

```bash
cd user-uniapp
cp .env.example .env.local
```

当前测试环境建议内容：

```env
WEIXIN_MP_APPID=wx4fbc4f0e40e4068d
USER_API_BASE_URL=https://api.yxl123.xyz/api
WEIXIN_MP_URL_CHECK=false
```

说明：

- `.env.local` 已被 gitignore，不能提交真实账号、域名或密钥。
- `USER_API_BASE_URL` 是公开后端 API base path，不得填写 OCR Key、AI Key 或数据库连接串。
- 提交审核或正式真机验证时，把 `WEIXIN_MP_URL_CHECK` 改为 `true`，并先在微信公众平台配置 request 合法域名。

### 3.2 小程序构建与开发者工具

无 AppID 的本地构建：

```bash
cd user-uniapp
npm run build:mp-weixin
```

带真实 AppID 和后端地址构建：

```bash
cd user-uniapp
WEIXIN_MP_APPID=wx0000000000000000 \
USER_API_BASE_URL=https://api.example.com/api \
WEIXIN_MP_URL_CHECK=true \
npm run build:mp-weixin
```

本地开发者工具调试时可临时关闭合法域名校验：

```bash
cd user-uniapp
WEIXIN_MP_APPID=wx0000000000000000 \
USER_API_BASE_URL=https://dev-api.example.com/api \
WEIXIN_MP_URL_CHECK=false \
npm run dev:mp-weixin
```

说明：

- `WEIXIN_MP_APPID` 只临时写入构建过程和生成产物，不会提交到 `src/manifest.json`。
- `USER_API_BASE_URL` 是公开后端 API base path，不得填写任何密钥。
- H5 仍默认使用 `/api` 和 Vite proxy；小程序没有 H5 proxy，必须使用绝对 URL 或在设置页手工填写。

小程序构建产物目录：

```text
user-uniapp/dist/build/mp-weixin
```

### 3.3 后端本地配置

本机后端配置文件：

```bash
cd backend
cp .env.example .env
```

当前测试环境关键值：

```env
DATABASE_URL=postgres://postgres:password@localhost:15432/compcheck
POSTGRES_PORT=15432
HOST=127.0.0.1
PORT=3010
CORS_ORIGIN=https://api.yxl123.xyz
JWT_SECRET=<本机随机 32 字节以上密钥>
OCR_PROVIDER=rapidocr
OCR_SERVICE_URL=http://127.0.0.1:8000
```

说明：

- 后端监听 `127.0.0.1:3010`，只给 Caddy 反代，不直接暴露端口。
- `JWT_SECRET` 必须是本机私密值，不提交。
- `OCR_SERVICE_URL` 当前仍是代码实际读取的变量；后续统一迁移到 `OCR_LOCAL_URL` 时再改。

### 3.4 数据库启动、迁移和 seed

启动本地 Postgres：

```bash
cd backend
docker compose up -d postgres
```

查看 Postgres 容器：

```bash
cd backend
docker compose ps
```

迁移数据库：

```bash
cd backend
npm run db:migrate
```

导入 seed 和 GB2760 数据：

```bash
cd backend
npm run db:seed
```

如宿主机连接 Postgres 出现密码认证失败，可在容器内重置为 `.env` 使用的本地密码：

```bash
docker exec backend-postgres-1 psql -U postgres -d compcheck -c "alter user postgres with password 'password';"
```

### 3.5 后端开发启动

临时开发启动：

```bash
cd backend
npm run dev
```

如果要用 Caddy 当前配置联调，需要确保 `backend/.env` 为：

```env
HOST=127.0.0.1
PORT=3010
```

验证本机后端：

```bash
curl http://127.0.0.1:3010/health
curl "http://127.0.0.1:3010/api/ingredients?limit=1"
```

### 3.6 后端生产式启动（systemd）

构建后端：

```bash
cd backend
npm run build
```

当前测试环境使用 systemd 服务：

```bash
sudo systemctl status compcheck-api.service --no-pager
sudo systemctl restart compcheck-api.service
sudo systemctl is-active compcheck-api.service
sudo journalctl -u compcheck-api.service -n 100 --no-pager
```

当前服务文件位置：

```text
/etc/systemd/system/compcheck-api.service
```

当前服务关键配置：

```ini
WorkingDirectory=/home/downloads/git/compcheck/backend
ExecStart=/root/.nvm/versions/node/v22.22.0/bin/node /home/downloads/git/compcheck/backend/dist/index.js
Restart=always
```

如需首次创建或重建服务：

```bash
sudo tee /etc/systemd/system/compcheck-api.service >/dev/null <<'EOF'
[Unit]
Description=CompCheck API
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/downloads/git/compcheck/backend
Environment=NODE_ENV=production
ExecStart=/root/.nvm/versions/node/v22.22.0/bin/node /home/downloads/git/compcheck/backend/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now compcheck-api.service
```

### 3.7 Caddy 反代和 HTTPS

当前 Caddy 配置文件：

```text
/etc/caddy/Caddyfile
```

当前需要存在的站点块：

```caddyfile
api.yxl123.xyz {
    encode gzip

    reverse_proxy /api/* 127.0.0.1:3010
    reverse_proxy /health 127.0.0.1:3010
}
```

格式化和校验 Caddy：

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
```

重载 Caddy：

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

查看 Caddy 状态：

```bash
sudo systemctl status caddy --no-pager
```

### 3.8 公网 API 验证

健康检查：

```bash
curl https://api.yxl123.xyz/health
```

数据库接口检查：

```bash
curl "https://api.yxl123.xyz/api/ingredients?limit=1"
```

小程序 API base path 检查：

```bash
cd user-uniapp
npm run build:mp-weixin
```

构建日志不应出现：

```text
USER_API_BASE_URL is not set
WEIXIN_MP_APPID is not set
```

### 3.9 本轮验证命令

```bash
cd user-uniapp
npm run lint
npm run typecheck
npm run build:mp-weixin
npm run build:h5
```

```bash
git diff --check
```

## 4. 微信开发者工具导入

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择 `user-uniapp/dist/build/mp-weixin`。
4. AppID 填写真实小程序 AppID。
5. 本地调试阶段可按需要勾选“不校验合法域名、web-view 域名、TLS 版本以及 HTTPS 证书”。
6. 进入首页后依次验收：拍照/相册、OCR 降级、文本确认、标签类型、配料/营养解析、匹配确认、报告、历史、关注项、报告分享。

## 5. 微信公众平台配置

在“小程序后台 → 开发管理 → 开发设置 → 服务器域名”中配置：

| 类型 | 建议值 |
|---|---|
| request 合法域名 | 后端 API 域名，例如 `https://api.example.com` |
| uploadFile 合法域名 | 当前主流程不直接用小程序上传接口，可暂不配 |
| downloadFile 合法域名 | 当前主流程不依赖，可暂不配 |
| socket 合法域名 | 当前不使用，可暂不配 |

隐私与权限配置：

- 相机：用于拍摄食品标签图片。
- 相册：用于选择已有食品标签图片。
- 网络请求：用于把图片转成 OCR 请求并获取标签解读结果。
- OCR/AI 第三方供应商：上线前需按真实供应商披露；本地 RapidOCR 不作为公网第三方服务暴露给小程序。

## 6. 真机验收清单

| 流程 | 验收点 |
|---|---|
| 首次打开 | 首页、底部导航和页面样式无明显错位 |
| 拍照 | 可调起相机，拒绝权限时有错误提示和手动输入路径 |
| 相册 | 可选择图片，图片不会写入小型键值存储 |
| OCR | 后端地址缺失/不可达时进入手动输入，不返回假识别文字 |
| 文本确认 | OCR 成功或手动输入后必须进入确认页 |
| 报告 | 可生成食品标签解读报告，文案不输出医疗化或购买结论 |
| 历史 | 报告可保存、可再次打开 |
| 分享 | 报告页可触发微信转发或复制摘要降级 |
| 设置 | 可查看/修改后端 API 基址 |
| 隐私 | 可打开隐私说明页 |

## 7. 当前仍需人工完成

- 在微信公众平台配置 request 合法域名。
- 用微信开发者工具完成真机预览验收。
- 提审前确认隐私政策最终文本、OCR 供应商披露和服务条款。
