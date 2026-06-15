# AI Review — 2026-06-15 Batch ADMIN-A information architecture

## 本轮目标

PR #94 合并后继续当前最早未完成且未阻塞的 Batch：ADMIN-A 后台信息架构与菜单。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不改业务代码，不把任何后台计划页面写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `docs/product-blueprint/API_CONTRACT.md`

## 已确认现状

1. `admin-web/` 仍未创建，后台管理端只处于规划阶段。
2. 现有后台相关真实能力仍主要是 GB2760 复核旧页和后端 `/api/gb2760/*`、`/api/ingredients*` 能力。
3. 后台菜单必须覆盖产品运营、数据治理、业务监控、系统配置、权限审计，而不是只剩 GB2760 / 添加剂。
4. 会员、订阅、订单、支付、上架均不进入 MVP 强制项；账号和法务材料未提供前不得实现或伪造真实支付闭环。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：新增 ADMIN-A 信息架构矩阵，按一级菜单、二级页面、阶段、状态和 MVP 边界登记 Dashboard、用户与会员、内容运营、食品标签业务、数据治理、OCR/AI/Provider、系统配置、权限与审计。
2. `PAGE_STRUCTURE.md`：补后台导航落地规则，固定一级导航顺序，明确 MVP 默认展开范围、计划入口和支付/订阅不上 MVP。
3. `UI_ROADMAP.md`：补 ADMIN-A 收口说明，明确本批不创建工程，后续 ADMIN-B 转向数据治理后台 MVP 页面/API 复用。
4. `CODEX_TASKS.md`：将 ADMIN-A 标记为已完成，并把下一步切到 ADMIN-B。
5. `PROJECT_PLAN.md`：更新整体进度、M13 后台管理系统进度、下一步计划和最近修改记录。

## 验证计划

- `git diff --check`
- 本地自审：检查是否存在把计划目录/页面写成已实现、支付订阅进入 MVP、或遗漏任务状态同步的问题。

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. `admin-web/` 尚未初始化；后续 ADMIN-B 仍是文档/API 计划优先，不应提前堆空壳代码。
2. 后台数据治理 MVP 的页面/API 复用还需继续细化，尤其是 `pending_review`、签核审计和只读/写权限边界。
3. 用户、内容、会员、成本、RBAC、系统配置后续批次仍需分阶段规划，不能被 ADMIN-A 的菜单矩阵误读为已实现。
