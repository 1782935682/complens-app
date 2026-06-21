# OCR Iteration 8

Started: 2026-06-20T19:45:13.501Z

Exit code: 1

## Metrics

- 样本数量：100
- 通过数量：66
- 失败数量：34
- 分类覆盖：30
- ingredientsText 准确率：46.67%
- nutritionText 准确率：50%
- 配料表误判率：1.43%
- 营养误入配料率：1%
- other 误入配料率：0%
- ChatGPT Review：30
- DeepSeek Review：44.4

## Metrics Change

- 样本从 74 扩展到 100，分类覆盖从 17 扩展到 30。
- 配料误判率降到 1.43%，但 ingredientsText 准确率仍只有 46.67%。
- nutritionText 准确率从 0% 提升到 50%，但距离 95% 上线门禁仍很远。
- ChatGPT 子 agent 和 DeepSeek 均判定不可上线。

## 本轮修复内容

- Open Food Facts 采样改为 legacy API 分页，并支持从 `images.ingredients_*` / `images.nutrition_*` 元数据恢复图片 URL。
- ChatGPT 无 API Key 时改为当前会话子 agent 深度 Review，并把 review 结果写入 `reports/ocr_reviews/chatgpt-subagent-review.json`。
- 扩展多语言配料 / 营养锚点，覆盖 `Nutrition Facts`、`Supplement Facts`、`Nahrwerte`、`Informacion Nutricional`、`Declaration nutritionnelle` 等包装常见写法。
- 修复营养表拆行后只保留表头的问题；允许从完整 OCR 原文回退重组营养字段。
- 营养字段解析增加多语言别名、小数逗号、单位在前数值在后的处理。
- 配料误判口径修正为基于 OCR 原文是否存在配料锚点，而不是只看样本角色名。
- 验收门禁从 90% 改为用户要求的 95%，并增加 `detected_type_mismatch` 失败项。
- 收紧营养输出：少于 3 个核心营养字段时不生成 nutritionText，避免稀疏 OCR 直接进入报告结论。
- 成熟度报告增加 AI 优化判断：AI 只应做 OCR 可见证据内的分区/纠错候选，不能直接生成最终报告结论。

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

- 先清洗 100 样本 gold set：剔除 404 / 图不对 / expected 与图片内容不一致的样本，固定图片 hash。
- 拆分评测指标：OCR 原文、版面分区、配料抽取、营养抽取、报告生成分别计分。
- 基于坐标和行列重建营养表，不再只靠线性正则邻近匹配。
- 报告生成绑定置信度：核心字段不足或未确认时只提示补拍/手动确认，不输出食用建议。
- 在 deterministic 提取后、用户确认页前新增 AI-assisted OCR cleanup 候选通道，并严格标注 AI 来源与证据 span。

## 是否达到验收标准

否。当前 OCR 分区能力未达到成熟标准，不能声明完成。
