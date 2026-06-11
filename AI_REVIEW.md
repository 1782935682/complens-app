# AI Review - Backend Ingredients API

## 任务目标

完成 `CODEX_TASKS.md` Batch 3-B 数据库 Schema 与成分 API，在 Batch 3-A 后端骨架上接入 PostgreSQL/Drizzle 成分库、迁移、seed 和只读查询接口。

## 修改摘要

- 新增 Drizzle 配置 `backend/drizzle.config.ts`。
- 新增 `ingredients` 主表，覆盖 `FoodAdditive` 字段；数组和对象字段使用 JSONB。
- 新增 `ingredient_sources` 来源关联表，并用外键关联 `ingredients.id`。
- 生成首个迁移文件 `backend/src/db/migrations/0000_thick_the_professor.sql`。
- 新增数据库 client，默认使用 `DATABASE_URL`，本地默认 PostgreSQL 宿主端口为 `15432`。
- 新增 `backend/scripts/seed.ts`，从前端 `src/data/foodAdditives.js` 读取 100 条食品添加剂数据并幂等 upsert。
- 新增成分服务和 API：
  - `GET /api/ingredients?q=&category=&riskLevel=&page=1&limit=20`
  - `GET /api/ingredients/categories`
  - `GET /api/ingredients/:id`
- 非法分页、limit 或 riskLevel 返回 400 JSON；缺失详情返回 404 JSON。
- 处理 PR Review 反馈：关键词搜索会转义 `%`、`_`、`\`，aliases 改为 JSONB 数组元素级 `ILIKE`，并新增 `pg_trgm` 文本搜索 GIN 索引与 aliases JSONB GIN 索引迁移。
- 处理 Codex Review 反馈：Docker Compose 中 API 容器显式覆盖 `DATABASE_URL=postgres://postgres:password@postgres:5432/compcheck`，保留宿主机命令使用 `localhost:15432`。
- 后端 Vitest 新增 ingredients API 测试。
- CI 增加 `backend/**` 触发，并执行后端 `npm ci`、typecheck、test、build。
- 更新 `COMMANDS.md`、`backend/README.md`、`CODEX_TASKS.md`、`PROJECT_PLAN.md` 和根项目静态断言。

## 修改文件

- `.github/workflows/ci.yml`
- `AI_REVIEW.md`
- `CODEX_TASKS.md`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `backend/.env.example`
- `backend/README.md`
- `backend/docker-compose.yml`
- `backend/drizzle.config.ts`
- `backend/package.json`
- `backend/src/app.ts`
- `backend/src/config.ts`
- `backend/src/db/client.ts`
- `backend/src/db/schema.ts`
- `backend/src/db/migrations/`
- `backend/src/routes/ingredients.ts`
- `backend/src/services/ingredientService.ts`
- `backend/scripts/seed.ts`
- `backend/tests/health.test.ts`
- `backend/tests/ingredients.test.ts`
- `backend/tsconfig.test.json`
- `scripts/test.mjs`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
cd backend && docker compose up -d postgres
cd backend && npm run db:migrate
cd backend && npm run db:seed
cd backend && docker compose up -d --build api
cd backend && docker compose exec api node -e "console.log(process.env.DATABASE_URL)"
curl "http://127.0.0.1:3000/api/ingredients?q=苯甲酸"
curl "http://127.0.0.1:3000/api/ingredients?q=E211"
curl "http://127.0.0.1:3000/api/ingredients/categories"
curl "http://127.0.0.1:3000/api/ingredients/sodium-benzoate"
curl -i "http://127.0.0.1:3000/api/ingredients/not-exist"
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，100 条食品添加剂记录校验成功。
- `npm run lint` 通过。
- `npm run test` 通过。
- `npm run build` 通过。
- `backend npm run typecheck` 通过。
- `backend npm test` 通过，2 个测试文件、9 个测试用例通过。
- `backend npm run build` 通过。
- `npx drizzle-kit generate` 生成 migration 成功。
- `backend npm run db:migrate` 通过，迁移应用成功。
- `backend npm run db:seed` 通过，输出 `Seeded 100 ingredients`。
- `docker compose up -d --build api` 通过，API 容器正常启动。
- API 容器内 `DATABASE_URL` 确认为 `postgres://postgres:password@postgres:5432/compcheck`。
- API curl 验收通过：
  - `q=苯甲酸` 返回 3 条匹配记录。
  - 容器化 API 请求 `q=E211` 返回 `sodium-benzoate`，确认可连通 compose PostgreSQL 服务。
  - `/api/ingredients/categories` 返回分类统计。
  - `/api/ingredients/sodium-benzoate` 返回苯甲酸钠详情。
  - `/api/ingredients/not-exist` 返回 404 `{"error":"not_found"}`。
- `git diff --check` 通过。

## 风险点

- 当前 API 仍是只读成分查询，没有账号、JWT、用户数据同步、限流或审计日志。
- `q` 关键词搜索包含 JSONB aliases 的文本匹配，适合当前 100 条种子数据；数据规模扩大后需要全文索引或专用搜索索引。
- 本地 PostgreSQL 默认映射到宿主 `15432`，避免和本机 5432 冲突；API 容器通过 compose 服务名 `postgres:5432` 访问同一数据库；生产环境需要单独配置托管数据库 `DATABASE_URL`。
- 当前 seed 读取前端数据源，后续数据后台或导入流程接入后需要替换为正式数据发布流程。

## 本次 git diff 摘要

- 后端从健康检查骨架推进到可迁移、可 seed、可查询的食品添加剂只读 API。
- PR CI 开始覆盖后端基础校验。
- 项目真实进度更新为 28%，下一个 Codex 批次为 Batch 3-C 账号与鉴权。
