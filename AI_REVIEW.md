# AI Review - 2026-06-12 Data 1-C 数据版本与审核状态

## 本轮目标

按 `CODEX_TASKS.md` 当前可执行批次推进：

- Data Batch 1-C：数据版本管理与审核状态后台化

本批次不处理官方来源逐条审核、真实 OCR Key、真实 AI Key、生产数据库、自动部署、远程服务器操作、支付订阅、商店上架、iOS/Android 签名或生产图片/CDN 存储。

## 本轮完成

1. `backend/src/db/schema.ts` 为 `ingredients` 新增 `reviewed_by`、`reviewed_at`、`change_note`，并为 `confidence_level`、`data_version` 新增索引。
2. 新增 Drizzle migration `backend/src/db/migrations/0006_cute_leo.sql` 和对应 meta snapshot。
3. `backend/src/routes/ingredients.ts` 支持 `confidenceLevel=high|medium|low|unverified`，非法值返回 `400 invalid_parameter`。
4. `backend/src/services/ingredientService.ts` 在列表/search 查询中按 `confidenceLevel` 过滤；seed upsert 支持导入审计选项，并在已有记录版本变化时才更新 `change_note` 和 `reviewed_at`。
5. `backend/scripts/seed.ts` 支持 `--version`、`--reviewed-by`、`--change-note` 参数，并输出本次导入版本。
6. `src/services/ingredientApiService.js` 会把前端筛选中的 `confidenceLevel` 传给后端 API。
7. `src/pages/dataPage.js` 新增来源和可信等级筛选，展示可信等级统计、待审核比例、筛选后的版本/来源/分类摘要。
8. `src/router/router.js` 和 `src/main.js` 支持 `/data?source=...&confidenceLevel=...` 的 hash query 与筛选表单交互。
9. `scripts/test.mjs` 和 `backend/tests/ingredients.test.ts` 补充后端字段、API 参数、数据页筛选和 seed 审计字段断言。
10. `CODEX_TASKS.md`、`PROJECT_PLAN.md`、`COMMANDS.md`、`DATA_SOURCES.md` 已同步。本批次标记完成，整体产品进度更新为 47%。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
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
cd backend && npm run db:seed -- --version 2026-06-v1 --reviewed-by system --change-note "Data 1-C verification"
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/ingredients?confidenceLevel=unverified&limit=5"
curl -i "http://127.0.0.1:3000/api/ingredients?confidenceLevel=trusted&limit=5"
git diff --check
```

以上已通过。数据库验证前发现本地 Docker PostgreSQL 旧卷密码与仓库 `.env` 默认值不一致，已将本机 dev 容器的 `postgres` 密码恢复为 `password` 后重跑迁移和 seed。API 验证显示 `confidenceLevel=unverified` 返回 100 条总量，非法 `trusted` 返回 `400 invalid_parameter`。

## 当前风险

1. `reviewed_by`、`reviewed_at`、`change_note` 只是导入和审核状态基础设施，不代表当前 seed 已完成官方法规审核。
2. 当前 100 条食品添加剂仍全部是 `confidenceLevel: "unverified"`、`isVerified: false`。
3. 生产数据库、备份、发布审计和审核后台仍未完成。
4. `/data` 页筛选基于当前 seed 和本地聚合，仍需要后续后台化审核流支撑正式数据治理。

## 下一步

当前没有无阻塞的 Codex 可直接执行批次。下一项 `Batch A-A：AI 解释层集成` 需要先人工提供 AI API Key 和成本边界；`Data Batch 1-B` 仍需要人工提供官方来源清单和逐条审核样例。
