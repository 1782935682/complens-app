# API 契约（API_CONTRACT）

> 本文件属于 `docs/product-blueprint/` 蓝图集，是 CompLens/成分镜 面向所有客户端（Web/PWA、微信小程序、原生 App、内部后台）的**统一 API 契约**。
>
> 关联文档：
> - [`README.md`](./README.md)：蓝图集索引。
> - 根目录 `README.md`：项目入口说明。
> - 根目录 `DATA_SOURCES.md`：数据治理与来源原则的**权威依据**。本文件与 `DATA_SOURCES.md` 冲突时以后者为准。
> - `docs/product-blueprint/DATA_TRUST_SPEC.md`：展示层数据可信规范（dataStatus / 来源类型 / 展示规则）。本文件可信字段约定与之对齐。
> - `docs/product-blueprint/FRONTEND_SPEC.md`：前端规格。
> - `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`：跨端规格。
> - `docs/product-blueprint/ARCHITECTURE_SPEC.md`：统一技术栈、后端必需性、OCR 服务链路和后台规划。
>
> **本契约同时记录两类接口，并以状态标签明确区分，绝不把不存在的接口写成已存在：**
> - ✅ **已实现**：后端代码中真实存在的路由（已在 `backend/src/routes/*` 与 `backend/src/app.ts` 核对）。
> - ⚠️ **现有等价 / 部分**：目标主流程接口未以该名称存在，但有真实等价能力（可能在后端，也可能仅在前端本地）。
> - ❌ / 计划 / blocked：尚未实现，仅作目标规范。
>
> **核心原则**：配料解析、配料匹配、可信字段判定等核心逻辑应尽量收敛到后端或 shared core，避免各端各自实现配料解析逻辑导致口径漂移（当前 `parseIngredientList` 仍在前端 `src/utils/text.js`，属待收敛项，见第二部分）。
>
> **约定**：任何接口的新增、改名、参数或响应字段变更，必须同步更新本文件。

技术栈现状：后端 Node 20 + TypeScript + Hono + Drizzle/PostgreSQL。路由模块：`auth` / `health` / `ingredients` / `ocr` / `user` / `gb2760` / `labels` / `nutrition` / `reports`。除 `GET /health` 挂载于根路径 `/` 外，其余均挂载于 `/api` 前缀（见 `backend/src/app.ts`）。

后端分层边界（STACK-C，2026-06-15 已核对）：

| 层 | 当前真实目录 | 责任 |
|---|---|---|
| App 装配 | `backend/src/app.ts` | 创建 Hono app、挂载中间件、组合路由、统一 404/500 响应 |
| 启动入口 | `backend/src/index.ts` | 读取配置并启动 Node server |
| 路由层 | `backend/src/routes/*` | HTTP 路径、鉴权、参数读取、状态码和响应形状 |
| 中间件 | `backend/src/middleware/*` | JWT 鉴权、请求日志等横切逻辑 |
| 服务层 | `backend/src/services/*` | 业务编排、数据库查询组合、数据可信状态判断、报告/解析逻辑 |
| Provider | 当前 `backend/src/services/ocrProviders/*` | OCR 外部服务适配；AI/支付等 provider 真实落地后再扩展，不提前空建目录 |
| 数据层 | `backend/src/db/*` | Drizzle client、schema 和 migrations |

新增 API 的落地规则：

1. 不创建 Express / Nest / Fastify 第二套服务，所有端继续复用现有 Hono 后端。
2. 新业务先补 `routes/<domain>.ts` + `services/<domain>Service.ts`，必要时再补 `tests/<domain>.test.ts`。
3. 请求/响应 validator、shared schema、jobs 目录只在真实接口需要复用时创建，不为目录结构本身空建文件。
4. `user-uniapp`、旧 `src/`、小程序、App、后台均不得直连 OCR / AI / 数据库 / GB2760 导入脚本。
5. 计划接口在代码实现前必须继续标为 ❌ 或 ⚠️；本地 parser、mock-only adapter 和本地报告存储不能写成后端已实现。

消费者主路径后端化建议顺序：

1. `labels`：新增 `POST /api/labels/scan` 与 `POST /api/labels/classify`，收敛标签类型识别和扫描会话状态。
2. `nutrition`：新增 `POST /api/nutrition/parse`，把营养表解析从各端本地工具收敛到服务层，保留手动修正。
3. `reports`：新增 `POST /api/reports/label`，由后端聚合配料匹配、营养字段、关注项和来源证据；匿名本地 MVP 仍可保留。
4. `data-sources` / `feedback`：补数据说明和用户纠错入口；不影响 OCR 主路径闭环。
5. `admin`：随 `admin-web` 分期建设后台聚合 API；会员、订阅、支付仍按人工阻塞处理。

通用错误约定（实测）：
- 参数校验失败：`400 { error: "invalid_parameter", field, message }`
- 资源不存在：`404 { error: "not_found" }`
- 未匹配路由：`404 { error: "not_found" }`（`app.notFound`）
- 未捕获异常：`500 { error: "internal_server_error" }`（`app.onError`）
- 鉴权：需登录接口使用 JWT（`Authorization: Bearer <token>`，见 `backend/src/middleware/auth.ts`）。

---

## 第一部分：现状接口清单（已实现）

> 以下接口均已在后端代码中核对存在。字段名以代码为准。

### 1. 健康检查

#### `GET /health`  ✅ 已实现
- 用途：服务健康探针 / 版本信息。
- 调用端：运维、所有客户端启动探测。
- 鉴权：**允许匿名**。
- 请求参数：无。
- 响应：`{ status: "ok", version: "0.1.0", timestamp: <ISO 字符串> }`
- 来源：`backend/src/routes/health.ts`。

---

### 2. 鉴权（auth）

> 真实路径已核对（`backend/src/routes/auth.ts`，挂载于 `/api`）。

#### `POST /api/auth/register`  ✅ 已实现
- 用途：邮箱注册。
- 鉴权：匿名。
- 请求体：`{ email: string, password: string(>=8) }`
- 成功：`201 { token, tokenType, expiresAt(ISO), user: { id, email, createdAt(ISO) } }`
- 错误：`400 invalid_parameter`（email/password 校验）；`409 { error: "email_already_registered" }`。

#### `POST /api/auth/login`  ✅ 已实现
- 用途：邮箱登录。
- 鉴权：匿名。
- 请求体：`{ email, password }`
- 成功：`200 { token, tokenType, expiresAt(ISO), user }`
- 错误：`400 invalid_parameter`；`401 { error: "invalid_credentials" }`。

#### `POST /api/auth/logout`  ✅ 已实现
- 鉴权：**需登录**。
- 行为：使当前 token 失效。
- 成功：`200 { ok: true }`。

#### `GET /api/auth/me`  ✅ 已实现
- 鉴权：**需登录**。
- 成功：`200 { user: { id, email, createdAt(ISO) } }`。

#### `DELETE /api/auth/account`  ✅ 已实现
- 鉴权：**需登录**。
- 行为：注销并删除账户。
- 成功：`200 { ok: true }`。

---

### 3. 配料 / 添加剂（ingredients）

> 来源：`backend/src/routes/ingredients.ts` + `backend/src/services/ingredientService.ts`。**全部允许匿名访问**（未挂载鉴权中间件）。

#### `GET /api/ingredients`  ✅ 已实现
- 用途：配料/添加剂分页列表与检索（支持过滤/排序/分面统计）。
- 调用端：Web/PWA 数据库浏览页、各端检索。
- 鉴权：匿名。
- 查询参数：
  - `q`：关键词（可选）
  - `category`：分类（可选）
  - `riskLevel`：`low|medium|high|unknown`（可选）
  - `confidenceLevel`：`high|medium|low|unverified`（可选）
  - `dataStatus`：见可信字段约定七态枚举（可选）
  - `sort`：`relevance|risk|name`（可选）
  - `page`：默认 1
  - `limit`：默认 20，最大 100
- 成功响应（`IngredientListResult`）：
  ```
  {
    items: IngredientRow[],   // 含 dataStatus / matchConfidence / sourceName / sourceUrl / regulatoryBasis 等可信字段
    page, limit, total, totalPages,
    riskFacets: [{ level, count }],
    categoryFacets: [{ name, count }]
  }
  ```
- 错误：`400 invalid_parameter`（参数非法时返回对应 field）。

#### `GET /api/ingredients/search`  ✅ 已实现
- 用途：检索接口，与 `GET /api/ingredients` 共用同一查询解析与返回结构（代码层等价，仅语义命名不同）。
- 鉴权：匿名。
- 参数 / 响应：同 `GET /api/ingredients`（支持 `q`、`limit` 等全部列表参数）。
- 说明：路由顺序上特意置于 `/ingredients/:id` 之前，避免 `search` 被当成 id。

#### `GET /api/ingredients/categories`  ✅ 已实现
- 用途：分类汇总。
- 鉴权：匿名。
- 参数：无。
- 成功：`{ items: [{ name, count }] }`。

#### `GET /api/ingredients/:id`  ✅ 已实现
- 用途：单条配料/添加剂详情。
- 鉴权：匿名。
- 路径参数：`id`。
- 查询参数：`includeEvidence`（可选，取值 `1` 时附带 GB2760 证据，见下一条）。
- 成功：`200 IngredientRow`（含全部可信字段）。
- 错误：`404 { error: "not_found" }`。

