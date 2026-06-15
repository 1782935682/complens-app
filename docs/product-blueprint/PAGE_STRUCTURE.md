# CompLens / 成分镜 页面结构（PAGE_STRUCTURE）

> 本文档属 `docs/product-blueprint/` 蓝图规范集，配套阅读本目录 [`README.md`](./README.md) 索引。
>
> 蓝图集相关文档（相对链接引用，部分可能尚未物理落地，以 README 索引为准）：
> [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)、
> [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)、
> [`DATA_TRUST_SPEC.md`](./DATA_TRUST_SPEC.md)、
> [`ADMIN_CONSOLE_SPEC.md`](./ADMIN_CONSOLE_SPEC.md)、
> [`QA_ACCEPTANCE_SPEC.md`](./QA_ACCEPTANCE_SPEC.md)。

- 产品代号：CompCheck
- 产品名：CompLens / 成分镜
- 文档类型：页面结构（信息架构 / 页面清单 / 主流程 / 后台规划）
- 适用范围：食品标签（配料表、营养成分表、包装正面卖点）；不含化妆品、护肤品、药品

> **登记约定（强制）**：任何新增页面（用户端或后台）必须登记到本文件对应小节，包含「页面目标 / 对应文件 / 路由 / 当前状态」四项，否则不视为完成。

---

## 0. 路由与可信总则

### 0.1 路由约定

- 正式用户端目录为 `user-uniapp/`，采用 uni-app + Vue3，路由由 `user-uniapp/src/pages.json` 配置承载。
- 当前 `src/` 纯 JS + Vite 前端采用 **hash 路由**，源在 `src/router/router.js`，仅作为历史原型和迁移来源。
- 本文档同时登记目标页面与当前原型承载页面；不确定的统一标注「计划 / 待确认」。

### 0.2 数据可信展示总则（统一来源 `src/utils/dataStatus.js`）

所有页面在展示成分来源 / 可信等级时，**只能使用以下七个枚举**，并以 `dataStatusLabel()` 输出文案：

| 枚举 | 文案 | 含义 | 可否作为权威结论 |
| --- | --- | --- | --- |
| `verified_regulation` | 官方标准已验证 | 已对齐官方标准 | 可作为权威依据展示 |
| `verified_jecfa` | 安全评价已匹配（非中国法规范围） | 已匹配安全评价，但非中国法规口径 | 可展示，须注明非中国法规范围 |
| `pending_review` | 待复核来源数据 | 来源数据待人工复核 | **禁止**作为权威结论 |
| `mapped_candidate` | 疑似匹配，待确认 | 自动疑似匹配，未确认 | **禁止**作为权威结论 |
| `common_ingredient` | 普通配料 | 普通食材类配料 | 可展示，非添加剂结论 |
| `unverified` | 未验证 | 未验证 | **禁止**作为权威结论 |
| `unknown_from_ocr` | 暂未收录 | OCR 文本未匹配到收录项 | **禁止**作为权威结论 |

`pending_review` / `mapped_candidate` / `unverified` 属「待定」状态（`isPendingDataStatus`），与 OCR 原始文本、AI 推断一样，**一律不得展示为官方/权威结论**，必须带「待复核 / 疑似 / 未验证」等弱化措辞。

### 0.3 全局文案红线（所有页面适用）

禁止出现：可以买、不能买、健康、不健康、安全、有害、致癌、治疗、诊断、一定过敏。

---

## 一、用户端页面

> 每个页面统一模板：页面目标 / 对应文件·路由 / 入口 / 核心组件 / 主要操作 / 页面状态（含 loading·empty·error 三态）/ 移动端注意事项 / 数据可信展示规则 / 验收标准。
> 移动端通用约束（除非另注，对所有页面生效）：尊重安全区（顶部刘海 / 底部 Home 条）；**禁止整页横向滚动**；可点击控件命中区域 **≥ 44px**；底部主导航在小屏使用 `MOBILE_NAV_ITEMS`（首页 / 扫描 / 搜索 / 历史 / 设置）。
> 三态通用约束：loading / empty / error 三态已在各页复核（Batch 8-C 完成）。

### 1.0 正式 `user-uniapp/` 页面登记

