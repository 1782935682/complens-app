# AI Review — 2026-06-14 GB2760 参考表修复、导入审计与 promote 准入

## 本轮目标

本轮范围包含以下工作：

- 修复 GB2760 官方参考表 B.2/B.3/C.1/C.2/C.3 英文与拉丁名的紧缩文本、跨列边界和已定位 OCR 分词问题。
- 同步重构任务与规划文档，让后续 Codex 按数据源准确性、GB2760 导入、OCR 主路径优先执行。
- 避免新增 `README.md` 与既有 `readme.md` 在大小写不敏感文件系统上冲突；产品入口已合并到既有 `readme.md`。
- 完成 Batch 1-A：新增 GB2760 导入审计骨架，记录官方来源文档、导入批次和错误明细，并提供只读查询接口。
- 完成 Batch 1-C：新增 `additive_usage_rules` 和 `promote:gb2760`，只允许人工签核且字段齐全的 staging 行进入正式规则表；成功 promote 会同步更新对应 `ingredients` 行的 GB2760 可见字段；空签核场景 0 promoted。
- 完成 Batch 1-D：新增 `validate:gb2760` 数据准入校验命令，校验正式规则表、staging 状态、JECFA 边界、最新导入批次和 CI 数据链路。

## 修改文件

| 文件 | 操作 | 摘要 |
|---|---|---|
| `scripts/generate-gb2760-reference-tables.mjs` | 更新 | 保留参考表英文/拉丁词间空格，区分天然香料、生物来源、加工助剂和合成香料化学括号；修复已定位的 B.2 N127、C.2 与 C.3 orphan/紧缩文本 |
| `src/data/gb2760OfficialReferenceTables.js` | 重新生成 | 保持 2800 行，修复 B.2/B.3/C.1/C.2/C.3 多处英文/拉丁显示边界，并确认可由官方 PDF 复现 |
| `scripts/validate-data.mjs` | 更新 | 新增 GB2760 参考表紧缩拉丁/英文文本回归校验 |
| `scripts/test.mjs` | 更新 | 增加 B.2/B.3/C.1/C.2/C.3 代表性分词与边界断言 |
| `backend/src/db/schema.ts` | 更新 | 新增 `source_documents` / `import_runs` / `import_errors` / `additive_usage_rules` 表定义、约束、索引和类型 |
| `backend/src/db/migrations/0012_breezy_franklin_richards.sql` | 新增 | 创建 GB2760 导入审计三表和索引 |
| `backend/src/db/migrations/0013_productive_crusher_hogan.sql` | 新增 | 创建 `additive_usage_rules` 表、`ingredient_id` 外键、`sourceStagingId` 唯一约束、索引和 `verified_regulation` check |
| `backend/src/db/migrations/meta/0012_snapshot.json`、`meta/0013_snapshot.json`、`meta/_journal.json` | 更新 | Drizzle 迁移快照同步 |
| `backend/src/services/gb2760Service.ts` | 新增 | 封装来源文档、导入批次、错误记录的 mapper/upsert/query 服务 |
| `backend/src/services/gb2760PromoteService.ts` | 新增 | 封装 promote 准入校验、`additive_usage_rules` upsert、`ingredients` 法规可见字段同步、`reviewStatus` 更新和空签核统计 |
| `backend/src/routes/gb2760.ts` | 新增 | 新增需登录鉴权的 `GET /api/gb2760/import-runs` 和 `GET /api/gb2760/import-runs/:id/errors` |
| `backend/src/app.ts` | 更新 | 挂载 GB2760 只读审计路由并支持测试注入 service |
| `backend/scripts/seed.ts` | 更新 | `db:seed` 先登记 GB2760 source document，再为 A.1 staging、全文页、参考表写入 import run；失败时写批次级 import error 并抛错 |
| `backend/scripts/promote-gb2760.ts` | 新增 | 后端 `promote:gb2760` CLI：运行 promote、写入 promote import run、记录已签核缺字段错误 |
| `backend/src/services/gb2760ValidateService.ts` | 新增 | 封装 `validate:gb2760` 准入校验：正式规则表、staging 状态、JECFA 边界、最新 import run |
| `backend/scripts/validate-gb2760.ts` | 新增 | 后端 `validate:gb2760` CLI：读取 DB、输出报告、违规退出非 0 |
| `backend/package.json`、`package.json` | 更新 | 新增 backend 与根目录 `validate:gb2760` 脚本 |
| `.github/workflows/ci.yml` | 更新 | CI 增加 Postgres service，执行 backend `db:migrate` / `db:seed` / `validate:gb2760` |
| `backend/tests/gb2760.test.ts` | 新增 | 覆盖导入审计路由、分页校验、404、source/run/error mapper，以及 promote / validate 准入 helper |
| `backend/tests/ingredients.test.ts` | 更新 | 验证 GB2760 mapper 入库时把 `needs_review` 规范为 `pending_review` |
| `CODEX_TASKS.md` | 重构 | 重排为项目主路径 / 自动化规则 / 人工阻塞规则 / 任务状态定义 / 阶段 1-11；新增 GB2760 staging→promote→pending_review→validate 流程（Batch 1-A/1-C/1-D/1-E）、OCR Provider 抽象重构（3-B）、产品体验阶段（UX-A~UX-E）；保留已完成项并标记完成；附录保留 GB2760 导入历史 |
| `PROJECT_PLAN.md` | 重写 | 产品定位、最高优先级、真实进度（M1-M11）、已完成、未完成、人工阻塞、下一步、7 天执行计划、阶段验收标准 |
| `readme.md` | 更新 | 合并产品入口、主路径、数据可信状态和快速开始，避免新增大小写冲突文件 |
| `AGENTS.md` | 新建 | 编码 Agent 强制规范：主路径、五条红线、执行流程、阻塞跳过、技术栈约束、验收、体验要求、输出格式 |
| `COMMANDS.md` | 更新 | 新增 GB2760 审计 API 验收，明确 `import:gb2760:status` 只有 API 已实现、CLI 仍为计划，不伪造 npm 命令 |
| `DATA_SOURCES.md` | 更新 | 硬性规则补充 staging/verified 区别、`pending_review` 不能当权威、持续扩充；新增导入审计层和当前审计计数 |
| `AI_REVIEW.md` | 覆盖 | 本文件 |

