# COMMANDS

本文件集中记录 CompLens / 成分镜（CompCheck）当前可用命令。修改依赖、启动方式、构建方式或测试方式时需要同步更新。文档分类见 [`docs/README.md`](./docs/README.md)，新机器完整部署见 [`docs/deployment.md`](./docs/deployment.md)，数据库设计和初始化 SQL 见 [`docs/database.md`](./docs/database.md)。

## 环境要求

- Node.js >= 20.19
- 当前可运行用户端原型使用 Vite（`src/`，纯 JS + hash 路由），首次拉取后需要执行 `npm install` 安装开发依赖并校验 lockfile。
- 正式用户端已新增 `user-uniapp/`（uni-app + Vue3），目标覆盖 H5/PWA、微信小程序、Android、iOS；后台目标为 `admin-web/`（Vue3 + TDesign Web），仍是计划项，不要当成已存在工程调用。
- 后端复用现有 `backend/`（Node.js + TypeScript + Hono + Drizzle + PostgreSQL），不要创建第二套 Express/Nest/Fastify 服务。
- 当前阶段优先级为数据源准确性、数据完整度、数据库真实对接和 OCR 拍照识别主路径；订阅、支付、AI 高级分析、上架、iOS/Android 签名后置。
- 验证命令按改动范围选择，不要每次默认跑完整测试；纯文档修改至少执行 `git diff --check`。

## 环境变量

参考 `.env.example`。本项目通过 Vite 构建前端，但公开配置仍不使用 `VITE_` 前缀，统一在 `vite.config.js` 中显式 `define` 注入。

当前前端仅允许读取显式注入的公开配置。服务端密钥（OCR_API_KEY、AI_API_KEY）只在后端 Node.js 进程中读取，不传前端。外部组件目录、配置和命令统一记录在 `INTEGRATIONS.md`，新增外部系统时必须同步更新。另一台机器从零部署时先看 `docs/deployment.md`。

食品搜索和详情默认请求同源 `/api`；如需指向独立后端，可在浏览器本地设置 `compcheck:api-base-url`。后端不可用时，前端食品搜索/详情会降级到本地 `src/data/foodAdditives.js` seed，并展示错误提示和未验证状态。

正式用户端 `user-uniapp/` 的 H5 构建默认使用同源 `/api`，由 dev proxy 或部署网关转发到后端。微信小程序 / App 没有 Vite proxy，必须在构建或运行前提供绝对后端 API base path：构建时设置公开变量 `USER_API_BASE_URL=https://api.example.com/api`，或在测试环境写入本地存储 key `complens:user-api-base-url`。该变量只允许保存后端 API origin / base path，不得放 OCR Key、AI Key 或其他密钥；未配置时非 H5 请求会明确失败并进入 manual/mock fallback，不伪造后端结果。

微信小程序构建可额外设置 `WEIXIN_MP_APPID` 临时注入真实 AppID，设置 `WEIXIN_MP_URL_CHECK=true|false` 控制生成产物的开发者工具合法域名校验配置。详细导入、公众平台域名和真机验收见 [`docs/wechat-mini-program.md`](./docs/wechat-mini-program.md)。
也可以把本机调试配置写入 `user-uniapp/.env.local`；该文件已被 gitignore，仅用于本地微信开发者工具调试，不能提交真实账号、域名或密钥。
微信小程序专项命令（小程序构建、后端 3010 启动、Postgres、Caddy、systemd、公网 API 验证）集中维护在 [`docs/wechat-mini-program.md`](./docs/wechat-mini-program.md)。