#### `GET /api/ingredients/:id?includeEvidence=1`  ✅ 已实现（注意：现状已落地）
- 用途：详情 + GB2760 证据（staging 记录与 reference 行），用于"可追溯到法规来源"的展示。
- 鉴权：匿名。
- 成功：`200 IngredientRow & { stagingRows: Gb2760OfficialRecordRow[], referenceRows: Gb2760OfficialReferenceRow[] }`
  - 即调用 `ingredientService.getIngredientWithGb2760Evidence(id)`。
- 错误：`404 { error: "not_found" }`。
- 说明：早期蓝图曾把此能力标为"计划/待实现"，**经核对 `backend/src/routes/ingredients.ts` 第 49–59 行已实现**，本契约据实更正为"已实现"。

#### `POST /api/ingredients/batch-search`  ✅ 已实现
- 用途：**批量配料匹配**。这是目标 `POST /api/ingredients/match` 的真实等价实现。
- 调用端：OCR 确认 / 分析页对解析出的配料数组做批量匹配。
- 鉴权：匿名。
- 请求体：
  ```
  {
    terms: string[],            // 配料词数组；空白项被过滤；最多 200 项，否则 400
    includeENumbers?: boolean   // 默认 true（仅当显式传 false 时关闭）
  }
  ```
- 成功：`{ results: BatchSearchResult[] }`，每项：
  ```
  {
    term: string,
    eNumber: string | null,
    match: IngredientRow | null,   // 命中项，含 dataStatus / matchConfidence / sourceName / sourceUrl / regulatoryBasis
    confidence: number,            // 0~1 的匹配置信度数值（exact=1, eNumber≈0.99, alias≈0.92, fuzzy≈0.75/0.55, none=0）
    matchType: "exact" | "alias" | "eNumber" | "fuzzy" | "none",
    alternates: IngredientRow[]    // 候选备选项
  }
  ```
- 错误：`400 invalid_parameter`（body 非对象 / terms 非数组 / terms 超 200 项）。
- 注意：此处 `confidence` 是 **0~1 数值**（运行时匹配置信度），与配料记录字段 `matchConfidence`（枚举 `high|medium|low|unverified`）不是同一字段，前端不要混用。

---

### 4. OCR

#### `POST /api/ocr`  ✅ 已实现
- 用途：图片配料表 OCR 识别。
- 调用端：拍照/上传识别流程。
- 鉴权：MVP 主流程允许匿名调用；生产如加入配额/账号限制，必须保留手动输入降级路径。
- 请求体：
  ```
  {
    imageBase64: string,   // 必填；<=10MB（按 base64 长度上限校验）
    mimeType: string,      // 必填；须匹配 image/* MIME
    category?: string       // 可选，默认 "food"
  }
  ```
- provider 取值：`manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`（由后端配置 `OCR_PROVIDER` 决定，见 `backend/src/services/ocrProviders/index.ts`）。`rapidocr` 优先使用 `OCR_LOCAL_URL=http://127.0.0.1:18080/ocr` 调用本机 Python FastAPI OCR 服务，未配置时兼容旧变量 `OCR_SERVICE_URL`；`aliyun` 已接入阿里云通用文字识别，后端需要 `ALIYUN_ACCESS_KEY_ID`/`ALIYUN_ACCESS_KEY_SECRET`（兼容 `OCR_API_KEY`/`OCR_API_SECRET`），可选 `ALIYUN_OCR_ENDPOINT` / `ALIYUN_OCR_ACTION`；`paddleocr` 仍是占位 provider。
- 成功响应：
  ```
  {
    text: string,            // 识别全文（OCR 原始结果，属用户输入来源，非权威）
    confidence: number,      // 0~1
    provider: <provider 名>,
    blocks: [{ text, confidence }]
  }
  ```
- 错误码（实测）：
  - `400 { error: "invalid_parameter", field, message }`：body 非法 / imageBase64 缺失或超限 / mimeType 非图片类型。
  - `503 { error: "ocr_not_configured", provider }`：provider=manual，或需要的 Key/ServiceUrl 缺失。
  - `501 { error: "ocr_provider_pending", provider }`：provider 已选但适配器尚未返回结果（当前主要用于 `paddleocr` 未适配）。
  - `502 { error: "ocr_provider_invalid_response" | "ocr_provider_failed", provider, message }`：上游响应结构漂移 / 上游失败。
  - `503 { error: "ocr_provider_unreachable", provider, message }`：上游不可达。
  - `504 { error: "ocr_provider_timeout", provider, message }`：上游超时。
- 展示规则：OCR 结果是**用户输入来源，非权威数据源**；未识别/低置信内容必须保留、不得静默丢弃；未匹配项运行时记为 `unknown_from_ocr`（文案"暂未收录"），进入人工校验队列（见 `DATA_TRUST_SPEC.md` 第 4 节）。

---

### 5. 商品补全（products）

#### `POST /api/products/lookup`  ✅ 已实现
- 用途：当用户只拍到商品条码、二维码或 8/12/13 位商品编码，且本机历史没有配料表/营养成分表时，由后端可选调用 DeepSeek 补全公开商品标签线索。
- 调用端：用户端单一拍包装识别流程；前端不得直连 DeepSeek。
- 鉴权：MVP 允许匿名调用；生产可加配额，但失败必须回到“补拍配料表/营养成分表”。
- 请求体：
  ```
  {
    normalizedCode?: string, // EAN-13 / EAN-8 / UPC-A 等标准化数字
    qrContent?: string,      // 二维码原始内容，可能是 URL / 文本 / 商品码
    rawContent?: string      // 条码或 OCR 原始摘要
  }
  ```
- 成功响应：
  ```
  {
    usedAiSearch: boolean,
    provider: "deepseek" | "none",
    model: string,
    productName: string,
    brand: string,
    specification: string,
    ingredientsText: string,
    nutritionText: string,
    sourceSummary: string,
    aiNotice: string,
    confidence: "high" | "medium" | "low",
    errorCode?: string
  }
  ```
- 错误/降级：
  - `400 missing_query`：没有提供编码、二维码或原始内容。
  - `503 ai_disabled`：后端未启用 AI。
  - `503 deepseek_unavailable` / `missing_api_key` / `deepseek_failed`：DeepSeek 不可用或缺 Key。
- 展示规则：
  - DeepSeek 输出只能作为“AI 联网搜索推测 / 公开标签线索”，不得伪装成包装 OCR。
  - 如果按商品名、品牌、商品码或二维码搜到公开配料表 / 营养成分表，可生成参考报告，但必须标注 AI 来源；如果只补到商品名，未补到配料表或营养成分表，报告必须继续显示信息不足。
  - 报告必须展示提示：“AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。”

---

### 6. 用户数据（user）

> 来源：`backend/src/routes/user.ts`，整个 `/user/*` 段挂载鉴权中间件，**全部需登录**。所有写操作均按 `userId` 隔离。

#### 收藏 `POST/GET/DELETE /api/user/favorites`  ✅ 已实现
- `GET`：`{ items }`。
- `POST`：单条 `{ id, category }` 返回 `201 { items }`；或 `{ items: [...] }` 整体替换返回 `{ items }`。
- `DELETE`：按 query `id` + `category` 删除单条，或不带参数清空，返回 `{ items }`。

#### 历史 `POST/GET/DELETE /api/user/history`  ✅ 已实现
- `GET`：`{ items }`。
- `POST`：`{ query }` 追加（`201`），或 `{ items: string[] }` 替换。
- `DELETE`：按 query `query` 删除指定项或清空。

#### 过敏原 `GET/PUT /api/user/allergens`  ✅ 已实现
- `GET`：`{ items }`。
- `PUT`：`{ items: string[] }` 整体替换，返回 `{ items }`。

#### 关注/规避清单 `GET/PUT /api/user/profile/:kind`  ✅ 已实现
- `kind ∈ { watch, avoid }`（非法 kind → `400 invalid_parameter`）。
- `GET`：`{ items }`。
- `PUT`：`{ items: string[] }` 整体替换，返回 `{ items }`。

#### 报告云同步 `GET/POST/DELETE /api/user/reports`  ✅ 已实现
- 用途：登录后将本地报告同步至云端（详见第二部分对 reports 的说明）。
- `GET`：`{ items }`。
- `POST`：单条 `{ report }`（或直接报告对象，须含 `id`）追加（`201`），或 `{ items: [...] }` 整体替换。
- `DELETE`：按 query `id` 删除。

#### 产品档案 `GET/POST/PATCH/DELETE /api/user/products`  ✅ 已实现
- `GET /api/user/products`：列表，query 支持 `search`、`isFavorite`(`true|false`)、`riskGrade`、`page`、`limit`，返回服务端分页结构。
- `GET /api/user/products/:id`：`{ item }`，不存在 → `404 not_found`。
- `POST /api/user/products`：单条 `{ product }`（须含 `id, productName, originalText, reportId`）返回 `201 { item, items }`；或 `{ items: [...] }`（<=100 项）整体替换。
- `PATCH /api/user/products/:id`：部分字段更新（`productName/brandName/isFavorite/tags/riskGrade`），返回 `{ item }`，不存在 → `404`。
- `DELETE /api/user/products/:id`：删除，返回 `{ items }`。
- 校验失败统一经 `onError` 归一为 `400 { error: "invalid_parameter", field: "items", message }`。

