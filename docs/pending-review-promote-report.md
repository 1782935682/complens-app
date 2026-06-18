# pending_review 数据正式化报告

生成时间：2026-06-18T15:37:43.730Z

## 执行口径

- review 提交时间：2026-06-18T11:42:44.682Z
- dry-run：否
- 本轮只提升 S0 中国官方来源中已通过本地文件内容和 SHA-256 校验的记录。
- 本轮处理 `ingredient_master`、`ingredient_source_relations`、`ingredient_regulatory_rules`、`nutrition_fortifier_rules`、`novel_food_ingredient_rules`、`food_medicine_rules` 和 `microorganism_strains`。
- 官方目录仅限 `source_type=official_catalog` 且非 OCR 辅助来源；GB 2760 C.3 等非目录菌种引用继续保持待复核。
- S2 普通配料、OCR 辅助抽取、数字标签独立公告本地原文未保存项、营养声称阈值和过敏原规则继续保持待复核。

## 本轮已正式化

| 项目 | 数量 |
|---|---:|
| ingredient_master | 2146 |
| ingredient_source_relations -> current | 2158 |
| ingredient_regulatory_rules -> current | 133 |
| nutrition_fortifier_rules -> current | 0 |
| novel_food_ingredient_rules -> current | 95 |
| food_medicine_rules -> current | 13 |
| microorganism_strains -> current | 26 |
| ingredient_import_staging -> approved | 264 |

### ingredient_master 按类型

| ingredient_type | 数量 |
|---|---:|
| food_additive | 2012 |
| food_medicine_substance | 13 |
| food_microorganism | 26 |
| novel_food_ingredient | 95 |

### staging approved 按类型

| record_type | 数量 |
|---|---:|
| food_additive_new_variety | 14 |
| food_medicine_substance | 13 |
| food_microorganism | 26 |
| novel_food_ingredient | 95 |
| nutrition_fortifier_rule | 116 |

## 使用的合格来源

| source_status / verification_status | 数量 |
|---|---:|
| verified_official_catalog / verified_by_local_content_and_checksum | 4 |
| verified_official_standard / verified_by_local_content_and_checksum | 9 |

## 仍保留 pending_review

| ingredient_type | 数量 |
|---|---:|
| food_microorganism | 95 |
| ordinary_ingredient | 468 |

## 跳过原因

| reason | 数量 |
|---|---:|
| OCR-assisted official extraction remains pending_review | 14 |
| S2 ordinary ingredient seed remains pending_review | 468 |
| non-catalog microorganism references require dedicated row-level promotion | 81 |

## 边界

- 本轮没有把任何 S2、未验证、OCR 辅助或缺官方页面定位的数据标记为官方正式数据。
- 本轮没有变更旧 `ingredients` / `additive_usage_rules` 用户端展示表；GB2760 A.1 正式规则仍由 `promote:gb2760` 管理。
- 被跳过的数据需要后续保存官方原文、逐条核对 OCR/阈值/标签规则，或补非目录菌种专用 promote 逻辑后再升级。
