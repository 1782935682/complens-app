# AI Review - 2026-06-12 R-A 食品配料分析报告页

## 本轮目标

按 `CODEX_TASKS.md` 当前最早可执行的 Codex 批次推进：

- Batch R-A：食品配料分析报告页

本批次不处理等待人工确认的官方数据导入、生产数据库、真实 OCR Key、真实 AI Key、商店账号、支付和法务材料。

## 本轮完成

1. 新增 `src/services/reportService.js`，集中生成和归一化食品配料分析报告。
2. 报告模型升级到 `schemaVersion: 3`，保留旧报告兼容字段，并新增 `originalText`、`parsedIngredients`、`matchResults`、`riskGrade`、`riskSummary`、`unmatchedTerms`、`lowConfidenceTerms` 和 `matchRate`。
3. 新增整体评级 A/B/C/D/F，按高关注和中等关注成分数量计算，报告页用大号评级卡展示。
4. 新增关注摘要、配料顺序说明、食品添加剂分类统计、未收录/普通原料区、特殊人群提示、过敏原命中和数据来源说明。
5. 新增 `src/pages/reportDetailPage.js`，报告详情支持删除、分享、重新分析、返回报告列表、复制 Markdown、下载 Markdown 和下载 JSON。
6. `src/router/router.js` 增加 `/report/:id` 别名，保留 `/reports/:id` 兼容。
7. `src/services/shareService.js` 改为分享报告摘要链接，指向可打开的报告详情页。
8. `src/services/reportExportService.js` 的 Markdown/JSON 导出同步输出整体评级、关注摘要、配料顺序和结构化匹配数据。
9. `src/store/userStore.js` 保存报告时统一走报告服务，单类别报告保留上限从 20 条提升到 50 条。
10. `scripts/lint.mjs` 增加更严格的绝对化和恐吓式表达禁用词，避免报告文案越过医疗/安全边界。
11. `scripts/test.mjs` 补充报告评级、详情渲染、路由别名、导出、分享和 50 条保留上限断言。

## 人工阻塞

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |
| Apple / Google 开发者账号 | blocked_by_user | App Store / Google Play 账号、签名证书和测试设备 |
| 支付与合规材料 | blocked_by_user | IAP/Billing 商品、正式隐私政策、服务条款和法务复核 |

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

全部通过。

## 当前风险

1. 100 条食品添加剂 seed 仍全部是 `confidenceLevel: "unverified"`、`isVerified: false`，报告只透明展示草稿状态，不把数据写成已审核结论。
2. 真实 OCR 尚未接入；当前报告可以从手动/确认文本生成，但不能视为真实拍照自动识别完成。
3. 真实 AI 尚未接入；报告总结来自本地规则和现有数据，不是模型生成的个性化建议。
4. 尚未做浏览器 E2E、PDF/图片导出、真机相机/分享验收和跨设备报告同步验收。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch F-A：产品档案与 IndexedDB 图片存储`。
