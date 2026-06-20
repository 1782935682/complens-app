# 后台管理系统规范 ADMIN_CONSOLE_SPEC

> 本文属 `docs/product-blueprint/` 蓝图集。配套阅读：[`README.md`](./README.md)、[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)、[`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)、[`VISUAL_STYLE_GUIDE.md`](./VISUAL_STYLE_GUIDE.md)、[`API_CONTRACT.md`](./API_CONTRACT.md)、[`DATA_TRUST_SPEC.md`](./DATA_TRUST_SPEC.md)、[`PAGE_STRUCTURE.md`](./PAGE_STRUCTURE.md)。
>
> 本文涉及的接口契约与数据可信度规则必须与上述文档和后端真实代码保持一致；计划页面不得写成已实现。

---

## 0. 定位与范围

CompLens / 成分镜是一款面向普通消费者的**食品标签拍照解读与消费决策助手**。后台定位为：

```text
CompLens 产品运营后台 + 数据治理后台 + 系统配置后台
```

本文档描述后台管理系统的完整规划和分期，仅为产品/工程规范文档，不含实现代码；后台服务于数据可信、业务运营、会员运营、成本监控和系统配置，不改变用户端的消费者报告定位。

### 当前真实状态总结
- **后台尚未作为独立系统建设。** 唯一已部分落地的是「内部 GB2760 复核工作台」，嵌在现有用户端前端中：
  - 前端页面：`src/pages/gb2760ReviewPage.js`，路由约 `#/food/gb2760-review`
  - 后端：`backend/src/routes/gb2760.ts` + `gb2760Service.ts`
  - 对应迭代批次 **Batch 1-F**，状态 **⛔ blocked_by_user**（用户要求等产品页面设计统一后再继续推进）。
- 其余后台页面均为**计划**，部分能力依赖尚未确认的后端接口（见各节「当前状态」）。

### STACK-D 工程边界（2026-06-15）

本节用于确认 `admin-web/` 的建设边界。本批次仅规划，不创建工程目录；在 `admin-web/` 真实初始化前，不得把任何后台页面或命令写成已实现。

| 项 | 规划值 | 当前状态 |
|---|---|---|
| 目标目录 | `admin-web/` | 计划，尚未创建 |
| 技术栈 | Vue3 + TypeScript + Vite + TDesign Web | 计划 |
| 后端入口 | 现有 `backend/` Hono API，优先 `/api/admin/*`，MVP 可复用已存在 `/api/gb2760/*` 内部接口 | 部分后端接口已存在 |
| 设计系统 | 共用产品级 design tokens、数据状态枚举、文案红线；视觉形态按 TDesign 工作台而非消费端大卡片布局 | 计划 |
| 权限模型 | MVP 预留管理员登录；GB2760 写操作继续使用 `GB2760_INTERNAL_REVIEWERS` allowlist；产品化阶段补 RBAC | 部分后端 allowlist 已存在 |
| 实现边界 | 不直连数据库、OCR 服务、AI 服务、导入脚本或密钥；所有能力通过后端 API | 强制约束 |

目标目录结构（创建工程时再落地）：

```text
admin-web/
  src/
    main.ts
    App.vue
    router/
    layouts/
      AdminLayout.vue
    pages/
      dashboard/
      users/
      content/
      label-business/
      data-governance/
      providers/
      system/
      security/
    services/
      api/
    constants/
      dataStatus.ts
      routes.ts
    styles/
      tokens.css
```

MVP 启动范围：

1. Dashboard 概览：导入批次、待复核、OCR 失败、用户反馈、系统告警。
2. 数据治理：数据源、GB2760 导入任务、staging 复核、添加剂、食品分类、使用规则。
3. 食品标签业务：OCR 记录、用户反馈；扫描记录和报告记录先只读规划。
4. 系统配置：功能开关和 provider 状态只读；不展示密钥明文。
5. 权限与审计：管理员登录预留、操作日志规划；RBAC 后置到产品化。

明确不进入 MVP 强制范围：

- 会员、订阅、订单、支付、退款真实闭环。
- Apple IAP、Google Play Billing、微信支付、国内安卓渠道支付。
- AI 调用日志真实成本统计（AI Key 未提供前只能规划）。
- 自动部署生产或生产数据写入。

### 后台四类能力

1. **运营管理**：用户、会员、订阅、公告、Banner、FAQ、内容配置。
2. **数据治理**：GB2760、成分库、食品分类、规则、staging 复核。
3. **业务监控**：OCR 记录、报告记录、反馈记录、调用成本、失败日志。
4. **系统管理**：管理员、角色权限、系统配置、审计日志、版本配置。

### 后台分期

| 阶段 | 范围 | 说明 |
|---|---|---|
| MVP | 数据源管理、GB2760 导入状态、staging 数据复核、食品添加剂管理、食品分类管理、OCR 记录查看、用户反馈查看、基础系统配置、管理员登录预留 | 优先保证数据准入链路和基础运营可见 |
| Beta | 用户管理、用户详情、扫描记录、标签解读报告管理、公告管理、FAQ 管理、首页运营位配置、操作日志 | 支撑真实用户试用和问题回溯 |
| 产品化 | 会员管理、订阅计划、订单/支付记录、退款/取消记录、App/小程序版本配置、消息通知、AI/OCR 成本统计、角色权限系统、审计日志 | 支撑商业化和多人后台 |
| 上架/商业化 | Apple IAP、Google Play Billing、微信支付、国内安卓渠道、订阅权益、第三方 SDK 清单、隐私协议版本管理 | 需要开发者账号、支付账号、法务材料 |

> 支付、订阅、会员可以规划表结构和页面，但没有开发者账号、支付账号、App Store / Google Play / 微信支付配置前，不实现真实支付闭环，不伪造支付成功。

### 后台菜单结构

ADMIN-A 信息架构矩阵（2026-06-15）：

| 一级菜单 | 二级菜单 / 页面 | 阶段 | 当前状态 | MVP 边界 |
|---|---|---|---|---|
| 后台首页 / Dashboard | 数据治理概览、OCR 失败、反馈、系统告警 | MVP | 计划 | 只展示聚合状态和待处理入口，不做复杂 BI |
| 用户与会员 | 用户管理、用户详情、用户设备与登录记录 | Beta | 计划 | 不进入 MVP 强制范围 |
| 用户与会员 | 会员管理、订阅管理、订单/支付记录 | 产品化 / 上架商业化 | 计划 / blocked_by_user | 仅规划字段和页面，账号未提供前不实现真实支付闭环 |
| 内容运营 | 公告、Banner、首页场景卡片、FAQ、数据说明文案 | Beta | 计划 | 不阻塞数据治理 MVP |
| 内容运营 | 隐私政策 / 用户协议管理 | 上架商业化 | 计划 / 人工确认 | 需法务/人工确认版本内容 |
| 食品标签业务 | OCR 记录、用户反馈管理 | MVP | 计划 | 优先支撑 OCR 失败回溯和用户纠错 |
| 食品标签业务 | 扫描记录、标签解读报告、关注项统计、产品档案 | Beta | 计划 | 初期只读规划，不暴露隐私字段全集 |
| 数据治理 | 数据源、GB2760 导入任务、staging 复核、食品添加剂、食品分类、使用规则 | MVP | 计划；staging 旧页部分落地 | 数据可信主线，严禁把 `pending_review` 当权威结论 |
| 数据治理 | 普通配料词库、营养成分字段规则、包装卖点词库 | Beta | 计划 | 先规划，不影响当前 GB2760 准入闭环 |
| OCR / AI / Provider | OCR 失败日志 | MVP / Beta | 计划 | 只记录失败原因和降级状态，不保存敏感图片 |
| OCR / AI / Provider | OCR Provider、AI Provider、AI 调用日志、成本统计、降级策略 | 产品化 | 计划 / 部分人工阻塞 | 不展示密钥明文；AI Key 未提供前不伪造成本数据 |
| 系统配置 | 功能开关、基础平台配置 | MVP | 计划 | 开关不得绕过后端安全边界 |
| 系统配置 | App / 小程序版本、分享、消息、第三方 SDK | Beta / 产品化 / 上架商业化 | 计划 | 真机、商店和 SDK 清单需后续人工确认 |
| 权限与审计 | 管理员登录预留、操作日志规划 | MVP 预留 | 计划 | 高风险写操作继续受 allowlist / 后端鉴权保护 |
| 权限与审计 | 管理员、角色权限、审计日志 | 产品化 | 计划 | RBAC 后置，不让所有后台用户默认超级管理员 |

菜单阶段规则：

1. MVP 只服务数据准入、OCR/反馈回溯、基础配置和管理员登录预留。
2. Beta 支撑真实试用后的用户、报告、内容和反馈运营。
3. 产品化再做会员、成本、RBAC、系统版本和多人协作审计。
4. 上架/商业化依赖 Apple Developer、Google Play、微信支付、国内渠道、法务材料等人工前置条件；未满足前必须保持计划或 `blocked_by_user`。

```text
后台首页 / Dashboard

用户与会员
- 用户管理
- 用户详情
- 会员管理
- 订阅管理
- 订单/支付记录
- 用户设备与登录记录

内容运营
- 公告管理
- Banner 管理
- 首页场景卡片管理
- FAQ 管理
- 数据说明文案管理
- 隐私政策 / 用户协议管理

食品标签业务
- 扫描记录
- OCR 记录
- 标签解读报告
- 用户关注项统计
- 产品档案管理
- 用户反馈管理

数据治理
- 数据源管理
- GB2760 导入任务
- staging 数据复核
- 食品添加剂管理
- 食品分类管理
- 使用规则管理
- 普通配料词库
- 营养成分字段规则
- 包装卖点词库

OCR / AI / Provider
- OCR Provider 配置
- OCR 失败日志
- AI Provider 配置
- AI 调用日志
- 调用成本统计
- 降级策略配置

系统配置
- 功能开关
- 平台配置
- App / 小程序版本配置
- 分享配置
- 消息通知配置
- 第三方 SDK 配置

权限与审计
- 管理员管理
- 角色权限
- 操作日志
- 审计日志
```

### 已落地真实数据规模（截至文档时点）
- `source_documents`：1 条
- `import_runs`：批次类型含 a1_staging（2404 行）/ fulltext（264）/ reference_tables（2800）/ promote
- `additive_usage_rules`：2391 行
- staging（`gb2760_official_records`）：2404 行

### 全局数据状态枚举（`dataStatus` / `reviewStatus` 共用词表）
`verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr`

后台所有列表的状态标签必须使用上述统一枚举，禁止各页面自造状态文案。

---

## 1. 数据源管理

### ADMIN-B 数据治理 MVP 页面/API 矩阵（2026-06-15）

| 页面 | MVP 用途 | 第一版 API 策略 | 写操作边界 | 当前状态 |
|---|---|---|---|---|
| 数据源管理 | 查看 GB2760 来源文档、PDF SHA-256 和关联导入批次；发布日期/实施日期待独立来源 API | 通过 `GET /api/gb2760/import-runs` 返回的 `sourceDocument` 展示来源摘要；独立 `source_documents` 管理 API 后置 | 新增/编辑来源元数据暂不进 MVP，避免绕过导入审计 | 计划；数据表已存在，缺独立 UI |
| GB2760 导入任务 | 查看 fulltext / A.1 staging / reference_tables / promote 批次和错误 | 复用 `GET /api/gb2760/import-runs`、`GET /api/gb2760/import-runs/:id/errors` | UI 不触发导入脚本；导入仍由受控脚本执行 | 计划；后端只读接口已存在 |
| staging 数据复核 | 查看待复核/已签核/promoted 行，执行单条/批量复核和映射 | 复用 `GET /api/gb2760/staging-rows`、`PUT /api/gb2760/staging-rows/*` | 写操作必须登录 + `GB2760_INTERNAL_REVIEWERS` allowlist，并保留 `reviewedBy` / `reviewedAt` / `reviewNote` | 旧页部分落地；admin-web UI 计划 |
| 食品添加剂管理 | 按名称、分类、可信状态查看添加剂主数据和证据 | 复用 `GET /api/ingredients`、`GET /api/ingredients/search`、`GET /api/ingredients/:id?includeEvidence=1` | 编辑可信字段后置到专用后台 API；不得直接改 DB | 计划；现有接口只读可用 |
| 食品分类管理 | 查看 GB2760 食品分类系统和参考表 | 复用 `GET /api/gb2760/reference-rows?table=表 E.1`（表名以实际 reference 行为准） | 第一版只读；独立分类表/树编辑后置 | 计划；reference 行查询已存在 |
| 使用规则管理 | 查看 promote 后的使用范围/限量及溯源 | 第一版从 ingredient 详情证据与 `usageLimits` 展示；后续补 `/api/admin/additive-usage-rules` 聚合列表 | 编辑规则后置，且必须有审计和来源校验 | 计划；正式规则数据已存在 |
| 普通配料词库 | 查看普通配料可读性词条 | 复用 `GET /api/ingredients?dataStatus=common_ingredient` | 词库编辑后置 | Beta 计划 |
| 营养成分字段规则 | 规划能量、蛋白质、脂肪、糖、钠等解析字段 | `POST /api/nutrition/parse` 已后端接入，后台先复用 parse 结果展示 | 暂无后台写操作 | Beta 计划 |
| 包装卖点词库 | 规划 0 糖、低脂、高蛋白、无添加等卖点词库 | 等待包装卖点解析后端化 | 暂无后台写操作 | Beta 计划 |

数据治理 MVP 约束：

1. 第一版优先复用 `gb2760` 与 `ingredients` 现有接口，不为了后台页面重复造查询接口。
2. `pending_review` / `mapped_candidate` / `unverified` 只能作为待处理状态展示，不得展示为官方结论。
3. 复核、映射、编辑等写操作必须有权限和审计；没有专用后台 API 前不得让 `admin-web` 直连数据库或脚本。
4. 食品分类、使用规则、普通配料词库可先只读展示；涉及数据准入或可信状态调整时继续走 GB2760 staging → approve/promote 流程。

- **页面目标**：登记并管理 GB2760 等标准的原始来源文档，作为所有导入与可信度判定的溯源根。
- **核心字段**：标准号、标题、PDF 文件名、SHA-256、平台记录 ID、发布日期、实施日期。
- **列表字段**：标准号、标题、PDF 文件名、SHA-256（截断显示+复制）、发布/实施日期、关联导入批次数。
- **详情字段**：上述全部 + 关联的 `import_runs` 列表 + 关联记录统计。
- **主要操作**：新增/编辑来源元数据、查看关联导入任务、校验 SHA-256 一致性。
- **筛选条件**：标准号、发布/实施日期范围。
- **权限要求**：查看需登录；写操作建议限内部 reviewer allowlist（**待确认**：目前无专用写接口）。
- **是否 MVP 必须**：**是**（数据准入链路起点）。
- **当前状态**：计划（数据已存在 1 条 `source_documents`，尚无管理 UI）。

---

## 2. GB2760 导入任务

- **页面目标**：查看 GB2760 各类导入批次的执行情况与错误明细，支撑导入审计。
- **核心字段**：批次类型（`a1_staging` / `fulltext` / `reference_tables` / `promote`）、行数、状态、错误明细。
- **列表字段**：批次 ID、批次类型、行数、状态、开始/结束时间、错误数。
- **详情字段**：批次元数据 + 逐条 `import_errors`（行号、字段、错误原因、原始值）。
- **主要操作**：查看批次列表、查看单批次错误明细；（导入触发为后端脚本，UI 仅查看）。
- **筛选条件**：批次类型、状态、来源文档。
- **权限要求**：只读，需登录。
- **真实后端接口**：`GET /api/gb2760/import-runs`、`GET /api/gb2760/import-runs/:id/errors`（需登录）。
- **是否 MVP 必须**：**是**。
- **当前状态**：计划（后端审计接口已存在，缺管理 UI）。

---

## 3. staging 数据复核 — **已部分落地（Batch 1-F）**

- **页面目标**：对 GB2760 解析出的待审记录逐条/批量人工复核签核，是数据准入的核心人工环节。
- **数据表**：`gb2760_official_records`（添加剂 × 食品类别 × 限量/备注）。
- **核心字段**：添加剂名称、CNS、INS、食品类别、最大限量、备注、PDF 页码、原文片段、`reviewStatus`、签核审计字段。
- **签核审计字段**：`reviewedBy`、`reviewedByUserId`、`reviewedAt`、`reviewNote`。
- **列表字段**：添加剂、CNS/INS、食品类别、限量、`reviewStatus` 标签、PDF 页、reviewedBy/reviewedAt。
- **详情字段**：上述全部 + 原文区域（PDF 页 + 原文片段对照）+ 映射的 `ingredientId` + promote 预检结果。
- **主要操作**：
  - 单条 / 批量签核为 `approved`
  - 退回 `pending_review`
  - 标记 `mapped_candidate`
  - 映射成分身份 `ingredientId`
  - promote 预检（字段齐全且已签核才可 promote）
- **筛选条件**：`reviewStatus`、ready 筛选（可 promote 的就绪记录）、分页 + 每页条数。
- **权限要求**：**写操作需内部 reviewer allowlist（`GB2760_INTERNAL_REVIEWERS`），普通登录返回 403**；只读需登录。
- **真实后端接口**：`PUT /api/gb2760/staging-rows/*`（签核/映射写操作，要求 reviewer allowlist）。
- **关联脚本**：
  - `npm run map:gb2760`：自动映射缺失成分身份，置 `mapped_candidate`
  - `npm run promote:gb2760`：人工签核且字段齐全才 promote 到 `additive_usage_rules`
  - `npm run validate:gb2760`：准入校验
- **是否 MVP 必须**：**是（最高优先）**。
- **当前状态**：**已部分落地**。
  - 已落地：内部复核入口、分页/每页条数、ready 筛选、单条/批量签核、自动映射脚本、审计字段、reviewer allowlist、promote 闭环。
  - 待补：手动映射 UI、后台工作台视觉、更完整角色系统（用户要求待产品页面设计统一后推进）。

---

## 4. 食品添加剂管理

- **页面目标**：维护添加剂成分主数据及其可信度标记。
- **数据表**：`ingredients`。
- **核心字段**：成分名称、CNS、INS、别名、可信字段（来源依据）、`dataStatus`。
- **列表字段**：成分名称、CNS/INS、`dataStatus` 标签、关联使用规则数。
- **详情字段**：可信字段全集、`dataStatus`、来源溯源、关联 `additive_usage_rules`。
- **主要操作**：编辑可信字段、调整 `dataStatus`、查看关联规则。
- **筛选条件**：`dataStatus`、是否有 CNS/INS。
- **权限要求**：只读需登录；写操作建议限 reviewer allowlist（**待确认**）。
- **是否 MVP 必须**：否。
- **当前状态**：计划。

---

## 5. 使用规则管理

- **页面目标**：查看/维护正式准入的添加剂使用规则（promote 后的成品库）。
- **数据表**：`additive_usage_rules`。
- **核心字段**：添加剂、食品类别、最大用量、来源（溯源 `source_documents` / 导入批次）。
- **列表字段**：添加剂、食品类别、最大用量、来源、数据状态。
- **详情字段**：规则全字段 + 溯源链（来源文档 → 导入批次 → staging 记录）。
- **主要操作**：查看、（受限）编辑、溯源跳转。
- **筛选条件**：食品类别、添加剂、来源、数据状态。
- **权限要求**：只读需登录；写操作建议限 reviewer allowlist（**待确认**）。
- **是否 MVP 必须**：否（由 staging promote 自动产生，第一版以只读查看为主）。
- **当前状态**：计划（数据已有 2391 行）。

---

## 6. 食品分类管理

- **页面目标**：管理 GB2760 食品分类系统（分类编码与层级）。
- **数据表**：当前存于 `reference_rows`（**待确认**：是否拆分为独立分类表）。
- **核心字段**：分类编码、分类名称、层级/父级、说明。
- **列表字段**：分类编码、名称、层级、关联规则数。
- **详情字段**：分类全字段 + 上下级 + 关联使用规则。
- **主要操作**：查看分类树/列表（第一版以只读为主）。
- **筛选条件**：层级、关键词。
- **权限要求**：只读需登录。
- **是否 MVP 必须**：否。
- **当前状态**：计划（数据在 `reference_rows`，约 2800 行 reference_tables 导入）。

---

## 7. OCR 记录管理

- **页面目标**：查看 OCR 识别原文、置信度与 provider，用于排查识别质量。
- **核心字段**：OCR 识别文字、置信度、provider、图片引用。
- **列表字段**：记录 ID、provider、置信度、识别时间、关联产品分析。
- **详情字段**：原文全文、分段置信度、provider、图片引用、关联 `user_reports`。
- **主要操作**：查看原文、按 provider/置信度排查。
- **筛选条件**：provider、置信度区间、时间范围。
- **权限要求**：只读需登录。
- **是否 MVP 必须**：否。
- **当前状态**：计划。
  - **待确认**：当前图片存于客户端 **IndexedDB**，后台是否可访问图片需确认；`ocr_results` 表为**计划/待确认**，目前无统一后端 OCR 记录表。

---

## 8. 用户反馈管理

- **页面目标**：集中查看与处理用户反馈/支持请求。
- **核心字段**：反馈内容、用户标识、提交时间、状态、处理备注。
- **列表字段**：反馈摘要、用户、提交时间、状态。
- **详情字段**：反馈全文、关联上下文、处理记录。
- **主要操作**：查看、标记处理状态、回复（**待确认**）。
- **筛选条件**：状态、时间范围。
- **权限要求**：只读需登录；处理写操作建议限管理员。
- **是否 MVP 必须**：否。
- **当前状态**：计划。
  - **待确认**：当前 `supportService` 为**客户端本地**实现，后端 feedback 接口**待确认**，无后台数据来源。

---

## 9. 产品分析记录

- **页面目标**：查看用户侧产品分析与归档记录，支撑数据分析与问题回溯。
- **数据表**：`user_reports`、`product_archives`。
- **核心字段**：报告 ID、用户、产品/配料、分析结果、生成时间；归档产品标识、归档时间。
- **列表字段**：报告 ID、用户、产品、生成时间、关联 OCR 记录。
- **详情字段**：分析结果全文、关联 OCR、关联使用规则命中。
- **主要操作**：查看、检索、跳转关联 OCR/规则。
- **筛选条件**：用户、时间范围、产品关键词。
- **权限要求**：只读需登录。
- **是否 MVP 必须**：否。
- **当前状态**：计划。

---

## 10. 系统配置

- **页面目标**：管理后台运行所需的关键配置项。
- **核心字段**：OCR provider 配置、reviewer allowlist（`GB2760_INTERNAL_REVIEWERS`）、其他开关。
- **列表/详情字段**：配置项名称、当前值、说明、可选值。
- **主要操作**：查看/编辑配置（编辑权限限管理员，**待确认**是否走环境变量而非可视化编辑）。
- **筛选条件**：配置分类。
- **权限要求**：管理员（**待确认**：当前 allowlist 等以环境变量配置，可视化编辑能力待评估）。
- **是否 MVP 必须**：否。
- **当前状态**：计划。

---

## 11. 用户管理（Beta）

### 字段

| 字段 | 说明 |
|---|---|
| 用户ID | 系统内部用户标识 |
| 昵称 | 用户显示名 |
| 手机号 / 邮箱 / 微信 openid | 按平台实际登录方式保存；敏感信息需脱敏展示 |
| 注册时间 | 用户首次注册时间 |
| 最近登录时间 | 最近一次登录或打开服务时间 |
| 平台来源 | `web` / `wechat_mp` / `ios` / `android` |
| 会员状态 | 免费 / 会员 / 过期 / 试用等，按会员模块定义 |
| 扫描次数 | 累计扫描或 OCR 请求次数 |
| 报告数量 | 生成食品标签解读报告数量 |
| 反馈数量 | 用户反馈次数 |
| 账号状态 | 正常 / 禁用 / 删除申请中 |

### 操作

- 查看用户详情。
- 查看扫描记录。
- 查看报告记录。
- 查看反馈记录。
- 禁用用户。
- 恢复用户。
- 导出用户（后续）。

不在 MVP 强制实现复杂 CRM，不做营销自动化。

### ADMIN-C 用户与反馈管理页面/API 矩阵（2026-06-15）

| 页面 / 能力 | 阶段 | 第一版数据来源 | 后台 API 状态 | 隐私与权限边界 |
|---|---|---|---|---|
| 用户列表 | Beta | `users`、`user_reports`、`product_archives` 聚合；现有 `/api/auth/me` 只返回当前用户 | `GET /api/admin/users` 计划 | 邮箱/手机号/openid 脱敏；不展示密码 hash、token、完整设备指纹 |
| 用户详情 | Beta | `users` + favorites/history/allergens/profile/reports/products 摘要 | `GET /api/admin/users/:id` 计划 | 默认只读；敏感字段最小必要展示 |
| 用户设备与登录记录 | Beta | 当前仅有 `sessions` token / expiresAt；缺平台、设备、IP、UA 结构化字段 | `GET /api/admin/users/:id/devices` 后置计划 | 不保存或展示超出登录安全排查需要的原始指纹 |
| 扫描记录 | Beta | 用户端本地/`user_reports.data` 里可能含 OCR/标签上下文；尚无独立 scan sessions 表 | `GET /api/admin/label-scans` 计划 | 图片仍按 IndexedDB/对象存储边界处理；后台不直接读取前端 IndexedDB |
| 标签解读报告 | Beta | 现有 `/api/user/reports` 仅服务登录用户本人；DB 表为 `user_reports` | `GET /api/admin/reports`、`GET /api/admin/reports/:id` 计划 | 报告识别文字、过敏/忌口、关注项属于敏感上下文，需按管理员权限和审计查看 |
| 产品档案 | Beta | 现有 `/api/user/products` 仅服务登录用户本人；DB 表为 `product_archives` | `GET /api/admin/products` 计划 | 产品图片、原始标签文本不作为公开运营素材 |
| 用户反馈 | MVP | 旧 `supportService` 仅本机 markdown/复制流；无后端反馈表；用户提交入口应为公开 `POST /api/feedback` | `GET/PATCH /api/admin/feedback` 计划 | 反馈可能包含联系方式、报告识别文字和过敏信息；处理状态写操作需审计 |
| 禁用 / 恢复用户 | Beta | 现有 `users` 表没有 accountStatus 字段 | `PATCH /api/admin/users/:id/status` 计划 | 需管理员权限、原因、操作者、前后状态；不得作为支付或客服结论替代 |

ADMIN-C 落地约束：

1. 现有 `/api/user/*` 仍是“当前登录用户自己的收藏、历史、关注项、报告、产品档案同步接口”，不能直接当后台跨用户查询接口使用。
2. 后台用户/报告/反馈 API 必须走 `backend/`，不得让 `admin-web/` 直连数据库或读取前端 IndexedDB。
3. 没有 `accountStatus`、`feedback_tickets`、`scan_sessions`、`login_devices` 等后端结构前，只能写计划和数据来源假设，不能把禁用/恢复、反馈处理、扫描追踪写成已实现。
4. 用户隐私字段默认脱敏；报告识别文字、联系方式、过敏/忌口/关注项、OCR 识别文字和图片引用都需要权限和审计。

## 12. 会员管理（产品化）

### 会员字段

| 字段 | 说明 |
|---|---|
| 用户ID | 关联用户 |
| 会员等级 | free / plus / pro 等，最终名称待确认 |
| 会员状态 | active / expired / cancelled / trial 等 |
| 开通时间 | 权益开始时间 |
| 到期时间 | 权益结束时间 |
| 订阅来源 | ios / android / wechat / web / admin_grant |
| 权益包 | OCR 次数、AI 次数、历史容量、对比能力等 |
| 剩余 OCR 次数 | 如采用次数制 |
| 剩余 AI 解读次数 | 如采用次数制 |

### 权益建议

- 免费用户：有限次数 OCR、历史记录数量有限。
- 会员用户：更多 OCR 次数、更多历史记录、高级解读、对比功能。

商业模式不要现在写死，需要支持：

- 免费额度。
- 按月订阅。
- 按年订阅。
- 次数包（后续）。

## 13. 订阅计划与订单（产品化 / 上架商业化）

### 订阅计划字段

| 字段 | 说明 |
|---|---|
| planId | 计划 ID |
| 计划名称 | 月度 / 年度 / 终身 / 次数包等 |
| 周期 | `monthly` / `yearly` / `lifetime` / `credits` |
| 价格 | 数值 |
| 币种 | CNY / USD 等 |
| 权益 | OCR 次数、AI 次数、历史容量、功能开关 |
| 状态 | 启用 / 停用 |
| 平台 | ios / android / wechat / web |

### 订单字段

| 字段 | 说明 |
|---|---|
| orderId | 系统订单 ID |
| userId | 用户 ID |
| planId | 订阅计划 ID |
| 支付平台 | Apple / Google / WeChat / Alipay / App Store channel 等 |
| 平台订单号 | 外部平台订单号 |
| 支付金额 | 实付金额 |
| 支付状态 | pending / paid / failed / refunded |
| 订阅状态 | active / cancelled / expired |
| 创建时间 | 订单创建时间 |
| 支付时间 | 支付完成时间 |
| 取消时间 | 用户或平台取消时间 |
| 退款时间 | 退款时间 |

状态枚举：

```text
pending
paid
active
cancelled
expired
refunded
failed
```

约束：

- 订阅和支付属于产品化阶段。
- 当前如果没有支付平台账号，只规划后台页面、数据模型和 API，不接真实支付。
- 不允许伪造支付成功。
- iOS 订阅后续接 Apple IAP。
- 安卓海外后续接 Google Play Billing。
- 国内安卓后续接微信 / 支付宝 / 应用商店支付。
- 小程序后续接微信支付。

## 14. 内容运营

### 公告管理

公告字段：

- 公告ID
- 标题
- 内容
- 展示平台：`all` / `web` / `wechat_mp` / `ios` / `android`
- 展示位置：首页弹窗 / 首页顶部 / 我的页 / 系统公告
- 开始时间
- 结束时间
- 状态
- 优先级
- 创建人
- 更新时间

操作：

- 创建公告
- 编辑公告
- 上架
- 下架
- 预览
- 定时发布

公告用途：

- 版本更新
- 服务维护
- 数据源更新
- 隐私政策更新
- 重要通知

### Banner / 首页运营位

字段：

- 标题
- 副标题
- 图片
- 跳转类型
- 跳转地址
- 展示平台
- 排序
- 状态
- 开始时间
- 结束时间

### FAQ / 内容管理

内容类型：

- FAQ
- 数据来源说明
- OCR 隐私说明
- 食品标签解读说明
- 免责声明
- 隐私政策
- 用户协议

内容字段：

- 标题
- 内容
- 语言
- 版本号
- 状态
- 发布时间
- 更新时间

隐私政策和用户协议必须支持版本管理。

### ADMIN-D 内容运营页面/API 矩阵（2026-06-15）

| 页面 / 能力 | 阶段 | 目标内容 | 后台 API 状态 | 发布与合规边界 |
|---|---|---|---|---|
| 公告管理 | Beta | 版本更新、服务维护、数据源更新、隐私政策更新、系统公告 | `GET/POST/PATCH/DELETE /api/admin/announcements` 计划 | 发布、下架、定时发布必须记录操作者和前后状态 |
| Banner 管理 | Beta | 首页运营位、活动入口、数据说明入口 | `GET/POST/PATCH /api/admin/banners` 计划 | 图片使用后台 asset 引用，不提交字体或大图；不得作为支付/医疗承诺 |
| 首页场景卡片管理 | Beta | 控糖、低钠、孩子、忌口等入口配置 | `GET/POST/PATCH /api/admin/home-cards` 计划 | 文案只能引导“重点查看/建议关注”，不得写购买或医疗结论 |
| FAQ 管理 | Beta | 常见问题、使用流程、OCR 失败处理、数据可信说明 | `GET/POST/PATCH /api/admin/content?type=faq` 计划 | FAQ 不能替代法律条款或医学建议 |
| 数据说明文案管理 | Beta | 数据来源、可信等级、OCR 隐私、AI 非权威、标签解读说明、免责声明 | `GET/POST/PATCH /api/admin/content` 计划 | 必须与 `DATA_TRUST_SPEC.md`、`PRIVACY_AND_COMPLIANCE_SPEC.md` 保持一致 |
| 隐私政策 / 用户协议版本管理 | 上架商业化 / 人工确认 | 隐私政策、用户协议、订阅说明、数据安全说明版本 | `GET/POST/PATCH /api/admin/legal-documents` 后置计划 | 最终文案需人工/法务确认；可规划草稿/发布/归档状态，不能伪造法务通过 |

ADMIN-D 落地约束：

1. 当前 `src/data/legalContent.js` 只是旧前端法律文案草案，`user-uniapp/src/pages/privacy/index.vue` 是用户端隐私说明页；后台内容运营不得把这些静态草案写成已发布正式协议。
2. 所有内容发布接口必须走 `backend/`，不得让 `admin-web/` 直连静态文件、数据库或对象存储。
3. 内容状态至少区分 `draft` / `scheduled` / `published` / `archived`；发布、下架、定时发布、协议版本切换都必须有审计记录。
4. 隐私政策、用户协议、订阅说明、数据安全说明最终版属于人工/法务阻塞；Codex 只规划结构、状态和接口边界。
5. 运营文案必须遵守禁用词边界，不得出现“可以买/不能买/健康/不健康/安全/有害/治疗/诊断”等结论。

## 15. 系统配置和功能开关

配置项包括：

- 是否启用 OCR
- 默认 OCR Provider
- 是否启用 AI 解读
- 免费 OCR 次数
- 免费报告保存数量
- 是否启用产品对比
- 是否启用包装卖点提示
- 是否展示订阅入口
- 维护模式
- 最低 App 版本

功能开关必须支持平台范围：

```text
web
wechat_mp
ios
android
all
```

配置编辑须记录操作日志；涉及 provider、支付、SDK 的配置应优先读取后端环境变量或密钥管理系统，后台仅展示引用和启停状态，不展示密钥明文。

### ADMIN-H 系统配置页面/API 矩阵（2026-06-15）

| 页面 / 能力 | 阶段 | 目标内容 | 后台 API 状态 | 配置与审计边界 |
|---|---|---|---|---|
| 功能开关 | MVP / 产品化 | OCR、AI、产品对比、包装卖点提示、订阅入口、维护模式 | `GET /api/admin/feature-flags`、`PATCH /api/admin/feature-flags/:key` 计划 | 开关不得绕过后端鉴权、数据可信校验或 OCR 文本确认 |
| 平台配置 | 产品化 | `web` / `wechat_mp` / `ios` / `android` / `all` 平台开关、API base、能力矩阵 | `GET/PATCH /api/admin/platform-config` 计划 | 小程序/App 仍必须通过后端 API；不得写入 OCR/AI Key |
| App / 小程序版本配置 | 产品化 / 上架商业化 | 最低版本、推荐版本、升级提示、强制升级策略、平台渠道 | `GET/PATCH /api/admin/app-versions` 计划 | 真机、商店审核和版本发布需人工；后台只管理配置草案 |
| 分享配置 | Beta | 分享标题、摘要、落地页、报告分享默认文案 | `GET/PATCH /api/admin/share-config` 计划 | 分享文案不得包含购买、医疗或营养诊断结论 |
| 消息通知配置 | 产品化 | 订阅消息、系统通知、数据更新提醒、反馈处理提醒 | `GET/PATCH /api/admin/notification-config` 计划 | 推送模板、平台权限和用户授权需人工确认 |
| 第三方 SDK 配置 | 上架商业化 | SDK 名称、用途、平台范围、启停状态、隐私说明引用 | `GET/PATCH /api/admin/sdk-config` 计划 | 只展示 SDK 清单和状态；密钥、证书和商店材料不在前端暴露 |

ADMIN-H 落地约束：

1. 配置来源必须区分 `env` / `database` / `secret_manager` / `static_default`；密钥类配置只展示“已配置/未配置”和来源引用，不返回明文。
2. 影响 OCR、AI、支付、SDK、版本强制升级、维护模式的变更必须写操作日志，记录操作者、前后值、平台范围和变更原因。
3. 未实现 RBAC 前，配置写操作保持只读或内部管理员 allowlist，不得默认所有登录用户可改。
4. 功能开关只能控制入口或能力启停，不能让前端绕过后端鉴权、数据可信状态、文本确认页、隐私授权或人工阻塞边界。
5. 订阅入口、支付入口、App/小程序版本和第三方 SDK 均依赖人工账号/法务材料；Codex 当前只规划配置结构。

## 16. OCR / AI 成本监控

### OCR 监控

字段：

- OCR 请求数
- 成功数
- 失败数
- 平均耗时
- Provider
- 失败原因
- 图片大小
- 平台来源

### AI 监控

字段：

- 调用次数
- 模型
- 输入 tokens
- 输出 tokens
- 成本估算
- 失败原因
- 用户ID
- 报告ID

AI/OCR 调用成本直接影响会员权益和商业化定价，后台需要可查看、可按时间和平台过滤。

### ADMIN-F OCR / AI / Provider 页面/API 矩阵（2026-06-15）

| 页面 / 能力 | 阶段 | 目标内容 | 后台 API 状态 | 隐私与阻塞边界 |
|---|---|---|---|---|
| OCR Provider 状态 | MVP / 产品化 | 当前 provider、配置来源、可用状态、最近错误、降级状态 | `GET /api/admin/providers/ocr` 计划 | 不展示 `OCR_API_KEY`；本机 RapidOCR 和生产 Aliyun 状态分开 |
| OCR 失败日志 | MVP / Beta | 请求 ID、provider、平台、失败码、耗时、图片大小、是否进入 manual fallback | `GET /api/admin/ocr-logs` 计划 | 不保存或展示敏感原图；图片只可显示脱敏引用 |
| OCR 成功率与耗时 | Beta | 请求数、成功率、平均耗时、P95、失败原因分布、平台分布 | `GET /api/admin/ocr-metrics` 计划 | 只做运营监控，不把 OCR 识别文字当权威来源 |
| AI Provider 状态 | 产品化 / blocked_by_user | 模型、启停、配置来源、最近错误、可用性 | `GET /api/admin/providers/ai` 计划 / blocked | AI Key 和模型选型未提供前只显示未配置，不伪造可用状态 |
| AI 调用日志 | 产品化 / blocked_by_user | 模型、tokens、成本估算、失败原因、关联报告 | `GET /api/admin/ai-logs` 计划 / blocked | 不保存完整敏感 prompt；AI 结果只作解释层 |
| 调用成本统计 | 产品化 | OCR/AI 按平台、provider、时间范围的请求数和成本估算 | `GET /api/admin/cost-summary` 计划 | 没有真实调用日志时不得填假成本或假单价 |
| 降级策略配置 | 产品化 | OCR 超时、provider 不可用、AI 不可用时的 manual/mock/fallback 策略 | `GET/PATCH /api/admin/degradation-policies` 计划 | 降级必须保留手动输入和文本确认，不得返回假 OCR/AI 结论 |

ADMIN-F 落地约束：

1. OCR 监控第一版优先记录失败原因、耗时、provider 和降级状态；敏感图片、完整 OCR 识别文字和用户隐私字段默认不进入后台列表。
2. AI Key 未提供前，AI Provider、AI 日志和成本统计只能展示“未配置/无数据”，不得构造假调用或假成本。
3. Provider 配置页面只展示 provider 名称、启用状态、配置来源、可用状态和最近错误，不展示密钥明文。
4. 所有 OCR/AI 监控数据仍属于运营排障信息，不改变用户端数据可信规则；OCR 是用户输入来源，AI 是解释层。
5. 降级策略不得绕过 OCR 文本确认页，不得用 mock 冒充真实 provider。

## 17. 权限与审计

角色建议：

```text
super_admin
data_admin
operation_admin
support_admin
viewer
```

权限维度：

- 用户查看
- 用户禁用
- 数据复核
- 添加剂编辑
- 规则编辑
- 公告发布
- 会员查看
- 订阅管理
- 系统配置
- 管理员管理

操作日志必须记录：

- 管理员ID
- 操作类型
- 对象类型
- 对象ID
- 操作前
- 操作后
- IP
- User-Agent
- 操作时间

### ADMIN-G 权限与审计页面/API 矩阵（2026-06-15）

| 页面 / 能力 | 阶段 | 目标内容 | 后台 API 状态 | 权限与合规边界 |
|---|---|---|---|---|
| 管理员管理 | MVP 预留 / 产品化 | 管理员账号、状态、角色、最近登录 | `GET/POST/PATCH /api/admin/admin-users` 计划 | 不展示 token；新增/禁用管理员必须审计 |
| 角色权限 | 产品化 | `super_admin`、`data_admin`、`operation_admin`、`support_admin`、`viewer` 与权限矩阵 | `GET/POST/PATCH /api/admin/roles` 计划 | RBAC 未落地前不开放高风险写操作给普通登录用户 |
| 操作日志 | MVP / Beta | 登录、查看敏感详情、配置变更、反馈处理、内容发布等操作记录 | `GET /api/admin/operation-logs` 计划 | 敏感字段按摘要或 diff 存储，避免日志泄露密钥和原图 |
| 审计日志 | 产品化 | 数据复核、规则编辑、权限变更、系统配置、协议发布等关键审计 | `GET /api/admin/audit-logs` 计划 | 关键合规操作不可绕过审计；支持按操作者/对象/时间过滤 |
| reviewer allowlist 状态 | MVP | 查看 `GB2760_INTERNAL_REVIEWERS` 是否配置、当前账号是否可写 GB2760 复核 | `GET /api/admin/reviewer-access` 计划 | 只展示命中状态和配置来源，不泄露完整内部名单给无权限用户 |
| 权限自检 | MVP | 当前管理员可访问菜单、可执行操作、禁用原因 | `GET /api/admin/me/permissions` 计划 | 前端菜单隐藏不等于权限；后端仍必须逐接口校验 |

ADMIN-G 落地约束：

1. MVP 阶段可以继续使用普通 JWT 登录 + `GB2760_INTERNAL_REVIEWERS` allowlist 保护高风险数据写操作；RBAC 表和完整管理员体系后置到产品化。
2. 权限必须区分只读、处理、发布、复核、配置、管理员管理，不允许所有后台用户默认超级管理员。
3. 数据复核、内容发布、用户禁用、配置变更、权限变更、协议版本发布等操作必须记录操作者、前后状态、对象 ID、IP、User-Agent 和时间。
4. 敏感查看行为也应逐步纳入操作日志，包括报告识别文字、OCR 识别文字、联系方式、过敏/忌口和关注项等隐私上下文。
5. 日志不得记录密钥明文、完整支付凭证、token、用户密码或未经脱敏的图片内容。

---

## 权限边界

- **只读接口**：需登录。
- **GB2760 写操作**（签核 / 映射 / promote 相关）：需位于**内部 reviewer allowlist** `GB2760_INTERNAL_REVIEWERS`，**普通登录用户返回 403**。
- 其余页面写操作按角色权限系统规划执行；未落地前必须保持只读或内部 allowlist，不得默认所有登录用户可写。

---

## 后台技术建议

- **独立 Web 项目**：后台应作为 `admin-web/` 单独建设，技术栈为 **Vue3 + TDesign Web**。
- **不与用户端强行共用页面代码**：正式用户端为 `user-uniapp`（uni-app + Vue3），当前 `src/` 为历史原型；后台使用 TDesign 工作台形态，不能复用消费端页面。
- **必须共用**：设计 token、数据状态枚举、API 契约。三者作为用户端与后台的统一约定层，不得各自分叉。

---

## UI 形态要求

后台采用**工作台形态**，与消费端的视觉语言区分：

- 密集列表 / 表格为主，信息密度高。
- 顶部/选区批量工具栏（批量签核、批量退回等）。
- 详情区 + 原文对照区域（如 staging 复核的 PDF 页 + 原文片段对照）。
- 统一状态标签（复用全局数据状态枚举，颜色/文案统一）。
- **不使用**消费端的大卡片堆叠式布局。
