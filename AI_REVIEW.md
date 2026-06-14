# AI Review — 2026-06-14 GB2760 参考表修复、导入审计、promote 准入与 Batch 8-C 状态统一

## 本轮目标

本轮范围包含以下工作：

- 修复 GB2760 官方参考表 B.2/B.3/C.1/C.2/C.3 英文与拉丁名的紧缩文本、跨列边界和已定位 OCR 分词问题。
- 同步重构任务与规划文档，让后续 Codex 按数据源准确性、GB2760 导入、OCR 主路径优先执行。
- 避免新增 `README.md` 与既有 `readme.md` 在大小写不敏感文件系统上冲突；产品入口已合并到既有 `readme.md`。
- 完成 Batch 1-A：新增 GB2760 导入审计骨架，记录官方来源文档、导入批次和错误明细，并提供只读查询接口。
- 完成 Batch 1-C：新增 `additive_usage_rules` 和 `promote:gb2760`，只允许人工签核且字段齐全的 staging 行进入正式规则表；成功 promote 会同步更新对应 `ingredients` 行的 GB2760 可见字段；空签核场景 0 promoted。
- 完成 Batch 1-D：新增 `validate:gb2760` 数据准入校验命令，校验正式规则表、staging 状态、JECFA 边界、最新导入批次和 CI 数据链路。
- 完成 GB2760 复核闭环：新增自动映射脚本，人工批量签核剩余 staging 行后 promote 到正式规则表。
- 本地 review 后补强内部复核写接口：GB2760 staging 签核/映射写操作需要内部 reviewer allowlist，并写入签核人、签核时间和备注审计字段。
- 完成 Batch 3-B：OCR Provider 抽象命名闭环，支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`；mock 只作为明确标注的测试 provider，真实 provider 仍等待 Key 和适配。
- 按用户要求暂停内部控制台后续 UI，等产品页面设计统一推进时再继续。
- 完成 Batch 8-C：全页 loading / empty / error 状态复核，补齐搜索初始空态下一步入口、GB2760 复核页错误重试/空态出口、GB2760 参考表错误重试。

## 修改文件

| 文件 | 操作 | 摘要 |
|---|---|---|
| `scripts/generate-gb2760-reference-tables.mjs` | 更新 | 保留参考表英文/拉丁词间空格，区分天然香料、生物来源、加工助剂和合成香料化学括号；修复已定位的 B.2 N127、C.2 与 C.3 orphan/紧缩文本 |
| `src/data/gb2760OfficialReferenceTables.js` | 重新生成 | 保持 2800 行，修复 B.2/B.3/C.1/C.2/C.3 多处英文/拉丁显示边界，并确认可由官方 PDF 复现 |
| `scripts/validate-data.mjs` | 更新 | 新增 GB2760 参考表紧缩拉丁/英文文本回归校验 |
| `scripts/test.mjs` | 更新 | 增加 B.2/B.3/C.1/C.2/C.3 代表性分词与边界断言；补充搜索初始空态、GB2760 复核页错误/空态、GB2760 参考表错误态断言 |
| `backend/src/db/schema.ts` | 更新 | 新增 `source_documents` / `import_runs` / `import_errors` / `additive_usage_rules` 表定义、约束、索引和类型 |
| `backend/src/db/migrations/0012_breezy_franklin_richards.sql` | 新增 | 创建 GB2760 导入审计三表和索引 |
| `backend/src/db/migrations/0013_productive_crusher_hogan.sql` | 新增 | 创建 `additive_usage_rules` 表、`ingredient_id` 外键、`sourceStagingId` 唯一约束、索引和 `verified_regulation` check |
| `backend/src/db/migrations/0016_large_moonstone.sql` | 新增 | 为 `gb2760_official_records` 增加 `reviewedBy` / `reviewedByUserId` / `reviewedAt` / `reviewNote` 审计字段，并对既有已复核状态回填 legacy 审计说明 |
| `backend/src/db/migrations/meta/0012_snapshot.json`、`meta/0013_snapshot.json`、`meta/0016_snapshot.json`、`meta/_journal.json` | 更新 | Drizzle 迁移快照同步 |
| `backend/src/services/gb2760Service.ts` | 新增/更新 | 封装来源文档、导入批次、错误记录的 mapper/upsert/query 服务；staging 签核、批量签核和映射修正写入 reviewer 审计字段 |
| `backend/src/services/gb2760PromoteService.ts` | 新增 | 封装 promote 准入校验、`additive_usage_rules` upsert、`ingredients` 法规可见字段同步、`reviewStatus` 更新和空签核统计 |
| `backend/src/routes/gb2760.ts` | 新增/更新 | 新增需登录鉴权的 GB2760 查询接口；签核、批量签核和映射写接口额外要求 `GB2760_INTERNAL_REVIEWERS` allowlist |
| `backend/src/app.ts`、`backend/src/config.ts` | 更新 | 挂载 GB2760 路由，支持测试注入 service，并读取内部 reviewer allowlist |
| `backend/scripts/seed.ts` | 更新 | `db:seed` 先登记 GB2760 source document，再为 A.1 staging、全文页、参考表写入 import run；失败时写批次级 import error 并抛错 |
| `backend/scripts/promote-gb2760.ts` | 新增 | 后端 `promote:gb2760` CLI：运行 promote、写入 promote import run、记录已签核缺字段错误 |
| `backend/scripts/auto-map-gb2760-ingredients.ts` | 新增/更新 | 从未映射 GB2760 staging 行自动创建缺失成分身份并回填 `ingredientId`，状态置为 `mapped_candidate`，不自动签核；生成成分使用规范 `food-additive` kind，并幂等修复旧值 |
| `backend/src/services/gb2760ValidateService.ts` | 新增 | 封装 `validate:gb2760` 准入校验：正式规则表、staging 状态、JECFA 边界、最新 import run |
| `backend/scripts/validate-gb2760.ts` | 新增 | 后端 `validate:gb2760` CLI：读取 DB、输出报告、违规退出非 0 |
| `backend/package.json`、`package.json` | 更新 | 新增 backend 与根目录 `validate:gb2760`、`map:gb2760`、`promote:gb2760` 脚本 |
| `.github/workflows/ci.yml` | 更新 | CI 增加 Postgres service，执行 backend `db:migrate` / `db:seed` / `validate:gb2760` |
| `backend/tests/gb2760.test.ts` | 新增/更新 | 覆盖导入审计路由、分页校验、404、source/run/error mapper、内部 reviewer 403、签核审计参数，以及 promote / validate 准入 helper |
| `backend/tests/ingredients.test.ts` | 更新 | 验证 GB2760 mapper 入库时把 `needs_review` 规范为 `pending_review` |
| `CODEX_TASKS.md` | 重构/更新 | 重排为项目主路径 / 自动化规则 / 人工阻塞规则 / 任务状态定义 / 阶段 1-11；新增 GB2760 staging→promote→pending_review→validate 流程（Batch 1-A/1-C/1-D/1-E）、OCR Provider 抽象重构（3-B）、产品体验阶段（UX-A~UX-E）；保留已完成项并标记完成；本轮标记 Batch 8-C 完成并记录下一步需确认 5-B/UX-C 边界 |
| `PROJECT_PLAN.md` | 重写/更新 | 产品定位、最高优先级、真实进度（M1-M11）、已完成、未完成、人工阻塞、下一步、7 天执行计划、阶段验收标准；本轮同步 Batch 8-C 完成、下一步人工确认边界 |
| `readme.md` | 更新 | 合并产品入口、主路径、数据可信状态和快速开始，避免新增大小写冲突文件 |
| `AGENTS.md` | 新建 | 编码 Agent 强制规范：主路径、五条红线、执行流程、阻塞跳过、技术栈约束、验收、体验要求、输出格式 |
| `COMMANDS.md` | 更新 | 新增 GB2760 审计 API 验收，明确 `import:gb2760:status` 只有 API 已实现、CLI 仍为计划，不伪造 npm 命令 |
| `DATA_SOURCES.md` | 更新 | 硬性规则补充 staging/verified 区别、`pending_review` 不能当权威、持续扩充；新增导入审计层和当前审计计数 |
| `src/pages/gb2760ReviewPage.js`、`src/services/gb2760ApiService.js`、`src/router/router.js`、`src/main.js`、`src/styles.css` | 新增/更新 | 新增内部 GB2760 复核页、每页条数、ready 筛选、单条/批量签核和映射 API 客户端 |
| `src/pages/searchPage.js`、`src/pages/dataPage.js`、`src/pages/gb2760ReviewPage.js`、`src/main.js` | 更新 | Batch 8-C 状态统一：搜索初始空态提供拍照/粘贴入口；GB2760 复核错误态增加重试、空态增加重置为待复核行和返回数据页；GB2760 参考表错误态增加重试；retry 事件改为委托绑定以覆盖局部渲染 |
| `backend/src/services/ocrProviders/index.ts` | 新增 | OCR provider 命名层，规范 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，并提供 mock OCR 结果 |
| `backend/src/routes/ocr.ts`、`backend/tests/ocr.test.ts`、`src/services/ocrService.js`、`scripts/test.mjs` | 更新 | 后端按 provider 区分 mock / 真实 pending / 未配置 Key；前端校验 provider 名称；测试覆盖 mock 与 pending |
| `AI_REVIEW.md` | 覆盖 | 本文件 |

## 核心调整

1. GB2760 参考表生成结果仍为 2800 行：A.2=68、B.1=29、B.2=388、B.3=1504、C.1=37、C.2=80、C.3=66、D=23、E.1=318、F=287。
2. 参考表英文/拉丁文本不再大量保留紧缩形态，例如 `Litsea cubeba berry oil`、`Green tea tincture (Thea sinensis or Camellia sinensis)`、`carnauba wax`、`polyoxyethylene polyoxypropylene amine ether (BAPE)`、`Leaf alcohol (cis-3-Hexen-1-ol)`、`3-(Methylthio)butanal`、`Methyl(methylthio)acetate`、`Bacillus subtilis`。
3. 文档优先级重排为：数据源 → GB2760 导入 → 数据库 → OCR 主路径 → 解析 → 匹配 → 报告 → 档案 → 移动体验 → AI → 登录 → 订阅。
4. GB2760 导入流程明确为 staging 全量承接 → 高置信 promote 正式库 → 低置信 `pending_review` → 人工复核；已实现命令和计划命令在 `COMMANDS.md` 分开标注。
5. `README.md` 大小写冲突已规避，产品入口保留在已跟踪的 `readme.md`，`AGENTS.md` 链接同步指向 `readme.md`。
6. Batch 1-A 已落地：`source_documents` 1 条 GB2760 官方来源记录；最近一次 `db:seed` 写入三条稳定成功 `import_runs`（A.1 staging 2404、全文 264、参考表 2800）且 `import_errors` 为 0；查询接口只读且需要登录鉴权，不改变原有 `gb2760_official_*` 数据事实。
7. Batch 1-C 已落地：`additive_usage_rules` 表已创建；`promote:gb2760` 只处理 DB staging 中 `approved` / `promoted` 行，成功 promote 同步更新对应 `ingredients` 行的 GB2760 法规状态、来源和 `usageLimits`；空签核场景已验证为 0 promoted，不会把历史 `verified` staging 行自动写入新规则表。
8. Batch 1-D 已落地：`validate:gb2760` 当前 DB 通过，报告 `staging=2404`、`pending_review=0`、`promoted=2391`、`legacy_verified=13`、`additive_usage_rules=2391`、`verified_regulation_ingredients=308`、`import_errors=0`，并已接入 CI。
9. GB2760 复核闭环已落地：`map:gb2760` 自动创建 217 个缺失成分身份并回填 1447 条 staging 映射；人工在复核页批量签核后，`promote:gb2760` 成功 promote 2391 条正式规则，失败 0。
10. 本地 review 后已补强三项风险：普通登录用户不能调用 GB2760 写接口、签核/映射写入 reviewer 审计字段、自动生成 ingredient kind 统一为 `food-additive`。
11. OCR 抽象层已补齐 provider 命名：`OCR_PROVIDER=mock` 可用于本地固定响应测试，`aliyun` / `paddleocr` / `rapidocr` 在真实适配前继续返回 pending，不会伪造真实 OCR。
12. Batch 8-C 已补齐全页状态出口：搜索初始空态不再是单行空提示，GB2760 复核和参考表错误态都可重试；retry 事件使用委托绑定，覆盖参考表局部渲染后的错误态按钮；UX-D 的共享组件抽取和 5-B/UX-C 可信表达统一不在本批次冒充完成。

## 与现有代码核对（防止伪造状态）

- 真实后端表：`ingredients`、`ingredient_sources`、`gb2760_official_records`、`gb2760_official_pages`、`gb2760_official_reference_rows`、`source_documents`、`import_runs`、`import_errors`、`additive_usage_rules`、`users`、`sessions`、`user_favorites`、`user_history`、`user_allergens`、`user_profile_ingredients`、`user_reports`、`product_archives`。
- 真实后端路由：`auth` / `health` / `ingredients` / `ocr` / `user` / `gb2760`。
- 真实前端命令：`dev` / `build` / `preview` / `lint` / `test` / `validate:data` / `validate:gb2760` / `map:gb2760` / `promote:gb2760` / `cap:*`；后端：`dev` / `build` / `db:generate` / `db:migrate` / `db:seed` / `map:gb2760` / `promote:gb2760` / `validate:gb2760` / `typecheck` / `test`。
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
npm run map:gb2760
npm run promote:gb2760
cd backend && npm run typecheck
cd backend && npm test
npm --prefix backend run test -- ocr.test.ts
npm --prefix backend run typecheck
node --input-type=module -e "<front OCR provider contract check>"
node -e "<query source_documents/import_runs/import_errors counts>"
node -e "<query additive_usage_rules/review_status/import_errors counts>"
codex review --uncommitted
```

