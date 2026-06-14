# 前端工程规范（FRONTEND_SPEC）

> 本文属 `docs/product-blueprint/` 蓝图集，是 CompLens / 成分镜 的前端工程权威规范，供 Codex 及后续开发严格遵守。
>
> 关联蓝图（同目录下，均为当前蓝图集的一部分）：
> - `README.md`（蓝图集索引，已存在于 `docs/product-blueprint/README.md`）
> - `DESIGN_SYSTEM.md`（设计系统 / design tokens / 组件状态规则）
> - `VISUAL_STYLE_GUIDE.md`（视觉风格 / 字体 / 图标 / 动效）
> - `CONSUMER_DECISION_SPEC.md`（消费者食品标签解读与消费决策规范）
> - `CONSUMER_UX_SPEC.md`（消费者体验和话术规范）
> - `ARCHITECTURE_SPEC.md`（统一技术栈、旧前端迁移、后端/OCR/后台架构）
> - `PAGE_STRUCTURE.md`（页面结构和验收口径）
> - `API_CONTRACT.md`（接口契约）
> - `DATA_TRUST_SPEC.md`（数据可信规范）
>
> 本规范区分“正式目标架构”和“当前历史原型”。正式用户端采用 `user-uniapp`（uni-app + Vue3）；当前 `src/` 纯 JS + Vite/hash 路由前端保留为历史原型和迁移来源，不把计划迁移写成已完成。

---

## 0. 技术栈基线（目标 + 现状）

### 0.1 正式用户端目标栈

正式用户端采用：

- 目录：`user-uniapp/`（规划，尚未创建）
- 框架：uni-app + Vue3
- 目标平台：H5/PWA、微信小程序、Android、iOS
- API：所有端统一调用后端 API
- UI 基线：复用 `DESIGN_SYSTEM.md` 的 design tokens、数据状态、组件语义和文案规范

正式用户端不得：

- 直连 OCR / AI / 数据库 / 本地 OCR 服务。
- 暴露 OCR Key / AI Key。
- 假设所有平台都有 `window` / `document` / `navigator`。
- 跳过 OCR 文本确认页直接分析。

### 0.2 当前历史原型现状

当前 `src/` 是历史 Web/PWA 原型：

- 语言：纯 JavaScript ES2022+，用 JSDoc 注释类型。
- 模块：ES Modules。
- 框架：无框架。
- 构建：Vite 8.x。
- 路由：自实现 hash 路由（`window.location.hash` + `hashchange`），见 `src/router/router.js`。
- 样式：单文件 `src/styles.css`，原生 CSS + CSS 变量。
- 状态管理：无状态管理库，使用模块级函数 + `localStorage`（见 `src/store/userStore.js`）。
- 测试：`scripts/test.mjs`，Node 原生 `assert`。
- 移动端能力：历史原型中已有 Capacitor 7.x 目录和部分桥接。

处理策略：

1. 旧前端保留为历史原型和迁移来源，不直接删除。
2. 不继续在旧前端上堆复杂新业务。
3. 旧前端中已有可复用的业务逻辑、文案、样式 token、页面流程，可逐步迁移到 `user-uniapp` 或 shared 模块。
4. 旧前端如需维护，只做阻断性 bug、安全/数据可信/OCR 降级等小范围修复。

### 0.3 后端与后台目标

- 后端 API：复用现有 `backend/`，技术栈为 Node.js + TypeScript + Hono + Drizzle/PostgreSQL。不要重复创建 Express/NestJS 服务。
- 后台管理端：`admin-web/`（规划，尚未创建），Vue3 + TDesign Web。
- OCR 服务：Python FastAPI + RapidOCR，本地地址目标为 `http://127.0.0.1:18080/ocr`，后端通过 `OCR_LOCAL_URL` 调用；当前代码仍使用 `OCR_SERVICE_URL`，改名需另做配置迁移。

安全与配置约束（强制）：

