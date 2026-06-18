# 数据质量报告

生成时间：2026-06-18T11:57:13.954Z

## 来源可信度

| 指标 | 数量 |
|---|---:|
| S0 来源文件 | 14 |
| 非 S0 来源文件 | 0 |
| 待核验来源元数据文件 | 0 |
| 需要人工下载/确认 | 1 |
| 重复 SHA-256 | 0 |

## 数据库质量

| 指标 | 数量 |
|---|---:|
| official_sources | 15 |
| ingredient_import_staging | 462 |
| pending_review staging | 462 |
| pending_review ingredient | 2730 |
| allergen_categories | 8 |
| allergen_aliases | 32 |
| allergen_labeling_rules | 10 |
| ingredient_allergen_relations | 31 |
| digital_label_rules | 12 |
| nutrition_reference_values | 32 |
| nutrition_claim_rules | 15 |
| nutrition_polyol_energy_rules | 0 |
| import_errors | 0 |
| unlinked staging 全量 | 184 |
| unlinked actionable staging | 0 |
| alias conflicts | 0 |
| extract failures | 0 |

## pending_review 说明

- 本轮从 GB 7718-2025、GB 7718-2011、GB 28050-2025、解读材料和公告抽取的标签/营养规则均为自动抽取，默认 `pending_review`。
- NRV 与比较声称即使写入专用营养表，状态仍是 `pending_review`，不能作为已验证法规结论展示。
- 未找到或无法完整下载的官方资料不会使用第三方文件替代，不会写入 S0 `official_sources`。

## import_errors

- 当前统计未发现 import_errors。

## 需要人工复核

- 国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告: CFSA/SPPT 检索“预包装食品数字标签”“关于实施预包装食品数字标签有关事项的公告”未命中独立公告；NHC 页面访问返回反爬挑战，SAMR 搜索入口未返回可核验详情页。本轮不能用第三方转载页面替代 S0。
- GB 28050-2025 糖醇能量规则未在已保存官方 PDF/HTML 中自动定位到原文片段，未导入。
- 所有标签/营养解释性规则需要人工复核条款边界、适用范围和最终展示文案。

## 结论

本轮没有发现正式 S0 来源记录缺少本地文件或 SHA-256；没有把第三方资料标成 S0。仍未达到食品成分知识库全量覆盖，普通食品原料和商品标签写法仍需后续按来源等级补充。