OCR Provider 抽象已支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`。`OCR_PROVIDER=mock` 会返回明确标注为 `provider: "mock"` 的固定测试结果；`OCR_PROVIDER=rapidocr` 会调用本机 `/home/downloads/tools/complens-ocr` FastAPI 服务，不需要 `OCR_API_KEY`，当前代码配置名为 `OCR_SERVICE_URL`。统一架构目标把本机 OCR 固定为后端内网调用（目标 `OCR_LOCAL_URL=http://127.0.0.1:18080/ocr`），变量改名和端口统一属于后续配置迁移，未完成前不要让 `OCR_SERVICE_URL` 和 `OCR_LOCAL_URL` 长期并存且含义不清。`aliyun` / `paddleocr` 缺少 `OCR_API_KEY` 时，`POST /api/ocr` 返回 `503 ocr_not_configured`；已配置但供应商适配未实现时返回 `501 ocr_provider_pending`。前端会进入 manual/fallback 确认页，不会伪造 OCR 识别文本。

GB2760 内部复核写接口需要登录且账号在后端 allowlist 内。开发/部署时用 `GB2760_INTERNAL_REVIEWERS` 配置逗号分隔的内部邮箱或用户 ID；未配置时，`PUT /api/gb2760/staging-rows/*` 会对普通登录账号返回 `403 forbidden`，只读查询仍只要求登录。

## 本地存储调试 Key

`compcheck:api-base-url` 仅用于本地或测试环境覆盖后端 API 地址，例如把前端指向独立运行的后端服务。该 key 不保存用户数据、不参与过敏原/收藏/历史/报告同步，也不得复用为业务数据存储 key。清空该 key 后，前端会回到默认同源 `/api`。

扫描图片和大 blob 存入 IndexedDB（`compcheck-images` / `scan-images`），localStorage 只保存 pending 图片 id、元数据、确认文本和用户设置。禁止把图片 base64 写入 localStorage。

## 命令清单速查（实现状态）

> 以下汇总常用命令及其实现状态，详细用法见下方各节。标「计划命令，待 Codex 实现」的尚不存在，不要当作已有命令调用。

| 用途 | 命令 | 状态 |
|---|---|---|
| 前端启动 | `npm run dev` | ✅ 已实现 |
| 前端构建 | `npm run build` | ✅ 已实现 |
| 前端预览 | `npm run preview` | ✅ 已实现 |
| 正式用户端 H5 启动 | `cd user-uniapp && npm run dev:h5` | ✅ 已实现 |
| 正式用户端 H5 构建 | `cd user-uniapp && npm run build:h5` | ✅ 已实现 |
| 正式用户端微信小程序启动 | `cd user-uniapp && npm run dev:mp-weixin` | ✅ 已实现（需微信开发者工具导入调试） |
| 正式用户端微信小程序构建 | `cd user-uniapp && npm run build:mp-weixin` | ✅ 已实现（真机/开发者工具验收后置） |
| 正式用户端 lint | `cd user-uniapp && npm run lint` | ✅ 已实现 |
| 正式用户端类型检查 | `cd user-uniapp && npm run typecheck` | ✅ 已实现 |
| 后台管理端启动 | `cd admin-web && npm run dev` | 计划命令，待 Codex 实现 |
| 代码检查 | `npm run lint` | ✅ 已实现 |
| 测试 | `npm run test` | ✅ 已实现 |
| 数据校验 | `npm run validate:data` | ✅ 已实现 |
| 后端启动 | `cd backend && npm run dev` | ✅ 已实现 |
| 后端构建 | `cd backend && npm run build` | ✅ 已实现 |
| 后端类型检查 | `cd backend && npm run typecheck` | ✅ 已实现 |
| 后端测试 | `cd backend && npm test` | ✅ 已实现 |
| 数据库迁移 | `cd backend && npm run db:migrate` | ✅ 已实现 |
| 数据库 seed | `cd backend && npm run db:seed` | ✅ 已实现 |
| 本机 OCR 服务启动 | `cd /home/downloads/tools/complens-ocr && .venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000` | ✅ 已实现（本机 RapidOCR） |
| 统一架构目标 OCR 服务启动 | `cd /home/downloads/tools/complens-ocr && .venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 18080` | 计划命令，待 Codex 做配置迁移并验证 |
| GB2760 全文/staging/参考表生成 | `node scripts/generate-gb2760-*.mjs` | ✅ 已实现 |
| GB2760 自动映射 | `npm run map:gb2760` | ✅ 已实现 |
| GB2760 promote | `npm run promote:gb2760` | ✅ 已实现 |
| GB2760 校验 | `npm run validate:gb2760` | ✅ 已实现 |
| GB2760 导入封装 | `import:gb2760` | 计划命令，待 Codex 实现（当前用 generate 脚本 + `db:seed`） |
| GB2760 导入状态 CLI | `import:gb2760:status` | 计划命令，待 Codex 实现（已有只读 API `GET /api/gb2760/import-runs`） |
| 移动端同步 | `npm run cap:sync` / `cap:open:ios` / `cap:open:android` | ✅ 已实现 |
| 文档/差异检查 | `git diff --check` | ✅ 已实现 |

