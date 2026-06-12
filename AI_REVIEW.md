# AI Review - 2026-06-12 Batch U-B 关注/忌口云同步

## 本轮目标

在 `CODEX_TASKS.md` 当前无立即可执行批次、A-A 仍等待 AI API Key 的情况下，补齐 `PROJECT_PLAN.md` 已列出的 P1 缺口：

- Batch U-B：关注成分与忌口项跨设备同步

本批次不处理真实 AI Key、真实 OCR Key、生产数据库、官方来源逐条审核、自动部署、远程服务器操作、支付订阅、商店上架、iOS/Android 签名或生产图片/CDN 存储。

## 本轮完成

1. `backend/src/db/schema.ts` 新增 `user_profile_ingredients` 表，按 `user_id + kind(watch/avoid) + ingredient_id` 存储登录用户个人关注/忌口成分。
2. 新增 Drizzle migration `backend/src/db/migrations/0007_tricky_marvel_zombies.sql` 和对应 meta snapshot。
3. `backend/src/services/userService.ts` 新增 `listProfileIngredients` / `replaceProfileIngredients`，保持 whole-set replace 语义并保留用户设置顺序。
4. `backend/src/routes/user.ts` 新增 `GET/PUT /api/user/profile/:kind`，仅接受 `watch` 和 `avoid`，非法 kind 或非字符串条目返回 `400 invalid_parameter`。
5. `src/services/storageService.js` 将 `compcheck:watch-ingredients`、`compcheck:avoid-ingredients` 接入现有 hydrate-before-write 云同步流程；未登录时仍保持本机 localStorage 行为。
6. `backend/tests/user.test.ts` 补充 profile API route 测试；`scripts/test.mjs` 补充 schema、migration、route、service 和前端同步路径断言。
7. `CODEX_TASKS.md`、`PROJECT_PLAN.md`、`COMMANDS.md` 已同步，整体产品进度更新为 48%。

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
git diff --check
```

以上已通过。`npm run db:migrate` 已成功应用 `0007_tricky_marvel_zombies.sql`，创建 `user_profile_ingredients` 表。

## 当前风险

1. 本批次只补云同步 API 和前端自动同步触发，不等同于完成真实跨设备验收；仍需用两个浏览器 profile 或两台设备登录同一账号验证恢复。
2. 关注/忌口同步当前按成分 id 存储，依赖前端继续过滤未知或已下线成分 id。
3. 离线写入队列仍未完成；当前网络失败时保持本机可用，下一次登录态读写再尝试同步。

## 下一步

当前按 `CODEX_TASKS.md` 仍没有无阻塞的下一批次。下一项 `Batch A-A：AI 解释层集成` 需要先人工提供 AI API Key 和成本边界；真实 OCR 供应商接入仍等待 OCR API Key。