- 图片存 IndexedDB（库名 `compcheck-images` / `scan-images`）；`localStorage` 只存元数据 / 索引 / 设置。
- **禁止 base64 图片写入 `localStorage`**。
- API Key 只在后端环境变量；前端不暴露、不直连第三方 OCR / AI 服务。
- 环境变量**不加 `VITE_` 前缀**；公开配置在 `vite.config.js` 中通过 `define` 显式注入。

---

## 1. 前端总体原则

1. **移动端优先**：所有页面、组件、交互首先满足移动端竖屏体验，再适配宽屏。
2. **正式用户端按 uni-app + Vue3 规划**：新复杂功能优先进入 `user-uniapp` 规划，不继续压在旧 `src/` 原型上。
3. **不一次性重写全部业务代码**：先建目录、API 契约和迁移边界，再逐步迁移页面、服务和状态。
4. **旧前端栈稳定**：旧 `src/` 原型内不新增 Vue/React/Tailwind/状态库等新栈；如要使用 Vue3，只能在正式 `user-uniapp` 或 `admin-web` 中使用。
5. **渐进增强**：核心信息（关注项、配料、营养字段、数据来源）在低端机 / 弱网下也可读；增强能力（动画、懒加载图）失败不影响主信息。
6. **单一事实来源**：迁移完成前，状态枚举以 `src/utils/dataStatus.js` 为当前实现参考；正式端需迁移为 shared 契约，不得各端自造状态。
7. **消费者默认视角**：页面默认展示食品标签解读和购买前建议关注，专业法规/数据库字段默认折叠到“数据来源和查看依据”。

---

## 2. 目录结构规范

以下区分目标目录与当前原型目录。

目标目录：

```text
user-uniapp/    计划  正式用户端，uni-app + Vue3
admin-web/      计划  后台管理端，Vue3 + TDesign Web
backend/        已存在  统一后端 API，Node.js + Hono + Drizzle/PostgreSQL
src/            已存在  旧 Web/PWA 原型，迁移来源
```

当前 `src/` 真实目录结构（迁移来源），逐目录说明用途，并标注「已存在」/「建议迁移」。

```
src/
  pages/        已存在  页面级渲染模块（每页一个 renderXxxPage 函数）
  components/   已存在  共享组件（当前仅 render.js）
  services/     已存在  业务服务 / API 调用 / 平台桥接
  store/        已存在  模块级状态（userStore.js）
  utils/        已存在  纯工具函数
  data/         已存在  静态数据 / 分类 / 法规内容等
  router/       已存在  自实现 hash 路由（router.js）
  styles.css    已存在  唯一全局样式文件
  main.js       已存在  应用入口
  assets/       建议迁移到 user-uniapp  图片 / 图标 / 静态资源（禁止提交字体文件）
  constants/    建议迁移到 shared/user-uniapp  集中常量 / 文案 key / 枚举
  platform/     建议迁移到 user-uniapp  平台差异适配层
```

### 2.1 `src/pages/`（已存在）
页面级模块，每个页面对外暴露一个 `renderXxxPage(...)` 函数（返回 HTML 字符串 / DOM）。真实页面（按职责）：

`home`、`scan`、`ocrConfirm`、`analyze`、`reportDetail`、`reports`、`history`、`detail`、`search`、`favorites`、`settings`、`productArchive`、`data`、`gb2760Review`、`auth`、`onboarding`、`membership`、`support`、`legal`、`compare`、`notFound`。

规范：页面只负责「组织本页结构 + 调用 services 取数 + 渲染三态」，不直接写 `fetch`，不实现底层业务逻辑。

### 2.2 `src/components/`（已存在，待补全）
当前**仅有 `render.js`**，共享组件尚未抽取，多为页面内联。统一抽取属计划 **Batch UX-D（待办）**，见第 4 节组件清单。

### 2.3 `src/services/`（已存在）
集中所有外部交互与业务编排。真实服务文件：

`aiAnalysis`、`allergen`、`auth`、`compare`、`gb2760Api`、`imageStore`、`ingredientApi`、`ingredientMatch`、`ingredient`、`membership`、`nativeBridge`、`ocr`、`personalProfile`、`productArchive`、`reportExport`、`report`、`reviewQueue`、`share`、`storage`、`support`。

