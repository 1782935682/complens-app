# AI Review - 2026-06-12 Data Batch 1-B JECFA 第二批导入

## 本轮目标

PR #66 合并后继续补官方来源数据。目标是扩大 WHO JECFA 官方数据库的 reviewed 覆盖，同时继续避免把相近条目、分组条目或未核验 GB 2760 限量写成权威结论。

本批次只使用 WHO JECFA Food Additives and Contaminants Database 的查询结果和条目 URL，不使用 AI 生成权威成分结论。

## 本轮完成

1. `src/data/foodAdditives.js` 的数据版本更新为 `food-additives-official-review-v2`。
2. 在首批 10 条基础上新增 22 条 JECFA reviewed / medium 条目，累计 32 条。
3. 新增条目：`pectin`、`calcium-carbonate`、`tartrazine`、`sunset-yellow-fcf`、`allura-red-ac`、`glycerol`、`calcium-chloride`、`sodium-alginate`、`acesulfame-potassium`、`carrageenan`、`guar-gum`、`polysorbate-80`、`sodium-nitrite`、`potassium-nitrate`、`potassium-citrate`、`calcium-citrate`、`lactic-acid`、`sodium-acetate`、`calcium-propionate`、`natamycin`、`propylene-glycol-alginate`、`sodium-carboxymethyl-cellulose`。
4. 当前状态：32 条 `reviewStatus: 'reviewed'` / `confidenceLevel: 'medium'`，68 条 `confidenceLevel: 'unverified'`。
5. 全部 100 条仍保持 `isVerified: false`，`usageLimits` 仍全部为空数组，因为 GB 2760 逐食品类别限量尚未完成条款级核验。
6. `DATA_SOURCES.md` 记录 Batch 2 的 JECFA ID、条目名和 ADI 摘要；`CODEX_TASKS.md`、`PROJECT_PLAN.md` 和测试断言已同步，整体产品进度更新为 50%。

## 未全部补齐的原因

| 条目类型 | 示例 | 当前处理 |
|---|---|---|
| JECFA 分类型，seed 是汇总项 | `caramel-colours` 对应 Caramel Colour Class I-IV | 不升级，避免混用不同 ADI |
| JECFA 按来源或构型拆分，seed 未拆 | `beta-carotene`、`malic-acid` | 不升级，等待拆分或人工归并规则 |
| JECFA 有多个盐/衍生物，seed 是分组 | `saccharins` | 不升级，等待明确用哪一类盐或分组口径 |
| JECFA 精确项和 seed 名称有差异 | `nisin` vs `NISIN A` | 不升级，等待人工确认是否归并 |
| JECFA 只给风味剂语境或无清晰 ADI | 部分酸类、香料类 | 不升级，避免把风味剂评价当作食品添加剂限量 |

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| GB 2760 条款级限量 | blocked_by_user | 官方标准版本、条款编号、适用食品类别和最大使用量 |
| 分组/拆分规则 | blocked_by_user | 焦糖色、糖精类、胡萝卜素、苹果酸、Nisin 等是否拆成多个条目 |
| Data Batch 1-B 剩余 68 条审核 | in_progress | 下一批优先条目或完整官方来源样例 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |

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
cd backend && npm run db:seed -- --version food-additives-official-review-v2 --reviewed-by codex --change-note "JECFA official review batch 2"
git diff --check
```

以上已通过。`npm run validate:data` 输出：reviewed=32、verified=0、unverified=68、missingSourceFields=0、missingUsageLimits=100。本地 PostgreSQL 汇总确认：68 条 `draft / unverified / is_verified=false`，32 条 `reviewed / medium / is_verified=false`。

## 当前风险

1. JECFA reviewed 只代表条目和 ADI 摘要已从官方数据库核对，不代表中国 GB 2760 使用范围和限量已核验。
2. `isVerified` 仍全部为 false；不能在产品文案里展示为权威或已验证结论。
3. 32 条 reviewed 中仍需后续和 GB 2760、Codex、EU 条款做冲突核验。
4. 继续扩大 JECFA 覆盖前，应先明确分组条目是否拆分，否则会在 seed 层面制造不可追溯混淆。

## 下一步

继续 Data Batch 1-B：优先接 GB 2760 条款级限量，或先建立分组条目拆分规则，再继续扩剩余 JECFA reviewed 覆盖。
