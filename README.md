# CompLens / 成分镜（CompCheck）

面向普通消费者的**食品标签拍照解读与消费决策助手**。一句话定位：**「拍一下，看懂配料表」**。

> ⚠️ **产品方向已修订（2026-06）。** 当前方向与优先级以 [`docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md`](./docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md) 为单一事实来源：定位收敛为"拍一下，看懂配料表"；第一版收敛为**微信小程序单端**；新增 **添加剂大白话翻译 / 比一比** 为核心；**GB2760 全量治理与 admin 后台暂停继续投入**（已有成果转为添加剂大白话词表来源）；OCR **保留自建 RapidOCR**。与其他较早文档冲突时以该文档为准。

> 本文件是仓库唯一根目录 README，也是产品与协作入口。完整文档导航见下方[「文档导航」](#文档导航)。

---

## 当前产品主路径

```
拍食品标签
  → 识别配料表 / 营养成分表
  → 用户确认和修正识别文本
  → 自动拆分配料 / 解析营养字段
  → 结合我的关注项
  → 生成食品标签解读报告
  → 保存历史
```

**成分搜索和专业法规查询只是辅助功能，不是主路径。OCR 拍照识别食品标签 + 消费者标签解读是核心主路径。**

当前阶段只做食品标签（配料表、营养成分表、包装正面卖点），不混入化妆品、护肤品、药品。

---

## 当前架构策略

> 方向修订（2026-06）：第一版**收敛为微信小程序单端优先**，H5 / Android / iOS 扩端在小程序验证成功后再做；admin 后台**暂停建设**。详见 [`PRODUCT_DIRECTION_2026H2.md`](./docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md)。

- **正式用户端**：`user-uniapp/`，uni-app + Vue3；**第一版优先交付微信小程序单端**，H5/PWA、Android、iOS 作为后续扩端目标（验证成功后再做）。当前已完成食品标签解读 MVP 主流程迁移。
- **旧 Web/PWA 原型**：当前 `src/` 纯 JS + Vite + hash 路由前端**冻结**，仅作历史参考和迁移来源，不再投入。
- **后台管理端**：`admin-web/`（Vue3 + TDesign Web）**暂停建设**；无用户、无运营前用脚本 / 直连 DB 管理。
- **后端 API**：复用现有 `backend/`，Node.js + TypeScript + Hono + Drizzle + PostgreSQL；不要重复创建 Express/Nest/Fastify 第二套后端。
- **OCR 服务**：用户端 / 小程序 / App → 后端 API → OCR Provider → Python FastAPI + RapidOCR。OCR 服务不暴露公网，前端不直连 OCR / AI / 数据库，不暴露任何 Key。

完整技术栈、旧前端迁移、后端必需性和后台定位见 [`docs/product-blueprint/ARCHITECTURE_SPEC.md`](./docs/product-blueprint/ARCHITECTURE_SPEC.md)。

---

## 数据可信状态

| 状态 | 含义 | 能否作为权威展示 |
|---|---|---|
| `verified_regulation` | 已通过 GB2760 官方来源确认 | 是 |
| `verified_jecfa` | JECFA 安全评价已匹配（非中国法规范围） | 仅安全评价 |
| `pending_review` | 已从官方来源抽取，待复核 | 否 |
| `mapped_candidate` | 疑似匹配，待确认 | 否 |
| `common_ingredient` | 普通食品配料 | 仅可读性 |
| `unverified` | 无可靠来源 | 否 |
| `unknown_from_ocr` | OCR 识别到但未收录 | 否 |

GB2760 导入采用 **staging 全量承接 → 高置信度 promote 到正式库 → 低置信度 pending_review → 人工复核**，详见 [`DATA_SOURCES.md`](./DATA_SOURCES.md)。

---

## 产品蓝图与开发规范

完整的产品、消费者决策、UI、视觉、前端、跨端、API、数据可信、后台、隐私合规、测试验收规范统一收敛在 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)，本文件只做入口，不重复正文。