---

### 7. GB2760 数据治理（gb2760）

> 来源：`backend/src/routes/gb2760.ts`，整个 `/gb2760/*` 段**需登录**。**写操作（PUT）额外要求内部审核员**：通过 `GB2760_INTERNAL_REVIEWERS` allowlist（匹配 email 或 userId，支持 `*` 全放行）校验，普通登录用户写操作 → `403 { error: "forbidden", message }`。

#### `GET /api/gb2760/import-runs`  ✅ 已实现
- 用途：GB2760 导入批次列表（目标 `GET /api/imports/gb2760/status` 的等价能力）。
- query：`page`(默认1)、`limit`(默认20，max100)。
- 成功：服务端分页结果。

#### `GET /api/gb2760/import-runs/:id/errors`  ✅ 已实现
- 用途：某导入批次的错误明细。
- 成功：错误结果；不存在 → `404 not_found`。

#### `GET /api/gb2760/reference-rows`  ✅ 已实现（注意：现状已落地）
- 用途：GB2760 reference 行查询（用于证据/对照展示）。
- query：`table`（表名，可选）、`q`（可选）、`page`、`limit`。
- 成功：服务端分页结果。
- 说明：早期蓝图曾标"计划/待实现"，**经核对 `backend/src/routes/gb2760.ts` 第 42–50 行已实现**，本契约据实更正。

#### `GET /api/gb2760/staging-rows`  ✅ 已实现
- 用途：staging 行列表（审核队列）。
- query：`page`、`limit`、`status`（须为合法审核状态）、`q`、`ready`(`1` 仅就绪项)。
- 成功：服务端分页结果；`status` 非法 → `400 invalid_parameter`。

#### `PUT /api/gb2760/staging-rows/review`  ✅ 已实现（批量）
- 用途：批量更新审核状态。
- 鉴权：登录 + 内部审核员。
- 请求体：`{ ids: string[] (1~100), reviewStatus, reviewNote? (<=500) }`。
- 错误：`400 invalid_parameter`；`403 forbidden`（非内部审核员）。

#### `PUT /api/gb2760/staging-rows/:id/mapping`  ✅ 已实现
- 用途：将 staging 行映射到正式 ingredient。
- 鉴权：登录 + 内部审核员。
- 请求体：`{ ingredientId, reviewStatus, reviewNote? }`。
- 错误：`400 invalid_parameter`；`403 forbidden`；`404 not_found`；映射冲突 → `409 { error: "locked_review_status", ... }` 或 `422 { error, message, reasons }`。

#### `PUT /api/gb2760/staging-rows/:id/review`  ✅ 已实现
- 用途：单行更新审核状态。
- 鉴权：登录 + 内部审核员。
- 请求体：`{ reviewStatus, reviewNote? }`。
- 错误：同上（`400 / 403 / 404 / 409 / 422`）。

---

## 第二部分：主流程目标 API 契约

> 本节是产品主路径目标契约，供后续 Web / PWA、微信小程序、Android、iOS 统一调用。状态必须如实标注：✅ 已实现 / ✅ 等价已实现 / ⚠️ 部分实现 / ❌ 未实现。未实现接口不得在页面中当成已存在调用。

| 目标接口 | 当前状态 | 当前真实对应 | 是否应允许匿名完成 MVP |
|---|---|---|---|
| `POST /api/ocr` | ✅ 已实现 | `POST /api/ocr`（MVP 主流程允许匿名调用） | 是，MVP 主流程应允许匿名识别或降级手动输入 |
| `POST /api/ingredients/parse` | ⚠️ 前端本地 | 历史 `src/utils/text.js`；正式端 `user-uniapp/src/utils/ingredientParser.ts`；后端无同名路由 | 是 |
| `POST /api/ingredients/match` | ✅ 等价已实现 | `POST /api/ingredients/batch-search` | 是 |
| `POST /api/reports` | ⚠️ 部分 | `user-uniapp` 本地报告 + 登录后 `POST /api/user/reports` 云同步 | 是，本地保存应可匿名 |
| `GET /api/reports/:id` | ⚠️ 部分 | `user-uniapp` 本地读取 + 登录后用户报告接口 | 是，本地历史应可匿名 |
| `GET /api/reports` | ⚠️ 部分 | `user-uniapp` 本地历史 + 登录后用户报告接口 | 是 |
| `GET /api/additives/search` | ✅ 等价已实现 | `GET /api/ingredients/search` / `GET /api/ingredients` | 是 |
| `GET /api/additives/:id` | ✅ 等价已实现 | `GET /api/ingredients/:id?includeEvidence=1` | 是 |
| `GET /api/data-sources` | ❌ 未实现 | 当前为 `DATA_SOURCES.md` + `/data` 页面 | 是 |
| `GET /api/imports/gb2760/status` | ✅ 等价已实现 | `GET /api/gb2760/import-runs` 等后台接口 | 否，后台/内部查看 |
| `POST /api/feedback` | ⚠️ 前端本地 | `src/services/supportService.js` 本地存储 | 是 |
| `POST /api/labels/scan` | ✅ 已实现 | `backend/src/routes/labels.ts` + `backend/src/services/labelScanService.ts` | 是 |
| `POST /api/labels/classify` | ✅ 已实现 | 后端 `backend/src/routes/labels.ts` + `labelService.ts`，`user-uniapp` adapter 后端优先、本地降级 | 是 |
| `POST /api/barcodes/lookup` | ❌ 计划 / 后续 | 商品条码 GTIN 查询商品及配料数据 | 是 |
| `POST /api/digital-labels/parse` | ❌ 计划 / 后续 | 数字标签二维码页面解析配料和营养信息 | 是 |
| `POST /api/nutrition/parse` | ✅ 已实现 | 后端 `backend/src/routes/nutrition.ts` + `nutritionService.ts`，`user-uniapp` adapter 后端优先、本地降级 | 是 |
| `POST /api/claims/parse` | ❌ 计划 / 后续 | 包装正面卖点解析 | 是 |
| `POST /api/reports/label` | ✅ 已实现 | `backend/src/routes/reports.ts` + `backend/src/services/reportService.ts`，`user-uniapp` `buildLabelReportWithAdapter` 后端优先、本地 fallback | 是 |
| `POST /api/reports/compare` | ❌ 计划 / 后续 | 两款商品对比报告 | 是 |
| `GET /api/user-attention-items` | ❌ 后端未实现 / 前端本地 | `user-uniapp/src/stores/attentionStore.ts` 本地读取 | 是 |
| `POST /api/user-attention-items` | ❌ 后端未实现 / 前端本地 | `user-uniapp/src/stores/attentionStore.ts` 本地保存 | 是 |

### 消费者标签解读计划 API（部分后端已实现）

以下 API 用于从“配料表识别”扩展到“食品标签拍照解读”。`POST /api/labels/scan`、`POST /api/labels/classify` 与 `POST /api/nutrition/parse` 已落地；`POST /api/reports/label` 已在后端接入。其余未实现接口不得在实现前当作已存在后端接口调用。`user-uniapp/` 已为 MVP 提供本地 parser / 本地降级 / 本地报告存储，界面必须明确这些不是权威数据来源。

后续 P1/P2 支持商品条码和数字标签二维码时，客户端入口仍保持一个拍照入口。前端继续提交图片到统一扫描链路，由后端自动识别条码、数字标签二维码、配料表 / 营养表或未知标签；`barcodes` 和 `digital-labels` 是后端分流后的服务能力，不是前端新增主入口：

```text
拍食品标签 / 包装
  → 后端自动识别：商品条码 / 数字标签二维码 / 配料表 OCR / 营养表 OCR / 未知
  → 商品条码：GTIN 商品数据查询
  → 数字标签二维码：数字标签页面解析
  → 配料表 OCR：包装文字识别与文本确认
  → 成分归一化
  → 官方成分知识库匹配
  → 成分分析
```

商品条码、数字标签二维码和配料表 OCR 只能作为后端识别后的取数分支；任何接口失败、未命中或信息不足时，只返回可操作的错误/空态和补充建议，不自动跳转其他分支，也不把三种方式设计成串行流程。

注意：当前已实现 `labelType` 枚举仍是 `ingredient_list|nutrition_facts|front_claims|barcode_or_product|unknown_label`。数字标签二维码不属于当前已实现 `labelType`；实际落地前需另行扩展共享 API / 前端 / 后端 schema，或通过独立 `scanObjectType` 表达二维码分流。

实现时路由归属：