| 页面 | 页面目标 | 对应文件 / 路由 | 当前状态 |
| --- | --- | --- | --- |
| 首页 | 引导进入拍照解读食品标签主路径，提供上传、粘贴、搜索、历史、关注项入口 | `user-uniapp/src/pages/index/index.vue` / `/pages/index/index` | 已落地 MVP |
| 拍照/上传页 | 拍照、相册上传、图片预览、重选、质量和权限提示 | `user-uniapp/src/pages/capture/index.vue` / `/pages/capture/index` | 已落地 MVP |
| OCR 识别页 | 经后端 OCR adapter 识别，失败可重试或手动输入 | `user-uniapp/src/pages/ocr/index.vue` / `/pages/ocr/index` | 已落地 MVP |
| 标签类型识别页 | 配料表、营养成分表、包装正面、未知标签确认 | `user-uniapp/src/pages/label-type/index.vue` / `/pages/label-type/index` | 已落地 MVP |
| 文本确认页 | 展示 OCR/手动文本，允许编辑、清空、重新上传、确认继续 | `user-uniapp/src/pages/confirm-text/index.vue` / `/pages/confirm-text/index` | 已落地 MVP |
| 配料拆分页 | 拆分配料、手动编辑、删除错误项、新增遗漏项、保留暂未识别 | `user-uniapp/src/pages/ingredients/index.vue` / `/pages/ingredients/index` | 已落地 MVP |
| 营养成分表解析页 | 结构化能量、蛋白质、脂肪、糖、钠、NRV% 等字段 | `user-uniapp/src/pages/nutrition/index.vue` / `/pages/nutrition/index` | 已落地 MVP |
| 匹配确认页 | 汇总配料/营养与我的关注项命中，确认后生成报告 | `user-uniapp/src/pages/match/index.vue` / `/pages/match/index` | 已落地 MVP |
| 食品标签解读报告页 | 展示一句话摘要、关注项、配料/营养解读、添加剂分组、过敏/忌口、来源依据 | `user-uniapp/src/pages/report/index.vue` / `/pages/report/index` | 已落地 MVP |
| 历史页 | 本地报告列表、打开报告、删除记录、按时间排序 | `user-uniapp/src/pages/history/index.vue` / `/pages/history/index` | 已落地 MVP |
| 我的关注项页 | 本地保存控糖、低钠、少添加、过敏/忌口等关注项和细分项 | `user-uniapp/src/pages/attention/index.vue` / `/pages/attention/index` | 已落地 MVP |
| 成分搜索页 | 辅助搜索成分，不作为主路径 | `user-uniapp/src/pages/search/index.vue` / `/pages/search/index` | 已落地 MVP |
| 数据说明页 | 说明 OCR 确认、数据来源分级、AI 非权威、未验证口径 | `user-uniapp/src/pages/data-sources/index.vue` / `/pages/data-sources/index` | 已落地 MVP |
| 隐私说明页 | 说明图片隐私、后端 OCR、Key 不暴露、本地历史、非医疗建议 | `user-uniapp/src/pages/privacy/index.vue` / `/pages/privacy/index` | 已落地 MVP |

### 1.1 首页

- **页面目标**：作为产品起点，引导用户进入「拍照解读食品标签」主路径，并提供最近历史 / 报告等快捷入口。强调「起点是手里那包食品」，而非搜索框。
- **对应文件 / 路由**：`src/pages/homePage.js`；`#/`（带类别如 `#/food/`，待确认（以 router.js 为准），`resolveRoute` 中 `/` → view `home`）。
- **入口（从哪来）**：App 启动默认页；底部导航「首页」；各页返回主页。
- **核心组件**：主 CTA（拍照解读食品标签）、场景卡片、最近分析 / 报告快捷区、辅助入口（搜索 / 历史 / 设置）。共享组件多为内联（统一抽取见 Batch UX-D，待办）。
- **主要操作**：进入扫描；选择场景卡片；查看最近报告；进入辅助功能。
- **页面状态**：
  - loading：首屏骨架 / 占位。
  - empty：无历史时引导首拍。
  - error：本地数据读取失败时给重试。
- **移动端注意事项**：主 CTA 大按钮 ≥44px；首屏不横向滚动；尊重底部安全区。
- **数据可信展示规则**：首页若展示历史卡片的可信徽标，须用 `dataStatusLabel()`；不得在首页把任何成分直接断言为权威结论。
- **首页场景卡片**：控糖看配料、低钠看营养、给孩子买零食、过敏 / 忌口检查、少添加选择、对比两款食品。
- **验收标准**：
  - [ ] 首屏主 CTA 文案为「拍照解读食品标签」且可进入扫描。
  - [ ] 无历史时显示引导态而非空白。
  - [ ] 任一可信徽标均来自 `dataStatus` 枚举。

### 1.2 拍照 / 上传页 + OCR 识别页

> 主路径中「拍食品标签 → OCR 识别」由 **scanPage** 承载（输入采集 + 触发 OCR）。拍摄对象不再限定为配料表。

- **页面目标**：采集食品标签图片（配料表、营养成分表、包装正面），调用 OCR 得到识别文本，承接到标签类型确认与文本确认环节。
- **对应文件 / 路由**：`src/pages/scanPage.js`；`#/scan`（带类别如 `#/food/scan`；可带 `?text=` 预填，见 `resolveRoute` view `scan`）。
- **入口（从哪来）**：首页主 CTA；底部导航「扫描」；其他页「再拍一张」。
- **核心组件**：拍照 / 相册上传控件、标签类型提示卡、OCR 触发与进度、识别结果预览、下一步（去确认）。
- **主要操作**：拍配料表；拍营养成分表；拍包装正面；发起 OCR；进入标签类型选择 / 文本确认页。
- **页面状态**：
  - loading：OCR 识别中进度态。
  - empty：未选择图片时引导态。
  - error：拍照权限被拒 / OCR 失败 → 给出重试与改为手动输入。
- **移动端注意事项**：相机权限处理；按钮 ≥44px；进度态不可整页横向滚动；尊重安全区。
- **拍摄提示**：拍配料表：看成分和添加剂；拍营养成分表：看糖、钠、脂肪、热量；拍包装正面：核对 0 糖、低脂、高蛋白等卖点。
- **数据可信展示规则**：OCR 输出为**原始识别文本**，属未验证内容，**严禁**在此页将识别结果当作权威结论；匹配状态在后续页以 `unknown_from_ocr` 等枚举体现。
- **验收标准**：
  - [ ] 拍照与上传两条入口均可用。
  - [ ] OCR 失败可重试或转手动输入。
  - [ ] 识别结果以「待确认文本」措辞呈现，不作权威断言。

