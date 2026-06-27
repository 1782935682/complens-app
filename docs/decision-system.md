# 成分镜购买决策系统

## 产品原则

成分镜只做食品购买决策。用户拍照后，系统必须输出购买建议，而不是把识别结果展示给用户分析。

用户问题：

```text
这个东西我该不该买？
```

## Agent

| Agent | 责任 |
|---|---|
| `product-agent` | 产品路径固定为拍照到购买建议 |
| `ui-agent` | 首页单入口，结果页三卡 |
| `ocr-agent` | 图像识别条码、配料、营养、二维码 |
| `nutrition-agent` | 营养解析与风险判断 |
| `rule-agent` | GB2760 / GB28050 和添加剂规则 |
| `decision-agent` | 输出推荐、谨慎、不建议、信息不足 |
| `compare-agent` | A/B 商品对比 |
| `eval-agent` | 自动评测 |
| `fix-agent` | 根据失败项进入下一轮修复 |
| `review-agent` | 独立检查 UI 清晰度、功能价值、决策输出和 OCR 工具化倾向 |

## 数据结构

统一输出字段：

- `product`
- `ingredient_analysis`
- `nutrition_analysis`
- `decision_result`
- `comparison_result`
- `user_profile`
- `behavior_log`
- `evaluation_case`

后端当前实现位于：

- `backend/src/services/decisionAgentService.ts`
- `backend/src/routes/decision.ts`
- `backend/src/data/evaluationCases.ts`

## UI 合同

首页：

- 只显示 `拍照识别`。

结果页：

- 结论卡：推荐 / 谨慎 / 不建议 / 信息不足。
- 风险卡：最多 3 条原因。
- 替代推荐卡：最多 3 条建议。
- 底部轻动作：对比上一款、收藏建议或加入避雷、反馈。

禁止：

- OCR 原文。
- 技术字段。
- 长文本分析。
- 单成分搜索入口。

## 用户画像

当前支持：

- 控糖。
- 减脂。
- 儿童。
- 过敏。
- 乳糖不耐。

## 评测和续跑

```bash
npm run eval:all
```

每轮写入：

- `reports/evaluation/eval-all-report.json`
- `reports/evaluation/eval-all-report.md`
- `reports/evaluation/decision-cases-report.json`
- `reports/evaluation/review-agent-report.json`
- `reports/evaluation/iteration-report.json`
- `reports/evaluation/iterations/<iteration_id>.json`
- `.codex/state/checkpoint.json`

checkpoint 字段：

- `iteration_id`
- `current_stage`
- `completed_tasks`
- `failed_tasks`
- `metrics`
- `ui_state`
- `decision_quality`
- `failed_cases`
- `next_actions`

强化指标：

- `stability_score`
- `regression_detection`
- `decision_quality_score`
- `ui_clarity_score`

恢复执行时先读取 `.codex/state/checkpoint.json`，继续 `next_actions`。