## 核心调整

1. GB2760 参考表生成结果仍为 2800 行：A.2=68、B.1=29、B.2=388、B.3=1504、C.1=37、C.2=80、C.3=66、D=23、E.1=318、F=287。
2. 参考表英文/拉丁文本不再大量保留紧缩形态，例如 `Litsea cubeba berry oil`、`Green tea tincture (Thea sinensis or Camellia sinensis)`、`carnauba wax`、`polyoxyethylene polyoxypropylene amine ether (BAPE)`、`Leaf alcohol (cis-3-Hexen-1-ol)`、`3-(Methylthio)butanal`、`Methyl(methylthio)acetate`、`Bacillus subtilis`。
3. 文档优先级重排为：数据源 → GB2760 导入 → 数据库 → OCR 主路径 → 解析 → 匹配 → 报告 → 档案 → 移动体验 → AI → 登录 → 订阅。
4. GB2760 导入流程明确为 staging 全量承接 → 高置信 promote 正式库 → 低置信 `pending_review` → 人工复核；已实现命令和计划命令在 `COMMANDS.md` 分开标注。
5. `README.md` 大小写冲突已规避，产品入口保留在已跟踪的 `readme.md`，`AGENTS.md` 链接同步指向 `readme.md`。
6. Batch 1-A 已落地：`source_documents` 1 条 GB2760 官方来源记录；最近一次 `db:seed` 写入三条稳定成功 `import_runs`（A.1 staging 2404、全文 264、参考表 2800）且 `import_errors` 为 0；查询接口只读且需要登录鉴权，不改变原有 `gb2760_official_*` 数据事实。
7. Batch 1-C 已落地：`additive_usage_rules` 表已创建；`promote:gb2760` 只处理 DB staging 中 `approved` / `promoted` 行，成功 promote 同步更新对应 `ingredients` 行的 GB2760 法规状态、来源和 `usageLimits`；空签核场景为 `approved=0`、`promoted=0`、`pending_review=2391`、`already_verified=13`，不会把历史 `verified` staging 行自动写入新规则表。
8. Batch 1-D 已落地：`validate:gb2760` 在当前空签核 DB 上通过，报告 `staging=2404`、`pending_review=2391`、`legacy_verified=13`、`additive_usage_rules=0`、`import_errors=0`，并已接入 CI。