- `labels` 相关接口进入 `backend/src/routes/labels.ts` 与 `backend/src/services/labelService.ts`。
- `nutrition` 相关接口进入 `backend/src/routes/nutrition.ts` 与 `backend/src/services/nutritionService.ts`。
- `reports/label` 进入 `backend/src/routes/reports.ts` 与 `backend/src/services/reportService.ts`；登录后云同步可复用现有 `user` 服务，但报告生成逻辑不应散落在用户数据路由里。
- `barcodes` 相关接口后续进入 `backend/src/routes/barcodes.ts` 与 `backend/src/services/productLookupService.ts`；由统一扫描链路识别条码后调用，只能通过后端查询 GTIN 商品数据源，前端不得直连第三方商品库。
- `digital-labels` 相关接口后续进入 `backend/src/routes/digitalLabels.ts` 与 `backend/src/services/digitalLabelService.ts`；由统一扫描链路识别数字标签二维码后调用，只能由后端解析数字标签页面，前端不得绕过后端抓取或暴露解析密钥。
- 包装正面卖点和对比属于后续消费者能力，不阻塞标签类型、营养解析和报告后端化。
- 所有新接口必须补后端测试；涉及数据可信表达时同步 `DATA_TRUST_SPEC.md` 与 `DATA_SOURCES.md`。

#### `POST /api/labels/scan`
- 用途：创建或更新一次食品标签扫描会话，支持一张到三张图片组合。
- 调用端：拍照页、多图上传 / 补拍页。
- 请求参数：`sessionId?`、`labelTypeHint?`、`images[]`（`assetId`、`labelType?`、`mimeType?`、`ocrResultId?`、`status?`）。
- 响应字段：`sessionId`、`images[]`（`assetId`、`labelType`、`ocrResultId`、`status`）、`nextSuggestedCapture[]`。
- 错误码：`400 invalid_parameter`。
- 数据状态字段：图片和 OCR 结果标记为 `ocr_input`，不是权威来源。
- 前端展示规则：拍一张也能继续；推荐补拍配料表和营养成分表；单张失败不影响其他图片。
- 是否需要登录：目标不需要。
- 是否允许匿名：允许。

#### `POST /api/labels/classify`
- 状态：✅ 已实现。
- 用途：识别 OCR 文本或图片属于配料表、营养成分表、包装正面、条码/产品名或未知标签。
- 调用端：拍照页、OCR 页、文本确认页。
- 请求参数：`text?`、`imageAssetId?`、`userSelectedType?`。
- 响应字段：`labelType`（`ingredient_list|nutrition_facts|front_claims|barcode_or_product|unknown_label`）、`confidence`、`requiresUserSelection`。
- 错误码：`400 invalid_parameter`。
- 数据状态字段：分类结果是辅助判断，不是权威结论。
- 前端展示规则：低置信或 unknown 时不要让消费者选择专业标签类型；继续进入文本确认和报告生成，按标签文字展示并提示核对。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

#### `POST /api/nutrition/parse`
- 用途：把营养成分表 OCR 文本解析为结构化营养字段。
- 调用端：文本确认页、食品标签解读报告生成流程。
- 请求参数：`text`、`perUnit?`、`servingSize?`。
- 响应字段：`nutrition`（`energy`、`protein`、`fat`、`saturatedFat`、`transFat`、`carbohydrate`、`sugar`、`sodium`、`dietaryFiber`、`servingSize`、`perUnit`、`nrvPercent`）、`warnings[]`。
- 错误码：`400 invalid_parameter`、`422 parse_failed`。
- 数据状态字段：营养字段来自 OCR/用户确认文本，须保留来源和置信度。
- 解析成功边界：只有解析到真实营养字段数值才返回成功；仅包含“营养成分表 / 每100g / NRV%”等标题、单位或表头时返回 `422 parse_failed`，不得当作有效营养数据。
- 前端展示规则：信息不足时显示“请补充标签文字后查看结果”，不得做营养诊断；糖、钠、脂肪、能量等字段说明需使用普通人可理解的分项描述，不统一套用专业说明。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

#### `POST /api/claims/parse`
- 用途：解析包装正面卖点，如 0 蔗糖、低脂、高蛋白、无添加等。
- 调用端：包装正面卖点提示页、报告页。
- 请求参数：`text`、`labelType: "front_claims"`。
- 响应字段：`claims[]`（`claimText`、`claimType`、`relatedCheck`、`confidence`）。
- 错误码：`400 invalid_parameter`、`422 parse_failed`。
- 数据状态字段：卖点来自包装 OCR/用户确认文本，不是打假结论。
- 前端展示规则：只做提示，不输出“虚假 / 真实 / 打假”结论。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

#### `POST /api/reports/label` ✅ 已实现
- 用途：生成食品标签解读报告，合并配料表、营养成分表、关注项和 OCR 元信息。
- 调用端：报告生成流程（`user-uniapp` 在 `/match` 页面发起）。
- 请求参数：
  - `productName?`（文本）
  - `rawText?`（文本）
  - `ingredients[]`（配料项）
  - `matches[]`（配料匹配结果）
  - `nutrition[]`（营养字段）
  - `attention`（关注项：`goals/detailTerms/customTerms`）
  - `labelType?`
  - `frontClaimsText?`
  - `ocr?`（`mode/provider`）
  - `sourceMeta?`（`productNameText?`、`foodTypeText?`、`ingredientText?`、`nutritionText?`、`allergenText?`、`frontClaimsText?`、`productionDateText?`）
- 响应字段：`id`、`title`、`productName`、`summarySentence`、`attentionHits`、`focusItems`、`ingredientSection`、`nutritionSection`、`nutritionIngredientChecks`、`frontClaimsSection?`、`additiveGroups`、`allergenHints`、`analysisSource?`、`foodAnalysis?`、`sources`、`rawText`。
- 错误码：`400 invalid_parameter`、`422 insufficient_label_data`。
- 数据状态字段：报告保留每个结论的来源、`dataStatus`、OCR 来源和用户确认状态。
- 前端展示规则：报告名称为“食品标签解读”；普通人可读内容优先，专业依据可折叠展示，禁止生成医疗/安全结论；后端输出默认使用“线索 / 已整理 / 信息不足 / 未确认线索”等中性表达，不使用“核验 / 阈值 / 标识偏差”等默认专业判断。
- 是否需要登录：本地保存不需要；云同步需登录。
- 是否允许匿名：允许。

#### `POST /api/food/analyze` ✅ 已实现
- 用途：基于 OCR/用户确认后的食品包装文字输出消费决策增强结果，供报告页展示“一句话结论、关键原因、建议关注人群、份量提示、添加剂解释和识别详情”。
- 调用端：`user-uniapp` 报告生成流程；前端不得直连 DeepSeek / OpenAI-compatible / OCR 服务。
- 请求参数：
  - `ocrText`（必填，食品包装 OCR 或用户确认文本）
  - `userProfile?`（`goals[]`、`allergens[]`、`forChild?`、`pregnant?`、`highBloodPressure?`）
  - `options?`（`enableAi?`、`provider?`，支持 `auto` / `deepseek` / `mock` / `openai-compatible` 等后端注册 Provider）
- 响应字段：`productName`、`category`、`productionDate`、`ingredients[]`、`nutrition`（`energy`、`protein`、`fat`、`carbohydrate`、`sugar`、`sodium`、`transFat` 等已识别项）、`frontClaims[]`、`uncertainClues[]`、`decision`、`decisionText`、`riskLevel`、`summary`、`plainExplanation`、`mainReasons[]`、`suitableFor[]`、`notSuitableFor[]`、`ingredientHighlights[]`、`nutritionJudgement`、`eatingAdvice`、`confidence`、`source`、`retakeSuggestion`。
- 错误码：`400 invalid_parameter`、`422 insufficient_label_data`。
- AI 边界：本地规则先输出最终决策和营养判断；AI 只能做通俗解释和总结，不覆盖规则等级，不编造成分、法规、医疗、权威数据或 OCR 内容。AI Provider 失败、缺 Key、超时或非 JSON 时必须 fallback 到规则结果，不让报告崩溃。
- 密钥边界：DeepSeek / OpenAI-compatible Key 只允许后端环境变量持有，不进入前端、小程序、文档或仓库。
- 前端展示规则：报告页必须优先展示购买/食用决策和关键原因；营养数字优先图形化；识别详情和原始文字默认靠后或折叠；不确定字段进入未确认线索。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

#### `POST /api/reports/compare`
- 用途：生成两款商品的对比报告。
- 调用端：产品对比页。
- 请求参数：`leftReportId`、`rightReportId`、`attentionItems[]`。
- 响应字段：`compareReportId`、`differences[]`、`attentionSummary`、`sources[]`。
- 错误码：`400 invalid_parameter`、`404 not_found`、`422 insufficient_data`。
- 数据状态字段：每个对比项保留来源报告和数据可信状态。
- 前端展示规则：只能输出“糖更低 / 钠更低 / 添加剂数量更少 / 更符合当前关注项”，禁止“更健康 / 不健康”。
- 是否需要登录：本地对比不需要；云同步需要。
- 是否允许匿名：允许。

#### `GET /api/user-attention-items`
- 用途：读取我的关注项。MVP 可先用本地存储实现，服务端接口后续用于云同步。
- 调用端：我的关注项设置页、报告页。
- 请求参数：无。
- 响应字段：`items[]`（`type`、`enabled`、`keywords[]`、`customTerms[]`）。
- 错误码：`401 unauthorized`（云同步时）、`500 internal_error`。
- 数据状态字段：关注项是用户偏好，不是医学诊断。
- 前端展示规则：匿名用户读取本地关注项。
- 是否需要登录：目标不需要；云同步需要。
- 是否允许匿名：允许本地读取。

