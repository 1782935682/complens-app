# OCR Iteration 9

Started: 2026-06-21T00:00:00.000+08:00

Exit code: 1

## Metrics

- 样本数量：100
- 通过数量：66
- 失败数量：34
- 分类覆盖：30
- 核心有效样本：55
- 核心有效配料样本：26
- 核心有效营养样本：29
- 无效样本：6
- 弱 OCR 样本：1
- ingredientsText 准确率：46.67%
- nutritionText 准确率：50%
- 核心有效 ingredientsText 准确率：53.85%
- 核心有效 nutritionText 准确率：55.17%
- 配料表误判率：1.43%
- 营养误入配料率：1%
- other 误入配料率：0%
- ChatGPT Review：30
- DeepSeek Review：50

## Metrics Change

- 增加 `sampleQuality`，每个样本记录质量状态、原因、图片大小与 sha256。
- 增加核心有效样本指标，避免 front_or_claims 样本通过率掩盖配料/营养失败。
- 最终验收门禁调整为 500 样本稳定 95%，100 样本只作为 gold set 清洗阶段。

## 本轮修复内容

- `ocr:evaluate` 输出 `coreSamples`、`coreIngredientSamples`、`coreNutritionSamples`、`invalidSampleCount`、`weakOcrSampleCount`。
- `acceptancePass` 现在要求至少 500 样本、核心配料/营养各不少于 25、无 invalid 样本、总体与核心准确率均达到 95%。
- 新增 `npm run ocr:sample-quality`，生成 `reports/ocr/sample-quality-report.md` 和 `reports/ocr/sample-quality-report.json`。
- AI Review prompt 增加 `sampleQuality`，便于区分坏样本、弱 OCR 和算法失败。
- 成熟度报告写入 100 -> 500 的分阶段扩样策略：100 样本未稳定 95% 前不进入 500 扩样。

## 失败原因 Top 10

- code_missing: 90
- brand_missing: 87
- productName_missing: 29
- detected_type_mismatch: 13
- nutrition_missing: 13
- missing_structured_section: 9
- ingredients_missing: 8
- ocr_or_sample_failed: 6
- ingredients_low_overlap: 5

## 下一轮修复方向

- 清洗当前 100 样本：剔除或替换 6 个 invalid 和 1 个 weak OCR 样本。
- 固化 gold set manifest，避免 Open Food Facts 图像 URL 变动影响回归。
- 为每个核心失败样本建立回归夹具，先处理 `detected_type_mismatch`、`nutrition_missing`、`ingredients_missing`。
- 开始设计 AI-assisted OCR cleanup，但只作为用户确认前的候选分区/纠错，不直接进入报告结论。

## 是否达到验收标准

否。当前 OCR 分区能力未达到成熟标准，不能声明完成；也不能进入 500 样本扩样阶段。