## 与现有代码核对（防止伪造状态）

- 真实后端表：`ingredients`、`ingredient_sources`、`gb2760_official_records`、`gb2760_official_pages`、`gb2760_official_reference_rows`、`source_documents`、`import_runs`、`import_errors`、`additive_usage_rules`、`users`、`sessions`、`user_favorites`、`user_history`、`user_allergens`、`user_profile_ingredients`、`user_reports`、`product_archives`。
- 真实后端路由：`auth` / `health` / `ingredients` / `ocr` / `user` / `gb2760`。
- 真实前端命令：`dev` / `build` / `preview` / `lint` / `test` / `validate:data` / `validate:gb2760` / `cap:*`；后端：`dev` / `build` / `db:generate` / `db:migrate` / `db:seed` / `promote:gb2760` / `validate:gb2760` / `typecheck` / `test`。
- 用户要求的 `promote:gb2760` / `validate:gb2760` 已存在；`import:gb2760` 仍不存在；`import:gb2760:status` 的查询能力已作为需登录 API `GET /api/gb2760/import-runs` 落地，但 npm CLI 包装仍不存在。
- 已完成的 OCR/解析/报告/档案/登录/移动批次按真实页面与服务（`scanPage`/`ocrConfirmPage`/`ingredientMatchService`/`reportDetailPage`/`productArchiveService`/`authService` 等）标 ✅。

## 验证结果

本轮已执行：

```bash
npm run validate:data
npm run test
npm run lint
npm run build
git diff --check
node scripts/generate-gb2760-reference-tables.mjs /home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf /tmp/gb2760-reference-check.js
diff -q /tmp/gb2760-reference-check.js src/data/gb2760OfficialReferenceTables.js
cd backend && npm run db:generate
cd backend && npm run db:migrate
cd backend && npm run db:seed
cd backend && npm run promote:gb2760
npm run validate:gb2760
cd backend && npm run typecheck
cd backend && npm test
node -e "<query source_documents/import_runs/import_errors counts>"
node -e "<query additive_usage_rules/review_status/import_errors counts>"
codex review --uncommitted
```

`validate:data` 输出 112 条食品记录、2404 行 GB2760 staging、2800 行 GB2760 reference rows；`validate:gb2760` 输出 `staging=2404 pending_review=2391 approved=0 promoted=0 legacy_verified=13 mapped_candidate=0 additive_usage_rules=0 verified_regulation_ingredients=5 import_errors=0`；`lint`、`test`、`build`、`git diff --check` 和官方 PDF 重生成比对均通过。后端 `db:migrate` / `db:seed` / `promote:gb2760` / `validate:gb2760` / `typecheck` / `test` 通过，审计表查询结果为：`source_documents` 1 条、`import_runs` 三条 seed 成功记录 + 一条 promote 成功记录、`import_errors` 0；promote 空签核结果为 `additive_usage_rules=0`、DB staging `pending_review=2391`、历史 `verified=13`。本地 self-review 发现的 `README.md`/`readme.md` 大小写冲突、本文件范围说明不准确、C.2 加工助剂英文紧缩、B.2 N127 拉丁名紧缩、C.3 row 33 紧缩和植物学缩写缺空格问题已修复。

## 风险点与后续人工确认

- 源文件中的 `needs_review` 未做大规模 churn；后端入库 mapper 已统一为 DB `pending_review`。`db:seed` 只在行级法规字段指纹不变时保留既有人工 `mapped_candidate` / `approved` / `promoted` 状态；抽取内容变化会降回待复核，避免旧签核覆盖新限量或新原文证据。`validate:gb2760` 当前校验 DB 口径；源文件口径仍由 `validate:data` 校验。
- `additive_usage_rules` 已存在但当前为空；这代表尚无人工签核行进入正式规则表，不代表 GB2760 无使用规则。
- GB2760 高置信 staging 行的实际 promote verified 增量需要人工复核签核（`blocked_by_user`）；当前脚本已在空签核场景跑通。
- 真实 OCR / AI 接入、生产数据库、跨设备验收、上架仍为人工阻塞项。