规范：所有网络请求、IndexedDB / localStorage 访问、平台 API 调用必须经由对应 service。

### 2.4 `src/store/`（已存在）
模块级状态，当前为 `userStore.js`。状态读写封装为函数，底层用 `localStorage` 持久化小型数据。禁止把大对象 / 图片塞入 store。

### 2.5 `src/utils/`（已存在）
纯函数工具，无副作用、不发请求。真实文件：`dataStatus`、`imageFile`、`imageProcessor`、`text`。状态枚举与映射统一在 `dataStatus.js`。

### 2.6 `src/data/`（已存在）
静态数据：分类（`categories.js`）、法规内容（`legalContent.js`）等。

### 2.7 `src/styles.css`（已存在）
**唯一**全局样式文件。所有样式集中于此（或由其 `@import` 拆分，但仍属同一原生 CSS 体系），见第 5 节。

### 2.8 `src/router/`（已存在）
自实现 hash 路由，见第 6 节。

### 2.9 `src/main.js`（已存在）
应用入口：初始化路由、监听 `hashchange`、首屏渲染。

---

## 3. 页面开发规范

每个页面必须满足：

1. **明确目标**：页面顶部职责单一，能用一句话说明「用户在这页要完成什么」。
2. **三态完整**：必须实现并区分
   - `loading`：加载中（骨架屏 / 占位，使用 `--color-skeleton-base` / `--color-skeleton-highlight`）。
   - `empty`：无数据（友好文案 + 引导主操作，对应 `EmptyState`）。
   - `error`：出错（错误文案 + 可执行动作，对应 `ErrorState`，见第 12 节）。
3. **主操作明确**：每页有清晰的主操作按钮（如扫描页「拍照 / 选图」、确认页「确认并分析」），视觉上主次分明。
4. **返回 / 重试路径**：每页可返回上一步或首页；失败态必须提供重试或替代动作（如手动输入）。
5. **移动端不横向滚动**：内容自适应视口宽度，禁止出现整页水平滚动条。
6. **核心内容不被底部导航遮挡**：页面底部预留 `BottomNav` 高度 + `safe-area-inset-bottom`，正文最后一屏内容不被遮挡。
7. **状态文案统一**：可信状态、风险等级等文案统一走 `dataStatus.js` 映射，不在页面内自造文案。

---

## 4. 组件开发规范

组件原则：

- **单一职责**：一个组件只做一件事。
- **可复用、不写死业务数据**：数据通过 props / 参数传入，不在组件内硬编码具体配料 / 报告内容。
- **不内联硬编码颜色**：颜色一律用 CSS 变量（见第 5 节），禁止 `style="color:#xxx"` 写死品牌色 / 风险色。
- **状态通过 props / 参数传入**：组件不自行读取全局 store；由页面取数后传参。
- **命名清晰**：组件名见名知义，导出 `renderXxx` 风格保持一致。
- **不复制多套相似组件**：相似 UI 收敛为一个可配置组件，禁止「标签组件复制三份」。

### 4.1 须统一抽取的组件清单（Batch UX-D，待办）

> 现状：以下组件多为**页面内联实现**，尚未集中到 `src/components/`（当前仅 `render.js`）。统一抽取属计划 **Batch UX-D（待办）**。新开发应优先复用已抽取的，未抽取的在实现时就近沉淀为可复用单元，避免再次复制。