#### `POST /api/user-attention-items`
- 用途：保存我的关注项。MVP 可先用本地存储实现，服务端接口后续用于云同步。
- 调用端：我的关注项设置页。
- 请求参数：`items[]`（控糖、低钠、减脂、高蛋白、少添加、给孩子看、过敏/忌口等）。
- 响应字段：`items[]`、`updatedAt`、`storageScope`.
- 错误码：`400 invalid_parameter`、`401 unauthorized`（云同步时）、`507 storage_full`。
- 数据状态字段：关注项是用户偏好，不是医学诊断。
- 前端展示规则：不登录也能本地保存；报告按关注项排序。
- 是否需要登录：本地保存不需要；云同步需要。
- 是否允许匿名：允许本地保存。

### `POST /api/ocr`
- 用途：对食品标签图片做 OCR，返回可编辑文本和识别块。
- 调用端：Web / PWA 拍照上传页、后续小程序/App 拍照入口。
- 请求参数：`imageBase64` 或文件上传引用、`mimeType`、`category?: "food"`。
- 响应字段：`text`、`confidence`、`blocks[]`、`provider`、`sourceType: "ocr_input"`、`requiresUserConfirmation: true`。
- 错误码：`400 invalid_parameter`、`501 ocr_provider_pending`、`502 ocr_provider_invalid_response / ocr_provider_failed`、`503 ocr_not_configured / ocr_provider_unreachable`、`504 ocr_provider_timeout`。
- 数据状态字段：OCR 输出必须标记为 `ocr_input`，不能作为 `verified_*` 数据。
- 前端展示规则：无论成功/失败都必须进入文本确认或手动输入路径；禁止跳过确认直接分析。
- 是否需要登录：MVP 主流程不需要；生产如加入配额/账号限制，必须保留手动输入降级路径。
- 是否允许匿名：目标允许。

### `POST /api/ingredients/parse`
- 用途：把用户确认后的配料表文本拆成结构化配料项。
- 调用端：文本确认页。
- 请求参数：`text`、`locale?: "zh-CN"`、`source?: "ocr_input" | "manual_input"`。
- 响应字段：`items[]`（`rawText`、`normalizedName`、`position`、`warnings[]`）、`parseConfidence`。
- 错误码：`400 invalid_parameter`、`422 parse_failed`。
- 数据状态字段：解析结果仍继承用户输入来源，不得标成权威数据。
- 前端展示规则：必须展示可编辑拆分结果；解析失败时允许用户手动拆分。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### `POST /api/ingredients/match`
- 用途：将拆分出的配料项匹配到食品成分/食品添加剂数据库。
- 调用端：配料拆分页、匹配确认页。
- 请求参数：`items[]`（`rawText`、`normalizedName`）、`category?: string`。
- 响应字段：`results[]`（`query`、`match`、`alternates[]`、`confidence`、`dataStatus`、`sourceName`、`regulatoryBasis`）。
- 错误码：`400 invalid_parameter`、`422 match_failed`、`503 database_unavailable`。
- 数据状态字段：必须返回 `verified_regulation`、`verified_jecfa`、`pending_review`、`mapped_candidate`、`common_ingredient`、`unverified` 或运行时 `unknown_from_ocr`。
- 前端展示规则：低置信度和多候选必须进入确认；`pending_review` 不得展示成官方结论。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### `POST /api/reports`
- 用途：保存一次配料分析报告。
- 调用端：分析报告页。
- 请求参数：`ocrText`、`confirmedText`、`ingredients[]`、`matches[]`、`summary`、`dataSources[]`。
- 响应字段：`id`、`createdAt`、`report`、`storageScope: "local" | "cloud"`。
- 错误码：`400 invalid_parameter`、`401 unauthorized`（云同步时）、`507 storage_full`。
- 数据状态字段：报告内所有匹配项保留原始 `dataStatus` 和来源字段。
- 前端展示规则：匿名用户保存本地历史；登录云同步后再提示账号能力。
- 是否需要登录：本地保存不需要；云同步需要。
- 是否允许匿名：允许。

### `GET /api/reports/:id`
- 用途：读取单份历史报告。
- 调用端：历史页、报告详情页。
- 请求参数：路径参数 `id`。
- 响应字段：`id`、`createdAt`、`report`、`dataSources[]`、`dataTrustSummary`。
- 错误码：`401 unauthorized`（云报告）、`404 not_found`。
- 数据状态字段：原样返回报告创建时保存的可信字段。
- 前端展示规则：缺失报告展示空态/错误态，不重算或编造来源。
- 是否需要登录：云报告需要，本地报告不需要。
- 是否允许匿名：允许读取本地报告。

### `GET /api/reports`
- 用途：读取报告历史列表。
- 调用端：历史页、我的页。
- 请求参数：`page`、`limit`、`storageScope?`。
- 响应字段：`items[]`、`page`、`limit`、`total`。
- 错误码：`401 unauthorized`（云历史）、`500 internal_error`。
- 数据状态字段：列表项至少返回 `dataTrustSummary`。
- 前端展示规则：匿名展示本地历史；无记录展示 empty 状态。
- 是否需要登录：云历史需要，本地历史不需要。
- 是否允许匿名：允许读取本地历史。

### `GET /api/additives/search`
- 用途：辅助搜索食品添加剂/配料，非主路径入口。
- 调用端：成分详情页、辅助搜索页、匹配确认页候选搜索。
- 请求参数：`q`、`category?`、`page`、`limit`。
- 响应字段：`items[]`（`id`、`name`、`aliases[]`、`dataStatus`、`sourceName`、`matchConfidence`）。
- 错误码：`400 invalid_parameter`、`500 internal_error`。
- 数据状态字段：必须包含可信状态和来源字段。
- 前端展示规则：搜索只作为辅助功能，不得替代拍照/OCR主路径。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### `GET /api/additives/:id`
- 用途：获取单个食品添加剂/配料详情与证据。
- 调用端：成分详情页、报告页详情弹层。
- 请求参数：路径参数 `id`，可选 `includeEvidence=1`。
- 响应字段：`id`、`name`、`aliases[]`、`dataStatus`、`sourceName`、`sourceUrl`、`regulatoryBasis`、`evidence[]`。
- 错误码：`404 not_found`、`500 internal_error`。
- 数据状态字段：详情页必须展示 `dataStatus`、`sourceType/sourceScope`、`matchConfidence`。
- 前端展示规则：`verified_jecfa` 只能写安全评价，不得反推 GB2760 使用范围。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### `GET /api/data-sources`
- 用途：返回前端“数据说明页”需要展示的数据来源、版本、可信边界。
- 调用端：数据说明页、报告页来源说明。
- 请求参数：无或 `scope?`。
- 响应字段：`sources[]`（`sourceType`、`name`、`version`、`authorityLevel`、`url`、`updatedAt`、`limitations`）。
- 错误码：`500 internal_error`。
- 数据状态字段：来源类型必须与 `DATA_TRUST_SPEC.md` 对齐。
- 前端展示规则：不得编造不存在的数据源链接；接口未实现前使用静态说明。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### `GET /api/imports/gb2760/status`
- 用途：查看 GB2760 导入任务、staging、promote 进度。
- 调用端：Web 管理后台。
- 请求参数：`runId?`、`page`、`limit`。
- 响应字段：`runs[]`、`stagingCounts`、`promotedCounts`、`failedCounts`、`lastRunAt`。
- 错误码：`401 unauthorized`、`403 forbidden`、`500 internal_error`。
- 数据状态字段：staging 数据只能展示为 `pending_review` / `mapped_candidate`，不能展示为 verified。
- 前端展示规则：后台查看导入状态，不面向普通用户展示为法规结论。
- 是否需要登录：需要内部账号。
- 是否允许匿名：不允许。

### `POST /api/feedback`
- 状态：❌ 计划；后端当前无 feedback 路由，旧 `supportService` 仍是客户端本地 markdown/复制流。
- 用途：提交用户反馈、未收录成分、纠错建议。
- 调用端：报告页、成分详情页、我的/反馈页。
- 请求参数：`type`、`message`、`relatedReportId?`、`relatedIngredientId?`、`contact?`。
- 响应字段：`id`、`status: "received"`、`createdAt`。
- 错误码：`400 invalid_parameter`、`429 rate_limited`、`500 internal_error`。
- 数据状态字段：反馈标记为 `user_feedback`，不能作为权威结论。
- 前端展示规则：提交后只提示已收到，不承诺结论正确或处理时效。
- 是否需要登录：不需要。
- 是否允许匿名：允许。

### 计划说明：`POST /api/analyze`
- 状态：计划 / blocked_by_user（AI API Key 未提供）。后端当前无 `/api/analyze` 路由。
- 用途：基于已匹配的 `matchResults` 生成解释层摘要。
- 硬约束：AI 只能总结数据库匹配结果，必须标注 `ai_generated`，不得编造法规结论，不得把 `pending_review` 当 `verified`。

---

## 第三部分：后台 API 规划（当前未实现 / 计划）