### 1.3 标签类型选择页

- **页面目标**：当系统无法稳定判断用户拍摄对象时，让用户确认这是配料表、营养成分表、包装正面还是无效图片。
- **对应文件 / 路由**：计划新增；建议 `src/pages/labelTypeSelectPage.js`，语义路由 `#/label-type`。
- **入口（从哪来）**：scanPage OCR 后；多图上传 / 补拍流程中每张图识别后。
- **核心组件**：标签类型选择卡片、原图 / OCR 摘要、重新拍按钮。
- **主要操作**：选择“这是配料表”“这是营养成分表”“这是包装正面”“都不是，重新拍”。
- **页面状态**：
  - loading：标签类型识别中。
  - empty：无图片或 OCR 文本 → 引导重新拍。
  - error：识别失败 → 手动选择或重新拍。
- **移动端注意事项**：四个选择项点击区域 ≥44px；保留原图缩略图；不横向滚动。
- **数据可信展示规则**：标签类型是 OCR/分类结果，属于用户确认前的辅助判断，不作为权威结论。
- **验收标准**：
  - [ ] 系统无法判断时必须允许用户手动选择。
  - [ ] 选择后进入对应文本确认流程。
  - [ ] “都不是，重新拍”路径可用。

### 1.4 多图上传 / 补拍页

- **页面目标**：支持一张、两张或三张标签图片组合解读，允许用户补拍配料表、营养成分表和包装正面。
- **对应文件 / 路由**：计划新增；建议 `src/pages/labelScanSessionPage.js`，语义路由 `#/label-session`。
- **入口（从哪来）**：首页主 CTA；scanPage 识别后“补拍营养成分表 / 包装正面”。
- **核心组件**：三图槽位、已识别标签类型、补拍按钮、继续生成报告按钮。
- **主要操作**：拍包装正面（可选）；拍配料表（推荐）；拍营养成分表（推荐）；删除 / 替换单张图；继续解读。
- **页面状态**：
  - loading：某张图 OCR 中。
  - empty：无图片 → 引导先拍配料表或营养成分表。
  - error：单张识别失败 → 重拍 / 手动输入 / 保留其他图。
- **移动端注意事项**：图片槽固定尺寸；补拍按钮 ≥44px；单张失败不影响其他图片。
- **数据可信展示规则**：每张图片只标识来源和标签类型，不展示结论。
- **验收标准**：
  - [ ] 拍一张也能继续。
  - [ ] 拍两张可合并。
  - [ ] 拍三张报告更完整但不强制。

### 1.5 文本确认页

- **页面目标**：让用户核对 / 修正 OCR 文本，确保进入解析前文本准确（主路径关键人工校验环节）。
- **对应文件 / 路由**：`src/pages/ocrConfirmPage.js`；`#/ocr-confirm`（带类别，见 `resolveRoute` view `ocr-confirm`）。
- **入口（从哪来）**：scanPage 完成 OCR 后跳入。
- **核心组件**：标签类型标识、可编辑文本区、原图对照（如有）、修改标签类型入口、确认并继续按钮。
- **主要操作**：编辑 / 修正文本；修改标签类型；确认并进入配料拆分 / 营养字段解析 / 卖点解析。
- **页面状态**：
  - loading：载入待确认文本时占位。
  - empty：无可确认文本（直接来此）→ 引导回扫描。
  - error：提交确认失败 → 重试。
- **移动端注意事项**：文本编辑区适配软键盘，不被遮挡；按钮 ≥44px；不横向滚动。
- **数据可信展示规则**：此页文本仍为**用户/OCR 文本**，未经数据库匹配或营养字段校验，不展示任何可信结论；明确提示「确认后再分析」。
- **验收标准**：
  - [ ] 文本可编辑并保存修正。
  - [ ] 无文本时不报错，引导回扫描。
  - [ ] 页面不出现「安全/有害」类断言。

### 1.6 配料拆分页 + 匹配确认页（分析页）

> 「配料拆分 → 数据库匹配确认」由 **analyzePage** 统一承载（拆分配料、逐项匹配、展示来源与可信、生成报告入口）。

- **页面目标**：将确认后的文本自动拆分为单条配料，逐条匹配食品成分 / 添加剂数据库，展示每项来源与可信等级，产出分析报告。
- **对应文件 / 路由**：`src/pages/analyzePage.js`；`#/analyze`（带类别；可带 `?text=` 与 `?productName=`，见 `resolveRoute` view `analyze`）。
- **入口（从哪来）**：ocrConfirmPage 确认后；也可由手动输入文本直达 `#/analyze?text=`。
- **核心组件**：配料列表（逐条）、每条的可信徽标与来源、低置信 / 待确认项的复核提示、生成 / 查看报告入口。
- **主要操作**：查看拆分结果；查看单条来源；处理疑似匹配；生成 / 进入报告。
- **页面状态**：
  - loading：拆分与匹配进行中。
  - empty：无可拆分配料 → 引导回确认 / 扫描。
  - error：匹配服务失败 → 重试，且不丢失已确认文本。
