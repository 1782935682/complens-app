# AI Review — 2026-06-18

## 官方目录 pending-review 受控正式化

### 本轮范围

本轮接在 PR #119 合并后的 `main` 上，继续处理食品成分知识库扩展层。范围限定为补齐已保存官方目录文件的 NHC 官方公告页/附件 URL，并把已通过来源门槛、非 OCR、证据字段完整的官方目录记录受控提升。

未修改旧 `ingredients` / `additive_usage_rules` 用户端展示表，未改变现有 `/api/ingredients` 返回结构，未把 S2 普通配料、OCR 辅助菌种、数字标签独立公告本地原文未保存项、营养声称阈值、数字标签规则或过敏原规则标记为正式结论。

### 代码审查结论

- `ingredient:promote-reviewed` 仍必须先校验 `docs/review-results.json` 全部通过。
- 合格来源继续限定为 `S0`、`government_public_document`、`verified_by_local_content_and_checksum`、本地文件路径和 SHA-256 存在、非 OCR、置信度不低于 0.95。
- 官方目录专用表只允许 `source_type=official_catalog` 且非 OCR 来源进入提升路径，避免把 GB 2760 C.3 酶制剂来源/供体微生物直接当作可食用菌种目录结论。
- `可用于婴幼儿食品的菌种名单.pdf` 仍因无文本层且依赖 RapidOCR 辅助抽取，必须保留 `pending_review`。

### 已完成

- `backend/scripts/ingredient-official-data-pipeline.ts`
  - 补齐三新食品目录、党参等 9 种食药物质目录、地黄等 4 种食药物质目录、可用于食品的菌种名单、可用于婴幼儿食品的菌种名单的 NHC 官方公告页和附件 URL。
  - 数字标签公告已定位 NHC 官方页面，但本地 `curl` 返回 WAF/412，继续写入 `docs/decision-required.md`，不使用第三方转载替代。
  - 覆盖报告模板更新，避免把已 current 的目录数据继续描述成全部 pending。
- `backend/scripts/promote-reviewed-ingredient-data.ts`
  - 官方目录提升扩展到 `novel_food_ingredient_rules`、`food_medicine_rules`、`microorganism_strains`。
  - `ingredient_import_staging` 现在可按合格官方目录来源标记 `food_additive_new_variety`、`novel_food_ingredient`、`food_medicine_substance`、`food_microorganism` 为 `approved`。
  - 跳过原因区分 OCR 辅助、S2 普通配料和 GB 2760 非目录菌种引用。
- 本地 DB 正式化结果
  - 本轮 `ingredient_master` 提升 2146 条：`food_additive=2012`、`novel_food_ingredient=95`、`food_medicine_substance=13`、`food_microorganism=26`。
  - `ingredient_source_relations.status=current` 提升 2158 条。
  - `ingredient_regulatory_rules.status=current` 提升 133 条。
  - `novel_food_ingredient_rules.status=current` 提升 95 条。
  - `food_medicine_rules.status=current` 提升 13 条。
  - `microorganism_strains.status=current` 提升 26 条。
  - `ingredient_import_staging.review_status=approved` 提升 264 条。
  - 当前累计 `verified_regulation=2452`、`pending_review ingredient=563`、`pending_review staging=198`、`current source relations=4567`。

### 数据边界

- 剩余 `pending_review ingredient=563`：`food_microorganism=95`、`ordinary_ingredient=468`。
- `food_microorganism=95` 中包含 14 条 OCR 辅助婴幼儿菌种和 81 条 GB 2760 C.3 非目录菌种引用，均不得展示为已验证可食用菌种目录结论。
- S2 普通配料仍不是官方普通食品原料目录；不得展示为 S0 或 verified。
- 数字标签公告官方页面已定位，但本地原文未保存，继续 manual_required。
- GB 28050-2025 糖醇能量规则仍未定位到可引用 S0 原文，继续不导入、不参与能量计算。

### 验证

已通过：

- `npm run ingredient:inventory`
- `npm run ingredient:extract`
- `npm run ingredient:import`
- `npm run ingredient:promote-reviewed`
- `npm run ingredient:validate`
- `npm run ingredient:coverage`
- `git diff --check`
- `npm run validate:data`
- `npm --prefix backend run typecheck`
- `npm run lint`
- `npm run test`
- `npm --prefix backend run test`
- `npm run build`
- `npm --prefix backend run build`