| 组件 | 职责 |
| --- | --- |
| `Button` | 主 / 次 / 文本按钮，高度 ≥ 44px |
| `Card` | 内容卡片容器（`--radius-card`、`--shadow-card`） |
| `Badge` | 通用徽标 |
| `StatusTag` | 数据可信状态标签（基于 `dataStatus.js`，必须含文字） |
| `SourceBadge` | 数据来源标识（官方标准 / JECFA / OCR / AI） |
| `ConfidenceBadge` | 匹配置信度标识（如 `mapped_candidate`） |
| `ImageUploader` | 图片选择 / 预览 / 重选 / 压缩入口 |
| `StepIndicator` | OCR 主流程步骤指示 |
| `IngredientChip` | 单个配料项展示 |
| `ReportSummaryCard` | 报告概要卡片 |
| `BottomNav` | 移动端底部导航（见 `MOBILE_NAV_ITEMS`） |
| `Toast` | 轻量提示 |
| `Modal` | 弹层 / 确认框 |
| `LoadingState` | 加载态（骨架 / 转圈） |
| `EmptyState` | 空数据态 |
| `ErrorState` | 错误态 + 可执行动作 |

---

## 5. CSS / 样式规范

1. **统一 CSS 变量**：所有颜色、间距、圆角、字号一律引用 `src/styles.css` 中 `:root` 定义的 token。
2. **不每页定义品牌色**：品牌色等只在 `:root` 定义一次。
3. **不大段 inline style**：禁止在 HTML 字符串里写大段 `style="..."`；动态样式通过 class 切换。
4. **不散落魔法数字**：间距 / 字号用 token，不写裸 `13px`、`7px` 等。
5. **统一移动端断点**：以 `styles.css` 现有 `@media` 断点为准，不各页自定义断点。
6. **统一 safe-area**：使用 `env(safe-area-inset-*)`（仓库已在顶栏使用 `safe-area-inset-top`），底部导航同理处理 `safe-area-inset-bottom`。
7. **按钮高度 ≥ 44px、正文 ≥ 14px**：见第 14 节。

### 5.1 CSS token（间距/字号取自 `src/styles.css`；品牌色与圆角见规范值说明）

> 品牌主色与圆角的**规范值已确认为薄荷绿 + 16px**（见 `DESIGN_SYSTEM.md` §2.1 / §2.10）；下方「当前代码」块为 `src/styles.css` 现状，切换为规范值是 Batch FRONTEND-A（待办）。间距、字号 token 不变。

间距：
```
--space-xs: 4px;  --space-sm: 8px;  --space-md: 12px;  --space-lg: 16px;  --space-xl: 24px;
```
圆角（规范值 16px；当前代码 8px，含约 88 处硬编码字面量，FRONTEND-A 统一收敛为 `var(--radius-*)`）：
```
/* 规范（目标） */ --radius-card: 16px;  --radius-btn: 16px;
/* 当前代码     */ --radius-card: 8px;   --radius-btn: 8px;
```
字号：
```
--font-size-xs: 12px;  --font-size-sm: 14px;  --font-size-base: 16px;
--font-size-lg: 18px;   --font-size-xl: 20px;  --font-size-2xl: 24px;
```
品牌 / 基础色（薄荷绿色阶为规范值；`--primary` 系列当前代码仍为青绿，FRONTEND-A 切换）：
```
--bg: #f6f7f4;  --surface: #ffffff;  --text: #18211f;  --muted: #66736f;  --line: #dce3df;
/* 规范（目标，薄荷绿色阶） */
--primary: #059669;  --primary-strong: #047857;  --primary-darker: #035c43;
--primary-bright: #10b981;  --primary-tint: #34d399;  --color-primary-soft: #ecfdf5;  --accent: #c85f38;
/* 当前代码 */
--primary: #116a5b;  --primary-strong: #0c5146;  --color-primary-soft: #e9efeb;  --accent: #c85f38;
```
风险 / 状态色（供状态标签使用，禁止自造）：
```
--color-risk-high: #ef4444;  --color-risk-medium: #f59e0b;  --color-risk-low: #22c55e;
--color-unverified: #9ca3af; --color-unknown: #6b7280;     --color-watch: #2563eb;
```
其它已有 token：`--shadow` / `--shadow-card`、`--transition-fast: 150ms ease-out`、骨架色 `--color-skeleton-base` / `--color-skeleton-highlight`、错误态 `--color-error-text` / `--color-error-border` / `--color-error-bg`。

> 新增 token 必须加到 `:root` 并复用，禁止页面级私有色值。