## 安装依赖

```bash
npm install
```

后端位于 `backend/` 子目录，首次拉取或后端依赖变化后需要单独安装：

```bash
cd backend
npm install
```

## 本地启动

当前 `npm run dev` 启动的是历史 Web/PWA 原型（`src/` + Vite）。正式用户端已迁移到 `user-uniapp/`，新复杂用户端功能优先进入 `user-uniapp/`，旧前端保留为历史原型和迁移来源。

```bash
npm run dev
```

该命令启动 Vite dev server。

默认地址：

```text
http://127.0.0.1:5173
```

可通过环境变量调整：

```bash
HOST=127.0.0.1 npm run dev -- --port 5174
```

正式用户端 H5 本地启动：

```bash
cd user-uniapp
npm install
npm run dev:h5
```

正式用户端 H5 构建：

```bash
cd user-uniapp
npm run build:h5
```

正式用户端微信小程序构建：

```bash
cd user-uniapp
npm run build:mp-weixin
```

构建完成后用微信开发者工具导入 `user-uniapp/dist/build/mp-weixin` 进行平台调试。小程序账号、后端域名和真机验收清单见 `docs/wechat-mini-program.md`。

如需让小程序 / App 构建直接访问后端，先提供绝对 API 地址：

```bash
cd user-uniapp
USER_API_BASE_URL=https://api.example.com/api npm run build:mp-weixin
```

如需注入真实小程序 AppID：

```bash
cd user-uniapp
WEIXIN_MP_APPID=wx0000000000000000 \
USER_API_BASE_URL=https://api.example.com/api \
WEIXIN_MP_URL_CHECK=true \
npm run build:mp-weixin
```

本地开发时，Vite 会把 `/api` 代理到 `API_ORIGIN`，默认是 `http://127.0.0.1:3000`。需要验证前端真实读取数据库时，先启动后端和数据库，再启动前端。这里的 `db:migrate` / `db:seed` 与后文数据库章节是同一组命令，只执行一次即可：

```bash
cd backend
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev

# 新终端回到仓库根目录
npm run dev
```

## 后端 API 与数据库

后端使用 Node.js 20 + TypeScript + Hono，入口位于 `backend/src/index.ts`。这是正式后端 API 的复用目标，所有用户端、后台、小程序和 App 都应通过它访问 OCR、AI、数据库和数据治理能力。

本地启动：

```bash
cd backend
cp .env.example .env
npm run dev
```

默认地址：

```text
http://127.0.0.1:3000
```

后端本地默认绑定 `HOST=127.0.0.1`；Docker Compose 会覆盖为 `HOST=0.0.0.0` 以便端口映射。

健康检查：

```bash
curl http://127.0.0.1:3000/health
```

预期返回：

```json
{"status":"ok","version":"0.1.0","timestamp":"..."}
```

后端校验：

```bash
cd backend
npm run typecheck
npm test
npm run build
```

## 本机 RapidOCR 服务

