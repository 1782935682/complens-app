# OCR 到报告准确性记录

生成时间：2026-06-27

## 结论

- 已增加 OCR 配料文本质量闸：长英文粘连、缺少分隔符、疑似乱码的配料候选不会进入购买判断。
- 报告层遇到低可信配料时降级为“信息不足/补拍或手动补充”，保留包装来源说明，不把乱码当作可购买依据。
- 真实包装样本中 OCR 失败数为 0；不可下结论的样本进入补拍或手动确认。

## 代码改动

- `user-uniapp/src/utils/labelTextExtractor.ts`：新增 `qualityWarnings`、低质量配料 OCR 检测和 `filterIngredientTextForReport`。
- `user-uniapp/src/services/recognition/ocrService.ts`：结构化 OCR 结果进入报告前过滤低质量配料文本。
- `user-uniapp/src/utils/localLabelAnalysis.ts`、`user-uniapp/src/pages/capture/index.vue`：把质量警告传到报告来源和识别质量提示。
- `user-uniapp/scripts/ocr-evaluate.mjs`：评测报告摘要使用过滤后的报告文本，避免 OCR 失败样本在报告摘要里显示错误配料结论。
- `user-uniapp/scripts/ocr-report-regression.mjs`：新增英文粘连乱码回归场景。

## 验证结果

- `npm run user:regression:ocr-report`：通过，47 个 OCR/report 回归场景。
- `env OCR_LOCAL_URL=http://127.0.0.1:8000 DEEPSEEK_API_KEY= OPENAI_API_KEY= npm run ocr:evaluate`：核心 100 样本完成，99/100 通过；退出码 1 是因为最终成熟度目标仍要求 500 样本。
- 唯一失败样本 `00825702-ingredients`：OCR 配料为长英文粘连乱码；报告摘要为“信息不足，请补拍配料表、过敏原提示，或手动补充对应文字”，未把乱码配料用于购买判断。
- `env OCR_LOCAL_URL=http://127.0.0.1:8000 DEEPSEEK_API_KEY= OPENAI_API_KEY= npm run user:sample:real-packaging`：11 个真实包装样本，6 个可生成报告，5 个补拍/手动确认，OCR 失败 0，高优先级问题 0，中优先级问题 1。

## 证据

- 核心 OCR 报告：`reports/ocr/ocr-evaluation-report.json`
- OCR 成熟度报告：`reports/ocr/final-ocr-maturity-report.md`
- 真实包装样本归档：`reports/ocr/real-packaging-samples-2026-06-27/`
- 回归脚本：`user-uniapp/scripts/ocr-report-regression.mjs`

## 未达项

- OCR 最终成熟度仍未达 500 样本目标，因此不能声明完整 OCR 终验通过。
- DeepSeek/OpenAI 中间评审未运行，命令显式清空了 `DEEPSEEK_API_KEY` 和 `OPENAI_API_KEY`。