> 后台 API 面向 `admin-web`（Vue3 + TDesign Web），用于产品运营、数据治理、业务监控、系统配置、权限与审计。除本文件第一部分已列出的 `GET /api/gb2760/*` 内部接口外，本节接口均为**计划 API**，不得在实现前写成已完成。后台必须通过后端 API 访问数据，不得直连数据库、OCR 服务、AI 服务或导入脚本。

通用约定：

- 调用端：`admin-web`。
- 鉴权：需要管理员登录；按角色授权（`super_admin`、`data_admin`、`operation_admin`、`support_admin`、`viewer`）。
- 错误码：`401 unauthorized`、`403 forbidden`、`404 not_found`、`422 invalid_state`、`500 internal_server_error`。
- 审计：新增、编辑、删除、禁用、发布、复核、配置变更等写操作必须写入操作日志 / 审计日志。
- 展示规则：后台可展示专业字段，但不得把 `pending_review` / `mapped_candidate` / `unverified` 当成正式结论。

### 后台 API 落地边界（STACK-D）

`admin-web/` 创建前，本节仍是规划。落地时遵守：

1. 后台通过现有 `backend/` 访问数据，禁止直连数据库、OCR 服务、AI 服务、GB2760 导入脚本或密钥。
2. 已存在的 GB2760 内部接口继续作为数据治理 MVP 的真实接口：`GET /api/gb2760/import-runs`、`GET /api/gb2760/import-runs/:id/errors`、`GET /api/gb2760/reference-rows`、`GET /api/gb2760/staging-rows`、`PUT /api/gb2760/staging-rows/*`。
3. 新后台聚合接口统一规划在 `/api/admin/*`；不要为了后台 UI 重复实现已存在的 `ingredients` / `gb2760` 查询能力。
4. MVP 可先复用普通 JWT 登录和 `GB2760_INTERNAL_REVIEWERS` allowlist 保护高风险写操作；产品化阶段再补独立 admin RBAC、角色权限和审计日志。
5. Provider、支付、AI、第三方 SDK 配置接口不得返回密钥明文；后台只展示 provider 名称、启用状态、配置来源和最近错误。
6. 会员、订阅、订单和支付接口保持 `blocked_by_user` / 计划状态，直到对应平台账号、沙箱和法务材料齐备。

后台 MVP API 优先级：

| 优先级 | 能力 | 路由策略 | 当前状态 |
|---|---|---|---|
| P0 | GB2760 导入状态与 staging 复核 | 复用 `/api/gb2760/*` | 部分已实现 |
| P0 | 配料/添加剂只读查询 | 复用 `/api/ingredients*` | 已实现 |
| P1 | Dashboard 汇总 | 新增 `/api/admin/dashboard` 聚合现有统计 | 计划 |
| P1 | OCR 失败日志和反馈列表 | 新增 `/api/admin/ocr-logs`、`/api/admin/feedback` | 计划 |
| P1 | 功能开关只读/受控编辑 | 新增 `/api/admin/feature-flags` | 计划 |
| P2 | 用户、报告、内容运营 | 新增 `/api/admin/users`、`/api/admin/content` 等 | 计划 |
| P3 | 会员、订阅、支付、订单 | 新增 `/api/admin/memberships`、`subscriptions`、`orders` | 计划 / blocked_by_user |

### 数据治理后台 MVP 复用矩阵（ADMIN-B）

本矩阵只定义 `admin-web` 第一版数据治理页面如何调用 API，不代表 `admin-web/` 已创建。

| 页面能力 | 第一版路由 | 鉴权 | 展示/操作边界 | 后续缺口 |
|---|---|---|---|---|
| 数据源管理 | `GET /api/gb2760/import-runs`（使用响应里的 `sourceDocument`） | 登录 | 只读展示来源文档、PDF SHA-256 和关联批次 | 独立 `GET/POST/PATCH /api/admin/data-sources` 后置 |
| GB2760 导入任务 | `GET /api/gb2760/import-runs`、`GET /api/gb2760/import-runs/:id/errors` | 登录 | 只读查看批次、行数、状态、错误；UI 不触发导入脚本 | 导入任务触发/重跑 API 后置 |
| staging 数据复核 | `GET /api/gb2760/staging-rows`、`PUT /api/gb2760/staging-rows/review`、`PUT /api/gb2760/staging-rows/:id/review`、`PUT /api/gb2760/staging-rows/:id/mapping` | 登录；写操作需 `GB2760_INTERNAL_REVIEWERS` | `pending_review` / `mapped_candidate` 只能作为待处理状态；写操作保留 reviewer 审计 | admin RBAC 与操作日志后置 |
| 食品添加剂管理 | `GET /api/ingredients`、`GET /api/ingredients/search`、`GET /api/ingredients/categories`、`GET /api/ingredients/:id?includeEvidence=1` | 匿名接口可复用；后台 UI 仍应要求登录 | 第一版只读查看主数据、可信字段和 GB2760 证据 | `PATCH /api/admin/ingredients/:id` 后置 |
| 食品分类管理 | `GET /api/gb2760/reference-rows?table=表 E.1`（表名按真实 reference 行过滤） | 登录 | 第一版只读查看分类编码、名称、层级线索 | 独立 food category tree API 后置 |
| 使用规则管理 | `GET /api/ingredients/:id?includeEvidence=1` 结合 `usageLimits` 和证据展示 | 后台 UI 要求登录 | 第一版按添加剂详情查看 promote 后规则；不得直接编辑 `additive_usage_rules` | `/api/admin/additive-usage-rules` 列表/详情后置 |
| 普通配料词库 | `GET /api/ingredients?dataStatus=common_ingredient` | 后台 UI 要求登录 | 只读展示普通配料词条，明确非法规结论 | 词库编辑 API 后置 |
| 营养成分字段规则 | 暂无后端接口 | - | 只做页面/API 计划，不展示为已实现 | 等 `POST /api/nutrition/parse` 后端化 |
| 包装卖点词库 | 暂无后端接口 | - | 只做页面/API 计划，不展示为已实现 | 等包装卖点解析接口后端化 |

ADMIN-B 禁止事项：

1. 不新增与 `/api/gb2760/*`、`/api/ingredients*` 等价的重复查询接口。
2. 不把 `source_documents`、`additive_usage_rules` 等数据库表直接暴露给前端或让后台直连数据库。
3. 不把 `pending_review`、`mapped_candidate`、`unverified` 渲染成官方/已验证结论。
4. 不在没有审计字段和权限模型时开放成分、规则、分类的后台编辑能力。

### 1. Dashboard

#### `GET /api/admin/dashboard`  ❌ 计划
- 用途：后台首页概览。
- 请求参数：`dateRange?`、`platform?`。
- 响应字段：`scanCount`、`ocrSuccessRate`、`reportCount`、`feedbackCount`、`pendingReviewCount`、`ocrCostSummary`、`aiCostSummary`、`systemAlerts[]`。
- 前端展示规则：只展示运营和治理概览，不提供普通用户端结论。

### 2. 用户与会员

#### `GET /api/admin/users`  ❌ 计划
- 用途：用户列表查询。
- 请求参数：`q?`、`platform?`、`memberStatus?`、`accountStatus?`、`page`、`limit`。
- 响应字段：`items[]`（`userId`、`nickname`、`phone?`、`email?`、`wechatOpenid?`、`registeredAt`、`lastLoginAt`、`platform`、`memberStatus`、`scanCount`、`reportCount`、`feedbackCount`、`accountStatus`）、分页字段。

#### `GET /api/admin/users/:id`  ❌ 计划
- 用途：用户详情。
- 响应字段：用户基础信息、会员信息、设备与登录记录摘要、扫描记录摘要、报告记录摘要、反馈记录摘要。

#### `PATCH /api/admin/users/:id/status`  ❌ 计划
- 用途：禁用、恢复或标记删除申请中。
- 请求参数：`status: "normal" | "disabled" | "delete_requested"`、`reason`。
- 审计：必须记录操作前后状态。
- 状态边界：当前 `users` 表尚无 `accountStatus` 字段，该接口必须等用户状态字段、管理员权限和审计日志落地后实现。

#### `GET /api/admin/users/:id/devices`  ❌ 计划
- 用途：查看用户设备与登录记录摘要。
- 响应字段：`deviceId?`、`platform`、`lastSeenAt`、`loginMethod`、`sessionExpiresAt`、`riskHint?`。
- 状态边界：当前只有 `sessions` 的 token / userId / expiresAt，不足以支撑设备管理；不得展示 token 明文。

#### `GET /api/admin/label-scans`  ❌ 计划
- 用途：后台查看扫描会话和 OCR/标签类型链路。
- 请求参数：`userId?`、`labelType?`、`ocrProvider?`、`dateRange?`、`page`、`limit`。
- 响应字段：`scanId`、`userId`、`labelType`、`ocrProvider`、`ocrStatus`、`reportId?`、`createdAt`、`hasImage`。
- 状态边界：当前没有独立后端 scan sessions 表；用户端图片在 IndexedDB，不允许后台直接读取。

