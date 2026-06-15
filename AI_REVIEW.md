# AI Review — 2026-06-15 Batch CONSUMER-LABEL-A/B/D backend labels + nutrition + reports API

## 本轮目标

PR 合并后继续原计划，进入消费者主路径后端化：先实现 `POST /api/labels/classify`，再补齐 `POST /api/nutrition/parse`，并补齐 `POST /api/reports/label`，减少 `user-uniapp` 本地 mock-only 依赖。

本轮不实现 `POST /api/labels/scan`，因为当前后端还没有独立 scan sessions 表、图片引用持久化和多图扫描会话模型；避免为了接口名创建空接口。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `backend/src/app.ts`
- `backend/src/routes/ocr.ts`
- `backend/src/routes/ingredients.ts`
- `backend/tests/ocr.test.ts`
- `user-uniapp/src/services/api/labels.ts`
- `user-uniapp/src/utils/labelClassifier.ts`
- `user-uniapp/src/pages/label-type/index.vue`
- `user-uniapp/src/pages/confirm-text/index.vue`
- `backend/src/routes/nutrition.ts`
- `backend/src/services/nutritionService.ts`
- `backend/tests/nutrition.test.ts`
- `user-uniapp/src/services/api/labels.ts`
- `user-uniapp/src/pages/nutrition/index.vue`
- `user-uniapp/src/utils/reportBuilder.ts`

## 已确认现状

1. 后端已有 Hono 单后端和 `/api/ocr`、`/api/ingredients/*` 路由模式，可直接新增 `labels` 路由。
2. `user-uniapp` 之前的 `classifyLabelWithAdapter` 只做本地规则判断，并明确写着后端分类 API 尚未实现。
3. 前端类型原先没有 `barcode_or_product`，但 API 契约已把它列为标签类型之一；需要补齐类型和前端补充信息流。
4. `labels/scan` 需要后端扫描会话和图片引用设计，当前不适合在本轮空实现。

## 已完成修改

1. `backend/src/services/labelService.ts`：
   - 新增标签分类服务，支持 `ingredient_list`、`nutrition_facts`、`front_claims`、`barcode_or_product`、`unknown_label`。
   - 支持用户手动选择覆盖 `userSelectedType`。
   - 低置信或无文本时返回 `unknown_label` 和 `requiresUserSelection: true`。
2. `backend/src/routes/labels.ts`：
   - 新增 `POST /api/labels/classify`。
   - 允许匿名调用。
   - 校验 JSON body、`text`、`imageAssetId` 和 `userSelectedType`。
3. `backend/src/app.ts`：
   - 挂载 labels 路由到 `/api`。
4. `backend/tests/labels.test.ts`：
   - 覆盖匿名调用、配料表判断、营养成分表判断、低证据文本、用户手动选择和非法标签类型。
5. `user-uniapp`：
   - 标签 adapter 改为后端优先、本地规则降级。
   - 本地降级时显示“后端标签分类暂不可用”，不再写“后端未实现 / mock-only”。
   - 扩展 `barcode_or_product` 标签类型、选择项、确认页流转和报告补充信息。
6. 文档同步：
   - `API_CONTRACT.md` 将 `POST /api/labels/classify` 与 `POST /api/nutrition/parse` 标为已实现，`POST /api/labels/scan` 继续计划。
   - `CODEX_TASKS.md` 更新 CONSUMER-LABEL-A 与 CONSUMER-LABEL-B 状态。
   - `PROJECT_PLAN.md` 更新整体进度、已完成、未完成、下一步和最近修改记录。
7. `POST /api/nutrition/parse` 新增与对接：
   - `backend/src/routes/nutrition.ts` + `backend/src/services/nutritionService.ts`：新增营养字段解析。
   - `backend/tests/nutrition.test.ts`：新增后端测试。
   - `user-uniapp/src/services/api/labels.ts` 新增 `parseNutritionWithAdapter`。
   - `user-uniapp/src/pages/nutrition/index.vue`：后端优先解析，失败回退本地。
8. `POST /api/reports/label` 新增与对接：
   - `backend/src/routes/reports.ts` + `backend/src/services/reportService.ts`：新增报告聚合 API（配料匹配、营养、关注项与来源凭据）。
   - `backend/tests/reports.test.ts`：新增后端测试（显式匹配、自动匹配回退、参数校验、数据完整性边界）。
   - `backend/src/app.ts`：挂载 reports 路由到 `/api`。
   - `user-uniapp/src/services/api/labels.ts` 新增 `buildLabelReportWithAdapter`。
   - `user-uniapp/src/pages/match/index.vue`：生成报告改为后端优先，后端不可用自动回退本地。

## 验证计划

- `cd backend && npm run test -- labels.test.ts`
- `cd backend && npm run test -- nutrition.test.ts`
- `cd backend && npm run test -- reports.test.ts`
- `cd backend && npm run typecheck`
- `cd user-uniapp && npm run typecheck`
- `cd user-uniapp && npm run lint`
- `git diff --check`

## 剩余风险

1. `POST /api/labels/scan` 尚未实现；需要后续扫描会话表、图片引用和多图状态模型。
2. `POST /api/labels/scan` 仍未实现；需要扫描会话表、图片引用持久化、会话级失败状态与重试策略设计。
3. 标签分类当前是规则式判断，不是 ML 模型；它只做辅助判断，低置信必须继续让用户手动选择。
4. 微信小程序/App 真机 API base、请求域名和图片权限仍待后续验收。
