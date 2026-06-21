# OCR Iteration 12

Generated: 2026-06-21T13:45:00+08:00

## Current Round

- 当前轮次：12
- 样本数量：500
- 通过数量：393
- 失败数量：107
- 当前阶段：validate_500
- 是否达到 500 样本最终验收：否
- 是否达到 100 样本扩容门槛：是

## Metrics Change

| Metric | Iteration 11 first 500 run | Current |
| --- | ---: | ---: |
| overallPassRate | 2.4% | 78.6% |
| coreIngredientSamples | 3 | 107 |
| coreNutritionSamples | 4 | 92 |
| invalidSampleCount | 488 | 49 |
| weakOcrSampleCount | 0 | 52 |
| ingredientsAccuracy | 1.79% | 71.33% |
| nutritionAccuracy | 2.67% | 61.33% |
| coreIngredientsAccuracy | 100% | 100% |
| coreNutritionAccuracy | 100% | 95.65% |
| ingredientFalsePositiveRate | 0% | 0% |
| nutritionAsIngredientRate | 0% | 0.2% |
| otherAsIngredientRate | 0% | 0% |
| ChatGPT/Codex subagent Review | pending | pending |
| DeepSeek Review | 96.3 | 86.9 |

## Fixes This Round

- 新增 `npm run ocr:cache-samples`，先缓存公开样本图片，再跑 OCR 评测。
- Open Food Facts 图片下载改为优先 `static.openfoodfacts.org`，并尝试 `400/full/200/100` 尺寸。
- 图片下载失败拆分为 `sample_download_failed`，不再混入 OCR 失败。
- 缓存阶段加入请求超时、进度输出、失败 URL 报告和 HTTP 429 限流分类。
- 缓存阶段达到 500 后仍检查核心覆盖：500 阶段配料样本和营养样本必须各不少于 150。
- 图片缓存最小门槛提高到 5KB，避免 100px/低清图进入 gold set。
- 样本 expected 按图片角色归一化：配料局部图只评配料，营养局部图只评营养；商品名、品牌、商品码不再由元数据硬压 OCR。
- 扩充公开样本搜索 bucket：早餐麦片、巧克力、糖果、意面、酱料、奶酪、冰淇淋、汤、咖啡茶等。
- 修复英文配料行被营养关键词误分区的问题：带 `Ingredients/配料` 锚点或明显配料列表形态的行不因 `protein/salt/sugar/g` 等词进入 nutrition。
- 运行样本质量报告并将本轮 49 个 invalid、52 个 weak OCR 样本加入 blocklist。

## Failure Top 10

- detected_type_mismatch: 60
- missing_structured_section: 50
- nutrition_missing: 42
- ingredients_missing: 40
- nutrition_low_overlap: 16
- ingredients_in_nutrition: 15
- insufficient_ocr_text: 7
- ingredients_low_overlap: 3

## Failure Categories

- weak_or_invalid_ocr_sample: 101
- remaining_rule_or_extraction_error_on_ok_sample: 15 observed examples, mainly ingredient sections split into nutrition/other
- false_positive_ingredient: 0
- nutrition_as_ingredient: 0.2%
- other_as_ingredient: 0
- ai_review_pending: ChatGPT/Codex subagent Review not yet run for this 500 set

## Review

- ChatGPT 替代：pending。无 `OPENAI_API_KEY` 时必须由当前 Codex 会话子 agent 输出 `chatgpt-subagent-review.json`，本轮未达本地指标，暂不把 Review 视为通过。
- DeepSeek：averageScore 86.9，过 85 门槛，但仍有 1 个 high risk 样本，不能声明通过。
- Review 结论：继续修复样本质量和配料/营养分区；未达到成熟标准。

## Next Direction

- 继续补足 500 个高质量本地样本，保持配料和营养样本各不少于 150。
- 对本轮 remaining ok failures 做规则修复，重点处理英文/多语言配料长行被拆到 nutrition/other。
- 再跑 500 样本评测；若本地指标接近 95%，再执行 Codex 子 agent Review 和 DeepSeek 深度 Review。
- 食品包装 OCR 未稳定前，二维码、条形码、商品数字码 500 用例评测仍不激活。

## Acceptance

- 是否达到验收标准：否
- 原因：overallPassRate 78.6%，核心有效样本数不足 150/150，仍有 invalid/weak OCR 样本，ChatGPT/Codex 子 agent Review 未执行，DeepSeek 存在 high risk 样本。
- 当前 OCR 分区能力未达到成熟标准，不能声明完成。
