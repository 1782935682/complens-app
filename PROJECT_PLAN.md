# Project Plan — CompLens / 成分镜（CompCheck）

## 1. 当前产品定位

**CompLens / 成分镜 是面向普通消费者的食品标签拍照解读与消费决策助手。**

核心主路径：

```
拍照/上传食品标签
→ 自动识别标签类型：配料表 / 营养成分表 / 包装正面 / 未知
→ OCR 识别文字
→ 用户确认和修正识别文本
→ 配料拆分 / 营养字段解析 / 包装卖点识别
→ 匹配食品成分、食品添加剂、营养字段和用户关注项
→ 生成食品标签解读报告
→ 保存历史记录和产品档案
```

用户拍的不一定只有配料表，也可能是营养成分表或包装正面。成分搜索和专业法规查询只是辅助能力，不是主路径。当前阶段只做食品标签，不混入化妆品、护肤品、药品。

---

## 2. 当前最高优先级

```
1. 数据源准确性
2. GB2760 官方 PDF 可追溯导入（staging → promote → pending_review → 人工复核）
3. 统一跨端技术栈和迁移边界
4. 后端 API 唯一入口与 Provider 架构
5. OCR 拍照识别主流程
6. 标签类型识别（配料表 / 营养成分表 / 包装正面 / 未知）
7. OCR 文本确认与修正
8. 配料表解析 + 营养字段解析
9. 我的关注项
10. 食品标签解读报告
11. 产品档案、收藏、历史
12. 移动端 / 跨端使用体验
13. 后台管理 MVP（数据治理 + 反馈 + 基础配置）
14. AI 总结解释
15. 登录、云同步
16. 订阅、支付、上架（后置）
```

订阅、支付、上架不排在核心闭环前；登录/云同步不阻塞本地 MVP；AI 不早于数据源和数据库匹配；OCR 是核心主路径不是附属；专业法规和数据库证据默认服务“查看依据”，不抢占消费者报告第一屏。

---

## 3. 当前真实进度

整体产品进度：**约 79%**（按数据底座 + OCR 主路径闭环 + 正式用户端迁移 + 后端/API/admin-web 架构规划口径）。

| 里程碑 | 名称 | 状态 | 完成度 |
|---|---|---|---|
| M1 | 数据源准确性 + GB2760 可追溯导入 | 🔄 进行中 | ~86% |
| M2 | 数据库真实对接（本地完成，生产待补） | 🔄 进行中 | ~70% |
| M3 | OCR 拍照识别主流程（manual/mock/本机 RapidOCR 闭环） | 🔄 进行中 | ~82% |
| M4 | 配料解析 + 数据库匹配 | 🔄 进行中 | ~72% |
| M5 | 食品标签解读报告（配料 + 营养 + 关注项） | 🔄 uni-app MVP 已落地 | ~58% |
| M6 | 我的关注项、产品档案、收藏、历史、个性化 | 🔄 uni-app 本地 MVP 已落地 | ~64% |
| M7 | 消费者体验与信息架构优化（UX） | 🔄 uni-app 主路径已迁移 | ~52% |
| M8 | 移动端 / PWA 体验 | 🔄 uni-app H5/小程序构建通过 | ~58% |
| M9 | AI 总结解释（本地 fallback 可用，真实待 Key） | 🔄 进行中 | ~15% |
| M10 | 登录、云同步（本地完成，跨设备验收待补） | 🔄 进行中 | ~40% |
| M11 | 订阅、支付、上架 | ⏸ 后置 | 0% |
| M12 | 统一跨端技术栈（uni-app / admin-web / backend 复用） | 🔄 用户端工程已创建，后端 API 边界和后台工程边界已规范化 | ~58% |
| M13 | 后台管理系统（运营 + 数据治理 + 系统 + 审计） | 🔄 admin-web 工程边界、后台菜单 IA、数据治理、用户反馈、内容运营、OCR/AI 监控、系统配置和权限审计页面/API 计划已规划 | ~40% |

数据底座真实口径（详见 `DATA_SOURCES.md`）：