当前本机真实 OCR 使用 `/home/downloads/tools/complens-ocr`，生产环境后续切换为阿里云 OCR。目录和替换说明见 `INTEGRATIONS.md`。OCR 服务只能由后端调用，不对公网暴露，前端/小程序/App 不直连。

启动本机 OCR 服务：

```bash
cd /home/downloads/tools/complens-ocr
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
```

后端本机配置：

```env
OCR_PROVIDER=rapidocr
OCR_SERVICE_URL=http://127.0.0.1:8000
OCR_API_KEY=
```

统一架构目标：

```env
OCR_PROVIDER=rapidocr
OCR_LOCAL_URL=http://127.0.0.1:18080/ocr
OCR_API_KEY=
```

上述 `OCR_LOCAL_URL` 目前是计划配置名，当前代码仍读取 `OCR_SERVICE_URL`。后续执行配置迁移时必须同步 `.env.example`、`INTEGRATIONS.md`、`docs/deployment.md` 和后端测试。

直接验证 OCR 服务：

```bash
curl -X POST "http://127.0.0.1:8000/ocr" \
  -F "file=@/path/to/ingredient-label.jpg"
```

通过 CompCheck 后端代理验证（MVP OCR 主流程允许匿名调用；无 provider/key 时返回明确降级错误）：

```bash
curl -X POST "http://127.0.0.1:3000/api/ocr" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"<base64>","mimeType":"image/jpeg","category":"food"}'
```

生产切换阿里云 OCR 时：

```env
OCR_PROVIDER=aliyun
OCR_API_KEY=<aliyun-ocr-key>
OCR_SERVICE_URL=
```

数据库启动。表设计、字段含义、迁移 SQL 清单和“为什么有两个数据库地址”的解释见 [`docs/database.md`](./docs/database.md)：

```bash
cd backend
cp .env.example .env
docker compose up -d postgres
```

数据库迁移。同一套命令在快速启动流程里也会出现，不代表有第二套数据库：

```bash
cd backend
npm run db:migrate
```

食品添加剂 seed 导入：

```bash
cd backend
npm run db:seed
```