- **数据可信原则**：数据状态分层展示（见上表与 [`DATA_TRUST_SPEC.md`](./docs/product-blueprint/DATA_TRUST_SPEC.md)）；`pending_review` / `mapped_candidate` / `unverified` / `unknown_from_ocr` 不得展示为权威结论；AI 不作为原始数据来源。
- **消费者体验原则**：专业信息默认隐藏，普通人报告默认展示；用户拍的不一定只有配料表，也可能是营养成分表或包装正面；报告只做购买前建议关注，不给绝对购买建议。
- **OCR 原则**：拍照识别是核心主路径；OCR 结果必须进入文本确认页，不能跳过；无 Key 时保留 manual 手动输入、不崩溃、不伪造识别文字；降级链路 real → manual → fallback。
- **跨端策略**：正式用户端采用 `user-uniapp`（uni-app + Vue3）覆盖 H5/PWA、微信小程序、Android、iOS；当前 `src/` Vite 前端保留为历史原型和迁移来源；后台管理端 `admin-web` 单独建设；统一的是产品流程、设计 token、数据状态、API 契约和平台能力接口，不强行一套 UI 代码覆盖所有端（见 [`CROSS_PLATFORM_SPEC.md`](./docs/product-blueprint/CROSS_PLATFORM_SPEC.md)）。
- **Codex 开发规则入口**：强制规范见 [`AGENTS.md`](./AGENTS.md)，任务清单见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)，验收见 [`QA_ACCEPTANCE_SPEC.md`](./docs/product-blueprint/QA_ACCEPTANCE_SPEC.md)。

---

## 快速开始

```bash
# Terminal 1: frontend
npm install
npm run dev
```

正式用户端（uni-app + Vue3）：

```bash
cd user-uniapp
npm install
npm run dev:h5
```

```bash
# Terminal 2: backend
cd backend
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

完整命令见 [`COMMANDS.md`](./COMMANDS.md)。

新机器从零部署 PostgreSQL、后端、前端和本机 OCR，见 [`docs/deployment.md`](./docs/deployment.md)。数据库表设计、字段含义、初始化 SQL 入口和 seed/promote 写入关系，见 [`docs/database.md`](./docs/database.md)。

---

## 文档导航

根目录只保留**协作入口与控制类文档**；专题规范放在 [`docs/`](./docs/README.md)，产品/设计/前端/数据等完整规范集中在 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)。

| 类别 | 文档 | 用途 |
|---|---|---|
| 产品方向 | [`docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md`](./docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md) | **方向修订（单一事实来源）**：定位、人群、优先级、三版路线、取舍、付费 |
| 产品蓝图 | [`docs/product-blueprint/`](./docs/product-blueprint/README.md) | 产品 / 消费者决策 / UI / 视觉 / 前端 / 跨端 / API / 数据可信 / 后台 / 隐私 / 验收完整规范集 |
| Agent 规则 | [`AGENTS.md`](./AGENTS.md) | 编码 Agent（Codex / Claude）强制工作规范 |
| 任务与进度 | [`CODEX_TASKS.md`](./CODEX_TASKS.md) · [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) | 任务清单、阶段、阻塞项、进度 |
| 命令手册 | [`COMMANDS.md`](./COMMANDS.md) | 本地启动、构建、校验、数据命令 |
| 数据来源 | [`DATA_SOURCES.md`](./DATA_SOURCES.md) | 官方来源、可信状态、GB2760 staging/promote 规则 |
| 外部系统 | [`INTEGRATIONS.md`](./INTEGRATIONS.md) | 数据库、OCR、AI、部署等外部组件目录与配置 |
| 审查记录 | [`AI_REVIEW.md`](./AI_REVIEW.md) | 近期 AI review 口径、风险与验证记录 |
| 部署 / 数据库 | [`docs/deployment.md`](./docs/deployment.md) · [`docs/database.md`](./docs/database.md) | 新机器部署、PostgreSQL 表设计 |
| 平台能力 | [`docs/platform/`](./docs/platform/) | 微信小程序、iOS plist、PWA 离线等平台补充 |

> 说明：早期 README 内嵌的「旧版开发指令与历史约定」（化妆品原型 + 多类别路由 + 旧 `src/` 香草 JS 架构）已随产品转向移除；当前规范以 [`AGENTS.md`](./AGENTS.md) 与 [`docs/product-blueprint/`](./docs/product-blueprint/README.md) 为准，历史版本可在 Git 历史中查阅。
