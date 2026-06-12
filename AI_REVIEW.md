# AI Review - 2026-06-12 Data Batch 1-B 首批官方来源导入

## 本轮目标

按用户确认“继续加官方数据”，先从官方公开来源导入一批可追溯的食品添加剂审核样例，不继续扩展 OCR、AI、订阅、支付或上架空壳功能。

本批次只使用 WHO JECFA Food Additives and Contaminants Database 的精确名称查询和条目页，不使用 AI 生成权威结论。

## 本轮完成

1. `src/data/foodAdditives.js` 新增 JECFA 首批复核覆盖表，数据版本更新为 `food-additives-official-review-v1`。
2. 10 条高频食品添加剂升级为 `reviewStatus: 'reviewed'`、`confidenceLevel: 'medium'`，并写入 JECFA 条目 URL、来源版本、ADI 摘要、审核日期和原始来源片段。
3. 首批条目：`citric-acid`、`sodium-citrate`、`potassium-sorbate`、`sodium-benzoate`、`ascorbic-acid`、`xanthan-gum`、`aspartame`、`sucralose`、`sodium-bicarbonate`、`sodium-cyclamate`。
4. 其余 90 条继续保持 `confidenceLevel: 'unverified'`；全部 100 条仍保持 `isVerified: false`。
5. `usageLimits` 仍全部为空数组，因为 GB 2760 逐食品类别限量尚未完成条款级核验。
6. `npm run validate:data` 新增数据质量报告，输出 reviewed、verified、unverified、缺来源字段、缺限量和来源版本分布。
7. 首页、搜索页、详情页和分析页文案调整为“当前记录 / 审核中”，避免把已 reviewed 的条目继续笼统称为全量草稿。
8. `DATA_SOURCES.md`、`CODEX_TASKS.md`、`PROJECT_PLAN.md` 和测试断言已同步，整体产品进度更新为 49%。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| GB 2760 条款级限量 | blocked_by_user | 官方标准版本、条款编号、适用食品类别和最大使用量 |
| Data Batch 1-B 后续 90 条审核 | in_progress | 下一批优先条目或完整官方来源样例 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
cd backend && npm run db:migrate
cd backend && npm run db:seed -- --version food-additives-official-review-v1 --reviewed-by codex --change-note "JECFA official review batch 1"
git diff --check
```

以上已通过。本地 PostgreSQL 汇总确认：90 条 `draft / unverified / is_verified=false`，10 条 `reviewed / medium / is_verified=false`。

## 当前风险

1. JECFA reviewed 只代表条目和 ADI 摘要已从官方数据库核对，不代表中国 GB 2760 使用范围和限量已核验。
2. `isVerified` 仍全部为 false；不能在产品文案里展示为权威或已验证结论。
3. `sodium-benzoate` 的 JECFA ADI 摘要已按当前 JECFA 查询结果改为 `0-20 mg/kg bw`，后续需要和 GB 2760、Codex、EU 条款一起做冲突核验。
4. 焦糖色当前 seed 是汇总项，而 JECFA 按 Class I-IV 分项评价，本批次未升级，避免混淆不同类别。

## 下一步

继续 Data Batch 1-B：按同样规则导入下一批官方来源条目，优先补 GB 2760 条款级限量和高频防腐剂、甜味剂、着色剂。