GB 2760-2024 官方 PDF 全文转换（需要本机已安装 `poppler-utils` / `pdftotext`，默认读取 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`）：

```bash
node scripts/generate-gb2760-fulltext.mjs
```

GB 2760-2024 官方 PDF 表 A.1 staging 转换：

```bash
node scripts/generate-gb2760-a1-staging.mjs
```

GB 2760-2024 官方 PDF 参考表转换（当前抽取表 A.2、B.1、B.2、B.3、C.1、C.2、C.3、附录 D、E.1 和附录 F）：

```bash
node scripts/generate-gb2760-reference-tables.mjs
```

上述命令分别生成 `src/data/gb2760OfficialFullText.js`、`src/data/gb2760OfficialGeneratedA1Staging.js` 和 `src/data/gb2760OfficialReferenceTables.js`，保存官方 PDF 全 264 页逐页文本、表 A.1 行级 staging，以及 2800 行官方参考表结构化数据。后端 `npm run db:seed` 会同时导入：

- `ingredients`
- `source_documents` GB2760 官方来源文档登记
- `gb2760_official_records` 表 A.1 行级 staging
- `gb2760_official_pages` PDF 全文页
- `gb2760_official_reference_rows` 官方参考表结构化行
- `import_runs` / `import_errors` 导入审计记录

官方 PDF 派生表按当前源文件做快照同步：`db:seed` 会清理源文件中已不存在的旧 `gb2760_official_records` / `gb2760_official_pages` / `gb2760_official_reference_rows` 行，再写入当前数据。

可选审计参数：

```bash
cd backend
npm run db:seed -- --version 2026-06-v1 --reviewed-by system --change-note "seed version update"
```

`--version` 会覆盖本次导入写入数据库的 `data_version`；同一条记录只有在数据库中已有版本与本次版本不同时，才会更新 `change_note` 和 `reviewed_at`。这只记录 seed 审计字段，不代表人工法规审核完成。

GB2760 导入审计 API 验收：

```bash
curl -H "Authorization: Bearer <token>" "http://127.0.0.1:3000/api/gb2760/import-runs"
curl -H "Authorization: Bearer <token>" "http://127.0.0.1:3000/api/gb2760/import-runs/<import-run-id>/errors"
```

`GET /api/gb2760/import-runs` 返回 `db:seed` 写入的 `fulltext` / `a1_staging` / `reference_tables` 批次、行数、状态和来源文档摘要；`errors` 接口返回失败批次的错误明细。接口需要登录 token，当前没有单独的 `npm run import:gb2760:status` CLI 包装命令。

GB2760 正式库准入 promote（后端命令，Batch 1-C 已实现）：

```bash
npm run promote:gb2760
```

`promote:gb2760` 只处理 DB staging 中已经人工标记为 `approved` 或已 `promoted` 的行。字段不完整的已签核行会记录到 `import_errors` 并使命令失败；未签核行保持 `pending_review`，不会写入正式规则表。成功 promote 会同步更新对应 `ingredients` 行的 GB2760 法规状态、来源和 `usageLimits`，让既有成分详情 / 搜索 API 可见。本轮人工签核后输出 `scanned=2404 approved=2391 promoted=2391 failed=0 pending_review=0 already_verified=13`，`additive_usage_rules=2391`。

默认 PostgreSQL 宿主端口为 `15432`，避免和本机已有 `5432` 冲突；如需调整，可在 `backend/.env` 设置 `POSTGRES_PORT` 并同步宿主机使用的 `DATABASE_URL`。

生产数据库未完成。当前仅完成本地数据库或开发环境数据库对接，不应将本地 schema、migration 或 seed 完成描述为生产数据库已完成。

成分 API 验收：

```bash
curl "http://127.0.0.1:3000/api/ingredients?q=苯甲酸"
curl "http://127.0.0.1:3000/api/ingredients/search?q=E211&limit=2"
curl "http://127.0.0.1:3000/api/ingredients?confidenceLevel=medium&limit=5"
curl "http://127.0.0.1:3000/api/ingredients?confidenceLevel=unverified&limit=5"
curl "http://127.0.0.1:3000/api/ingredients/categories"
curl "http://127.0.0.1:3000/api/ingredients/sodium-benzoate"
curl -i "http://127.0.0.1:3000/api/ingredients/not-exist"
```

批量成分匹配 API 验收：

```bash
curl -X POST "http://127.0.0.1:3000/api/ingredients/batch-search" \
  -H "Content-Type: application/json" \
  -d '{"terms":["E211","柠檬酸","未知配料"]}'
```

OCR 代理占位验收（MVP OCR 主流程允许匿名调用；`aliyun` / `paddleocr` 无 `OCR_API_KEY` 时预期返回 503）：

```bash
curl -i -X POST "http://127.0.0.1:3000/api/ocr" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"AA==","mimeType":"image/jpeg","category":"food"}'
```

OCR mock provider 验收（后端环境设置 `OCR_PROVIDER=mock`，不需要真实 OCR Key）：

```bash
curl -X POST "http://127.0.0.1:3000/api/ocr" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"AA==","mimeType":"image/jpeg","category":"food"}'
```

用户个人档案同步 API 验收（需要先登录取得 JWT）：

```bash
curl -X PUT "http://127.0.0.1:3000/api/user/profile/watch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"items":["sodium-bicarbonate","citric-acid"]}'

curl "http://127.0.0.1:3000/api/user/profile/watch" \
  -H "Authorization: Bearer <jwt>"