- **移动端注意事项**：长配料列表纵向滚动，禁止横向滚动；徽标与文案在小屏不截断；按钮 ≥44px。
- **数据可信展示规则**：每条配料按 `dataStatus` 枚举打标；`mapped_candidate` 须标「疑似匹配，待确认」并提供确认/否定；`pending_review` / `unverified` / `unknown_from_ocr` 不得呈现为权威结论；`verified_jecfa` 须注明「非中国法规范围」。
- **验收标准**：
  - [ ] 每条配料均带 `dataStatus` 徽标与来源说明。
  - [ ] 疑似 / 待复核项不被表述为权威结论。
  - [ ] 可由本页生成 / 进入分析报告。

### 1.7 食品标签解读报告页

- **页面目标**：以「普通消费者看得懂、关注项优先、专业依据可展开」的形式呈现食品标签解读。
- **对应文件 / 路由**：`src/pages/reportDetailPage.js`；`#/reports/:id`（亦兼容 `#/report/:id`，见 `resolveRoute` view `report-detail`）。报告列表见 `reportsPage`（§1.13）。
- **入口（从哪来）**：analyzePage 生成后；reportsPage 列表；历史记录。
- **核心组件**：一句话结论、我的关注项、购买前建议关注、配料表解读、营养成分解读、包装卖点核对、食品添加剂分组、过敏 / 忌口提示、暂未识别 / 暂未收录、数据来源和查看依据。
- **主要操作**：查看报告；保存到历史 / 档案；返回再分析。
- **页面状态**：
  - loading：报告加载中。
  - empty：报告不存在 / 已删除 → 提示并回列表。
  - error：加载失败 → 重试。
- **移动端注意事项**：长报告纵向滚动；徽标 / 表格不横向溢出；操作按钮 ≥44px。
- **数据可信展示规则**：报告内逐项沿用 `dataStatus` 枚举；整体结论须为中性、可核查表述，禁止使用文案红线词；非中国法规口径项须明确标注。报告页名称为「食品标签解读」，不要叫法规分析报告、风险分析报告、添加剂合规报告。
- **验收标准**：
  - [ ] 第一屏展示普通消费者能理解的一句话结论和购买前建议关注。
  - [ ] 报告含逐项来源与可信等级，但专业信息默认在“数据来源和查看依据”中展开。
  - [ ] 报告不存在时优雅降级。
  - [ ] 全文无文案红线词。

### 1.8 我的关注项设置页

- **页面目标**：让用户本地设置控糖、低钠、减脂、高蛋白、少添加、给孩子看、过敏 / 忌口等关注项，用于报告排序。
- **对应文件 / 路由**：当前可承载于 `settingsPage`；建议后续新增 `src/pages/attentionItemsPage.js`，语义路由 `#/attention-items`。
- **入口（从哪来）**：首页场景卡片；报告页“调整我的关注项”；设置页。
- **核心组件**：关注项多选、忌口成分列表、自定义忌口输入、本机保存 / 清空。
- **主要操作**：选择关注目标；添加 / 删除忌口项；保存本地设置。
- **页面状态**：
  - loading：读取本机偏好。
  - empty：未设置关注项 → 推荐选择控糖 / 低钠 / 少添加等。
  - error：保存失败 → 重试。
- **移动端注意事项**：多选标签可换行；点击区域 ≥44px；软键盘不遮挡输入框。
- **数据可信展示规则**：关注项是用户偏好，不是医疗诊断。
- **验收标准**：
  - [ ] 不登录也能本地保存。
  - [ ] 报告页按关注项排序。
  - [ ] 可清空本地关注项。

### 1.9 成分详情页

- **页面目标**：展示单条成分 / 添加剂的详情，包括来源、可信状态与相关说明。
- **对应文件 / 路由**：`src/pages/detailPage.js`；`#/ingredient/:id`（带类别如 `#/food/ingredient/:id`，见 `resolveRoute` view `detail`）。
- **入口（从哪来）**：analyzePage / 报告中单条配料；搜索结果；对比页。
- **核心组件**：成分基本信息、可信徽标与来源、相关法规 / 评价说明、收藏入口。
- **主要操作**：查看详情；收藏；返回来源页。
- **页面状态**：
  - loading：详情异步加载（`renderDetailPage` 接收 `asyncState`）。
  - empty：成分未收录 → 以 `unknown_from_ocr` / 「暂未收录」措辞展示。
  - error：加载失败 → 重试。
- **移动端注意事项**：信息分区纵向排版；不横向滚动；收藏等按钮 ≥44px。
- **数据可信展示规则**：以 `dataStatus` 标明该成分状态；`verified_jecfa` 注明非中国法规范围；未收录项不得编造结论。
- **验收标准**：
  - [ ] 详情含来源与可信状态。
  - [ ] 未收录成分明确标注「暂未收录」。
  - [ ] 无文案红线词。

### 1.10 历史页

- **页面目标**：展示用户历次分析 / 报告记录，支持筛选与检索，便于回看与续操作。
- **对应文件 / 路由**：`src/pages/historyPage.js`；`#/history`（可带 `?q=` 与 `?filter=`，过滤值经 `normalizeHistoryFilter`，见 `resolveRoute` view `history`）。
- **入口（从哪来）**：底部导航「历史」；首页快捷区；报告保存后。
- **核心组件**：历史列表、筛选 / 搜索、单条进入报告 / 档案。
- **主要操作**：筛选 / 搜索；打开历史项；删除（待确认）。
- **页面状态**：
  - loading：列表加载占位。
  - empty：无历史 → 引导首拍。
  - error：读取失败 → 重试。
