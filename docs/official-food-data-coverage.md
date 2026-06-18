# 食品成分知识库覆盖报告

生成时间：2026-06-18T12:16:42.137Z

统计口径：本地 PostgreSQL 实际查询结果。

## 数据库数量

| 指标 | 数量 |
|---|---:|
| 修改前兼容 ingredients 数量 | 329 |
| 修改后 ingredient_master 数量 | 3041 |
| 本次新增/派生 ingredient_master 数量 | 3041 |
| food_additive 数量 | 2311 |
| nutrition_fortifier 数量 | 21 |
| novel_food_ingredient 数量 | 95 |
| food_medicine_substance 数量 | 13 |
| food_microorganism 数量 | 121 |
| ordinary_ingredient 数量 | 480 |
| ingredient_aliases 数量 | 8735 |
| ingredient_tags 数量 | 2865 |
| ingredient_relations 数量 | 103 |
| allergen_categories 数量 | 8 |
| allergen_aliases 数量 | 32 |
| allergen_labeling_rules 数量 | 10 |
| ingredient_allergen_relations 数量 | 31 |
| digital_label_rules 数量 | 12 |
| nutrients 数量 | 46 |
| nutrition_reference_values 数量 | 32 |
| nutrition_claim_rules 数量 | 15 |
| nutrition_polyol_energy_rules 数量 | 0 |
| additive_usage_rules 数量 | 2391 |
| nutrition_fortifier_rules 数量 | 116 |
| import_errors 数量 | 0 |
| official_sources 数量 | 15 |
| verified_regulation 数量 | 285 |
| verified_official_standard 数量 | 9 |
| verified_official_catalog 数量 | 5 |
| verified_international_official 数量 | 0 |
| verified_secondary 数量 | 0 |
| observed_digital_label 数量 | 0 |
| manual_verified 数量 | 0 |
| staging 数量 | 462 |
| 正式提升数量（current source relations） | 2409 |
| pending_review ingredient 数量 | 2730 |
| pending_review staging 数量 | 462 |
| unverified 数量 | 10 |
| 重复数量 | 0 |
| 冲突数量 | 0 |
| 解析失败数量 | 0 |
| 下载失败数量 | 1 |
| 未链接 staging 全量 | 184 |
| 需人工处理的未链接 ingredient-like staging | 0 |

## ingredient_type

| ingredient_type | 数量 |
|---|---:|
| food_additive | 2311 |
| food_medicine_substance | 13 |
| food_microorganism | 121 |
| novel_food_ingredient | 95 |
| nutrition_fortifier | 21 |
| ordinary_ingredient | 480 |

## 来源状态

| source_status | 数量 |
|---|---:|
| pending_review | 1 |
| verified_official_catalog | 5 |
| verified_official_standard | 9 |

## 各来源实际导入数量

| source_id | 数量 |
|---|---:|
| official-source-food-medicine-4-06249a8708bc | 4 |
| official-source-food-medicine-9-8e2bdefad424 | 9 |
| official-source-food-microorganism-general-d560d08f9d6f | 26 |
| official-source-food-microorganism-infant-c71896026183 | 14 |
| official-source-gb14880-2012-0bc1e0d6e35e | 116 |
| official-source-gb2760-2024-2a2c4a867cf5 | 4874 |
| official-source-sanxin-2023-catalog-80ffe9ebb26e | 109 |
| ordinary-ingredient-seed-s2-v1 | 479 |

## staging 解析记录类型