`validate:data` 输出 112 条源文件食品记录、2404 行源文件 GB2760 staging、2800 行 GB2760 reference rows；`validate:gb2760` 当前 DB 输出 `staging=2404 pending_review=0 approved=0 promoted=2391 legacy_verified=13 mapped_candidate=0 additive_usage_rules=2391 verified_regulation_ingredients=308 import_errors=0`；`lint`、`build`、后端 `typecheck`、后端 `gb2760.test.ts` 通过。后端 `map:gb2760` 创建 217 个缺失成分身份并回填 1447 条 staging 映射；人工批量签核后 `promote:gb2760` 输出 `status=succeeded scanned=2404 approved=2391 promoted=2391 failed=0 pending_review=0 already_verified=13`。

Batch 8-C 本次增量验证：`npm test`、`npm run lint`、`npm run build`、`git diff --check` 通过；未重复运行完整数据校验，因本批次只改前端状态渲染、测试和任务文档，不改数据生成/入库口径。

## 风险点与后续人工确认

- 源文件中的 `needs_review` 未做大规模 churn；后端入库 mapper 已统一为 DB `pending_review`。`db:seed` 只在行级法规字段指纹不变时保留既有人工 `mapped_candidate` / `approved` / `promoted` 状态；抽取内容变化会降回待复核，避免旧签核覆盖新限量或新原文证据。`validate:gb2760` 当前校验 DB 口径；源文件口径仍由 `validate:data` 校验。
- `validate:data` 的 GB2760 staging 计数来自源文件静态抽取口径，仍会显示源文件 `needs_review`；当前发布准入状态以 DB 口径 `validate:gb2760` 为准。
- `additive_usage_rules` 当前已有 2391 行正式规则；后续若重新 seed 且行级法规字段指纹不变，会保留 DB 中的人工状态。
- GB2760 后续新增或变更 staging 行仍需要人工复核签核；本轮 2391 条 A.1 staging 已完成。
- 真实 OCR / AI 接入、生产数据库、跨设备验收、上架仍为人工阻塞项。
- Batch 5-B / UX-C 统一可信表达是下一个需要明确边界的候选；它不需要外部账号，但会影响结果页、详情页、搜索页的可信标签与文案，需按用户要求确认是否纳入产品页面设计暂缓范围。
