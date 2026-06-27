# 成分镜

成分镜是微信小程序食品购买决策系统。用户只需要拍食品包装，系统输出“这个东西该不该买”，而不是展示识别原文或技术分析。

## 当前主路径

```text
拍照识别 -> 标签/商品识别 -> 营养与规则分析 -> 购买建议
```

首页只有一个入口：`拍照识别`。

结果页只保留三张卡：

- 结论卡：推荐 / 谨慎 / 不建议 / 信息不足，包含适合和不适合人群。
- 风险卡：最多 3 条风险原因。
- 替代推荐卡：最多 3 条替代选择建议。

## 核心能力

- 多 Agent 决策服务：`product-agent`、`ui-agent`、`ocr-agent`、`nutrition-agent`、`rule-agent`、`decision-agent`、`compare-agent`、`eval-agent`、`fix-agent`、`review-agent`。
- 单品购买建议：`POST /api/decision/analyze`。
- A/B 商品对比：`POST /api/decision/compare`，输出更健康、更低风险、更适合画像。
- 用户画像：控糖、减脂、儿童、过敏、乳糖不耐。
- 断点续跑：`.codex/state/checkpoint.json`。
- 自动评测：`npm run eval:all`，包含 `stability_score`、`regression_detection`、`decision_quality_score`、`ui_clarity_score`。
- 独立评审：`npm run review:agent`，检查 UI 清晰度、决策价值和 OCR 工具化倾向。

## 当前架构

- `user-uniapp/`：微信小程序用户端，uni-app + Vue3。
- `backend/`：Node.js + TypeScript + Hono 决策 API。
- `backend/src/data/`：后端数据种子和 GB2760 校验引用的静态数据。旧根 `src/` 前端原型已删除。
- `reports/evaluation/`：每轮评测报告。
- `.codex/state/checkpoint.json`：持续执行 checkpoint。

## 常用命令

```bash
npm run lint
npm run eval:all
npm run user:build:mp-weixin
npm --prefix backend run dev
```

更多命令见 [`COMMANDS.md`](./COMMANDS.md)，产品说明见 [`docs/decision-system.md`](./docs/decision-system.md)。