---

## 6. 路由规范

- 路由为**自实现 hash 路由**：`window.location.hash` + `hashchange`，解析在 `src/router/router.js` 的 `resolveRoute(hash)`。
- 路由含**多类别前缀**：路径携带 `category` 字段（默认 `defaultCategory`，如 `food`）。带前缀形如 `#/food/<path>`，根路径 `#/` 使用默认类别。
- 渲染通过 `view` 字段分发到对应 `renderXxxPage`。

### 6.1 用户主流程路由映射表

> 语义路由列为产品/蓝图层面的人类可读路径；当前真实列以 `src/router/router.js` 为准。带类别前缀的实际 hash 形如 `#/<category>/<path>`（如 `#/food/scan`）。**任何具体 hash 串以 `src/router/router.js` 为准。**

| 主流程步骤 | 蓝图语义路由（建议） | 当前真实 hash 路由 |
| --- | --- | --- |
| 首页 | `/` | `#/`、`#/food/`（以 router.js 为准） |
| 拍照 / 选图 | `/capture` | `#/scan` / `#/food/scan` |
| OCR 识别中 | `/ocr` | （扫描页内状态，无独立路由；以 router.js 为准，待确认） |
| 文本确认 | `/confirm-text` | `#/ocr-confirm` / `#/food/ocr-confirm` |
| 解析配料 | `/parse` | `#/food/analyze`（`#/analyze`，携带 input/productName） |
| 匹配成分 | `/match` | `#/food/analyze` 流程内（以 router.js 为准，待确认） |
| 报告详情 | `/report/:id` | `#/food/report/:id` / `#/food/reports/:id` |
| 成分详情 | `/ingredients/:id` | `#/food/ingredient/:id` |
| 历史 | `/history` | `#/history` / `#/food/history` |
| 个人档案 | `/profile` | `#/settings` / `#/food/settings`（个人成分档案） |
| 数据来源 | `/data-sources` | `#/data` / `#/food/data` |
| 隐私条款 | `/privacy` | `#/legal`、`#/legal/:documentId` |
| 搜索 | `/search` | `#/food/search`（`#/search`） |
| 报告列表 | `/reports` | `#/reports` / `#/food/reports` |
| 收藏 | `/favorites` | `#/favorites` / `#/food/favorites` |
| 对比 | `/compare` | `#/compare` / `#/food/compare` |
| 产品档案 | `/products`、`/products/:id` | `#/products`、`#/product/:id`（以 router.js 为准） |
| GB 2760 复核 | `/gb2760-review` | `#/food/gb2760-review` |
| 登录 | `/login` | `#/login`（auth，携带 redirect） |
| 首次设置 | `/onboarding` | `#/onboarding` |
| 会员 | `/membership` | `#/membership` |
| 支持 | `/support` | `#/support` |
| 404 | — | `not-found`（未匹配路径） |

> 底部导航项见 `MOBILE_NAV_ITEMS`：home / scan / search / history / settings。

规范：
- 新增页面必须在 `router.js` 注册（解析 + `view` 分发 + 标题），不得脱离路由表硬跳。
- 跳转统一改 `window.location.hash`，不绕过路由直接替换 DOM。
- 带 id 的路由参数必须做编解码（仓库已有 `decodePathValue`）。

---

## 7. 食品标签 OCR 与标签类型状态机

OCR 主流程必须支持配料表、营养成分表、包装正面和未知标签。每个状态有明确 UI，每个失败状态都有「重试 / 返回 / 手动输入」出口。

标签类型枚举：

| labelType | 含义 | 前端动作 |
|---|---|---|
| `ingredient_list` | 配料表 | 进入配料文本确认、拆分与匹配 |
| `nutrition_facts` | 营养成分表 | 进入营养字段确认与结构化 |
| `front_claims` | 包装正面卖点 | 进入卖点文案确认，MVP 可作为补充信息 |
| `barcode_or_product` | 条码 / 产品名 | 后续能力，MVP 不强制 |
| `unknown_label` | 未知标签 | 展示类型选择页，允许重新拍 |