- **移动端注意事项**：列表纵向滚动；筛选控件 ≥44px；不横向滚动。
- **数据可信展示规则**：历史卡片若展示可信徽标，须用 `dataStatus` 枚举，保持与报告一致。
- **验收标准**：
  - [ ] 支持按 `filter` 与 `q` 检索。
  - [ ] 无历史显示引导态。
  - [ ] 徽标来自 `dataStatus` 枚举。

### 1.11 我的页（设置）

- **页面目标**：个人成分档案与设置入口（账号、隐私偏好、个人成分关注等）。标题为「个人成分档案」。
- **对应文件 / 路由**：`src/pages/settingsPage.js`；`#/settings`（见 `resolveRoute` view `settings`）。
- **入口（从哪来）**：底部导航「设置」；各处「我的 / 设置」入口。`auth` / `legal` / `onboarding` / `support` 在导航上归属 settings 分组。
- **核心组件**：账号区、个人成分偏好、隐私 / 条款入口、支持 / 反馈入口、会员入口。
- **主要操作**：编辑偏好；进入隐私条款 / 支持 / 会员 / 登录。
- **页面状态**：
  - loading：偏好加载占位。
  - empty：未登录 / 无偏好 → 引导设置或登录。
  - error：保存失败 → 重试。
- **移动端注意事项**：分组列表项 ≥44px；不横向滚动；尊重安全区。
- **数据可信展示规则**：本页不展示成分结论，无需可信徽标；如有数据说明入口，引导至数据说明页。
- **验收标准**：
  - [ ] 可进入隐私条款 / 支持 / 会员入口。
  - [ ] 偏好可保存。
  - [ ] 未登录态有合理引导。

### 1.12 数据说明页

- **页面目标**：向用户解释数据来源、可信等级体系与人工校验机制（数据治理 / 人工校验队列）。
- **对应文件 / 路由**：`src/pages/dataPage.js`；`#/data`（可带 `?source` `?confidenceLevel` `?dataStatus` `?gbTable` `?gbQuery` `?gbPage` 等筛选，见 `resolveRoute` view `data`）。配套文档：[`DATA_SOURCES.md`](../../DATA_SOURCES.md) / [`DATA_TRUST_SPEC.md`](./DATA_TRUST_SPEC.md)。
- **入口（从哪来）**：设置页「数据说明」；报告 / 详情页可信徽标的「了解可信等级」链接（待确认）；侧 / 全屏导航「数据来源」。
- **核心组件**：可信等级说明表、来源列表、GB 2760 表查询区、按 `dataStatus` 筛选。
- **主要操作**：浏览可信等级定义；按来源 / 状态筛选；查 GB 表。
- **页面状态**：
  - loading：来源 / 表数据加载占位。
  - empty：筛选无结果 → 给清除筛选。
  - error：查询失败 → 重试。
- **移动端注意事项**：表格区可纵向滚动，避免整页横向滚动（必要时表格内局部横滑并加视觉提示）；筛选控件 ≥44px。
- **数据可信展示规则**：本页是可信体系的**权威说明页**，须完整、准确呈现 §0.2 的七个枚举定义；说明 `pending_review` 等为待复核、非结论。
- **验收标准**：
  - [ ] 完整列出七个 `dataStatus` 枚举及含义。
  - [ ] 筛选无结果有空态。
  - [ ] GB 表查询可用。

### 1.13 隐私说明页

- **页面目标**：呈现隐私政策与用户条款等法律文本。
- **对应文件 / 路由**：`src/pages/legalPage.js`；`#/legal` 与 `#/legal/:documentId`（文档以 `getLegalDocument` 校验，见 `resolveRoute` view `legal`）。
- **入口（从哪来）**：设置页；onboarding；注册 / 登录页的条款链接。
- **核心组件**：文档目录、正文渲染、文档切换。
- **主要操作**：阅读条款；在不同法律文档间切换。
- **页面状态**：
  - loading：文档加载占位。
  - empty：无 documentId → 文档目录 / 默认文档。
  - error：未知 documentId → 走 not-found（`getLegalDocument` 校验失败时）。
- **移动端注意事项**：长文纵向滚动；不横向滚动；正文字号可读。
- **数据可信展示规则**：不涉及成分可信展示。
- **验收标准**：
  - [ ] 隐私与条款文档均可打开。
  - [ ] 未知文档优雅降级。
  - [ ] 文案符合合规要求。

### 1.14 产品对比页（后续）

- **页面目标**：支持两款食品按糖、钠、脂肪、蛋白质、添加剂数量和用户关注项命中进行对比。
- **对应文件 / 路由**：已有 `src/pages/comparePage.js` 可作为基础；目标路由 `#/compare`。
- **入口（从哪来）**：首页场景卡片“对比两款食品”；报告页“加入对比”；历史页选择两个报告。
- **核心组件**：A/B 产品卡、标签图来源、配料数量对比、添加剂数量对比、营养字段对比、关注项命中对比。
- **主要操作**：选择 A/B 报告；拍 A/B 产品标签；查看差异；保存对比报告。
- **页面状态**：
  - loading：读取 A/B 报告。
  - empty：未选择两个产品 → 引导选择或拍照。
  - error：任一产品读取失败 → 重试 / 替换。