#### `GET /api/admin/reports` / `GET /api/admin/reports/:id`  ❌ 计划
- 用途：后台查看标签解读报告和问题回溯。
- 请求参数：`userId?`、`category?`、`riskGrade?`、`dateRange?`、`page`、`limit`。
- 响应字段：报告摘要、标签类型、产品名、匹配统计、可信状态统计、关联扫描/OCR 摘要。
- 状态边界：现有 `/api/user/reports` 只允许当前登录用户读写自己的报告；后台跨用户读取必须新增管理员权限和审计。

#### `GET /api/admin/products` / `GET /api/admin/products/:id`  ❌ 计划
- 用途：后台查看产品档案和关联报告。
- 请求参数：`userId?`、`search?`、`riskGrade?`、`isFavorite?`、`page`、`limit`。
- 响应字段：产品名、品牌、报告 ID、风险等级、标签摘要、收藏状态、创建/更新时间。
- 状态边界：现有 `/api/user/products` 只服务当前用户；后台不得把产品图片或原始标签文本公开化。

#### `GET /api/admin/feedback` / `PATCH /api/admin/feedback/:id`  ❌ 计划
- 用途：后台查看和处理用户反馈 / 纠错 / 支持请求队列。
- 字段：`feedbackId`、`userId?`、`topic`、`subject`、`message`、`contact?`、`status`、`sourceReportId?`、`sourceScanId?`、`assignee?`、`handledBy?`、`handledAt?`、`internalNote?`。
- 状态边界：旧 `supportService` 只是客户端本地保存和 markdown 复制流；没有后端反馈表前，后台只能显示计划入口。普通用户提交反馈走公开 `POST /api/feedback`，不得要求 admin 权限。
- 隐私：联系方式、报告识别文字、过敏/忌口和 OCR 识别文字均按敏感字段处理，处理状态变更必须审计。

#### `GET /api/admin/memberships`  ❌ 计划
- 用途：会员列表与状态查询。
- 请求参数：`q?`、`level?`、`status?`、`source?`、`page`、`limit`。
- 响应字段：`userId`、`level`、`status`、`startedAt`、`expiresAt`、`source`、`benefits`、`remainingOcrCredits?`、`remainingAiCredits?`。
- 状态：产品化阶段规划，MVP 不强制实现。

#### `GET /api/admin/subscriptions`  ❌ 计划 / blocked_by_user
- 用途：订阅计划与订阅实例查询。
- 请求参数：`platform?`、`status?`、`page`、`limit`。
- 响应字段：`planId`、`planName`、`period`（`monthly|yearly|lifetime|credits`）、`price`、`currency`、`benefits`、`status`、`platform`。
- 阻塞条件：Apple Developer、Google Play、微信支付、国内安卓渠道或 Web 支付账号。

#### `GET /api/admin/orders`  ❌ 计划 / blocked_by_user
- 用途：订单 / 支付记录查询。
- 请求参数：`userId?`、`planId?`、`paymentPlatform?`、`paymentStatus?`、`subscriptionStatus?`、`page`、`limit`。
- 响应字段：`orderId`、`userId`、`planId`、`paymentPlatform`、`platformOrderId`、`amount`、`currency`、`paymentStatus`、`subscriptionStatus`、`createdAt`、`paidAt?`、`cancelledAt?`、`refundedAt?`。
- 禁止：不得伪造支付成功，不得在无平台账号时实现真实支付闭环。

### 3. 内容运营

#### `GET /api/admin/announcements` / `POST /api/admin/announcements` / `PATCH /api/admin/announcements/:id` / `DELETE /api/admin/announcements/:id`  ❌ 计划
- 用途：公告管理。
- 字段：`announcementId`、`title`、`content`、`platform`（`all|web|wechat_mp|ios|android`）、`position`、`startAt`、`endAt`、`status`（`draft|scheduled|published|archived`）、`priority`、`createdBy`、`updatedAt`。
- 操作：创建、编辑、上架、下架、预览、定时发布。
- 审计：发布、下架、定时发布和删除必须记录操作者、原因和前后状态。

#### `GET /api/admin/banners` / `POST /api/admin/banners` / `PATCH /api/admin/banners/:id`  ❌ 计划
- 用途：Banner 与首页运营位管理。
- 字段：`title`、`subtitle`、`imageAssetId`、`linkType`（`internal_route|external_url|content|none`）、`linkTarget`、`platform`、`sortOrder`、`status`、`startAt`、`endAt`。
- 规则：图片通过后台 asset 引用；不得把大图、字体文件或外部支付链接直接写入前端静态代码。

#### `GET /api/admin/home-cards` / `POST /api/admin/home-cards` / `PATCH /api/admin/home-cards/:id`  ❌ 计划
- 用途：首页场景卡片管理。
- 字段：`cardId`、`title`、`description`、`scenarioKey`（`sugar_control|low_sodium|children|avoidance|custom`）、`routeTarget`、`platform`、`sortOrder`、`status`。
- 规则：只做关注项入口配置，不给购买、医疗或营养诊断结论。

#### `GET /api/admin/content` / `POST /api/admin/content` / `PATCH /api/admin/content/:id`  ❌ 计划
- 用途：FAQ、数据说明、OCR 隐私说明、食品标签解读说明、免责声明等普通内容管理。
- 字段：`contentId`、`contentType`（`faq|data_source_note|ocr_privacy_note|label_report_note|disclaimer`）、`title`、`content`、`language`、`version`、`status`、`platform`、`publishedAt`、`updatedAt`。
- 规则：内容必须遵守 `DATA_TRUST_SPEC.md` 和 `PRIVACY_AND_COMPLIANCE_SPEC.md`，不能把 AI/OCR/未验证数据写成权威结论。

#### `GET /api/admin/legal-documents` / `POST /api/admin/legal-documents` / `PATCH /api/admin/legal-documents/:id`  ❌ 计划 / 人工确认
- 用途：隐私政策、用户协议、订阅说明、数据安全说明版本管理。
- 字段：`documentId`、`documentType`（`privacy_policy|terms_of_service|subscription_terms|data_security`）、`title`、`content`、`version`、`language`、`platform`、`status`（`draft|legal_review|approved|published|archived`）、`effectiveAt`、`publishedAt`、`approvedBy?`、`updatedAt`。
- 边界：最终文案必须人工/法务确认；Codex 只能规划草稿、审核、发布和归档流程，不得伪造 `approved` 或法务通过。
- 审计：版本切换、发布、归档必须记录操作者、原因和前后版本。

### 4. 系统配置与功能开关

#### `GET /api/admin/feature-flags` / `PATCH /api/admin/feature-flags/:key`  ❌ 计划
- 用途：功能开关和系统配置。
- 配置项：是否启用 OCR、默认 OCR Provider、是否启用 AI 解读、免费 OCR 次数、免费报告保存数量、是否启用产品对比、是否启用包装卖点提示、是否展示订阅入口、维护模式、最低 App 版本。
- 平台范围：`web`、`wechat_mp`、`ios`、`android`、`all`。
- 审计：配置变更必须记录操作者和操作前后值。
- 边界：开关只能控制入口或能力启停，不能绕过后端鉴权、OCR 文本确认、数据可信状态、隐私授权或人工阻塞项。

#### `GET /api/admin/platform-config` / `PATCH /api/admin/platform-config`  ❌ 计划
- 用途：管理各端平台配置摘要。
- 字段：`platform`（`web|wechat_mp|ios|android|all`）、`apiBaseUrlRef`、`enabledFeatures[]`、`minClientVersion?`、`maintenanceMode`、`updatedAt`。
- 规则：API base 只保存后端 API origin / base path；不得保存 OCR Key、AI Key、支付密钥或证书。
- 审计：平台配置变更必须记录平台范围、操作者、前后值和原因。

#### `GET /api/admin/app-versions` / `PATCH /api/admin/app-versions/:platform`  ❌ 计划
- 用途：App / 小程序版本配置。
- 字段：`platform`、`minVersion`、`recommendedVersion`、`forceUpgrade`、`upgradeMessage`、`storeUrl?`、`releaseNote?`、`status`。
- 边界：真机验收、商店审核和版本发布属于人工/平台流程；后台仅保存配置草案或已确认版本信息。

#### `GET /api/admin/share-config` / `PATCH /api/admin/share-config`  ❌ 计划
- 用途：配置分享标题、摘要、落地页和默认报告分享文案。
- 字段：`scene`、`title`、`summary`、`landingRoute`、`platform`、`status`、`updatedAt`。
- 规则：分享文案不得包含购买结论、医疗诊断、营养诊断或将未验证数据写成权威来源。

#### `GET /api/admin/notification-config` / `PATCH /api/admin/notification-config`  ❌ 计划
- 用途：订阅消息、系统通知、数据更新提醒和反馈处理提醒配置。
- 字段：`channel`、`platform`、`templateIdRef?`、`enabled`、`trigger`、`rateLimit`、`updatedAt`。
- 边界：微信订阅消息、App 推送和短信等模板、平台权限、用户授权均需人工确认；后台不得伪造发送成功。

