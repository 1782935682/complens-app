# AI Review — 2026-06-18

## 食品成分知识库数据补齐

### 本轮范围

本轮只处理数据层：官方材料盘点、来源 manifest、PDF 文本抽取、staging、数据库迁移、导入、校验、覆盖报告和命令入口。未修改小程序页面、结果页、扫码、OCR 拍照入口、现有 API 返回结构或生产部署配置。

### 原项目审查结论

- 后端技术栈：Node.js 20 + TypeScript + Hono + Drizzle + PostgreSQL。
- ORM/迁移：Drizzle Kit，schema 位于 `backend/src/db/schema.ts`，迁移位于 `backend/src/db/migrations/`。
- 本地数据库：Docker Compose PostgreSQL `compcheck`，宿主机端口 `15432`；本轮确认并只写入本地开发库。
- 已有数据结构：`ingredients`、`ingredient_sources`、`gb2760_official_records`、`gb2760_official_pages`、`gb2760_official_reference_rows`、`source_documents`、`import_runs`、`import_errors`、`additive_usage_rules`。
- 现有添加剂查询和 OCR 匹配仍依赖旧 `ingredients` / `aliases` / `gbCode` 字段，本轮采用旁路知识库表，不替换旧 API。

### 已完成

- 新增/扩展迁移：
  - `0018_narrow_zombie.sql`：`official_sources`、`ingredient_master`、`ingredient_aliases`、`ingredient_source_relations`、`ingredient_regulatory_rules`、`ingredient_relations`、`ingredient_type_tags`。
  - `0019_ingredient_source_coverage.sql`：来源扩展字段、`ingredient_import_staging`、`nutrition_fortifier_rules`、`allergen_categories`、`ingredient_allergen_relations`、`nutrients`、`nutrition_aliases`、`nutrition_reference_values`、`nutrition_claim_rules`、`microorganism_strains`、`novel_food_ingredient_rules`、`food_medicine_rules`。
- 新增统一管道：`backend/scripts/ingredient-official-data-pipeline.ts`。
- 固定目录已生成：
  - `data/official_sources/manifests/sources.json`
  - `data/official_sources/manifests/sources.yaml`
  - `data/official_sources/extracted/*.txt`
  - `data/official_sources/staging/ingredient-official-staging.json`
  - `data/official_sources/checksums/sha256sums.txt`
  - `data/official_sources/failed/extract-failures.json`
- 新增/更新命令：
  - `ingredient:inventory`
  - `ingredient:fetch`
  - `ingredient:extract`
  - `ingredient:import-staging`
  - `ingredient:promote`
  - `ingredient:import`
  - `ingredient:validate`
  - `ingredient:report`
  - `ingredient:update-all`
- 生成报告：
  - `docs/source-materials-manifest.json`
  - `docs/source-materials-download-report.md`
  - `docs/source-materials-missing-official.md`
  - `docs/official-source-inventory.md`
  - `docs/official-food-data-coverage.md`
  - `docs/official-data-conflicts.md`
  - `docs/manual-download-required.md`
  - `docs/unverified-existing-data.md`
  - `docs/data-quality-report.md`
- 修复本地数据审核入口：
  - 新增 `scripts/review-server.mjs`，用于服务 `docs/review-index.html` 并接收本地审核提交。
  - `docs/review-index.html` 的“审核通过选中项 / 退回选中项 / 选中项需人工复核”现在会提交到 `/api/review-results`。
  - 审核提交只写入 `docs/review-results.json` / `docs/review-results.md`，不直接 promote 数据库，不把 `pending_review` 自动伪装为 verified。
  - 用户已提交 7/7 报告审核通过，本轮报告级 review 已记录到 `docs/review-completion.md`。

### 实际导入结果

