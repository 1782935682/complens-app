# 食品成分知识库覆盖报告

生成时间：2026-06-18T12:16:10.260Z

统计口径：本地 PostgreSQL ingredient_* 知识库表实际导入结果。

## 总览

| 指标 | 数量 |
|---|---:|
| 当前食品源文件原有数据数量 | 112 |
| 本轮知识库成分主表数量 | 3041 |
| 新增知识库成分数量 | 2285 |
| 有官方来源关系的成分数量 | 285 |
| 未验证旧数据数量 | 10 |
| 内部普通配料词库数量（非官方） | 12 |
| 非中国法规安全评价旧数据数量 | 27 |
| 别名数量 | 8735 |
| 规则数量 | 2587 |
| 关系数量 | 103 |
| 数据冲突数量 | 0 |
| 解析失败数量 | 0 |

## ingredient_type 覆盖

| ingredient_type | 数量 |
|---|---:|
| food_additive | 2311 |
| food_medicine_substance | 13 |
| food_microorganism | 121 |
| novel_food_ingredient | 95 |
| nutrition_fortifier | 21 |
| ordinary_ingredient | 480 |

## 规则状态

| status | 数量 |
|---|---:|
| current | 2404 |
| pending_review | 183 |

## 来源关系导入数量

| source_id | 数量 |
|---|---:|
| official-source-food-medicine-4-06249a8708bc | 4 |
| official-source-food-medicine-9-8e2bdefad424 | 9 |
| official-source-food-microorganism-general-d560d08f9d6f | 26 |
| official-source-food-microorganism-infant-c71896026183 | 14 |
| official-source-gb14880-2012-0bc1e0d6e35e | 21 |
| official-source-gb2760-2024-2a2c4a867cf5 | 2371 |
| official-source-sanxin-2023-catalog-80ffe9ebb26e | 109 |
| ordinary-ingredient-seed-s2-v1 | 479 |

## GB 2760 派生来源

| 字段 | 内容 |
|---|---|
| 标准 | GB 2760-2024 |
| 标题 | 食品安全国家标准 食品添加剂使用标准 |
| 发布机构 | 国家卫生健康委员会 / 食品安全国家标准数据检索平台 |
| 公告号 | 2024年第1号 |
| 发布日期 | 2024-02-08 |
| 实施日期 | 2025-02-08 |
| 检索日期 | 2026-06-12 |
| 官方入口 | https://sppt.cfsa.net.cn:8086/db?task=indexSearch |
| 内容 SHA-256 | 2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de |
| 解析器版本 | ingredient-knowledge-gb2760-v1 |

## 当前覆盖与限制

- 普通食品原料：当前 ordinary_ingredient 为 480。其中 S2 高频 OCR 种子为人工整理的 pending_review 候选，不是中国官方普通原料全量目录，也不能展示为 S0 或 verified。
- 营养强化剂：当前 nutrition_fortifier 为 21，GB 14880 source-materials 结构化规则保持 pending_review，需人工复核后才能提升。
- 新食品原料：当前 novel_food_ingredient 为 95，来自已保存官方目录抽取，保持 pending_review。
- 食药物质：当前 food_medicine_substance 为 13，来自本地官方目录抽取，保持 pending_review。
- 可用于食品的菌种：当前 food_microorganism 为 121。其中 GB 2760 表 C.3 的酶制剂来源/供体微生物和 NHC 菌种名单抽取仍需人工复核；婴幼儿菌种 PDF 无文本层，已用 RapidOCR 辅助抽取 14 条 pending_review 候选，原始 OCR JSON 已保存，不能展示为 verified。
- 过敏原、营养 NRV、营养声称和数字标签规则已进入专用表或 staging，但均保持 pending_review，不作为 verified 结论展示。
- 官方公告新增、修改、废止记录：已预留 ingredient_relations 和 valid_from/valid_to/status，本轮没有自动推断废止链。
- 完整 source-materials 覆盖、S2 种子和专用规则表数量以 [official-food-data-coverage.md](./official-food-data-coverage.md) 与 [data-quality-report.md](./data-quality-report.md) 为准。

官方别名冲突明细见 [ingredient-alias-conflicts.md](./ingredient-alias-conflicts.md)。

## 普通食品原料覆盖限制

普通食品原料没有类似 GB 2760 添加剂标准这样的统一官方全量名单。本项目不得用第三方词库或 AI 推测补齐“官方普通食品原料库”。后续只能导入能够定位到国家机关、国家标准或公告原文的结构化事实，并在覆盖报告中继续区分官方来源、内部词库和未验证旧数据。

## 后续更新命令

```bash
npm run ingredient:inventory
npm run ingredient:fetch
npm run ingredient:extract
npm --prefix backend run db:migrate
npm run ingredient:import
npm run ingredient:ordinary-seed
npm run ingredient:validate
npm run ingredient:coverage
```
