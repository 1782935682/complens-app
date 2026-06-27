# AI Review

当前 AI/自动评测入口以 `npm run eval:all` 为准。

## 本轮结果

- 结果：通过。
- 报告：`reports/evaluation/eval-all-report.md`。
- checkpoint：`.codex/state/checkpoint.json`。

## 指标

最新指标由 `eval:all` 自动写入：

- OCR 准确率。
- 配料识别准确率。
- 营养解析准确率。
- 条码/二维码解析准确率。
- 决策一致性。
- 用户行为匹配度。

## 当前评审口径

- 首页只能有 `拍照识别`。
- 结果页只能围绕三卡：该不该买、风险原因、替代推荐。
- 不展示 OCR 原文。
- 不展示技术字段。
- 不恢复单成分搜索入口。
- AI 只能做解释和公开标签线索补充，不能伪造包装证据、法规结论或医疗建议。

## 外部模型评审

`user-uniapp/scripts/chatgpt-ui-review.mjs` 和 `user-uniapp/scripts/deepseek-comprehensive-review.mjs` 仍可作为人工补充评审入口，但不是 `eval:all` 的必需门禁。缺少 API Key 时不得伪造通过结果。
