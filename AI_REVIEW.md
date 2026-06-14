# AI Review — 2026-06-15 架构与后台规划文档优化

## 本轮目标

作为 CompLens / 成分镜 项目的架构规划与任务优化 Agent，审查并优化跨端产品、后端 API、后台管理、数据治理、用户会员运营相关文档。

本轮只修改文档、架构规划、任务计划和开发路线，不修改业务代码，不删除旧代码，不部署，不安装依赖，不导入 GB2760 PDF。

## 已检查文件

- `docs/product-blueprint/ARCHITECTURE_SPEC.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/PRODUCT_SPEC.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `docs/product-blueprint/README.md`
- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `AGENTS.md`
- `README.md` / `readme.md`
- `COMMANDS.md`
- `package.json`
- `backend/package.json`
- 现有目录结构：`backend/`、`src/`、`ios/`、`android/`

## 修复的问题

1. 新增 `ARCHITECTURE_SPEC.md`，明确正式用户端为 `user-uniapp`（uni-app + Vue3）、后台为 `admin-web`（Vue3 + TDesign Web）、后端复用现有 `backend/`（Hono + Drizzle + PostgreSQL）。
2. 将旧 `src/` 纯 JS + Vite 前端定位为历史 Web/PWA 原型和迁移来源：保留、不删除、不继续承载复杂新业务。
3. 明确本项目必须有后端，所有端通过后端 API 调用 OCR、AI、数据库、报告、历史、用户、会员、后台和数据治理能力。
4. 明确 OCR 服务链路：用户端 / 小程序 / App → 后端 API → OCR Provider → Python FastAPI OCR Service → RapidOCR；OCR 服务不暴露公网，前端不直连。
5. 补齐后台定位：产品运营后台 + 数据治理后台 + 系统配置后台 + 权限审计后台，不再只写 GB2760 / 添加剂后台。
6. 在 `ADMIN_CONSOLE_SPEC.md` 补齐用户与会员、订阅订单、公告 Banner、内容运营、系统配置、功能开关、OCR/AI 成本监控、角色权限和审计日志。
7. 在 `API_CONTRACT.md` 补充后台计划 API，并明确这些接口未实现，不得当作已落地调用。
8. 在 `CODEX_TASKS.md` 新增“统一跨端技术栈重构”和“后台管理系统规划”阶段，拆分 `STACK-A..F`、`ADMIN-A..H`。
9. 同步 `PROJECT_PLAN.md`、`AGENTS.md`、`README.md`、`readme.md`、`COMMANDS.md`、`UI_ROADMAP.md`、`QA_ACCEPTANCE_SPEC.md` 的技术路线、分期和验证边界。

## 仍有风险

1. `user-uniapp/` 和 `admin-web/` 尚未创建，当前只是规划；后续不能把计划命令写成已实现命令。
2. 现有 `src/` 前端仍承载已落地原型能力，后续需要按迁移策略逐步迁移，不能一次性删除或大改。
3. 当前后端已经是 Hono + Drizzle + PostgreSQL，应优先复用；若后续改框架，需要单独迁移方案，不应创建第二套服务。
4. OCR 当前代码仍使用 `OCR_SERVICE_URL` 和 8000 端口，本轮文档规划了 `OCR_LOCAL_URL=http://127.0.0.1:18080/ocr` 目标；后续需要专门配置迁移，避免两个变量长期并存。
5. 会员、订阅、支付、IAP、微信支付、国内渠道、上架和隐私协议版本管理均需要人工账号或法务材料，当前只能规划，不得伪造真实支付闭环。

## 建议 Codex 下一步

1. 提交本轮架构与后台规划文档 PR，合并前只需文档级检查。
2. PR 合并后先执行 `STACK-A`：确认现有 backend/frontend/Capacitor 结构并形成迁移方案。
3. 再执行 `STACK-B/STACK-C`：规划 `user-uniapp` 工程和现有后端 API 规范化，然后回到消费者标签识别和营养解析实现。