- **移动端注意事项**：A/B 对比在小屏用纵向堆叠，不强制横向表格；关键差异用标签展示。
- **数据可信展示规则**：只输出“A 的钠更低”“B 的食品添加剂数量更少”“A 更符合你当前低钠关注项”等相对标签信息；禁止“更健康 / 不健康”。
- **验收标准**：
  - [ ] 不足两个产品时有引导。
  - [ ] 对比字段来源清楚。
  - [ ] 无健康判断文案。

### 1.15 包装卖点核对页（后续）

- **页面目标**：识别包装正面卖点，并结合配料表和营养成分表做核对提醒。
- **对应文件 / 路由**：计划新增；建议 `src/pages/frontClaimsPage.js`，语义路由 `#/front-claims`。
- **入口（从哪来）**：多图上传 / 补拍页；报告页“包装卖点核对”区块。
- **核心组件**：卖点列表、配料/营养对应依据、提示卡。
- **主要操作**：查看 0 蔗糖、0 糖、低脂、高蛋白、无添加、儿童、粗粮、代餐、低卡、非油炸等卖点核对提醒。
- **页面状态**：
  - loading：卖点解析中。
  - empty：未拍包装正面或未识别到卖点 → 提示可补拍。
  - error：解析失败 → 重试 / 手动输入文案。
- **移动端注意事项**：卖点卡片短句优先，依据可折叠。
- **数据可信展示规则**：只做“核对提醒”，不做打假结论。
- **验收标准**：
  - [ ] 标注 0 蔗糖时提示继续查看其他糖类或甜味剂。
  - [ ] 标注高蛋白 / 低脂时提示结合营养成分表查看。
  - [ ] 标注无添加时提示结合配料表中的食品添加剂查看。

---

## 1A. 已有但主路径清单未点名页面（补登记）

> 以下页面均已存在于 `src/pages/`，在此登记目标 / 文件 / 路由 / 状态。详细模板可后续按需补全。

### 1A.1 报告列表页 reportsPage
- 目标：分析报告的列表与检索入口。
- 文件 / 路由：`src/pages/reportsPage.js`；`#/reports`（可带 `?q=`）。
- 状态：已落地。三态需与 8-C 一致。

### 1A.2 产品档案页 productArchivePage
- 目标：把分析过的产品沉淀为可回看的产品档案（列表 + 详情）。
- 文件 / 路由：`src/pages/productArchivePage.js`；列表 `#/products`（可带 `?q=` `?page=`），详情 `#/product/:id`。
- 状态：已落地。

### 1A.3 成分对比页 comparePage
- 目标：多条成分横向对比（辅助功能）。
- 文件 / 路由：`src/pages/comparePage.js`；`#/compare`。
- 状态：已落地。可信徽标须用 `dataStatus` 枚举。

### 1A.4 收藏夹页 favoritesPage
- 目标：收藏的成分 / 产品集中管理。
- 文件 / 路由：`src/pages/favoritesPage.js`；`#/favorites`（`?tab=ingredients|products`）。
- 状态：已落地。

### 1A.5 搜索页 searchPage
- 目标：成分检索（辅助功能，非主路径）。
- 文件 / 路由：`src/pages/searchPage.js`；`#/search`（`?q` `?page` `?risk` `?ingredientCategory` `?sort`）。
- 状态：已落地。结果可信展示须用 `dataStatus`。

### 1A.6 首次引导页 onboardingPage
- 目标：首次使用引导（权限 / 主路径介绍 / 偏好）。
- 文件 / 路由：`src/pages/onboardingPage.js`；`#/onboarding`。
- 状态：已落地。

### 1A.7 会员页 membershipPage
- 目标：会员权益介绍与升级入口。
- 文件 / 路由：`src/pages/membershipPage.js`；`#/membership`。
- 状态：已落地，**未接入支付**。

### 1A.8 支持 / 反馈页 supportPage
- 目标：用户反馈与支持，支持参数预填（`buildSupportPrefillFromParams`）。
- 文件 / 路由：`src/pages/supportPage.js`；`#/support`。
- 状态：已落地。

### 1A.9 登录 / 注册页 authPage
- 目标：账号登录与注册，支持 `mode` 与 `redirect`。
- 文件 / 路由：`src/pages/authPage.js`；`#/login`（`?mode` `?redirect`，经 `normalizeAuthMode` / `buildAuthRedirectTarget`）。
- 状态：已落地。

### 1A.10 GB2760 复核工作台 gb2760ReviewPage（内部）
- 目标：**内部用**的 GB 2760 数据复核工作台，处理 `pending_review` 等 staging 数据，非普通用户页。
- 文件 / 路由：`src/pages/gb2760ReviewPage.js`；`#/gb2760-review`（`?status` 默认 `pending_review`、`?q` `?ready` `?page` `?limit`）。
- 状态：部分落地（对应后台 Batch 1-F，`blocked_by_user` 暂缓）。详见 [`ADMIN_CONSOLE_SPEC.md`](./ADMIN_CONSOLE_SPEC.md)。

### 1A.11 404 页 notFoundPage
- 目标：未匹配路由的兜底页。
- 文件 / 路由：`src/pages/notFoundPage.js`；`resolveRoute` 兜底返回 view `not-found`。
- 状态：已落地。

---

## 二、用户端主流程

主路径（不可偏离），每步标注承载页面与可信约束：

```
首页 (`user-uniapp/src/pages/index/index.vue` / `/pages/index/index`；历史 `homePage` / `#/`)
  │  起点是手里那包食品，主 CTA 去拍照
  ▼
