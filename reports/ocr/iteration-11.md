# OCR Iteration 11

Generated: 2026-06-21T11:20:00+08:00

## Current Round

- 当前轮次：11
- 样本数量：500
- 通过数量：12
- 失败数量：488
- 当前阶段：validate_500
- 是否达到 500 样本最终验收：否
- 是否达到 100 样本扩容门槛：上一轮已达到，本轮为 500 扩样首轮

## Metrics Change

| Metric | Previous 100-sample gate | Current 500-sample run |
| --- | ---: | ---: |
| overallPassRate | 100% | 2.4% |
| coreIngredientSamples | 32 | 3 |
| coreNutritionSamples | 29 | 4 |
| ingredientsAccuracy | 100% | 1.79% |
| nutritionAccuracy | 100% | 2.67% |
| coreIngredientsAccuracy | 100% | 100% |
| coreNutritionAccuracy | 100% | 100% |
| ingredientFalsePositiveRate | 0% | 0% |
| nutritionAsIngredientRate | 0% | 0% |
| otherAsIngredientRate | 0% | 0% |
| ChatGPT/Codex subagent Review | 88 | pending for 500 run |
| DeepSeek Review | 92.5 | 96.3 |

## Fixes This Round

- 将 500 样本扩容评测从 100 样本门槛后启动，生成 500 条公开 Open Food Facts 样本 manifest。
- 明确本轮失败主因不是配料/营养分区规则，而是样本图片下载层：`images.openfoodfacts.org` 多数图片请求失败，导致后续 OCR 无法执行。
- 文档补充 OCR Review 门禁：无 `OPENAI_API_KEY` 时必须用当前 Codex 会话子 agent 作为 `chatgpt-subagent`；DeepSeek 深度 Review 仍需独立执行且平均分必须 >=85。
- 后续代码修复方向已确定：增加 Open Food Facts 静态图片域名 fallback，并把图片下载失败单独归类为 `sample_download_failed`。

## Failure Top 10

- ocr_or_sample_failed: 488

## Failure Categories

- sample_source_unreachable: 488
- ocr_classification_rule_error: 0 observed in the limited successfully downloaded core samples
- false_positive_ingredient: 0
- nutrition_as_ingredient: 0
- other_as_ingredient: 0

## Review

- ChatGPT 替代：500 样本本地评测未形成有效结果前暂不执行子 agent 深度 Review；不能把上一轮 100 样本 Review 复用为本轮通过。
- DeepSeek：averageScore 96.3；只覆盖本轮已进入 Review 的样本，不代表 500 样本整体成熟。
- Review 结论：本轮不能进入产品成熟验收。

## Next Direction

- 为 Open Food Facts 图片下载增加 `static.openfoodfacts.org` fallback，并对同一图片尝试 `400/200/100/full` 尺寸。
- 将下载失败从 `ocr_or_sample_failed` 拆分为 `sample_download_failed`，避免把样本源问题误归因到 OCR 分区能力。
- 使用同一 500 样本 manifest 重跑评测，优先验证下载恢复后核心配料/营养样本数量是否达到 500 阶段门槛。
- 若 500 样本本地指标接近或达到门槛，再执行当前 Codex 子 agent Review 和 DeepSeek 深度 Review 汇总。

## Acceptance

- 是否达到验收标准：否
- 原因：500 样本首轮只有 12 个样本通过，488 个样本因图片下载/样本源层失败未进入有效 OCR；不能据此声明 OCR 分区成熟。
- 当前 OCR 分区能力未达到成熟标准，不能声明完成。