- 食品基础库 DB 当前 329 条：`verified_regulation` 308、`verified_jecfa` 1、`common_ingredient` 12、`unverified` 8；源文件静态 seed 仍为 112 条，`validate:data` 继续校验源文件口径。
- GB2760 官方 PDF：264 页全文入库；表 A.1 第 8-148 页 → 2404 行 staging（后端 DB 2391 行已人工签核并 `promoted`，13 行历史 `verified`，缺映射 0）；A.2/B/C/D/E/F → 2800 行参考表，边界已修复；`source_documents` / `import_runs` / `import_errors` 导入审计骨架已落地；`additive_usage_rules`、`promote:gb2760` 与 `validate:gb2760` 已落地，当前正式规则 2391 行、错误数 0；内部复核写接口已加 `GB2760_INTERNAL_REVIEWERS` allowlist 和 reviewer 审计字段。
- 这不是完整成分库，也不是完整 GB2760 法规库；正式库只接收高置信、可追溯、字段完整的 promote 数据。

---

## 4. 已完成

- 后端 Hono/TS + Drizzle/PostgreSQL schema、迁移、seed、Docker Compose（本地/开发环境）。
- 成分 API：列表/详情/分类/搜索/批量匹配/可信等级筛选。
- 前端优先 API、失败降级本地 seed 并显示未验证标识。
- 数据溯源字段：`dataStatus`/`matchConfidence`/`sourceScope`/`sourceName`/`sourceVersion`/`sourceUrl`/`regulatoryBasis`/`rawSourceText`/`lastReviewedAt`/`reviewNote`/`isVerified`。
- GB2760 官方来源确认 + 264 页全文 + 2404 行 A.1 staging + 2800 行参考表（边界修复完成）+ 导入审计骨架（来源文档、批次、错误表和查询接口）+ `additive_usage_rules` 正式规则表 + `promote:gb2760` 准入脚本 + 本轮人工签核 promote 2391 条正式规则 + `validate:gb2760` 数据准入校验。
- OCR 主路径：拍照/上传入口、图片预处理（EXIF/压缩/IndexedDB）、OCR manual/mock/real-provider 抽象、文本确认页、配料解析、批量匹配；后端 `OCR_PROVIDER=mock` 可返回明确标注的 mock OCR 结果，`OCR_PROVIDER=rapidocr` 已接入本机 `/home/downloads/tools/complens-ocr` 服务，生产 Aliyun OCR 待 Key 后切换。
- 分析报告：整体评级、关注摘要、配料顺序、添加剂分类、未收录、特殊人群、来源说明、Markdown/JSON 导出、分享、历史。
- 产品档案 + 收藏 + 历史 + 个人关注/忌口/过敏原 + 全局高亮 + 登录态云同步。
- 前端登录/注册 + 访客模式 + JWT 管理 + 本机数据登录态同步。
- 移动端底部导航 + PWA 安装/离线基础 + 数据治理页人工校验队列。
- loading / empty / error 状态统一复核：搜索初始空态提供拍照/粘贴入口，GB2760 复核页和参考表错误态均有重试，复核空态有重置为待复核行/返回数据页出口。
- 统一结果可信表达映射层：`src/utils/dataStatus.js` 统一 `verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 的文案、颜色变量、Badge class 和 normalize 逻辑；搜索、详情、分析、报告、导出、数据治理页已引用。
- 产品蓝图文档集：`docs/product-blueprint/` 已覆盖产品、设计系统、视觉、前端、页面、跨端、API、数据可信、UI 路线、后台、隐私、测试验收；2026-06-15 已二次复核并同步 `CODEX_TASKS.md` / `AGENTS.md` / `COMMANDS.md` / `DATA_SOURCES.md`。
- 消费者食品标签解读规划：已新增 `CONSUMER_DECISION_SPEC.md` 与 `CONSUMER_UX_SPEC.md`，明确产品从“配料表识别/添加剂查询”升级为“食品标签拍照解读 + 消费决策助手”。
- 统一架构规划：已新增 `ARCHITECTURE_SPEC.md`，明确正式用户端 `user-uniapp`（uni-app + Vue3）、后台 `admin-web`（Vue3 + TDesign Web）、复用现有 `backend/`（Hono + Drizzle + PostgreSQL）、OCR 服务链路（后端调用 Python FastAPI + RapidOCR），并规定旧 `src/` Vite 前端只作为历史原型和迁移来源。
- 后端 API 框架规范化：已核对 `backend/src` 真实结构，确认继续复用 Hono 单后端；`ARCHITECTURE_SPEC.md` / `API_CONTRACT.md` 已补 routes/services/db/provider 分层边界、计划接口状态和 labels/nutrition/reports 后端化顺序。
- 后台管理端规划：已明确 `admin-web/` 独立工程边界、目标目录结构、工作台路由分组、后台 API 落地边界、MVP/非 MVP 范围、完整后台信息架构、数据治理 MVP 页面/API 复用矩阵、用户/扫描/报告/产品档案/反馈管理页面/API 边界、公告/Banner/FAQ/数据说明/法律文档版本管理边界，以及 OCR/AI Provider 监控、系统配置与功能开关、权限与审计页面/API 边界；当前仍未创建工程，支付/订阅/上架继续人工阻塞。
- 正式用户端迁移 MVP：已新增 `user-uniapp/`（uni-app + Vue3），迁移首页、拍照/上传、OCR 降级、标签类型选择、文本确认、配料拆分、营养解析、匹配确认、食品标签解读报告、历史、我的关注项、搜索、数据说明、隐私说明；集中建立设计 token、基础组件、API client、平台适配层和本地草稿/报告存储。

---

## 5. 未完成

- 成分详情页 GB2760 官方证据展示（Batch 1-E）。
- 生产 Aliyun OCR / 真实 AI 接入（Batch 3-E / 9-B，待 Key；本机 RapidOCR 已接入）。
- 标签类型识别、营养成分表结构化、我的关注项主路径化、食品标签解读报告结构改造已在 `user-uniapp/` 完成 MVP；后端正式 API 和跨端真机验收仍待补齐。
- 包装正面卖点核对、两款商品对比、扫码识别（MVP 后置）。
- 内部数据控制台 / GB2760 复核工作台后续 UI（用户要求等产品页面设计统一推进）。
- 移动端组件统一、报告页产品化复核、首页/OCR 产品体验整体复核（阶段 7；统一可信表达映射层已完成）。
- iPhone Safari、微信小程序开发者工具、Android/iOS 真机验收（阶段 8/15）。
- 生产数据库、生产部署、跨设备真实验收、离线同步队列。
- 订阅、支付、上架（后置）。
- `admin-web/` 后台管理端工程尚未创建。
- 后端尚未完成后台用户/会员/订阅/公告/Provider 监控/配置/权限审计 API；当前只有 GB2760 数据治理部分接口已落地，其余后台能力仍是计划。

---

## 6. 当前人工阻塞

| 阻塞项 | 阻塞内容 | 是否阻塞核心 |
|---|---|---|
| GB2760 后续增量复核 | 新抽取或变更 staging 行再次 promote | 否：本轮 2391 条已 promote，后续增量继续人工复核 |
| 内部控制台 / 产品页面设计 | 用户要求内部控制台先不做，等产品页面设计统一推进 | 否：当前数据复核/promote 闭环已可用 |
| 生产 DATABASE_URL | 生产数据库（2-D） | 否：本地闭环可用 |
| 生产 Aliyun OCR API Key | 生产 OCR 切换（3-E） | 否：本机 rapidocr/manual/mock 闭环可用 |
| AI API Key | 真实 AI（9-B） | 否：本地 fallback 可用 |
| Apple / Google 账号 | iOS/Android 上架（11-B/C/D） | 否：已后置 |
| 法务复核 / 域名 / 部署平台 | 合规与生产（11-F/G） | 否：已后置 |

遇到阻塞按 `CODEX_TASKS.md` 人工阻塞处理规则：标记 `blocked_by_user`、记录原因、跳过、继续后续任务。

---

## 7. 下一步计划（当前阶段目标）

当前阶段：**阶段 16 用户端 uni-app 迁移落地 → 阶段 17 后台管理系统规划**。

当前策略：

1. 正式用户端采用 `user-uniapp`（uni-app + Vue3），目标覆盖 H5/PWA、微信小程序、Android、iOS。
2. 当前 `src/` 纯 JS + Vite 前端作为历史 Web/PWA 原型和迁移来源，不删除，但不继续承载复杂新业务。
3. 后台管理端采用 `admin-web`（Vue3 + TDesign Web），单独建设产品运营、数据治理、业务监控、系统配置、权限审计。
4. 后端 API 复用现有 `backend/`（Node.js + Hono + Drizzle + PostgreSQL），作为所有端唯一入口；不创建第二套 Express/Nest/Fastify 服务。
5. OCR 服务采用 Python FastAPI + RapidOCR，由后端 Provider 调用，不暴露公网；生产再切换 Aliyun OCR。
6. 统一的是产品流程、design tokens、数据状态、API 契约、平台能力接口和文案规范，不强行一套 UI 代码覆盖所有端。

Codex 下一步任务：

1. 继续后端化消费者主路径 API：`labels`（扫描会话/标签类型）→ `nutrition`（营养解析）→ `reports`（食品标签解读报告），逐步减少前端 mock/local-only adapter。
2. ADMIN-E 会员订阅/支付继续人工阻塞；后台 `admin-web/` 工程和后台 API 代码仍待后续批次按计划落地。

人工并行：后续 GB2760 新增/变更 staging 行复核签核；生产 DATABASE_URL、Aliyun OCR Key、AI Key、商店账号和法务材料均不阻塞当前本地 MVP。

---

## 7.5 跨端策略、产品蓝图与中长期目标

**这是一个面向普通消费者的产品**：一切规划以用户端"食品标签拍照解读 + 消费决策辅助"主路径体验为中心；内部数据控制台、GB2760 复核工作台等是支撑工具，不得喧宾夺主。

跨端策略：

```
正式用户端：user-uniapp，uni-app + Vue3，面向 H5/PWA、微信小程序、Android、iOS
旧前端：src/ 纯 JS + Vite，保留为历史原型和迁移来源
后台管理端：admin-web，Vue3 + TDesign Web，单独建设
后端 API：复用 backend/，Hono + Drizzle + PostgreSQL，所有端唯一入口
OCR：Python FastAPI + RapidOCR，本地服务只允许后端调用
统一的是：产品流程、设计 token、数据状态、API 契约、平台能力接口、文案规范
```

完整规范收敛在 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)（产品 / 消费者决策 / 消费者体验 / 设计系统 / 视觉 / 前端 / 页面 / 跨端 / API / 数据可信 / UI 路线 / 后台 / 隐私 / 测试验收）。

- **短期目标（消费者主路径打磨）**：`user-uniapp/` 已完成标签类型识别、营养成分表结构化、我的关注项本地设置、食品标签解读报告和基础组件/token MVP；后续重点是真实后端 API、真机验收和报告文案走查。
- **设计基线（已确认 2026-06-14）**：主色薄荷绿色阶（`--primary #059669`、主按钮 `#047857`、辅助高亮 `#10b981`、装饰 `#34d399`、浅底 `#ecfdf5`）+ 16px 圆角；规范已写入 `docs/product-blueprint/DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md`，并已落到 `user-uniapp/src/styles/tokens.css`；旧 `src/styles.css` 当前仍为青绿/8px，保留历史原型状态。
- **中期目标（数据 + 标签能力 + 跨端）**：包装正面卖点核对、两款商品对比、GB2760 增量人工复核扩大正式库覆盖、生产数据库与生产 OCR（Aliyun）接入、微信小程序 / Android / iOS 适配落地、独立后台第一版。
- **长期目标（增值与上架）**：扫码、真实 AI 总结、登录云同步跨设备验收、订阅支付、应用商店上架与合规材料（阶段 11，后置）。
- **人工阻塞项**：生产 DATABASE_URL、生产 Aliyun OCR Key、AI API Key、Apple/Google/国内商店账号、支付订阅账号、隐私政策法律确认、软著/备案/商标、GB2760 后续增量复核、后台/产品页面设计统一推进边界。
后台分期：

