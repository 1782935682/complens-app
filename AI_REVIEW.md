# AI Review — 2026-06-15 Batch ADMIN-F/G/H operations, security and config planning

## 本轮目标

PR #98 合并后继续原计划，跳过 ADMIN-E 会员订阅/支付人工阻塞，执行 ADMIN-F / ADMIN-G / ADMIN-H：OCR/AI 监控、权限审计、系统配置与功能开关页面/API 规划。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不新增后端接口，不创建 RBAC/config/log 表，不把 OCR/AI 成本、Provider 配置、权限系统或系统配置写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/API_CONTRACT.md`

## 已确认现状

1. `admin-web/` 仍未创建，后台规划仍是文档/API 契约阶段。
2. 真实后端已存在 `POST /api/ocr` 和 OCR provider 抽象；但后台 OCR 日志、OCR 指标、Provider 状态和成本统计接口均未实现。
3. AI Key 和模型选型未提供，AI Provider、AI 调用日志和 AI 成本只能规划，不能伪造可用状态或成本数据。
4. GB2760 写操作目前由 `GB2760_INTERNAL_REVIEWERS` allowlist 保护；完整 admin RBAC、管理员管理、操作日志和审计日志仍未实现。
5. 系统配置、平台配置、版本配置、分享、通知、SDK 清单均无后台接口；密钥、证书、支付凭证和商店材料不得进入前端配置响应。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：
   - 新增 ADMIN-F OCR/AI/Provider 页面/API 矩阵，覆盖 OCR Provider 状态、OCR 失败日志、OCR 指标、AI Provider 状态、AI 日志、成本统计和降级策略。
   - 新增 ADMIN-G 权限与审计页面/API 矩阵，覆盖管理员、角色权限、操作日志、审计日志、reviewer allowlist 状态和当前权限自检。
   - 新增 ADMIN-H 系统配置页面/API 矩阵，覆盖功能开关、平台配置、版本配置、分享、通知和第三方 SDK 配置。
2. `API_CONTRACT.md`：
   - 补充 `/api/admin/providers/ocr`、`/api/admin/ocr-logs`、`/api/admin/ocr-metrics`、`/api/admin/providers/ai`、`/api/admin/ai-logs`、`/api/admin/cost-summary`、`/api/admin/degradation-policies` 等计划接口。
   - 补充 `/api/admin/platform-config`、`/api/admin/app-versions`、`/api/admin/share-config`、`/api/admin/notification-config`、`/api/admin/sdk-config` 等计划接口。
   - 补充 `/api/admin/me/permissions`、`/api/admin/reviewer-access`、`/api/admin/operation-logs`、`/api/admin/audit-logs` 等权限与审计计划接口。
3. `PAGE_STRUCTURE.md`：
   - 登记 ADMIN-F/G/H 目标路由、第一版数据入口和状态边界。
4. `CODEX_TASKS.md`：
   - 将 ADMIN-F/G/H 标记为已完成。
   - 保留 ADMIN-E 为 `blocked_by_user`。
   - 将下一步切到消费者标签后端 API：`labels` → `nutrition` → `reports`。
5. `PROJECT_PLAN.md`：
   - 更新整体进度到约 79%，M13 后台管理进度到约 40%。
   - 同步已完成、未完成、下一步和最近修改记录。

## 验证计划

- `git diff --check`
- 本地自审：
  - 检查是否把计划接口写成已实现。
  - 检查是否暴露 OCR/AI Key、token、支付凭证或敏感图片。
  - 检查 AI Key 未提供时是否保持 blocked/未配置表达。
  - 检查配置开关是否绕过后端鉴权、数据可信、OCR 文本确认或人工阻塞边界。

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. ADMIN-F/G/H 仍缺真实后端 API、数据库表、后台页面和权限中间件。
2. OCR/AI 日志与成本统计需要后续实际调用日志表和 provider 计费口径支撑。
3. RBAC、管理员管理、操作日志和审计日志还需要后续 schema/API/admin-web 实现。
4. 平台版本、通知、SDK、支付/订阅和法务材料仍依赖人工账号、平台权限和法律确认。