系统无法判断时，前端必须允许用户选择：这是配料表、这是营养成分表、这是包装正面、都不是重新拍。

```
idle
  └─选图─> selectingImage
              └─选中─> previewingImage
                          ├─重选─> selectingImage
                          └─确认─> uploadingImage
                                      └─上传完成─> recognizing
                                                     ├─成功─> confirmingText   （必经，不可跳过）
                                                     └─失败─> ocrFailed
ocrFailed
  ├─重试识别─> recognizing
  ├─手动输入─> confirmingText
  └─返回─> previewingImage / selectingImage
confirmingText  （文本确认页，含标签类型确认）
  ├─ingredient_list─> parsingIngredients ─> matchingIngredients ─> reportReady
  ├─nutrition_facts─> parsingNutrition ─> reportReady
  ├─front_claims─> parsingClaims ─> reportReady（后续）
  └─unknown_label─> selectingLabelType / selectingImage
parsingIngredients / matchingIngredients / parsingNutrition 任一异常 ─> failed
failed
  ├─重试─> 回到失败发生的环节
  ├─手动输入/编辑文本─> confirmingText
  └─返回首页
```

状态说明与 UI 要求：

| 状态 | UI 要求 |
| --- | --- |
| `idle` | 扫描入口，主操作「拍照 / 从相册选择」 |
| `selectingImage` | 调起相机 / 相册（H5 用 `input[type=file]`，App 用 nativeBridge） |
| `previewingImage` | 预览所选图，提供「重选」「确认」，提示图片清晰度 |
| `uploadingImage` | 上传进度 / loading，可取消 |
| `recognizing` | 识别中 loading，长任务展示进度 |
| `ocrFailed` | 明确失败原因 + 重试 + 手动输入 + 返回 |
| `confirmingText` | **文本确认页（必经）**：展示可编辑识别文本，用户确认 / 修正后才进入分析 |
| `parsingIngredients` | 解析中 loading |
| `parsingNutrition` | 营养成分字段解析中 loading |
| `parsingClaims` | 包装正面卖点解析中 loading（后续） |
| `matchingIngredients` | 匹配中 loading |
| `reportReady` | 跳转 / 展示「食品标签解读」报告 |
| `failed` | 通用失败态 + 可执行动作 |

强制约束：
- **OCR 失败不中断流程**：失败后仍可走 `manual`（手动输入）继续生成报告。
- **OCR 结果必须进入文本确认页**：禁止跳过 `confirmingText` 直接进入分析 / 报告。
- OCR 降级链：`real(rapidocr/aliyun) → manual → fallback`；无 Key 不崩溃、保留 manual、不伪造结果、mock 结果必须明确标注。
- MVP 不要求必须拍三张：拍一张也能分析，拍两张可以合并，拍三张报告更完整。

### 7.1 营养成分字段解析

营养成分表解析目标字段：

`energy`、`protein`、`fat`、`saturatedFat`、`transFat`、`carbohydrate`、`sugar`、`sodium`、`dietaryFiber`、`servingSize`、`perUnit`、`nrvPercent`。

展示规则：

- 控糖关注项优先展示碳水化合物、糖、甜味来源。
- 低钠关注项优先展示钠和含钠配料。
- 减脂关注项优先展示能量、脂肪、饱和脂肪、反式脂肪。
- 高蛋白关注项优先展示蛋白质。

### 7.2 我的关注项本地状态

关注项是主路径状态，MVP 本地保存，不要求登录。前端应提供统一读取/写入入口，页面不得各自散存。

关注项：控糖、低钠、减脂、高蛋白、少添加、给孩子看、过敏/忌口。后续：素食、清真、宗教忌口。

报告页排序必须消费用户关注项，而不是固定展示所有信息。

---

## 8. API 调用规范

