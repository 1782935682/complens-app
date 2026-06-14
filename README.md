# CompLens / 成分镜

面向普通消费者的**食品标签拍照解读与消费决策助手**：拍一下食品包装，帮助用户看懂配料、营养、卖点和需要关注的地方。

本仓库的当前项目入口在 [`readme.md`](./readme.md)。

产品、消费者决策、UI、前端、跨端、API、数据可信、后台、隐私合规、测试验收规范统一见 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)。Codex/Agent 开发规则见 [`AGENTS.md`](./AGENTS.md)，任务清单见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)。

当前架构策略：

- 用户端正式路线：`user-uniapp/`，uni-app + Vue3，目标覆盖 H5/PWA、微信小程序、Android、iOS。
- 当前 `src/` Vite 前端：历史 Web/PWA 原型和迁移来源，保留但不继续堆复杂新业务。
- 后台管理端：`admin-web/`，Vue3 + TDesign Web，单独建设产品运营、数据治理、系统配置和权限审计后台。
- 后端：复用现有 `backend/` Hono + Drizzle + PostgreSQL，作为所有端唯一 API 入口。
