# OCR Iteration 10

Generated: 2026-06-21T10:49:00+08:00

## Current Round

- 当前轮次：10
- 样本数量：100
- 通过数量：100
- 失败数量：0
- 当前阶段：ready_to_expand_500
- 是否达到 500 样本最终验收：否
- 是否达到 100 样本扩容门槛：是

## Metrics Change

| Metric | Previous 100-sample run | Current |
| --- | ---: | ---: |
| overallPassRate | 100% | 100% |
| coreIngredientSamples | 20 | 32 |
| coreNutritionSamples | 41 | 29 |
| ingredientsAccuracy | 100% | 100% |
| nutritionAccuracy | 100% | 100% |
| ingredientFalsePositiveRate | 0% | 0% |
| nutritionAsIngredientRate | 0% | 0% |
| otherAsIngredientRate | 0% | 0% |
| ChatGPT/Codex subagent Review | pending | 88 |
| DeepSeek Review | 90.6 | 92.5 |

## Fixes This Round

- RapidOCR `box` 坐标归一化为 `x/y/width/height`，让多区域图片按真实坐标分区。
- OCR 行分区支持同一照片内多个区域，避免营养表和配料/生产信息同行拼接。
- 允许营养成分图中同时存在明确 `Ingredients/配料` 区域，按多区域标签评测。
- 收紧无锚点短碎片配料判断，避免广告语、生产信息、过敏原碎片硬猜成配料。
- 增加西语、波兰语、捷语等常见配料锚点和保存/批号/食用说明结束边界。
- 修正 `nutritionAsIngredientRate` 统计口径，避免把合法配料词 `protein/sodium` 当成营养表误入。
- 新增公开配料/过敏原/模糊局部样本，并保留来源 URL；原图仅用于本地评测。
- 调整报告摘要：按实际识别到的区域生成，不再暗示配料表和营养表都已整理。
- 评测报告摘要固定加入“包装实拍 OCR”和“请以包装实物标注为准”提示。
- 写入当前会话 Codex 子 agent Review，作为无 OpenAI API Key 时的 ChatGPT Review 替代。

## Failure Top 10

- none

## Review

- ChatGPT 替代：Codex 子 agent，score 88，pass，risk low。
- DeepSeek：averageScore 92.5，8/8 pass，risk low。
- Review 结论：适合进入 500 样本扩容，但不能声明最终完成。

## Next Direction

- 扩展到 500 个食品包装 OCR 样本，继续覆盖模糊、倾斜、反光、正面无配料、仅营养表、配料和营养表同图、多语言包装。
- 500 样本必须继续保持 overallPassRate >= 95%、ingredients/nutrition 准确率 >= 95%、误判率在门槛内。
- 食品包装 OCR 500 样本稳定后，再启动二维码、条形码、商品数字码评测，每类 500 用例且正确率 >= 95%。

## Acceptance

- 是否达到验收标准：否
- 原因：当前只有 100 个 OCR 样本；最终验收要求食品包装 OCR 至少 500 样本稳定 95%，且后续码类测试尚未激活。
- 当前 OCR 分区能力未达到成熟标准，不能声明完成。
