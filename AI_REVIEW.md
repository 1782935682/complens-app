# AI Review — 2026-06-15 Batch ADMIN-D content operations

## 本轮目标

PR #97 合并后继续当前最早未完成且未阻塞的 Batch：ADMIN-D 内容运营后台页面/API 规划。

本轮只做规划文档同步，不创建 `admin-web/` 工程，不新增后端接口，不把内容发布、协议版本或法务确认写成已实现。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `docs/product-blueprint/DATA_TRUST_SPEC.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `src/data/legalContent.js`
- `src/pages/legalPage.js`
- `user-uniapp/src/pages/privacy/index.vue`
- `user-uniapp/src/pages/data-sources/index.vue`

## 已确认现状

1. `admin-web/` 仍未创建，ADMIN-D 仍是页面/API 计划。
2. `src/data/legalContent.js` 是旧前端法律文案草案，正式隐私政策、用户协议、订阅说明和数据安全说明仍需人工/法务确认。
3. `user-uniapp` 已有数据说明和隐私说明页面，但没有后台内容发布、公告、Banner、FAQ 或协议版本接口。
4. `API_CONTRACT.md` 已有内容运营计划接口，但需要拆清公告、Banner、首页场景卡、普通内容和法律文档版本管理的发布/审计边界。
5. 内容运营文案必须遵守数据可信和隐私合规规范，不得把 OCR、AI、未验证数据或法律草案包装成权威结论。

## 已完成修改

1. `ADMIN_CONSOLE_SPEC.md`：新增 ADMIN-D 内容运营页面/API 矩阵，覆盖公告、Banner、首页场景卡、FAQ、数据说明文案、隐私政策/用户协议版本管理。
2. `API_CONTRACT.md`：补充公告、Banner、首页场景卡、普通内容、法律文档版本管理的计划接口、字段、状态枚举、平台范围、审计和人工/法务边界。
3. `PAGE_STRUCTURE.md`：登记 ADMIN-D 目标路由、第一版数据入口和状态边界。
4. `CODEX_TASKS.md`：将 ADMIN-D 标记为已完成，并把下一步切到 ADMIN-F/G/H；ADMIN-E 支付订阅继续人工阻塞。
5. `PROJECT_PLAN.md`：更新整体进度、M13 后台管理进度、下一步计划和最近修改记录。

## 验证计划

- `git diff --check`
- 本地自审：检查是否把内容运营接口写成已实现，是否把法律草案写成已法务确认，是否遗漏发布审计、平台范围和禁用词边界。

未计划运行 build/test：本轮是纯文档和任务状态修改，不触达业务代码、依赖、构建入口、路由实现、数据库 schema 或数据文件。

## 剩余风险

1. ADMIN-D 仍缺真实后台内容 API、权限模型、审计日志和 `admin-web/` 页面。
2. 隐私政策、用户协议、订阅说明和数据安全说明最终版必须人工/法务确认。
3. 内容图片/asset 管理、外链白名单和内容安全审核仍需后续产品化设计。
