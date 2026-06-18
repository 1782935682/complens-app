# AI Review — 2026-06-18

## 食品成分官方源缺口决策清单

### 本轮范围

本轮只处理食品成分官方材料管线的缺口决策报告。未新增、删除、提升任何成分数据；未修改小程序页面、现有查询 API、数据库 schema、生产配置或用户端业务行为。

### 代码审查结论

- PR #117 已合并到 `main`，官方材料管线已有 `failed_extract` / `failed_parse` 失败分层。
- 当前剩余缺口里，数字标签独立公告和 GB 28050-2025 糖醇能量规则都会影响数据来源等级或正式展示边界，不能只散落在普通报告里。
- 按 Agent 规则，需要把用户/人工确认事项集中记录到 `docs/decision-required.md`，并明确默认安全处理。
- 未找到可核验 S0 原文前，不能用第三方转载、搜索摘要或推测规则补入 verified 数据。

### 已完成

- `backend/scripts/ingredient-official-data-pipeline.ts`
  - 新增 `buildDecisionRequiredReport(snapshot)`。
  - `ingredient:report` 现在会生成 `docs/decision-required.md`。
  - 决策清单包含问题描述、涉及数据量、选项、Codex 推荐选项、影响、默认安全处理和需要用户回复的问题。
  - 糖醇能量规则只有在 staging 中没有 `nutrition_polyol_energy_rule` 时才列为待确认缺口。
- `backend/tests/ingredientKnowledge.test.ts`
  - 新增回归测试，确认数字标签公告缺口、GB 28050-2025 糖醇能量规则缺口、`不导入、不标 S0 verified` 和 `nutrition_polyol_energy_rules=0` 会进入决策清单。
- `docs/decision-required.md`
  - 新增 2 个待处理事项：数字标签独立公告官方原文缺失、GB 28050-2025 糖醇能量规则官方原文未定位。

### 数据边界

- 本轮没有新增 `official_sources`、`ingredient_master`、`ingredient_import_staging` 或营养规则数据。
- `nutrition_polyol_energy_rules` 继续保持 0，糖醇能量规则不参与计算、不展示为 GB 28050 官方规则。
- 数字标签独立公告未进入 S0；现有数字标签规则仍只来自 GB 7718-2025 正文和 CFSA/SPPT 解读材料，且保持 `pending_review`。

### 验证

已通过：

- `npm run ingredient:report`
- `npm --prefix backend test -- tests/ingredientKnowledge.test.ts`：13 tests passed。
- `npm --prefix backend run typecheck`
- `npm run lint`
- `npm run ingredient:validate -- --no-db`
- `npm run ingredient:validate`
- `git diff --check`

未运行完整前端 build/test：本轮未触达前端页面、路由、构建入口或用户端业务逻辑。