拍照 / 上传食品标签 (`user-uniapp/src/pages/capture/index.vue` / `/pages/capture/index`；历史 `scanPage` / `#/scan`)
  │  采集图片
  ▼
标签类型识别 (`user-uniapp/src/pages/label-type/index.vue` / `/pages/label-type/index`)
  │  配料表 / 营养成分表 / 包装正面 / 未知；低置信必须让用户选择
  ▼
OCR 识别 (`user-uniapp/src/pages/ocr/index.vue` / `/pages/ocr/index`)
  │  ⚠ OCR 输出为原始文本，未验证，禁止当权威结论
  ▼
文本确认 (`user-uniapp/src/pages/confirm-text/index.vue` / `/pages/confirm-text/index`；历史 `ocrConfirmPage` / `#/ocr-confirm`)
  │  ⚠ 仍为用户/OCR 文本，无可信结论；确认后再分析
  ▼
配料拆分 / 营养字段解析 / 包装卖点识别 (`ingredients` / `nutrition` 页面；包装卖点后置)
  │  自动拆分单条配料；结构化营养字段；包装卖点识别先规划后实现
  ▼
匹配确认 (`user-uniapp/src/pages/match/index.vue` / `/pages/match/index`)
  │  匹配食品成分、食品添加剂、营养字段和用户关注项
  │  ⚠ 逐条按 dataStatus 打标；mapped_candidate/pending_review/
  │     unverified/unknown_from_ocr 一律不得呈现为权威结论
  ▼
食品标签解读报告 (`user-uniapp/src/pages/report/index.vue` / `/pages/report/index`；历史 `reportDetailPage` / `#/reports/:id`)
  │  ⚠ 逐项来源 + 可信等级；verified_jecfa 注明非中国法规范围；无红线词
  ▼
保存历史 / 档案 (`user-uniapp/src/pages/history/index.vue` / `/pages/history/index`；历史 `historyPage` / `#/history`、`productArchivePage` / `#/products`)
     沉淀可回看记录