- **MVP**：数据源管理、GB2760 导入状态、staging 数据复核、食品添加剂管理、食品分类管理、OCR 记录查看、用户反馈查看、基础系统配置、管理员登录预留。
- **Beta**：用户管理、用户详情、扫描记录、标签解读报告管理、公告、FAQ、首页运营位配置、操作日志。
- **产品化**：会员管理、订阅计划、订单/支付记录、退款/取消记录、App/小程序版本配置、消息通知、AI/OCR 成本统计、角色权限、审计日志。
- **上架/商业化**：Apple IAP、Google Play Billing、微信支付、国内安卓渠道、订阅权益、第三方 SDK 清单、隐私协议版本管理。

- **Codex 下一步**：完成本轮 ADMIN-F/G/H PR；合并后转入消费者主路径后端 API（labels/nutrition/reports），逐步减少 `user-uniapp` 前端 mock/local-only adapter。

## 8. 7 天执行计划

> 每天一个可验证闭环。遇人工阻塞时记录并继续后续无需人工的任务。

**Day 1：架构与后台规划文档收口**
- 目标：同步 `ARCHITECTURE_SPEC.md`、后台规划、API 契约、任务清单、计划和 Agent 规则。
- 验收标准：正式用户端 `user-uniapp`、后台 `admin-web`、复用现有 `backend/`、旧 `src/` 原型迁移边界全部写清楚；计划目录和计划命令不写成已实现。
- 是否需要人工：否。