1. **集中到 services/api 口径**：所有网络调用集中在 `src/services/` 下的 API service（现状如 `ingredientApiService`、`ocrService`、`aiAnalysisService`；后续可渐进收敛到 `src/services/api/`）。**页面 / 组件内禁止散写 `fetch`**。
2. **统一处理**：每个 service 统一处理 `loading` / timeout / error handling / toast，向上返回标准化结果（成功数据或归类后的错误，见第 12 节分类）。
3. **不硬编码接口地址**：基础地址来自构建期注入的公开配置（`vite.config.js` 的 `define`），不在调用处写死域名。
4. **字段遵守契约**：请求 / 响应字段遵守 `API_CONTRACT.md`；未实现接口必须按计划状态标注，不得在页面中直接按已实现调用。
5. **不在前端直连第三方 OCR / AI**：一律经本项目后端中转；前端不持有 / 不发送第三方 API Key。
6. **超时与重试**：网络请求设合理超时；可重试错误（网络 / 超时）提供重试动作，不静默吞错。

---

## 9. 数据可信展示规范

按真实可信状态枚举展示，统一映射见 `src/utils/dataStatus.js`：

| status | 标签 | 含义 / 展示约束 |
| --- | --- | --- |
| `verified_regulation` | 官方标准已验证 | 可作为权威法规结论展示 |
| `verified_jecfa` | 安全评价已匹配（非中国法规范围） | 标注「非中国法规范围」，不可包装成中国官方结论 |
| `pending_review` | 待复核来源数据 | **禁止**展示成官方结论 |
| `mapped_candidate` | 疑似匹配，待确认 | 必须标注「疑似 / 待确认」 |
| `common_ingredient` | 普通配料 | 普通展示 |
| `unverified` | 未验证 | 明确标注未验证 |
| `unknown_from_ocr` | 暂未收录 | 标注暂未收录，引导手动 / 反馈 |

强制约束：
- 状态标签、颜色一律走 `dataStatusLabel` / `dataStatusColorVar` / `dataStatusBadgeClass`，不自造文案 / 颜色。
- **禁止**把 `pending_review` 展示成官方结论。
- **禁止**把 OCR 结果展示成权威来源。
- **禁止**把 AI 总结展示成法规依据。
- 不确定状态用 `normalizeDataStatus` 归一，默认回退 `unverified`，不臆造 `verified_*`。
- 详见 `DATA_TRUST_SPEC.md`。

### 9.1 禁止文案（强制）
任何文案、状态、报告中**禁止**出现：可以买、不能买、健康、不健康、安全、有害、致癌、治疗、诊断、一定过敏、绝对安全、绝对有害、一定致敏、一定不能吃、有毒。改用相对、可追溯、带来源与不确定性的表述，例如“建议关注”“更适合重点查看”“部分人群可能需要留意”“信息不足，建议结合包装原文确认”。

---

## 10. 本地存储规范

1. **图片 / blob 不入 `localStorage`**：H5 / PWA 下图片一律存 **IndexedDB**（`compcheck-images` / `scan-images`，经 `imageStore` service）。
2. **`localStorage` 只存小型数据**：设置 / 偏好 / 索引 / 元数据（经 `storage` service 与 `store/userStore.js`）。
3. **平台差异**：小程序 / App 下图片用平台文件缓存（经 `nativeBridge`），不复用 H5 的 IndexedDB 假设。
4. **历史报告**：可先本地存储，后续支持云同步；本地与云结构需可平滑迁移。
5. **隐私可清理**：提供清理入口，隐私数据可被用户清除（设置页 / 隐私页）。
6. **禁止**把大对象 / base64 图片塞进 `localStorage` 或 store。

---

## 11. 图片上传规范

1. **上传前压缩**：经 `utils/imageProcessor.js` / `utils/imageFile.js` 压缩后再上传。
2. **大小限制**：当前校验上限 **8MB**，超限给出明确提示并引导重选 / 压缩。
3. **格式限制**：限制为常见图片格式（如 JPEG / PNG / WebP），不支持格式给出提示。
4. **预览 + 可重选**：上传前必须预览，提供「重选」。
5. **质量提示**：OCR 前提示图片清晰度 / 配料表完整性，降低识别失败率。
6. **失败可恢复**：上传 / 识别失败可重试或改手动输入，不中断主流程（见第 7 节）。

