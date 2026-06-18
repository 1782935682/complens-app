# AI Review — 2026-06-18

## GB 2760 C.3 酶制剂来源/供体边界

### 本轮范围

本轮接在 PR #120 合并后的 `main` 上，继续处理食品成分知识库扩展层的数据边界。范围限定为修正 GB 2760 表 C.3 酶制剂来源/供体微生物的分类，避免它们被误计入 NHC 可用于食品菌种目录覆盖。

未修改旧 `ingredients` / `additive_usage_rules` 用户端展示表，未改变现有 `/api/ingredients` 返回结构，未把 S2 普通配料、OCR 辅助菌种、数字标签规则、营养声称阈值或 C.3 来源/供体引用标记为正式可食用菌种结论。

### 代码审查结论

- `ingredientKnowledgeService` 仍保留 C.3 酶条目本身和来源/供体关系证据，但来源/供体 master 改为 `ingredient_type=other`。
- C.3 来源/供体新增 `enzyme_source` / `enzyme_donor` / `gb2760_enzyme_microorganism_reference` 标签，供后续专用复核使用。
- `ingredient:promote-reviewed` 的跳过原因现在明确区分 C.3 来源/供体引用，避免继续用“食品菌种目录”口径解释这 81 条 pending 记录。
- 覆盖报告和 source-materials 报告已明确：NHC 可用于食品菌种覆盖只统计对应官方菌种名单来源，不统计 GB 2760 C.3。

### 当前 DB 口径

- `ingredient_master=3041`。
- `food_microorganism=40`：26 条 NHC 通用食品菌种已 verified，14 条婴幼儿菌种 OCR 辅助记录仍 pending_review。
- `other=81`：GB 2760 表 C.3 酶制剂来源/供体引用，全部 pending_review。
- `verified_regulation=2452`。
- `current source relations=4426`。
- 剩余 `pending_review ingredient=563`：`ordinary_ingredient=468`、`food_microorganism=14`、`other=81`。

### 数据边界

- C.3 来源/供体引用只能说明“某酶制剂来源或供体关系”，不能说明该微生物属于 NHC 可用于食品菌种名单。
- C.3 来源/供体引用不能进入 `microorganism_strains` 的 current 口径，也不能展示为 verified 可食用菌种目录结论。
- `可用于婴幼儿食品的菌种名单.pdf` 仍因无文本层且依赖 RapidOCR 辅助抽取，必须保留 `pending_review`。
- S2 普通配料仍不是官方普通食品原料目录；不得展示为 S0 或 verified。
- 数字标签公告官方页面已定位但本地原文未保存，继续 manual_required。
- GB 28050-2025 糖醇能量规则仍未定位到可引用 S0 原文，继续不导入、不参与能量计算。

### 验证

已通过：

- `npm --prefix backend test -- tests/ingredientKnowledge.test.ts`
- `npm --prefix backend run typecheck`
- `npm run ingredient:validate`
- `npm run ingredient:coverage`
- `npm run validate:data`
- `npm run lint`
- `npm run test`
- `git diff --check`
