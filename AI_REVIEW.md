# AI Review — 2026-06-15 Batch STACK-D admin-web planning

## 本轮目标

PR #93 合并后继续当前最早未完成且未阻塞的 Batch：STACK-D 后台管理端 `admin-web` 规划。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不改业务代码，不把任何后台计划页面写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `backend/src/routes/gb2760.ts`
- `backend/src/routes/ingredients.ts`

## 已确认现状

1. 独立后台工程 `admin-web/` 尚未创建。
2. 现有后台相关真实能力主要是嵌在旧前端的 GB2760 复核页和后端 `/api/gb2760/*` 内部接口。
3. 后台 API 只能通过现有 `backend/` 访问数据，不得直连数据库、OCR 服务、AI 服务、GB2760 导入脚本或密钥。
4. 会员、订阅、订单、支付、上架均需要外部账号和法务材料，继续后置或标记人工阻塞。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：新增 STACK-D 工程边界，明确 `admin-web/` 目标技术栈、目录结构、MVP 启动范围、非 MVP 范围、权限边界和密钥展示限制。
2. `PAGE_STRUCTURE.md`：新增后台壳与路由分组，覆盖 Dashboard、用户与会员、内容运营、食品标签业务、数据治理、Provider、系统配置、权限审计。
3. `API_CONTRACT.md`：新增后台 API 落地边界，明确复用现有 `/api/gb2760/*` 和 `/api/ingredients*`，新增 `/api/admin/*` 的优先级和禁止直连边界。
4. `CODEX_TASKS.md`：将 STACK-D 标记为已完成，并把下一步指向 ADMIN-A。
5. `PROJECT_PLAN.md`：更新整体进度、M12/M13 状态、下一步计划和最近修改记录。

## 验证计划

- `git diff --check`

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. `admin-web/` 尚未初始化；后续 ADMIN-A/ADMIN-B 仍需继续细化菜单和数据治理 MVP。
2. 当前缺少 OCR 记录、用户反馈、后台 Dashboard 等真实后端表/API；相关页面仍为计划。
3. 后台 RBAC 尚未落地；GB2760 写操作仍依赖 `GB2760_INTERNAL_REVIEWERS` allowlist。