**Day 2：STACK-A 现有结构确认**
- 目标：盘点 `backend/`、`src/`、`ios/`、`android/`，形成迁移方案。
- 验收标准：不删除旧前端，不创建重复后端，不把计划工程写成已完成。
- 是否需要人工：否。

**Day 3：STACK-B / STACK-C 用户端与后端规范**
- 目标：规划 `user-uniapp` 工程结构和现有后端 API 分层规范化。
- 验收标准：所有端通过后端 API；前端不直连 OCR/AI/数据库；小程序/App 不假设浏览器全局对象。
- 是否需要人工：需要确认正式初始化时间点。

**Day 4：ADMIN-B 后台数据治理 MVP**
- 目标：已在 ADMIN-A 菜单 IA 收口后，细化数据治理 MVP 页面/API。
- 验收标准：MVP 后台只做数据治理、OCR 记录、反馈、基础配置和管理员登录预留。
- 是否需要人工：GB2760 promote 仍需人工复核。

**Day 5：ADMIN-C / ADMIN-D 用户反馈与内容运营**
- 目标：规划用户管理、扫描/报告记录、用户反馈、公告、Banner、FAQ、隐私协议版本管理。
- 验收标准：隐私和协议文案需要版本管理；用户隐私字段最小必要展示。
- 是否需要人工：内容和合规文案需人工确认。

