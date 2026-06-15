# AI Review — 2026-06-15 Batch ADMIN-C user and feedback management

## 本轮目标

PR #96 合并后继续当前最早未完成且未阻塞的 Batch：ADMIN-C 用户与反馈管理页面/API 规划。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不新增后端接口，不把计划接口写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `backend/src/routes/auth.ts`
- `backend/src/routes/user.ts`
- `backend/src/services/userService.ts`
- `backend/src/db/schema.ts`
- `src/services/supportService.js`
- `src/services/storageService.js`
- `user-uniapp/src/stores/scanStore.ts`
- `user-uniapp/src/services/api/labels.ts`

## 已确认现状

1. `admin-web/` 仍未创建，ADMIN-C 仍是页面/API 计划。
2. 现有 `/api/user/*` 只服务当前登录用户的收藏、历史、过敏/关注项、报告和产品档案同步，不能直接作为后台跨用户查询接口。
3. `users`、`sessions`、`user_reports`、`product_archives` 等表已存在，但没有后台聚合查询、用户状态、设备管理、扫描会话、反馈工单或管理员审计接口。
4. 旧 `supportService` 是客户端本地 markdown/复制反馈流，没有后端反馈表和处理状态。
5. 用户邮箱、联系方式、报告原文、OCR 原文、过敏/忌口/关注项和图片引用均需按敏感字段处理；后台写操作必须有权限和审计。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：新增 ADMIN-C 用户与反馈管理页面/API 矩阵，覆盖用户列表、用户详情、设备登录、扫描记录、报告记录、产品档案、用户反馈、禁用/恢复。
2. `API_CONTRACT.md`：补充 `/api/admin/users/:id/devices`、`/api/admin/label-scans`、`/api/admin/reports`、`/api/admin/products`、`GET/PATCH /api/admin/feedback` 计划接口，并明确现有 `/api/user/*` 的当前用户边界；公开反馈提交保留 `POST /api/feedback` 计划入口。
3. `PAGE_STRUCTURE.md`：登记 ADMIN-C 目标路由、第一版数据入口和状态边界。
4. `CODEX_TASKS.md`：将 ADMIN-C 标记为已完成，并把下一步切到 ADMIN-D。
5. `PROJECT_PLAN.md`：更新整体进度、M13 后台管理进度、下一步计划和最近修改记录。

## 验证计划

- `git diff --check`
- 本地自审：检查是否把 `/api/user/*` 误写成后台跨用户接口，是否把公开反馈提交误放进 admin 命名空间，是否把反馈处理、禁用/恢复、扫描会话写成已实现，是否遗漏隐私脱敏和审计边界。

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. ADMIN-C 仍缺真实后台聚合 API 和 `admin-web/` 页面。
2. 用户状态、设备登录、反馈工单、扫描会话需要后续 schema / route / service / audit 设计后才能实现。
3. 隐私政策、客服流程和用户支持处理 SOP 需要后续人工确认。