| record_type | 数量 |
|---|---:|
| allergen_alias | 64 |
| allergen_category | 16 |
| allergen_labeling_rule | 10 |
| digital_label_rule | 12 |
| food_additive_new_variety | 14 |
| food_medicine_substance | 13 |
| food_microorganism | 40 |
| label_rule_additive_labeling | 2 |
| label_rule_allergen_labeling | 2 |
| label_rule_claim | 1 |
| label_rule_compound_ingredient | 2 |
| label_rule_date_shelf_life_storage | 2 |
| label_rule_digital_label | 1 |
| label_rule_imported_food | 2 |
| label_rule_ingredient_list | 2 |
| label_rule_labeling_exemption | 2 |
| novel_food_ingredient | 95 |
| nutrition_comparative_claim_rule | 8 |
| nutrition_content_claim_rule | 7 |
| nutrition_fortifier_rule | 116 |
| nutrition_label_rule_comparative_claim | 2 |
| nutrition_label_rule_content_claim | 1 |
| nutrition_label_rule_energy_conversion | 1 |
| nutrition_label_rule_exemption | 2 |
| nutrition_label_rule_mandatory_nutrients | 1 |
| nutrition_reference_value | 32 |
| official_notice_standard_release | 1 |
| official_qa_allergen | 1 |
| official_qa_digital_label | 1 |
| official_qa_imported_food | 1 |
| official_qa_ingredient_additive | 1 |
| official_qa_mandatory_nutrients | 1 |
| official_qa_nrv | 1 |
| official_qa_nutrition_claim | 1 |
| official_qa_salt_oil_sugar_prompt | 1 |
| official_qa_serving_size | 1 |
| official_qa_standard_revision | 2 |

## 当前使用的标准版本

- GB 2760-2024：已使用本地 PDF SHA-256 与现有 GB2760 staging/reference 数据。
- GB 14880-2012：已从本地 PDF 文本层抽取部分营养强化剂使用范围，全部保持 pending_review。
- GB 7718-2025：已从 CFSA/SPPT 官方 PDF 抽取配料表、食品添加剂、复合配料、致敏物质、食品声称、日期/保质期/贮存、进口食品、数字标签和豁免标示规则片段，全部保持 pending_review。
- GB 7718-2011：已从 CFSA/SPPT 官方 PDF 抽取旧版配料表、食品添加剂、致敏物质、日期/贮存和豁免规则片段，全部保持 pending_review。
- GB 28050-2025：已从 CFSA/SPPT 官方 PDF 抽取强制营养成分、能量换算、NRV、营养声称、比较声称和豁免强制标示规则片段；NRV 与可结构化比较声称进入专用营养表，全部保持 pending_review。
- GB 7718-2025 / GB 28050-2025 解读材料：已保存 CFSA/SPPT 官方 HTML 并抽取解释性片段，全部保持 pending_review。
- 2025年第2号公告：已保存 CFSA/SPPT 官方 HTML 并登记发布公告来源。
- 三新食品 2023 汇总目录：已抽取目录项进入 staging/pending_review。
- 食药物质新增目录：已抽取本地文件中 13 个目录项进入 staging/pending_review。
- 可用于食品的菌种名单：已抽取文本层可识别菌种进入 staging/pending_review；可用于婴幼儿食品的菌种名单：本地 PDF 无文本层，已保存 RapidOCR 原始 JSON 作为 OCR 辅助证据并抽取 14 条进入 staging/pending_review，仍需人工复核，不提升为 verified。

## 缺失或需人工补齐

- GB 28050-2011 官方 PDF 已从 CFSA/SPPT 官方附件下载并进入 official_sources。
- 独立的“国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告”官方页面未自动定位；本轮仅使用 GB 7718-2025 正文和解读材料中的数字标签要求，公告专属规则继续 manual_required。
- GB 28050-2025 中“糖醇能量规则”未通过已保存官方 PDF/HTML 自动关键词定位到可引用原文片段，未导入该专项规则。

## 当前尚未覆盖的数据类别

- 普通食品原料不存在官方全量目录，本轮未声称全量覆盖。
- 过敏原规则、营养 NRV 和营养声称规则已有自动抽取记录，但均未人工复核，不能作为 verified 规则展示。
- 三新食品汇总目录之后至 2026-06-18 的增量公告需要继续逐条下载官方附件。
- 婴幼儿食品菌种名单已通过 RapidOCR 辅助抽取候选记录，因来源为扫描 PDF OCR 结果，仍需人工复核后才能提升。

## 下一次更新命令

```bash
npm run ingredient:inventory
npm run ingredient:fetch
npm run ingredient:extract
npm --prefix backend run db:migrate
npm run ingredient:import
npm run ingredient:validate
npm run ingredient:report
npm run ingredient:update-all
```
