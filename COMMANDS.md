# COMMANDS

当前仓库只保留成分镜微信小程序食品购买决策系统相关命令。

## 必跑评测

```bash
npm run eval:all
```

执行内容：

- 后端决策、营养和食品分析测试。
- 后端 TypeScript 类型检查。
- 小程序 TypeScript 类型检查。
- 小程序单入口和三卡结果页审计。
- `review-agent` 独立评审 UI 清晰度、功能价值、决策输出和 OCR 工具化倾向。
- OCR、配料、营养、条码/二维码历史样本指标汇总。
- 写入 `reports/evaluation/eval-all-report.json`、`reports/evaluation/eval-all-report.md`。
- 写入 `reports/evaluation/review-agent-report.json` 和 `reports/evaluation/iteration-report.json`。
- 写入 `.codex/state/checkpoint.json`。

## 根命令

```bash
npm run lint
npm run test
npm run eval:all
npm run review:agent
npm run loop
```

`npm run test` 当前等价于执行统一评测。`npm run loop` 会按 checkpoint 继续评测循环。

## 小程序

```bash
npm run user:dev:h5
npm run user:build:h5
npm run user:dev:mp-weixin
npm run user:build:mp-weixin
npm run user:typecheck
npm run user:audit:product-output
npm run user:visual:smoke
```

微信小程序导入和域名配置见 [`docs/platform/wechat-mini-program.md`](./docs/platform/wechat-mini-program.md)。

## 后端

```bash
npm --prefix backend run dev
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
```

决策 API：

- `POST /api/decision/analyze`
- `POST /api/decision/compare`

## 数据和规则

```bash
npm run validate:data
npm run validate:gb2760
npm run ingredient:validate
npm run ingredient:coverage
npm run ocr:evaluate
npm run product-code:evaluate
```

GB2760 和普通配料静态数据位于 `backend/src/data/`，由后端种子、GB2760 校验和 `validate:data` 复用。