- 扫描 `docs/source-materials/` 本地官方材料 14 个，未扫描 `docs/` 根目录。
- 本轮新增保存的白名单来源文件：
  - GB 7718-2025 官方 PDF：`1742974306979.pdf`
  - GB 28050-2025 官方 PDF：`1742974382329.pdf`
  - GB 7718-2011 官方 PDF：`1401948086918.pdf`
  - GB 28050-2011 官方 PDF：`GB_28050-2011_预包装食品营养标签通则.pdf`
  - GB 7718-2025 解读 HTML：`cfsa-gb7718-2025-qa.html`
  - GB 28050-2025 解读 HTML：`cfsa-gb28050-2025-qa.html`
  - 2025 年第 2 号公告 HTML：`cfsa-2025-no2-food-safety-standards-notice.html`
- source-materials staging：462 条。
  - 新食品原料：95 条。
  - 食品添加剂新品种：14 条。
  - 营养强化剂规则：116 条。
  - 食药物质：13 条。
  - 食品菌种：40 条。
  - GB 7718/GB 28050 标签规则：16 条。
  - GB 28050 营养标签规则：7 条。
  - NRV：32 条。
  - 营养声称规则：15 条。
  - 致敏物质候选和标示规则：90 条。
  - 数字标签规则：12 条。
  - 官方解读材料：11 条。
  - 官方公告：1 条。
- 数据库 `ingredient_master`：3041 条。
  - `food_additive`：2311。
  - `nutrition_fortifier`：21。
  - `novel_food_ingredient`：95。
  - `food_medicine_substance`：13。
  - `food_microorganism`：121。
  - `ordinary_ingredient`：480。
- S2 普通配料种子：479 条，全部 `pending_review`。
- `ingredient_aliases`：8735。
- `ingredient_source_relations`：5631。
- `ingredient_regulatory_rules`：2587。
- `additive_usage_rules`：2391。
- `nutrition_fortifier_rules`：116。
- `nutrition_reference_values`：32。
- `nutrition_claim_rules`：15。
- `official_sources`：15。
- `nutrients`：46。
- `ingredient_import_staging`：462。
- `import_errors`：0。

### 质量与边界

- GB 2760 已有 promote 数据保持 current；新增 GB 14880、三新食品、食药物质、菌种、GB 7718/GB 28050 标签营养规则、解读材料和公告抽取全部保持 `pending_review`，未伪装为 verified。
- NRV 和比较声称虽然写入 `nutrition_reference_values` / `nutrition_claim_rules`，仍为 `pending_review`，不能作为已验证法规结论展示。
- 本轮只额外导入 S2 人工整理 OCR 高频普通配料种子；未使用搜索摘要或第三方转载文件替代官方附件，S2 数据未标记为 S0 或 verified。
- 婴幼儿食品菌种 PDF 无可用文本层；本轮已保存 RapidOCR 原始 JSON 并抽取 14 条候选进入 staging/pending_review，仍需人工核对扫描件，不提升为 verified。
- GB 28050-2011 官方 PDF 已从 CFSA/SPPT 官方附件下载并进入 manifest/official_sources；此前的超时片段保留在 `_invalid/`，未进入有效扫描。
- 独立数字标签公告官方页面未自动定位，已进入 `docs/source-materials-missing-official.md`。
- GB 28050-2025 中“糖醇能量规则”未自动定位到可引用原文片段，未导入该专项规则。
- 普通食品原料没有官方全量目录，本轮不声称完整覆盖。
- 别名冲突已标记为 `alias_confidence=ambiguous` / `match_policy=candidate_only`；当前正式匹配冲突数为 0，复核明细见 `docs/alias-conflict-review.md`。

### 验证

已通过：

- `npm run ingredient:extract`
- `npm run ingredient:import`
- `npm run ingredient:ordinary-seed`
- `npm run ingredient:validate`
- `npm run ingredient:coverage`
- `npm run ingredient:report`
- `npm run ingredient:update-all`
- `node --check scripts/review-server.mjs`
- `npm run lint`
- `npm --prefix backend run typecheck`
- `npm --prefix backend test`
- `git diff --check`

注意：本轮没有修改 UI、前端页面、生产部署或正式查询接口；第一次数据库连接在沙箱内因 `127.0.0.1:15432 EPERM` 失败，已按规则用授权命令重跑成功。