---

## 12. 错误处理规范

统一错误分类，每类有用户可执行动作：

| 分类 | 典型场景 | 用户可执行动作 |
| --- | --- | --- |
| 网络异常 | 断网 / 超时 | 重试、检查网络、返回首页 |
| OCR 失败 | 识别不出文本 | 重试识别、手动输入、重新拍照 |
| 图片过大 | > 8MB | 重新选择 / 压缩后上传 |
| 格式不支持 | 非支持图片格式 | 重新选择正确格式 |
| 未匹配 | 配料未命中数据库 | 标「暂未收录」、手动确认、提交反馈 |
| 接口异常 | 后端 5xx / 4xx | 重试、稍后再试、返回 |
| 权限异常 | 未登录 / 无权限 | 跳转登录（带 redirect）、返回 |
| 未知错误 | 兜底 | 重试、返回首页、查看数据说明 |

规范：
- 错误在 service 层归类后向上返回，页面据分类渲染 `ErrorState` 与对应动作。
- 错误提示文案清晰、可执行，不暴露堆栈 / 原始报错给用户。
- 失败态使用统一错误态样式（`--color-error-*`）。

---

## 13. 性能规范

1. **首屏轻量**：入口只加载主路径必需模块。
2. **图片压缩**：上传前压缩，避免传大图。
3. **非关键模块懒加载**：次要页面 / 重逻辑用动态 `import()` 懒加载。
4. **避免大对象进 `localStorage`**：见第 10 节。
5. **避免阻塞主线程**：重计算（解析 / 匹配）避免长时间同步占用主线程，必要时分片 / 让出。
6. **长任务展示进度**：OCR / 解析 / 匹配等长任务给进度或 loading，不让界面"假死"。
7. **低端机可用**：动画可降级，核心信息在低端机 / 弱网仍可读可用。

---

## 14. 可访问性与可用性规范

1. 正文字号 **≥ 14px**（`--font-size-sm` 起步）。
2. 主按钮高度 **≥ 44px**；可点击区域 **≥ 44×44px**。
3. **不只靠颜色表达状态**：状态标签必须带**文字**（如「待复核」「疑似匹配」），色弱用户可辨。
4. 错误提示清晰、定位明确、给出下一步动作。
5. 输入框有 `label` / `placeholder`，焦点态可见。
6. 关键交互有可见反馈（点击态 / loading / Toast）。

---

## 15. 国际化规范

1. **文案集中管理**：用户可见文案集中到统一文案表（建议 `src/constants/` 下按 key 组织），不在组件 / 页面里散落硬编码中文。
2. **状态文案统一映射**：可信状态、风险等级等走 `dataStatus.js` 等统一映射，不重复定义。
3. **默认简体中文**；繁体 / 英文后续**按 key 扩展**，不改调用处。
4. **现状**：当前是否已落地 i18n 框架 **待确认**（仓库未见独立 i18n 模块）。在框架落地前，新文案仍应集中收口、走 key，便于后续平滑接入。

---

## 16. 前端禁止事项（强制）

1. 不暴露 OCR / AI 等任何后端密钥到前端。
2. 不跳过文本确认页（`confirmingText`）直接分析。
3. 不硬编码接口地址（用构建期注入的公开配置）。
4. 不把 OCR 结果当最终结论展示。
5. 不把 AI 总结当数据来源 / 法规依据展示。
6. 不每页单独发明样式 / 私有色值 / 魔法数字（统一走 token）。
7. 不提交字体文件到仓库。
8. 不把大图片 / base64 存入 `localStorage`（图片走 IndexedDB / 平台缓存）。
9. 不引入框架 / 重型 UI 依赖 / 状态管理库 / CSS 预处理器。
10. 不在页面 / 组件里散写 `fetch`（统一走 services）。
11. 不使用禁止文案（见 9.1）。
12. 不在前端直连第三方 OCR / AI 服务。