**Day 6：ADMIN-E/F/G/H 产品化后台规划**
- 目标：会员订阅、订单支付、OCR/AI 成本、权限审计、系统配置与功能开关规划。
- 验收标准：支付/订阅/上架标记人工阻塞；不伪造支付成功。
- 是否需要人工：支付账号、商店账号、法务材料。

**Day 7：回到消费者主路径实现**
- 目标：架构边界确认后执行 `CONSUMER-LABEL-A` 标签类型识别，再做营养表解析和关注项。
- 验收标准：不跳过文本确认；不在旧前端继续堆不适合迁移的复杂功能。
- 是否需要人工：需要确认是否立即创建 `user-uniapp`。

---

## 9. 阶段验收标准

每个 Codex Batch 结束前必须按改动范围验证：

- 纯文档修改：`git diff --check`。
- 前端样式/组件小改：`npm run lint` + 相关现有测试；必要时 `npm run test`。
- 触达构建入口、路由、PWA、跨端配置：加 `npm run build`。
- 涉及后端：`cd backend && npm run typecheck` + 相关测试；必要时 `npm test` / `npm run build`。
- 涉及 GB2760 数据准入：按任务要求运行 `npm run validate:gb2760` 或对应校验。

禁止为了省时间跳过必要验证；也不要每次无差别跑完整测试。纯文档修改需说明未运行 build/test 的原因。

---

## 10. 维护规则

每次 Codex 修改后必须同步更新本文件（进度、阶段、已完成、未完成、阻塞、下一步），以及 `CODEX_TASKS.md`、`AI_REVIEW.md`；影响命令更新 `COMMANDS.md`，影响数据口径更新 `DATA_SOURCES.md`。未同步视为任务未完成。

不允许伪造进度，不允许把未完成写成已完成，不允许把 seed 样本当完整数据集，不允许把 `pending_review` / `unverified` 当 `verified`。

---