#### `GET /api/admin/sdk-config` / `PATCH /api/admin/sdk-config/:sdkId`  ❌ 计划 / 人工确认
- 用途：第三方 SDK 清单、平台范围、用途和启停状态。
- 字段：`sdkId`、`name`、`purpose`、`platforms[]`、`enabled`、`privacyDocumentRef`、`dataFields[]`、`updatedAt`。
- 边界：SDK 隐私披露、商店材料、证书和密钥需人工/法务确认；接口不返回密钥明文。

### 5. OCR / AI / Provider 监控

#### `GET /api/admin/providers/ocr`  ❌ 计划
- 用途：查看 OCR Provider 状态。
- 响应字段：`provider`、`enabled`、`configSource`（`env|database|secret_manager|static_default`）、`hasKey`、`serviceUrlRef?`、`healthStatus`、`lastError?`、`fallbackMode`、`updatedAt`。
- 边界：只展示配置来源和是否配置，不展示 `OCR_API_KEY`；本机 RapidOCR 与生产 Aliyun OCR 状态分开。

#### `GET /api/admin/ocr-logs`  ❌ 计划
- 用途：OCR 请求、失败、耗时和 Provider 监控。
- 查询参数：`provider?`、`platform?`、`status?`、`dateRange?`、`page`、`limit`。
- 响应字段：`requestId`、`userId?`、`provider`、`status`、`durationMs`、`failureReason?`、`imageSize`、`platform`、`fallbackMode?`、`createdAt`。
- 隐私：后台列表不展示敏感原图；如需图片排障，只允许脱敏引用并按权限审计查看。

#### `GET /api/admin/ocr-metrics`  ❌ 计划
- 用途：OCR 成功率、耗时和失败原因聚合。
- 查询参数：`provider?`、`platform?`、`dateRange?`、`bucket?`。
- 响应字段：`requestCount`、`successCount`、`failureCount`、`successRate`、`avgDurationMs`、`p95DurationMs`、`failureReasons[]`、`providerBreakdown[]`、`platformBreakdown[]`。
- 边界：指标只用于运营监控，不能把 OCR 输出当成权威数据来源。

#### `GET /api/admin/providers/ai`  ❌ 计划 / blocked_by_user
- 用途：查看 AI Provider 状态。
- 响应字段：`provider`、`model`、`enabled`、`configSource`、`hasKey`、`healthStatus`、`lastError?`、`updatedAt`。
- 阻塞条件：AI API Key 和模型选型。
- 边界：无 Key 时只能返回未配置/不可用，不得伪造 provider 可用状态。

#### `GET /api/admin/ai-logs`  ❌ 计划 / blocked_by_user
- 用途：AI 调用日志和成本估算。
- 查询参数：`model?`、`status?`、`dateRange?`、`userId?`、`reportId?`、`page`、`limit`。
- 响应字段：`callId`、`model`、`inputTokens`、`outputTokens`、`estimatedCost`、`failureReason?`、`userId?`、`reportId?`、`createdAt`。
- 阻塞条件：AI API Key 和模型选型。
- 隐私：不保存完整敏感 prompt；AI 输出只作解释层，不能作为成分或法规事实来源。

#### `GET /api/admin/cost-summary`  ❌ 计划
- 用途：OCR / AI 成本汇总。
- 查询参数：`provider?`、`platform?`、`dateRange?`、`groupBy?`。
- 响应字段：`ocrRequestCount`、`ocrEstimatedCost`、`aiCallCount`、`aiEstimatedCost`、`currency`、`providerBreakdown[]`、`platformBreakdown[]`、`dataCompleteness`。
- 边界：没有真实调用日志、provider 单价或 AI Key 时，必须返回无数据/未配置，不得填假成本。

#### `GET /api/admin/degradation-policies` / `PATCH /api/admin/degradation-policies/:key`  ❌ 计划
- 用途：配置 OCR / AI 不可用时的降级策略。
- 字段：`key`、`scope`、`trigger`（`timeout|not_configured|provider_failed|quota_exceeded`）、`fallbackMode`（`manual|mock|retry|disabled`）、`platform`、`updatedAt`。
- 规则：降级必须保留手动输入和文本确认；`mock` 只能用于开发或明确标注的演示，不得冒充真实 OCR 或 AI。

### 6. 权限与审计

#### `GET /api/admin/me/permissions`  ❌ 计划
- 用途：返回当前管理员可访问菜单和可执行操作。
- 响应字段：`adminId`、`roles[]`、`permissions[]`、`menuAccess[]`、`deniedReasons[]`。
- 规则：前端菜单隐藏只是体验优化；后端仍必须逐接口执行权限校验。

#### `GET /api/admin/reviewer-access`  ❌ 计划
- 用途：查看当前账号对 GB2760 内部复核写操作的访问状态。
- 响应字段：`canReviewGb2760`、`matchedBy`（`email|userId|wildcard|none`）、`configSource`、`reason?`。
- 边界：只展示当前账号命中状态和配置来源，不向无权限用户暴露完整 `GB2760_INTERNAL_REVIEWERS` 名单。

#### `GET /api/admin/operation-logs`  ❌ 计划
- 用途：后台操作日志查询。
- 查询参数：`adminId?`、`actionType?`、`objectType?`、`dateRange?`、`page`、`limit`。
- 响应字段：`logId`、`adminId`、`actionType`、`objectType`、`objectId`、`summary`、`ip`、`userAgent`、`createdAt`。
- 隐私：日志中敏感字段以摘要或脱敏 diff 存储，不记录密钥、token、密码或原图。

#### `GET /api/admin/audit-logs`  ❌ 计划
- 用途：操作日志 / 审计日志查询。
- 查询参数：`adminId?`、`objectType?`、`objectId?`、`riskLevel?`、`dateRange?`、`page`、`limit`。
- 响应字段：`auditId`、`adminId`、`actionType`、`objectType`、`objectId`、`before`、`after`、`reason?`、`ip`、`userAgent`、`createdAt`。
- 审计范围：数据复核、规则编辑、内容发布、用户禁用、系统配置、权限变更、协议版本发布等关键操作。

#### `GET /api/admin/roles` / `POST /api/admin/roles` / `PATCH /api/admin/roles/:id`  ❌ 计划
- 用途：角色权限管理。
- 角色建议：`super_admin`、`data_admin`、`operation_admin`、`support_admin`、`viewer`。
- 权限维度：用户查看、用户禁用、数据复核、添加剂编辑、规则编辑、公告发布、会员查看、订阅管理、系统配置、管理员管理。
- 边界：RBAC 未落地前，高风险写操作继续保持只读或内部 allowlist，不得默认全部后台用户拥有超级管理员权限。

#### `GET /api/admin/admin-users` / `POST /api/admin/admin-users` / `PATCH /api/admin/admin-users/:id`  ❌ 计划
- 用途：管理员账号管理。
- 字段：`adminId`、`email`、`name`、`roles[]`、`status`、`lastLoginAt`、`createdAt`。
- 规则：MVP 至少预留管理员登录；产品化阶段补齐角色权限和审计；不得展示 token、密码哈希或重置凭证。

---

## 可信字段统一约定

> 与 `docs/product-blueprint/DATA_TRUST_SPEC.md` 完全对齐；冲突时以 `DATA_SOURCES.md` 为最终权威。

### 1. 凡返回成分/匹配结果的接口，响应中相关记录必须携带：
- `dataStatus`：七态枚举（代码权威：`backend/src/services/ingredientService.ts` 的 `validDataStatuses` / 前端 `src/utils/dataStatus.js`）：
  `verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr`。
  非法/未知状态归一为 `unverified`，**各端不得自行发明新枚举**。
- `matchConfidence`：记录级置信度枚举 `high|medium|low|unverified`。
- 来源可信字段：`sourceName`、`sourceUrl`、`regulatoryBasis`（以及 `sourceType`/`sourceScope`/`confidenceLevel` 等，见 `IngredientRow`）。

涉及接口：`GET /api/ingredients`、`/api/ingredients/search`、`/api/ingredients/:id`（含 `?includeEvidence=1`）、`POST /api/ingredients/batch-search`（`match`/`alternates` 内的记录）。

> 区分提醒：`batch-search` 顶层的 `confidence`（0~1 数值）是**运行时匹配置信度**，与记录字段 `matchConfidence`（枚举）不是同一字段。`low_confidence` 指的是数值区间（约 0.55-0.79），**不是**独立的 `dataStatus`；`verified_safety` 是产品语义名，当前代码等同本项目 `verified_jecfa`。

### 2. 前端展示规则（强约束）
- `verified_regulation`：可作官方法规结论展示（须已满足正式库准入规则）。
- `verified_jecfa`：仅作安全评价展示；**不得**写成中国法规使用范围，不得把 JECFA 反推为 GB 2760 范围。
- `pending_review` / `mapped_candidate` / `unverified`（pending 集合）：**一律不得展示为官方/权威结论**，须显式标注待复核/疑似/未验证。
- `common_ingredient`：仅作可读性/识别用途，非法规结论。
- `unknown_from_ocr`：文案"暂未收录"，进人工校验队列。
- **OCR 结果**（`/api/ocr` 返回）：用户输入来源，**不得展示为权威来源**；低置信/未识别内容必须保留。
- **AI 结果**（计划中的 `/api/analyze`）：仅解释层，标注 `ai_generated`，**不得展示为权威/法规来源**。
