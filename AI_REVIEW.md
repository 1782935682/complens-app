# AI Review — 2026-06-18

## pending-review 受控正式化

### 本轮范围

本轮接在本地 review 页 7/7 报告通过之后，只处理食品成分知识库扩展层的受控正式化入口和本地开发 DB 数据提升。未修改旧 `ingredients` / `additive_usage_rules` 用户端展示表，未改变现有 `/api/ingredients` 返回结构，未把 S2、OCR 辅助、缺官方页面定位或营养/标签/过敏原待复核规则标记为正式结论。

### 代码审查结论

- `docs/review-results.json` 显示 7 个报告全部审核通过，但该 review 只代表报告级确认，不能自动把所有 `pending_review` 数据改成 verified。
- 安全正式化必须继续按来源等级、来源校验状态、证据字段、数据类型和缺口决策分层执行。
- 本轮只允许提升 S0 中国官方来源中 `license=government_public_document`、`verification_status=verified_by_local_content_and_checksum`、SHA-256/本地文件/证据字段完整、且非 OCR 辅助的记录。
- `ordinary_ingredient` S2 种子、婴幼儿菌种 OCR 辅助抽取、三新/食药物质/菌种目录中官方页面 URL 仍待补齐的来源、营养声称阈值、数字标签和过敏原规则继续保留 `pending_review`。

### 已完成

- `backend/scripts/promote-reviewed-ingredient-data.ts`
  - 新增 `ingredient:promote-reviewed` 数据正式化脚本。
  - 运行前校验 `docs/review-results.json` 必须全部通过，并要求包含 pending-review 治理、数据质量和缺失官方源报告。
  - 仅连接本地开发 DB；生产库需要显式人工确认 `ALLOW_NON_LOCAL_INGREDIENT_IMPORT=1`。
  - 支持 `--dry-run`，dry-run 回滚 DB 事务但仍输出报告。
  - 正式执行后生成 `docs/pending-review-promote-report.md`。
- `package.json` / `backend/package.json`
  - 新增根命令和后端命令：`npm run ingredient:promote-reviewed`。
- 本地 DB 正式化结果
  - `ingredient_master` 提升 2026 条：`food_additive=2005`、`nutrition_fortifier=21`。
  - `ingredient_source_relations.status=current` 提升 2126 条。
  - `ingredient_regulatory_rules.status=current` 提升 133 条。
  - `nutrition_fortifier_rules.status=current` 提升 116 条。
  - `ingredient_import_staging.review_status=approved` 提升 116 条 `nutrition_fortifier_rule`。
  - 剩余 `pending_review ingredient=715`、`pending_review staging=346`。
- 文档同步
  - 更新 `COMMANDS.md`、`PROJECT_PLAN.md`、`DATA_SOURCES.md`、`CODEX_TASKS.md`。
  - 刷新 `docs/official-food-data-coverage.md`、`docs/data-quality-report.md` 等覆盖/质量报告。

### 数据边界

- 当前 DB 扩展层 `verified_regulation=2311`，`pending_review=715`，`unverified=10`，`import_errors=0`。
- 本轮未把普通配料 S2 种子标为官方数据。
- 本轮未把 RapidOCR 辅助抽取的 14 条婴幼儿菌种候选标为正式数据。
- 本轮未把数字标签独立公告缺口或 GB 28050-2025 糖醇能量规则缺口补成 verified。
- 本轮未把营养声称阈值、过敏原规则或数字标签规则切为正式展示结论。

### 验证

已通过：

- `npm --prefix backend run typecheck`
- `npm run ingredient:promote-reviewed -- --dry-run`
- `npm run ingredient:promote-reviewed`
- `npm run ingredient:validate`
- `npm run ingredient:coverage`
- `npm run lint`
- `git diff --check`
- `npm --prefix backend test -- tests/ingredientKnowledge.test.ts`：13 tests passed。

未运行完整前端 build/test：本轮未触达前端页面、路由、构建入口或用户端业务逻辑。
