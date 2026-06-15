# AI Review — 2026-06-15 Batch ADMIN-B data governance MVP

## 本轮目标

PR #95 合并后继续当前最早未完成且未阻塞的 Batch：ADMIN-B 数据治理后台 MVP 页面/API 计划。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不新增后端接口，不把任何后台计划页面写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `backend/src/routes/gb2760.ts`
- `backend/src/routes/ingredients.ts`
- `backend/src/services/gb2760Service.ts`
- `backend/src/services/ingredientService.ts`

## 已确认现状

1. `admin-web/` 仍未创建，后台数据治理 MVP 仍是页面/API 计划。
2. GB2760 已有登录态内部接口：导入批次、错误明细、reference rows、staging rows、单条/批量复核和映射。
3. Ingredients 已有只读查询接口：列表、搜索、分类、详情、详情 + GB2760 evidence。
4. `source_documents`、`additive_usage_rules` 等表已存在，但没有独立后台管理接口；后台不得直连数据库。
5. `pending_review` / `mapped_candidate` / `unverified` 不能展示为官方结论；复核/映射写操作必须保留 reviewer 审计。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：新增 ADMIN-B 数据治理 MVP 页面/API 矩阵，覆盖数据源、GB2760 导入、staging 复核、食品添加剂、食品分类、使用规则、普通配料词库、营养字段规则、包装卖点词库。
2. `API_CONTRACT.md`：新增数据治理后台 MVP 复用矩阵，明确第一版复用 `/api/gb2760/*` 与 `/api/ingredients*`，并标注后续 `/api/admin/*` 缺口。
3. `PAGE_STRUCTURE.md`：为数据治理页面登记目标路由、第一版数据入口和状态边界。
4. `CODEX_TASKS.md`：将 ADMIN-B 标记为已完成，并把下一步切到 ADMIN-C / ADMIN-D。
5. `PROJECT_PLAN.md`：更新整体进度、M13 后台管理系统进度、下一步计划和最近修改记录。

## 验证计划

- `git diff --check`
- 本地自审：检查是否误把计划页面/API 写成已实现，是否重复造现有 GB2760/ingredients 查询接口，是否把待复核状态写成官方结论。

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. 数据治理 MVP 仍缺 `admin-web/` 真实页面，后续实现时需要补 TDesign 工作台壳、三态和权限提示。
2. 使用规则、数据源、食品分类目前缺独立后台聚合 API；第一版只能复用现有查询或保持只读计划。
3. 成分/规则编辑、分类编辑、普通配料词库维护必须等权限和审计模型明确后再实现。