curl -X PUT "http://127.0.0.1:3000/api/user/profile/avoid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"items":["sodium-metabisulfite"]}'
```

`profile` 当前仅支持 `watch` 和 `avoid` 两类，分别对应前端 `compcheck:watch-ingredients` 和 `compcheck:avoid-ingredients`。未登录时前端仍保持本机 localStorage 行为；登录后通过现有云同步流程自动恢复和写回。

Docker 本地栈：

```bash
cd backend
docker compose up --build
```

该命令会启动 PostgreSQL 15 和 API 服务。宿主机命令使用 `localhost:15432` 连接数据库，API 容器会在 compose 中覆盖为 `postgres:5432` 连接同一个 PostgreSQL 服务。

后端本地密钥和生成物不纳入版本管理：`backend/.env`、`backend/node_modules/`、`backend/dist/` 均已忽略。

## 构建

```bash
npm run build
```

该命令执行 `vite build`。构建产物输出到 `dist/`，该目录为生成物，不纳入版本管理。

## 预览构建产物

```bash
npm run preview
```

该命令启动 Vite preview server，用于检查 `dist/` 产物。

## 移动端 Capacitor

当前移动端脚手架使用 Capacitor 7.x，匹配仓库 `Node.js >= 20.19` 的运行口径。不要升级到要求 Node 22+ 的 Capacitor 主版本，除非同步升级 `package.json` engines、CI Node 版本和本文档。

已接入的 Capacitor 7.x 插件：

- `@capacitor/camera`：原生相机 / 相册选择，Web 环境降级到文件输入。
- `@capacitor/share`：原生系统分享，Web 环境降级到 Web Share API 或复制。
- `@capacitor/filesystem`：随移动端基座安装，后续用于报告和离线文件能力。

```bash
npm run cap:sync
```

该命令会先执行 `npm run build`，再运行 `npx cap sync`，用于把 `dist/` Web 产物同步到本机 iOS / Android 平台工程。

```bash
npm run cap:open:ios
npm run cap:open:android
```

这两个命令分别通过 Capacitor 打开本机 iOS / Android 工程。仓库只提交 `capacitor.config.json`，`ios/` 和 `android/` 是本机生成目录，已在 `.gitignore` 中忽略；需要平台工程时执行：

```bash
npm run build
npx cap add ios
npx cap add android
npm run cap:sync
```

配置检查：

```bash
npx cap doctor
```

`npx cap doctor` 可用于检查 Capacitor 配置；允许提示本机未安装 Xcode、Android Studio 或相关 SDK。

## 代码检查

```bash
npm run lint
```

当前检查内容：

- JavaScript 语法检查
- `public/` service worker 语法检查
- `src/` 文案合规扫描

## 测试

```bash
npm run test
```

当前覆盖：

- 成分中文、英文、别名、拼音、首字母和常见误写搜索
- 食品添加剂 E-number / INS 编码搜索
- 成分表文本拆分与匹配
- OCR 拍照入口、确认页、manual/fallback 降级和响应格式校验
- 图片预处理与 IndexedDB 图片存储 fallback
- 数据库批量成分匹配和低置信/未匹配保留
- 真实包装成分表前缀、复配括号、剂量后缀解析和分析置信度
- 食品添加剂成分表匹配和重点关注项输出
- 未知成分输出
- 过敏原枚举、食品数据校验和本地存储异常兜底
- 本机数据导出 / 导入 / 清空
- 搜索历史记录开关和关闭后的不记录行为
- 首次启动引导、默认类别、过敏原和隐私偏好保存
- 会员中心路由、套餐对比、本机用量和订阅操作未接入提示
- 支持中心路由、本机反馈记录、预填数据纠错反馈、复制、删除、导出导入和设置 / 会员入口
- 隐私与条款路由、隐私政策草案、服务条款草案、订阅说明、数据安全和内容来源说明
- 成分对比路由、本机对比列表、搜索 / 详情 / 收藏入口和横向对比页
- 详情、报告和成分对比分享 / 复制 fallback
- Capacitor Camera / Share 非 native 环境降级不崩溃
- iOS 权限描述文档、viewport-fit 和安全区样式断言
- 本地报告历史检索
- 本地报告来源引用与审核状态导出
- AI/OCR 未配置时的降级返回

## 数据校验

```bash
npm run validate:data
```

当前校验食品添加剂数据的必填字段、枚举值、重复 id、重复中文名 + 英文名组合、来源字段、可信等级、已验证数据来源依据，以及风险说明中的绝对化医疗结论。命令通过后会额外输出数据质量报告，包括 reviewed / verified / unverified 数量、缺来源字段数、缺限量数和来源版本分布，以及 GB2760 staging / 参考表 / 全文 / seed 覆盖报告。

## GB2760 命令与已实现接口

> 以下为 `CODEX_TASKS.md` 阶段 1 的命令规划和当前状态。不要把"计划，未实现"项当作已存在命令调用。当前 GB2760 数据仍通过"GB 2760-2024 官方 PDF 全文转换 / 表 A.1 staging 转换 / 参考表转换"脚本生成，再由后端 `npm run db:seed` 入库；导入状态查询已先以只读 API 落地，正式库准入 promote 和 GB2760 数据校验已作为 npm 命令落地。

| 命令 | 用途 | 对应 Batch | 状态 |
|---|---|---|---|
| `import:gb2760` | 从官方 PDF 全量承接到 staging（封装现有生成脚本 + 导入审计） | Batch 1-A/1-B | 计划，未实现 |
| `import:gb2760:resume` | 断点续跑 staging 导入 | Batch 1-A/1-B | 计划，未实现 |
| `import:gb2760:status` | 查询导入批次状态（`import_runs` / `import_errors`） | Batch 1-A | CLI 计划，需登录 API 已实现：`GET /api/gb2760/import-runs` |
| `map:gb2760` | 为未映射 GB2760 staging 行自动创建缺失成分身份并回填 `ingredientId`，状态置为 `mapped_candidate`，不自动签核 | Batch 1-F | 已实现：`npm run map:gb2760`；本轮创建 217 个成分身份、映射 1447 行 |
| `promote:gb2760` | 把已人工签核且满足正式库准入规则的 staging 行 promote 到 `additive_usage_rules` 并同步更新 `ingredients` 可见法规字段；低置信保持 pending_review | Batch 1-C | 已实现：`npm run promote:gb2760`；当前 2391 promoted |
| `validate:gb2760` | 强制执行正式库准入规则与禁止事项，违规报错退出 | Batch 1-D | 已实现：`npm run validate:gb2760`；CI 已接入 |

后续 CLI 预期形态（占位，待导入状态 CLI 包装落地）：

```bash
# 后端（backend/package.json）：import:gb2760:status 仍为计划；map:gb2760 / promote:gb2760 / validate:gb2760 已实现
cd backend
npm run import:gb2760:status
```

当前可用的 GB2760 数据生成、入库、准入与校验流程是：`node scripts/generate-gb2760-fulltext.mjs` / `generate-gb2760-a1-staging.mjs` / `generate-gb2760-reference-tables.mjs` → `cd backend && npm run db:seed` → `npm run map:gb2760`（仅补映射，不自动签核）→ 人工签核 DB staging 行 → `npm run promote:gb2760` → `npm run validate:gb2760`。没有人工签核时 promote 会成功退出但写入 0 条正式规则；validate 会报告空签核状态并通过。

## 文档与差异检查

```bash
git diff --check
```

用于纯文档或小范围修改后的基础检查，确认 diff 中没有尾随空格等格式问题。仅修改 Markdown 文档且不影响代码、依赖、构建脚本或运行方式时，通常无需执行 build/test；仍应说明未运行原因。

## 启动验证

```bash
npm run dev
curl -I http://127.0.0.1:5173/
```

预期返回：

```text
HTTP/1.1 200 OK
```
