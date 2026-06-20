# 统一架构与技术栈规划（ARCHITECTURE_SPEC）

> 本文属于 `docs/product-blueprint/` 蓝图集，是后续架构规划、任务拆分和迁移决策的统一入口。本文只描述规划，不代表代码已经完成迁移。

## 1. 产品定位

CompLens / 成分镜 是**面向普通消费者的食品标签拍照解读与消费决策助手**。

核心价值：

```text
拍一下食品包装，帮普通消费者看懂配料、营养、包装卖点和需要关注的地方。
```

用户端不能被写成食品法规查询工具、GB2760 查询工具或食品添加剂数据库工具。后台和数据治理可以专业，但用户端必须默认讲人话。

## 2. 统一主流程

所有用户端、API、后台数据和验收文档统一围绕以下主流程：

```text
拍照/上传食品标签
→ 自动识别标签类型：配料表 / 营养成分表 / 包装正面 / 未知
→ OCR 识别文字
→ 用户确认和修正识别文本
→ 配料拆分 / 营养字段解析 / 包装卖点识别
→ 匹配食品成分、食品添加剂、营养字段和用户关注项
→ 生成食品标签解读报告
→ 保存历史记录和产品档案
```

MVP 至少覆盖：

- 配料表识别
- 营养成分表识别
- OCR 或手动输入
- 文本确认
- 配料拆分
- 营养字段解析
- 我的关注项
- 食品标签解读报告
- 历史记录
- 数据来源说明

MVP 后置能力：

- 包装正面卖点提示
- 两款商品对比
- 扫码
- 云同步
- AI 总结
- 微信小程序 / Android / iOS
- 订阅 / 支付

## 3. 推荐技术栈

| 层 | 正式技术路线 | 当前真实状态 | 处理策略 |
|---|---|---|---|
| 用户端 | `user-uniapp`：uni-app + Vue3 | 当前 `src/` 是纯 JS + Vite + hash 路由 Web/PWA 原型 | 保留为历史原型和迁移来源，不继续承载复杂新业务 |
| 后台管理端 | `admin-web`：Vue3 + TDesign Web | 尚未独立建设；仅有嵌入用户端的 GB2760 复核页 | 单独建设后台项目，不与用户端强行共用页面代码 |
| 后端 API | Node.js + Hono | 已有 `backend/`，技术栈为 Node.js + TypeScript + Hono | 优先复用现有 `backend`，不要重复创建 Express/Nest/Fastify 服务；Fastify 仅可作为未来评估，不作为当前迁移目标 |
| 数据库 | PostgreSQL + Drizzle | 已有 PostgreSQL + Drizzle | 继续复用 |
| OCR 服务 | Python FastAPI + RapidOCR / Aliyun OCR | 已对接本机 RapidOCR 服务，Aliyun 后端 provider 已实现 | 本地优先 RapidOCR；生产可配置后端 Aliyun 凭证后切换 |

## 4. 目录规划

目标仓库结构：

```text
user-uniapp/              # 正式用户端，uni-app + Vue3，面向 H5/PWA、微信小程序、Android、iOS
admin-web/                # 后台管理端，Vue3 + TDesign Web
backend/                  # 统一后端 API，复用当前 Hono + Drizzle + PostgreSQL
ocr-service/              # 可选：Python FastAPI + RapidOCR 服务封装；当前本机服务在 /home/downloads/tools/complens-ocr
docs/
docs/product-blueprint/
src/                      # 旧纯 JS + Vite Web/PWA 原型，保留为迁移来源
```

当前 `backend/` 已存在，优先复用。后续规范化方向：

```text
backend/
  src/
    routes/
    services/
    providers/     # 计划：OCR、AI、支付、第三方服务 provider
    db/
    schemas/       # 计划：请求/响应 schema 或 Drizzle schema 分层
    validators/    # 计划：接口参数校验
    jobs/          # 计划：导入、统计、清理、异步任务
```

当前没有 `providers/validators/jobs` 时，不要为“目录好看”空建大量无用文件；应在对应业务落地时补齐。

### 4.1 当前后端真实结构（2026-06-16）

本轮已核对 `backend/src`，当前真实结构如下：

```text
backend/src/
  app.ts                 # Hono app 装配、CORS、全局错误、路由挂载
  index.ts               # Node server 启动入口
  config.ts              # 环境变量读取与默认值
  middleware/
    auth.ts              # JWT 鉴权
    requestLogger.ts     # 请求日志
  routes/
    auth.ts              # /api/auth/*
    gb2760.ts            # /api/gb2760/*
    health.ts            # /health
    ingredients.ts       # /api/ingredients/*
    ocr.ts               # /api/ocr
    user.ts              # /api/user/*
  services/
    authService.ts
    gb2760Service.ts
    gb2760PromoteService.ts
    gb2760ValidateService.ts
    ingredientService.ts
    labelService.ts
    labelScanService.ts
    nutritionService.ts
    ocrProviders/index.ts
    reportService.ts
    userService.ts
  db/
    client.ts
    schema.ts
    migrations/
```

现有路由边界：