## 11. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 2026-06-15 | Batch ADMIN-F/G/H：补齐 OCR/AI Provider 监控、OCR 失败日志/指标、AI 调用日志/成本、降级策略、功能开关、平台/版本/分享/通知/SDK 配置、管理员/角色权限/操作日志/审计日志页面/API 计划；明确密钥不展示、AI Key 阻塞、配置变更审计、RBAC 后置和 `admin-web` 尚未创建 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-D：补齐内容运营后台页面/API 计划，明确公告、Banner、首页场景卡、FAQ、数据说明文案、隐私政策和用户协议版本管理的目标路由、计划接口、状态枚举、平台范围、发布审计和人工/法务确认边界；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-C：补齐用户与反馈管理页面/API 计划，明确用户列表/详情、设备登录、扫描记录、标签解读报告、产品档案、用户反馈和禁用/恢复的目标路由、计划接口、现有 `/api/user/*` 边界、公开反馈提交与后台反馈处理分离、隐私脱敏和审计要求；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-B：补齐数据治理后台 MVP 页面/API 计划，明确数据源、GB2760 导入、staging 复核、添加剂、食品分类、使用规则、普通配料、营养字段规则和包装卖点词库的第一版 API 复用、只读/写权限边界和后续缺口；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-A：补齐后台信息架构与菜单矩阵，明确 Dashboard、数据治理、食品标签业务、用户与会员、内容运营、OCR/AI Provider、系统配置、权限审计的阶段归属和 MVP 边界；未创建后台工程，不触达业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch STACK-D：补齐 `admin-web/` 独立后台工程边界、目标目录结构、TDesign 工作台路由分组、MVP 启动范围、后台 API 落地边界和优先级；未创建后台工程，不触达业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch STACK-C：核对现有 `backend/src` Hono 后端结构，补齐 routes/services/db/provider 分层边界、计划接口状态和消费者主路径 labels/nutrition/reports 后端化顺序；不创建第二套后端、不空建目录 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | 架构与后台规划文档优化：新增 `ARCHITECTURE_SPEC.md`，统一正式用户端 `user-uniapp`、后台 `admin-web`、复用现有 `backend/`、OCR Provider 链路和旧 `src/` 迁移边界；补齐后台用户/会员/订阅/公告/系统配置/OCR-AI 成本/权限审计/API/任务阶段；仅文档，不改业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | 新增 `user-uniapp/` 正式用户端（uni-app + Vue3），迁移食品标签拍照解读主流程页面、组件、设计 token、集中 API client、平台适配层和本地历史/关注项存储；保留旧 `src/` 原型不删除；同步命令与蓝图文档 | Codex | `cd user-uniapp && npm run lint` 通过；`npm run typecheck` 通过；`npm run build:h5` 通过；`npm run build:mp-weixin` 通过 |
| 2026-06-15 | 消费者食品标签解读文档优化：新增 `CONSUMER_DECISION_SPEC.md` / `CONSUMER_UX_SPEC.md`，将产品定位统一为“食品标签拍照解读 + 消费决策助手”，同步产品、页面、前端、API、数据可信、UI 路线、QA、任务清单、Agent 规则和入口 README；仅文档，不改业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-14 | 确认设计基线为薄荷绿主色 + 16px 圆角：更新 `DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md` / `FRONTEND_SPEC.md` / `product-blueprint/README.md` 为规范值（含用户给定 5 色阶与角色），并把 `CODEX_TASKS.md` Batch FRONTEND-A 细化为可执行落地任务。仅文档，未改业务代码（曾试改 `src/styles.css` 后按用户要求 `git checkout` 还原） | Claude (Opus 4.8) | `git diff --check`（纯文档；`src/styles.css` 已还原为青绿/8px 原状） |
| 2026-06-14 | 新增产品蓝图规范集 `docs/product-blueprint/`（PRODUCT/DESIGN_SYSTEM/VISUAL_STYLE/FRONTEND/PAGE_STRUCTURE/CROSS_PLATFORM/API_CONTRACT/DATA_TRUST/UI_ROADMAP/ADMIN_CONSOLE/PRIVACY/QA 共 12 份 + README 索引）；同步 `CODEX_TASKS.md`（阶段 12-14：UI-SPEC/PLATFORM/FRONTEND 批次）、`AGENTS.md`、`COMMANDS.md`、`readme.md`、`docs/README.md`、`PROJECT_PLAN.md`。仅文档，不改业务代码 | Claude (Opus 4.8) | `git diff --check`（未运行 build/test：纯文档修改，不影响代码/依赖/构建/运行方式） |
| 2026-06-14 | 接入本机 RapidOCR：后端 `rapidocr` provider 调用 `/home/downloads/tools/complens-ocr` FastAPI 服务，新增 `OCR_SERVICE_URL` 配置与外部组件台账 `INTEGRATIONS.md`；生产后续切换 Aliyun OCR | Codex | `backend ocr.test.ts` / 后端 `typecheck` / 后端 `build` / `npm test` / `lint` / `build` / `validate:data` / provider 实连本机 OCR 通过 |
| 2026-06-14 | Batch 5-B / UX-C：新增统一 dataStatus 映射工具，统一结果可信表达文案、颜色变量和 Badge class；搜索、详情、分析、报告、导出、数据治理页改为引用同一映射；产品页面整体设计仍暂缓 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 8-C：全页 loading / empty / error 状态复核，补齐搜索初始空态拍照/粘贴入口、GB2760 复核页错误重试与空态出口、GB2760 参考表错误重试；后续 5-B/UX-C 可信表达需先确认是否纳入产品页面设计暂缓范围 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 3-B：OCR Provider 抽象命名闭环，后端支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，mock 明确标注且真实 provider 仍需后端 Key；内部控制台后续 UI 按用户要求暂缓到产品页面设计统一推进 | Codex | 针对性验证：`backend ocr.test.ts`、后端 `typecheck`、前端 OCR 协议断言 |
| 2026-06-14 | GB2760 复核闭环：自动创建缺失成分映射、人工批量签核 1447 条剩余 staging 行，并 promote 全部 2391 条 A.1 staging 到 `additive_usage_rules`；根目录新增 `map:gb2760` / `promote:gb2760` 委托命令 | Codex + 人工 | `validate:gb2760` 通过；报告：staging 2404、pending_review 0、promoted 2391、legacy_verified 13、additive_usage_rules 2391、verified_regulation_ingredients 308、import_errors 0 |
| 2026-06-14 | Batch 1-D：新增 `validate:gb2760` 数据准入校验服务和后端 CLI，根目录命令委托到 backend；CI 增加 Postgres、migrate、seed、validate 链路 | Codex | `npm run validate:gb2760` 通过；报告：staging 2404、pending_review 2391、legacy_verified 13、additive_usage_rules 0、import_errors 0 |
| 2026-06-14 | Batch 1-C：新增 `additive_usage_rules` 表、`promote:gb2760` 后端脚本和 promote 准入服务；只处理人工 `approved` / `promoted` 行，空签核场景 0 promoted，不把历史 `verified` staging 行自动写入新规则表 | Codex | `db:migrate` / `db:seed` / `promote:gb2760` / 后端 `typecheck` / 后端 `test` 通过；查询：additive_usage_rules 0、pending_review 2391、verified 13、import_errors 0 |
| 2026-06-14 | Batch 1-A：新增 `source_documents` / `import_runs` / `import_errors`，`db:seed` 写入 GB2760 三类导入批次，新增需登录的 `GET /api/gb2760/import-runs` 与错误明细接口 | Codex | `db:migrate` / `db:seed` / 后端 `typecheck` / 后端 `test` 通过；审计表查询：source 1、runs 3、errors 0 |
| 2026-06-14 | 文档与任务计划重构：`CODEX_TASKS.md` 重排为阶段 1-11，新增 GB2760 staging→promote→validate 流程、UX 阶段、人工阻塞跳过规则；`PROJECT_PLAN.md` 加入 7 天计划；补 `AGENTS.md` 并把产品入口合并到既有 `readme.md`；更新 `COMMANDS.md` 计划命令、`DATA_SOURCES.md` 状态模型、`AI_REVIEW.md` | Claude (Opus 4.8) + Codex | `validate:data` / `lint` / `test` / `build` / `git diff --check` 通过 |
| 2026-06-14 | GB2760 参考表行边界修复，`validate:data` 通过，2800 行分表数量与官方 PDF 一致 | Codex | `validate:data` / `lint` / `test` / `build` 通过 |
