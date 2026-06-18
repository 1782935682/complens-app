# pending_review 数据正式化报告

生成时间：2026-06-18T15:17:09.246Z

## 执行口径

- review 提交时间：2026-06-18T11:42:44.682Z
- dry-run：否
- 本轮只提升 S0 中国官方来源中已通过本地文件内容和 SHA-256 校验的记录。
- 本轮只处理 `ingredient_master`、`ingredient_source_relations`、`ingredient_regulatory_rules` 和 `nutrition_fortifier_rules`。
- S2 普通配料、OCR 辅助抽取、官方页面 URL 仍待补齐的目录、营养声称阈值、数字标签规则和过敏原规则继续保持待复核。

## 本轮已正式化

| 项目 | 数量 |
|---|---:|
| ingredient_master | 2026 |
| ingredient_source_relations -> current | 2126 |
| ingredient_regulatory_rules -> current | 133 |
| nutrition_fortifier_rules -> current | 116 |
| ingredient_import_staging -> approved | 116 |

### ingredient_master 按类型

| ingredient_type | 数量 |
|---|---:|
| food_additive | 2005 |
| nutrition_fortifier | 21 |

### staging approved 按类型

| record_type | 数量 |
|---|---:|
| nutrition_fortifier_rule | 116 |

## 使用的合格来源

| source_status / verification_status | 数量 |
|---|---:|
| verified_official_standard / verified_by_local_content_and_checksum | 9 |

## 仍保留 pending_review

| ingredient_type | 数量 |
|---|---:|
| food_additive | 7 |
| food_medicine_substance | 13 |
| food_microorganism | 121 |
| novel_food_ingredient | 95 |
| ordinary_ingredient | 479 |

## 跳过原因

| reason | 数量 |
|---|---:|
| OCR-assisted official extraction remains pending_review | 14 |
| S2 ordinary ingredient seed remains pending_review | 479 |
| official source page or checksum verification incomplete | 141 |
| special catalog requires dedicated row-level promotion | 81 |

## 边界

- 本轮没有把任何 S2、未验证、OCR 辅助或缺官方页面定位的数据标记为官方正式数据。
- 本轮没有变更旧 `ingredients` / `additive_usage_rules` 用户端展示表；GB2760 A.1 正式规则仍由 `promote:gb2760` 管理。
- 被跳过的数据需要后续补官方页面、逐条核对 OCR/阈值/标签规则，或补专用 promote 逻辑后再升级。