| 模块 | 当前状态 | 责任边界 |
|---|---|---|
| `health` | 已实现 | 服务健康检查，匿名访问 |
| `auth` | 已实现 | 邮箱注册、登录、登出、当前用户、注销账户 |
| `ingredients` | 已实现 | 配料/添加剂检索、详情、分类、批量匹配；匿名访问 |
| `ocr` | 已实现 | OCR Provider 代理；manual/mock/rapidocr/aliyun/paddleocr 配置边界 |
| `user` | 已实现 | 登录态用户收藏、报告、产品档案、关注项、过敏原等个人数据 |
| `gb2760` | 已实现 | 内部 GB2760 导入状态、参考表、staging 审核与映射；写操作需要内部 reviewer |
| `labels` | 已实现 | 食品标签扫描会话、标签类型识别，返回结构化会话与文本 |
| `nutrition` | 已实现 | 营养字段解析与结构化结果 |
| `reports` | 已实现 | 标签报告生成与持久化 |
| `admin` | 计划 | 后台管理端聚合 API，后续随 `admin-web` 分期落地 |

### 4.2 后端分层边界（STACK-C）

后续新增 API 按以下边界落地：

1. `routes/` 只做 HTTP 契约、鉴权、参数读取、错误状态映射，不直接写数据库查询和第三方调用。
2. `services/` 承载业务编排、数据可信状态判断、DB 访问组合、报告生成和解析逻辑。
3. `ocrProviders` 目前保留在 `services/ocrProviders/`；当 AI、支付、推送等第二类 provider 真实落地时，再评估统一迁入 `providers/`，不要提前空建目录。
4. `db/schema.ts` 和迁移文件继续作为 Drizzle schema 的事实来源；请求/响应 schema 若需要复用，再按接口批次补 `schemas/` 或 `validators/`。
5. `jobs/` 只在出现真实异步任务（导入、统计、清理、重试队列）时创建；现有 GB2760 脚本继续放在 `backend/scripts/`。
6. 用户端、后台、小程序、App 不直连 OCR / AI / 数据库 / 导入脚本，全部通过 `backend/` API。
7. 未实现接口必须在 `API_CONTRACT.md` 标为计划或部分实现；页面不得把 mock adapter 或本地 parser 展示为后端事实。

## 5. 旧前端处理策略

当前 `src/` 纯 JS + Vite 前端的策略：

1. 保留为历史原型或临时 Web/PWA 原型。
2. 不直接删除旧前端。
3. 不继续在旧前端上堆复杂业务。
4. 新功能优先按 `user-uniapp` 用户端结构规划。
5. 旧前端中已有可复用的业务逻辑、文案、样式 token、页面流程，逐步迁移到 `user-uniapp` 或 shared 模块。
6. 本轮只更新文档和任务计划，不迁移业务代码。

旧前端允许做的改动：

- 修复合并后阻断性 bug。
- 修复安全、数据可信、OCR 降级等主流程问题。
- 补充用于迁移的轻量抽象和文档。

旧前端不应继续承载：

- 新的复杂跨端状态机。
- 大型页面重做。
- 会员支付闭环。
- 后台管理功能扩张。

## 6. 后端是必须层

本项目必须有后端，不能只靠前端、小程序或 App。

后端负责：

- OCR 调用
- AI 调用
- API Key 管理
- 图片上传和压缩
- 配料解析
- 营养成分表解析
- 包装卖点解析
- 食品添加剂数据库匹配
- GB2760 数据查询
- 标签解读报告生成
- 历史记录
- 用户反馈
- 用户管理
- 会员订阅
- 后台管理
- 数据导入和复核
- 权限控制
- 支付 / 订阅（后续）

前端、小程序、App 不能直接访问：

- OCR Key
- AI Key
- 数据库
- 本地 OCR 服务
- GB2760 导入脚本

## 7. OCR 服务架构

```text
用户端 / 小程序 / App
  ↓
后端 API
  ↓
OCR Provider
  ↓
Python FastAPI OCR Service
  ↓
RapidOCR
```

本地 OCR 服务地址：

```text
http://127.0.0.1:18080/ocr
```

约束：

- OCR 服务不暴露公网。
- 后端通过 `OCR_LOCAL_URL` 调用。
- 前端不能直接访问 OCR 服务。
- OCR 失败降级到手动输入。
- OCR 结果必须进入文本确认页。
- 生产环境可切换 Aliyun OCR，但同样只由后端调用。

> 当前代码优先读取 `OCR_LOCAL_URL`，旧的 `OCR_SERVICE_URL` 仅作为兼容 fallback。新配置和文档应统一使用 `OCR_LOCAL_URL=http://127.0.0.1:18080/ocr`。

## 8. 后台总体定位

后台不是简单的 GB2760 复核页，而是：

```text
CompLens 产品运营后台 + 数据治理后台 + 系统配置后台
```

四类能力：

1. 运营管理：用户、会员、订阅、公告、Banner、FAQ、内容配置。
2. 数据治理：GB2760、成分库、食品分类、规则、staging 复核。
3. 业务监控：OCR 记录、报告记录、反馈记录、调用成本、失败日志。
4. 系统管理：管理员、角色权限、系统配置、审计日志、版本配置。

后台技术路线：`admin-web`，Vue3 + TDesign Web，单独项目。后台共用 API 契约、数据状态、设计 token，不强行共用用户端页面代码。

## 9. 迁移原则

- 先规划目录和契约，再迁移业务。
- 后端 API 是所有端唯一数据入口。
- 不创建重复后端服务。
- 不把 NestJS、Express、Fastify 和 Hono 同时引入同一后端。
- 不前端直连 OCR / AI / 数据库。
- 不伪造支付成功、订阅生效或生产部署完成。
- 支付、订阅、上架涉及账号和平台配置时，标记 `blocked_by_user` 或 `人工+Codex`，不要阻塞其他任务。
