# PROJECT_PLAN

## 目标

把成分镜保持为微信小程序食品购买决策系统。所有功能必须帮助用户回答：这个东西该不该买。

## 产品边界

- 不做通用 OCR 工具。
- 不展示 OCR 原文。
- 不展示技术字段。
- 不保留单成分搜索入口。
- 不恢复旧 Vite/PWA/Capacitor 前端原型。

## 当前里程碑

| 阶段 | 状态 | 验证 |
|---|---|---|
| 决策 API | 完成 | `backend/tests/decisionAgent.test.ts` |
| 小程序单入口 | 完成 | `npm run user:audit:product-output` |
| 三卡结果页 | 完成 | `npm run user:audit:product-output` |
| A/B 后端对比 | 完成 | `backend/tests/decisionAgent.test.ts` |
| 自动评测 | 完成 | `npm run eval:all` |
| checkpoint | 完成 | `.codex/state/checkpoint.json` |
| 画像化 evaluation cases | 完成 | `backend/scripts/evaluate-decision-cases.ts` |
| UI 决策可视化 | 进行中 | `npm run user:visual:smoke` |

## 当前指标

最新指标见 `reports/evaluation/eval-all-report.md`。

## 后续计划

1. UI-first 决策可视化继续迭代，减少密集文字和重复说明。
2. OCR/配料/营养评测继续迭代到产品验收阈值。
3. 扩展更多真实包装样本，防止决策样本过拟合。
