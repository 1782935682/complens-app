# AI Review — 2026-06-15 Batch STACK-C backend API framework

## 本轮目标

拉取最新 `origin/main` 后继续当前最早未完成且未阻塞的 Batch：STACK-C 后端 API 框架规范化。

本轮只做架构和 API 契约文档同步，不改业务代码、不创建第二套后端、不空建 `providers` / `validators` / `jobs` 目录。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ARCHITECTURE_SPEC.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `backend/src/app.ts`
- `backend/src/index.ts`
- `backend/package.json`
- `backend/src/routes/*`
- `backend/src/services/*`

## 已确认现状

1. 当前后端只有一套 Node.js + Hono 服务，入口为 `backend/src/app.ts` / `backend/src/index.ts`。
2. 当前真实路由模块为 `auth` / `health` / `ingredients` / `ocr` / `user` / `gb2760`。
3. 当前真实服务层为 `authService` / `ingredientService` / `ocrProviders` / `userService` / `gb2760*Service`。
4. `labels` / `nutrition` / `reports` 消费者主路径后端 API 仍是计划项；`user-uniapp` 当前依赖本地 parser、mock-only adapter 和本地报告存储完成 MVP。
5. 生产 OCR / AI Key 仍为人工阻塞，不影响 manual/mock/rapidocr 和后端抽象边界。

## 已完成修改

1. `ARCHITECTURE_SPEC.md`：补充 `backend/src` 真实目录结构、现有路由责任边界和 STACK-C 后端分层规则。
2. `API_CONTRACT.md`：补充后端分层表、新增 API 落地规则、消费者主路径后端化顺序，以及 `labels` / `nutrition` / `reports` 计划接口的路由归属。
3. `CODEX_TASKS.md`：将 STACK-C 标记为已完成，并把下一批指向 STACK-D 后台规划。
4. `PROJECT_PLAN.md`：更新整体进度、M12 进度、下一步计划和修改记录。

## 验证计划

- `git diff --check`

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. `labels` / `nutrition` / `reports` 后端接口尚未实现；正式端仍需在后续批次减少本地 adapter 依赖。
2. `admin-web` 仍是计划工程；未得到启动确认前不能写成已创建。
3. OCR 配置名从 `OCR_SERVICE_URL` 统一到 `OCR_LOCAL_URL` 仍需单独配置迁移批次处理。
