# OCR Iteration 7

Started: 2026-06-20T18:58:00Z

## Metrics

- 样本数量：74
- 通过数量：69
- 失败数量：5
- 分类覆盖：17
- ingredientsText 准确率：50%
- nutritionText 准确率：0%
- 配料表误判率：1.43%
- 营养误入配料率：0%
- other 误入配料率：0%
- uncertainWithReasonRate：100%
- ChatGPT Review：32（chatgpt-subagent overall review）
- DeepSeek Review：43.8

## 本轮修复内容

- 生产 OCR 主流程接入 `ocrSectionClassifier` / `ingredientsExtractor` / `nutritionExtractor` / `productInfoExtractor`，避免评测链路和生产链路继续分叉。
- 增加 ChatGPT 无 API Key 时的子 agent 审核记录：`reports/ocr_reviews/chatgpt-subagent-review.json`。
- 调整样本选择为带配额的 balanced selection，避免前 100 个样本几乎全是包装正面。
- 撤回激进 rawText 配料兜底，避免包装正面 `INGREDIENTS` 营销词生成假配料。
- 营养表抽取增加“字段名/数值下一行”配对尝试。

## 失败原因 Top 10

- code_missing: 70
- brand_missing: 67
- productName_missing: 3
- nutrition_low_overlap: 3
- ingredients_low_overlap: 2

## 样本源阻塞

- Open Food Facts 搜索源本轮有 6 个 bucket 返回 503：dairy_yogurt、puffed_snack、instant_noodle、frozen_food、imported_food、china_recent。
- 本轮最终只构建到 74 个公开网络样本，不满足“样本数不少于 100”的验收指标。
- 样本仍不均衡：配料表 4 个、营养表 3 个，不能支撑扩大样本或上线判断。

## 下一轮修复方向

- 先补稳定 gold set，不继续盲目扩大随机 front 样本。
- 对营养表做坐标/表格级重组，不能只靠纯文本行配对。
- 对中文配料长行和 OCR 错字（护料、截断换行）做更稳的恢复，但不能重新引入正面营销词误判。
- 评估 AI 辅助只作为低置信样本的 Review/解释建议，不替代 OCR 分区真值。

## 是否达到验收标准

否。