```

辅助路径（非主路径）：搜索（searchPage）、对比（comparePage）、收藏（favoritesPage）、详情（detailPage）。

---

## 三、后台页面（完整规划）

> 详细规格见 [`ADMIN_CONSOLE_SPEC.md`](./ADMIN_CONSOLE_SPEC.md)。后台定位为 **CompLens 产品运营后台 + 数据治理后台 + 系统配置后台**，目标目录为 `admin-web/`，技术栈为 Vue3 + TDesign Web。当前后台**仅有内部 `gb2760ReviewPage` 部分落地**（Batch 1-F，`blocked_by_user` 暂缓），其余均为计划。状态取值：已落地 / 计划 / 待确认。

### 3.0 admin-web 壳与路由分组（STACK-D 规划）

当前 `admin-web/` 尚未创建；以下为创建工程时的目标页面壳，不代表已落地。

| 分组 | 目标路由前缀 | 页面范围 | 阶段 | 当前状态 |
| --- | --- | --- | --- | --- |
| 后台首页 | `/dashboard` | 业务、数据治理、OCR/AI 成本、反馈、系统告警概览 | MVP | 计划 |
| 用户与会员 | `/users`、`/memberships`、`/orders` | 用户、会员、订阅、订单、设备登录 | Beta / 产品化 | 计划 |
| 内容运营 | `/content` | 公告、Banner、首页场景卡片、FAQ、数据说明、协议版本 | Beta / 上架商业化 | 计划 |
| 食品标签业务 | `/label-business` | 扫描记录、OCR 记录、标签解读报告、关注项统计、产品档案、反馈 | MVP / Beta | 计划 |
| 数据治理 | `/data-governance` | 数据源、GB2760 导入、staging 复核、添加剂、分类、规则、词库 | MVP | 计划；staging 复核旧页部分落地 |
| OCR / AI / Provider | `/providers` | OCR/AI provider、失败日志、调用成本、降级策略 | MVP / 产品化 | 计划 |
| 系统配置 | `/system` | 功能开关、平台配置、版本配置、分享、消息、SDK | MVP / 产品化 | 计划 |
| 权限与审计 | `/security` | 管理员、角色权限、操作日志、审计日志 | MVP 预留 / 产品化 | 计划 |

后台壳验收边界：

- 使用 TDesign 工作台形态：侧边导航 + 顶栏 + 面包屑 + 内容区。
- 列表页默认提供 loading / empty / error 三态。
- 写操作默认需要权限和审计；未实现 RBAC 前，高风险写操作不对普通登录用户开放。
- 会员、订阅、支付页可在菜单规划中保留，但真实支付闭环必须标记人工阻塞。

ADMIN-A 导航落地规则：

1. 一级导航顺序固定为：Dashboard → 数据治理 → 食品标签业务 → 用户与会员 → 内容运营 → OCR/AI/Provider → 系统配置 → 权限与审计。
2. MVP 默认展开 Dashboard、数据治理、食品标签业务、系统配置、权限与审计预留；用户与会员、内容运营、成本/RBAC 等模块可显示为计划入口，但不得写成已实现。
3. 会员、订阅、订单、支付、退款、Apple IAP、Google Play Billing、微信支付、国内安卓渠道相关页面统一标记为产品化 / 上架商业化，不进入 MVP 强制验收。
4. 后台页面登记必须保留「页面目标 / 路由或目录 / 阶段 / 当前状态」四项；创建 `admin-web/` 后再把计划状态改为真实文件路径。

### 3.1 后台首页 / Dashboard
- 页面目标：展示核心业务、数据治理、OCR/AI 成本、反馈和系统状态概览。
- 目标路由：`/dashboard`。
- 阶段：MVP。
- 当前状态：计划。

### 3.2 用户与会员
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 用户管理 | 用户列表、筛选、账号状态 | Beta | 计划 |
| 用户详情 | 查看扫描、报告、反馈、设备登录 | Beta | 计划 |
| 会员管理 | 会员等级、状态、权益包 | 产品化 | 计划 |
| 订阅管理 | 订阅计划、状态流转 | 产品化 / 人工+Codex | 计划 |
| 订单/支付记录 | 支付平台订单、退款、取消 | 产品化 / 人工+Codex | 计划 |
| 用户设备与登录记录 | 平台来源、设备和登录安全 | Beta | 计划 |

### 3.3 内容运营
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 公告管理 | 版本更新、维护、隐私更新通知 | Beta | 计划 |
| Banner 管理 | 首页运营位 | Beta | 计划 |
| 首页场景卡片管理 | 控糖/低钠/孩子/忌口等入口配置 | Beta | 计划 |
| FAQ 管理 | 常见问题内容 | Beta | 计划 |
| 数据说明文案管理 | 数据来源、OCR 隐私、标签解读说明 | Beta | 计划 |
| 隐私政策 / 用户协议管理 | 协议版本管理 | 上架商业化 | 计划 |

### 3.4 食品标签业务
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 扫描记录 | 查看扫描会话 | Beta | 计划 |
| OCR 记录 | OCR 原文、provider、耗时、失败原因 | MVP | 计划 |
| 标签解读报告 | 查看报告记录和问题回溯 | Beta | 计划 |
| 用户关注项统计 | 统计关注项使用情况 | Beta | 计划 |
| 产品档案管理 | 查看用户产品档案 | Beta | 计划 |
| 用户反馈管理 | 查看和处理反馈 | MVP | 计划 |

### 3.5 数据治理
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 数据源管理 | 维护数据来源清单与元信息 | MVP | 计划 |
| GB2760 导入任务 | 管理 GB 2760 数据导入任务 | MVP | 计划 |
| staging 数据复核 | 复核 staging / 待定数据 | MVP | 部分落地（Batch 1-F，blocked_by_user 暂缓） |
| 食品添加剂管理 | 维护食品添加剂主数据 | MVP | 计划 |
| 食品分类管理 | 维护食品分类体系 | MVP | 计划 |
| 使用规则管理 | 维护添加剂使用范围 / 限量规则 | MVP | 计划 |
| 普通配料词库 | 管理常见食品配料 | Beta | 计划 |
| 营养成分字段规则 | 能量、蛋白质、脂肪、糖、钠等解析规则 | Beta | 计划 |
| 包装卖点词库 | 0 糖、低脂、高蛋白、无添加等词库 | Beta | 计划 |

### 3.6 OCR / AI / Provider
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| OCR Provider 配置 | provider、降级策略、服务地址 | 产品化 | 计划 |
| OCR 失败日志 | 失败原因、耗时、平台来源 | MVP / Beta | 计划 |
| AI Provider 配置 | 模型、开关、密钥引用 | 产品化 | 计划 |
| AI 调用日志 | tokens、成本、失败原因 | 产品化 | 计划 |
| 调用成本统计 | OCR/AI 成本估算 | 产品化 | 计划 |
| 降级策略配置 | OCR/AI 不可用时的降级 | 产品化 | 计划 |

### 3.7 系统配置
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 功能开关 | OCR、AI、对比、卖点核对、订阅入口 | MVP / 产品化 | 计划 |
| 平台配置 | web / wechat_mp / ios / android / all | 产品化 | 计划 |
| App / 小程序版本配置 | 最低版本、升级提示 | 产品化 | 计划 |
| 分享配置 | 分享文案和链接 | Beta | 计划 |
| 消息通知配置 | 推送和订阅消息 | 产品化 | 计划 |
| 第三方 SDK 配置 | SDK 清单与启停 | 上架商业化 | 计划 |

### 3.8 权限与审计
| 页面 | 页面目标 | 阶段 | 当前状态 |
| --- | --- | --- | --- |
| 管理员管理 | 后台账号 | MVP 预留 / 产品化 | 计划 |
| 角色权限 | super_admin / data_admin / operation_admin / support_admin / viewer | 产品化 | 计划 |
| 操作日志 | 操作前后差异 | 产品化 | 计划 |
| 审计日志 | 关键合规操作审计 | 产品化 | 计划 |

> 后台可信约束：复核工作台须明确区分 `verified_regulation` / `verified_jecfa` 与待定状态（`pending_review` / `mapped_candidate` / `unverified`），仅在复核确认后方可升级状态；任何未确认数据不得在用户端呈现为权威结论。

---

## 附：待确认事项

- 各页带类别前缀的完整 hash 串，以 `src/router/router.js` 为准。
- DATA_SOURCES 文档是否已物理落地（PRODUCT_SPEC 以蓝图集相对链接引用，部分文档可能尚未落地）。
- 历史 / 报告等页内具体删除、分享等交互细节，以实现为准。
- 共享组件统一抽取（Batch UX-D）完成后，本文「核心组件」可据实更新。
