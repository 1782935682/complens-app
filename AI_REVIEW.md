# AI Review - 2026-06-12 F-A 产品档案与 IndexedDB 图片存储

## 本轮目标

按 `CODEX_TASKS.md` 当前最早可执行的 Codex 批次推进：

- Batch F-A：产品档案与 IndexedDB 图片存储

本批次不处理等待人工确认的官方数据导入、生产数据库、真实 OCR Key、真实 AI Key、生产 CDN 图片存储、商店账号、支付和法务材料。

## 本轮完成

1. 新增 `src/services/productArchiveService.js`，提供产品档案建档、归一化、搜索过滤、分页、收藏切换、删除、清空和 100 条本地容量控制。
2. 产品档案 localStorage key 为 `compcheck:products`，只保存元数据、`imageId` 和小缩略图；完整图片仍通过现有 `imageStoreService` 保存在 IndexedDB。
3. 新增 `src/pages/productArchivePage.js`，支持 `/products` 列表和 `/product/:id` 详情页，展示产品名、品牌、缩略图、评级、分析日期、原文预览、收藏状态和完整报告链接。
4. 报告详情页新增“保存为产品档案 / 查看产品档案”入口，报告和产品通过 `reportId` 关联。
5. OCR 确认进入分析时不再提前删除图片；保存报告时把 pending scan 的 `imageId` 写入报告，建档时可读取 IndexedDB 图片生成缩略图。
6. 本机数据摘要、导出、导入和清空流程纳入产品档案，设置页展示产品档案数量。
7. storageService 新增 `compcheck:products` 登录态同步配置，按 `id` 合并 pending writes。
8. 后端新增 `product_archives` Drizzle schema、migration 和 `/api/user/products` API：列表搜索/过滤/分页、详情、创建、批量替换、PATCH 更新和删除。
9. `scripts/test.mjs` 和 `backend/tests/user.test.ts` 补充产品档案服务、路由、页面、localStorage 边界和后端 API 回归断言。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| 本地数据库迁移 | blocked_by_environment | 当前 Docker `postgres-data` volume 的 `postgres` 密码与 `backend/.env` 的 `postgres:password` 不一致；需人工决定是否重建本地 volume 或提供正确 `DATABASE_URL` |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| 生产图片/CDN 存储 | blocked_by_user | 对象存储/CDN 方案、上传 API、安全策略和缩略图 URL 策略 |
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
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
git diff --check
```

全部通过。

`cd backend && npm run db:migrate` 已尝试执行，但因本地 Postgres 密码认证失败未能应用迁移。容器存在且 `backend/.env` 为 `postgres://postgres:password@localhost:15432/compcheck`，Postgres 日志显示 `password authentication failed for user "postgres"`。

## 当前风险

1. 产品档案基础链路已完成，但 F-B 的历史列表、收藏管理和批量管理仍未完成。
2. 完整图片目前只在本机 IndexedDB，生产 CDN/对象存储仍未接入，跨设备只能同步元数据和缩略图。
3. 100 条食品添加剂 seed 仍全部是 `confidenceLevel: "unverified"`、`isVerified: false`，产品档案和报告都不能视为已审核结论。
4. 真实 OCR 尚未接入；当前图片链路能保留图片和手动/确认文本，但不能视为真实自动识别完成。
5. 尚未做真机相机、图片缩略图质量、离线同步队列和生产迁移验收。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch F-B：历史列表与产品收藏管理`。
