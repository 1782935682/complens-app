# AI Review - Data Foundation and Database Connection

## 本轮目标

完成“可信成分数据底座 + 数据库真实对接”的基础闭环，暂停订阅、支付、OCR、AI、上架、iOS/Android 签名相关开发。

## 修改文件

- `PROJECT_PLAN.md`
- `CODEX_TASKS.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `src/types/ingredient.js`
- `src/data/foodAdditives.js`
- `src/services/ingredientService.js`
- `src/services/ingredientApiService.js`
- `src/pages/searchPage.js`
- `src/pages/detailPage.js`
- `src/router/router.js`
- `src/main.js`
- `src/styles.css`
- `scripts/validate-data.mjs`
- `scripts/test.mjs`
- `vite.config.js`
- `backend/src/db/schema.ts`
- `backend/src/db/migrations/0004_good_timeslip.sql`
- `backend/src/db/migrations/meta/0004_snapshot.json`
- `backend/src/db/migrations/meta/_journal.json`
- `backend/src/services/ingredientService.ts`
- `backend/src/routes/ingredients.ts`
- `backend/tests/ingredients.test.ts`

## 变更摘要

- 食品添加剂类型、前端数据、后端 schema、seed 映射和 API 返回统一补齐来源可信字段：`sourceName`、`sourceType`、`sourceVersion`、`sourceUrl`、`effectiveDate`、`confidenceLevel`、`lastReviewedAt`、`regulatoryBasis`、`rawSourceText`、`isVerified`。
- 当前 100 条食品添加剂 seed 全部标记为 `confidenceLevel: "unverified"`、`isVerified: false`，避免用户误解为完整或权威数据。
- 新增 Drizzle migration，将来源字段写入 `ingredients` 表；seed 可将现有食品添加剂数据导入本地 PostgreSQL。
- 补齐 `GET /api/ingredients/search?q=`，复用现有分页、关键词、分类和别名搜索逻辑。
- 前端食品搜索和详情优先请求后端 API，API 失败时降级本地数据，并处理 loading、error、empty 状态。
- Vite 本地 dev server 将 `/api` 代理到 `API_ORIGIN` 或默认 `http://127.0.0.1:3000`，便于本地前端真实读取后端数据库。
- 搜索结果显示未验证标识；详情页展示来源、可信等级、法规依据和原始来源摘要。
- 增强 `npm run validate:data`，检查来源字段、可信等级、重复项、已验证数据依据和绝对化医疗结论。
- 新增 `DATA_SOURCES.md`，记录当前来源、数据量、可信等级、缺失范围和 AI 不得编造的数据。

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
cd backend && npm run db:migrate
cd backend && npm run db:seed
cd backend && npm run dev
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/ingredients/search?q=E211&limit=2"
curl "http://127.0.0.1:3000/api/ingredients/sodium-benzoate"
curl -i "http://127.0.0.1:3000/api/ingredients/not-exist"
npm run dev -- --host 127.0.0.1 --port 5173
curl "http://127.0.0.1:5175/api/ingredients/search?q=E211&limit=2"
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，100 条食品添加剂记录校验成功。
- `npm run lint` 通过，48 个 JavaScript 文件检查、54 个文本文件扫描通过。
- `npm run test` 通过，前端搜索、详情、数据校验和文本分析断言通过。
- `npm run build` 通过，Vite 构建产物生成成功。
- `cd backend && npm run typecheck` 通过。
- `cd backend && npm test` 通过，5 个测试文件、33 个测试用例通过。
- `cd backend && npm run build` 通过。
- `cd backend && docker compose up -d postgres` 通过，本地 PostgreSQL 容器运行中。
- `cd backend && npm run db:migrate` 通过，Drizzle migration 应用成功。
- `cd backend && npm run db:seed` 通过，输出 `Seeded 100 ingredients`。
- `cd backend && npm run dev` 可启动，API 监听 `http://127.0.0.1:3000`。
- `curl http://127.0.0.1:3000/health` 返回 200 和 `{"status":"ok"}`。
- `curl "http://127.0.0.1:3000/api/ingredients/search?q=E211&limit=2"` 返回 `sodium-benzoate`，包含来源字段、`confidenceLevel:"unverified"` 和 `isVerified:false`。
- `curl "http://127.0.0.1:3000/api/ingredients/sodium-benzoate"` 返回详情和来源字段。
- `curl "http://127.0.0.1:3000/api/ingredients/categories"` 返回分类统计。
- `curl -i "http://127.0.0.1:3000/api/ingredients/not-exist"` 返回 404 `{"error":"not_found"}`。
- `npm run dev -- --host 127.0.0.1 --port 5173` 可启动；当前环境中 5173/5174 已占用，Vite 自动落到 `http://127.0.0.1:5175/`。
- `curl "http://127.0.0.1:5175/api/ingredients/search?q=E211&limit=2"` 通过 Vite `/api` 代理返回数据库中的 `sodium-benzoate` 和来源字段。
- `git diff --check` 通过。

## 风险点

- 当前数据量仅 100 条 seed 样本，不能视为完整食品添加剂库。
- 当前来源字段是统一 seed 溯源入口和待审核状态，逐条标准条款、来源版本、生效日期、ADI 原文和逐食品类别限量仍未人工确认。
- 生产数据库未完成；当前仅完成本地数据库或开发环境数据库对接。
- 前端化妆品数据仍是原型数据，本轮未扩展，不能与食品添加剂主线混用为可信库。
- `README.md` 存在，`AGENTS.md` 不存在；本轮按 `readme.md`、`PROJECT_PLAN.md`、`CODEX_TASKS.md`、`COMMANDS.md` 和代码现状执行。
- OCR 和 AI 只能依赖可信数据底座继续推进；AI 不得作为原始数据来源。

## 剩余问题

- 需要人工确认官方来源清单和具体版本。
- 需要建立官方数据导入、逐条审核、变更记录和发布流程。
- 需要配置生产数据库、备份、监控和数据发布权限。
- 需要在可信数据底座完成后再恢复 OCR、AI、订阅、支付、上架和签名相关开发。
