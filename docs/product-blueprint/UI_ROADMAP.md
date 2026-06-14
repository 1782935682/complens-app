# UI 开发路线（UI_ROADMAP）

> 本文件属于 `docs/product-blueprint/` 蓝图集，与该目录其余文档配套阅读。
> 关联引用：
> - `docs/product-blueprint/DESIGN_SYSTEM.md`（已存在，设计系统规范）
> - `docs/product-blueprint/PRODUCT_SPEC.md`（已存在，产品规格）
> - [`CONSUMER_DECISION_SPEC.md`](./CONSUMER_DECISION_SPEC.md)：消费者食品标签解读与消费决策规范
> - [`CONSUMER_UX_SPEC.md`](./CONSUMER_UX_SPEC.md)：消费者体验规范
> - `docs/README.md`（文档总览）
> - 根目录 `CODEX_TASKS.md`（UX 阶段批次的权威进度来源）
> - [`PAGE_STRUCTURE.md`](./PAGE_STRUCTURE.md)：页面结构与验收口径
> - [`FRONTEND_SPEC.md`](./FRONTEND_SPEC.md)：前端工程规范

本路线与 `CODEX_TASKS.md` 中的 UX 阶段（UX-A..E、Batch 1-E、1-F、Batch 8-A..C）保持一致，进度状态以 `CODEX_TASKS.md` 为准，本文档不重复定义批次状态，仅做对齐与排序。

---

## 当前现状与排序原则

- **整体进度约 67%**：所有核心页面文件均已落地于 `src/pages/`（见各步骤的"涉及页面"），属于"页面已存在、需按产品化标准统一打磨"的阶段，而非从零搭建。
- **可信表达映射层（UX-C）已先完成**（✅ 2026-06-14，`src/utils/dataStatus.js`）：成分/数据的可信度与状态标签已有统一映射来源，后续各页面的状态展示应统一消费此层，不得各自硬编码文案。
- **共享组件抽取（UX-D）是统一前置**：当前 Button / Card / Badge / Toast / EmptyState / ErrorState / LoadingState / BottomNav 多为各页内联实现。在产品页面整体统一推进前，必须先完成 UX-D 抽取，否则各页面会重复造轮子、风格漂移。**UX-D 阻塞 UX-A / UX-B / UX-E / 1-E 的产品化收口。**
- **产品页面整体设计统一推进**：按用户要求，UX-A（首页主路径）、UX-B（OCR 状态机）、UX-D（共享组件）、UX-E（报告页产品化）、Batch 1-E（成分详情 GB2760 证据）、Batch 1-F（内部复核工作台后续 UI）放在一起统一做，不再零散改单页。
- **Batch 1-F 当前 blocked_by_user**：用户要求暂缓到产品页面设计统一推进时一起做；后端能力（复核入口/分页/签核/映射/审计）已落地，剩余手动映射 UI、后台工作台视觉待统一阶段补。
- **排序总原则**：先打通消费者主路径（首页 → 拍食品标签 → 标签类型识别 → OCR 确认 → 配料/营养解析 → 我的关注项 → 食品标签解读报告），再做围绕主路径的辅助页（历史、成分详情、关注、数据说明），最后做后台与多端适配。共享组件抽取（UX-D）虽在列表第 1-6 步中被反复引用，应在主路径产品化动工前作为零步先行落地。

**建议顺序**：1.移动端首页 → 2.拍照/上传页 → 3.标签类型识别 → 4.OCR 文本确认页 → 5.配料拆分页 → 6.营养成分表解析 → 7.我的关注项 → 8.食品标签解读报告页 → 9.历史记录页 → 10.成分详情页 → 11.数据说明页 → 12.包装卖点核对（后续） → 13.两款商品对比（后续） → 14.后台管理端 → 15.微信小程序适配 → 16.Android/iOS App 适配。

---

## 消费者食品标签解读新增步骤

### C1：标签类型识别

- **目标**：识别用户拍的是配料表、营养成分表、包装正面还是未知标签。
- **涉及页面**：`scanPage`、计划 `labelTypeSelectPage`。
- **涉及组件**：ImageUploader、StepIndicator、LabelTypeSelector、Toast、ErrorState。
- **验收标准**：低置信或 unknown 时允许用户选择；可重新拍；不跳过文本确认。
- **是否需要人工**：否。
- **是否阻塞后续**：是，阻塞营养解析和多图合并。
- **Codex 可执行任务**：新增标签类型枚举和前端选择 UI；API 先按计划文档标注，不伪装已实现。

### C2：营养成分表 OCR 与结构化

- **目标**：解析能量、蛋白质、脂肪、碳水、糖、钠等营养字段。
- **涉及页面**：`ocrConfirmPage`、`analyzePage`、报告页。
- **涉及组件**：NutritionFieldList、EditableField、ConfidenceBadge。
- **验收标准**：字段可编辑；解析失败可手动修正；信息不足时提示结合包装原文确认。
- **是否需要人工**：否。
- **是否阻塞后续**：是，阻塞控糖/低钠等关注项报告完整度。
- **Codex 可执行任务**：先实现本地解析和确认 UI，再规划后端 `/api/nutrition/parse`。

### C3：我的关注项本地设置

- **目标**：支持控糖、低钠、少添加、过敏/忌口、给孩子看等关注项。
- **涉及页面**：计划 `attentionItemsPage`、设置页、报告页。
- **涉及组件**：AttentionItemToggle、IngredientChip、Modal、Toast。
- **验收标准**：不登录可本地保存；报告按关注项排序；可清空。
- **是否需要人工**：否。
- **是否阻塞后续**：是，阻塞消费者报告排序。
- **Codex 可执行任务**：基于现有偏好/过敏原能力抽象本地关注项 service。

### C4：食品标签解读报告

- **目标**：把配料表、营养成分表、用户关注项合并成普通人能看懂的报告。
- **涉及页面**：`reportDetailPage`、`reportsPage`、`historyPage`。
- **涉及组件**：ReportSummaryCard、AttentionSummary、NutritionSummary、SourceBadge。
- **验收标准**：报告名为“食品标签解读”；第一屏展示一句话结论和购买前建议关注；专业依据默认折叠。
- **是否需要人工**：需要一次产品文案确认。
- **是否阻塞后续**：是，消费者主路径核心。
- **Codex 可执行任务**：调整报告结构，不改数据可信底层。

### C5：包装卖点核对（后续）

- **目标**：识别 0 糖、低脂、高蛋白、无添加等卖点，并结合配料/营养表提示。
- **涉及页面**：计划 `frontClaimsPage`、报告页。
- **验收标准**：只做核对提醒，不做打假结论。
- **是否需要人工**：可选。
- **是否阻塞后续**：否，MVP 后置。
- **Codex 可执行任务**：规划 `front_claims` 解析和报告折叠区。

### C6：两款商品对比（后续）

- **目标**：支持两款食品按糖、钠、脂肪、添加剂、用户关注项进行对比。
- **涉及页面**：`comparePage`。
- **验收标准**：输出相对标签信息，不输出“更健康 / 不健康”。
- **是否需要人工**：可选。
- **是否阻塞后续**：否，MVP 后置。
- **Codex 可执行任务**：基于历史报告选择 A/B 产品，先做本地对比。

---

## 第 0 步（前置）：共享组件抽取 UX-D

- **目标**：将 Button / Card / Badge / Toast / EmptyState / ErrorState / LoadingState / BottomNav 从各页内联实现抽取为统一移动端共享组件，作为后续所有页面产品化的基础设施。
- **涉及页面**：跨全部页面（被各页消费）。
- **涉及组件**：本步即"做组件"本身。BottomNav 对应 Batch 8-A（✅ 已完成），三态（loading/empty/error）逻辑对应 Batch 8-C（✅ 已完成）——但**组件抽取动作 UX-D 本身待办**，已完成的是其能力/行为，统一组件化封装尚未做。
- **当前状态**：⏸ 待办（UX-D，当前组件多内联）。
- **对应 Batch**：UX-D（核心）；关联 8-A（✅）、8-C（✅）。
- **验收标准**：
  1. 共享组件目录建立，上述 8 类组件各有单一实现来源；
  2. 至少首页与报告页改为消费共享组件、删除对应内联实现；
  3. EmptyState/ErrorState/LoadingState 三态消费 `src/utils/dataStatus.js` 的可信表达；
  4. 组件具备移动端基线样式，符合 `DESIGN_SYSTEM.md`。
- **是否需要人工**：组件 API 与视觉需 1 次人工评审定稿。
- **是否阻塞后续**：**是**——阻塞第 1/2/3/6/8 步的产品化收口。
- **Codex 可执行任务**：
  - 新建共享组件目录（如 `src/components/ui/`），实现 `Button`、`Card`、`Badge`、`Toast`、`EmptyState`、`ErrorState`、`LoadingState`，并复用已完成的 `BottomNav`；
  - EmptyState/ErrorState/LoadingState 内部引用 `src/utils/dataStatus.js`；
  - 先在 `src/pages/homePage.js`、`src/pages/reportDetailPage.js` 替换内联实现做样板。

---

## 第 1 步：移动端首页

- **目标**：重构首页主路径，让"拍照识别成分"成为最显眼的主行动，引导用户进入扫描流程。
- **涉及页面**：`src/pages/homePage.js`。
- **涉及组件**：Button、Card、BottomNav、EmptyState/LoadingState——**需先完成 UX-D 抽取**后消费共享组件。
- **当前状态**：🔁 待重构（UX-A，部分由旧 M-A 完成）。
- **对应 Batch**：UX-A；BottomNav 关联 8-A（✅）。
- **验收标准**：
  1. 首屏主 CTA 直达拍照/上传页（第 2 步）；
  2. 首页消费共享 Button/Card/BottomNav；
  3. 空/加载状态走 `dataStatus.js` 统一表达；
  4. 符合 `DESIGN_SYSTEM.md` 间距与层级。
- **是否需要人工**：主路径布局需 1 次人工确认。
- **是否阻塞后续**：弱阻塞——是用户进入第 2 步的入口，建议优先。
- **Codex 可执行任务**：在 `src/pages/homePage.js` 重排首屏，主 CTA 路由到 `scanPage`，替换内联组件为 UX-D 共享组件。

---

## 第 2 步：拍照 / 上传页

- **目标**：提供清晰的拍照与本地上传双入口，含拍摄引导与图片预处理反馈，衔接 OCR 流程。
- **涉及页面**：`src/pages/scanPage.js`。
- **涉及组件**：Button、LoadingState、Toast、ErrorState——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 待开始（属 OCR 流程状态机起点，UX-B）。
- **对应 Batch**：UX-B（起点）。
- **验收标准**：
  1. 拍照与上传两条入口可用且状态可区分；
  2. 上传/识别中走统一 LoadingState；
  3. 失败走统一 ErrorState + 重试；
  4. 成功后进入第 3 步 OCR 确认。
- **是否需要人工**：真机拍照体验需人工验收（关联 8-B 🔄 真机待验）。
- **是否阻塞后续**：**是**——是 OCR 状态机的输入端，阻塞第 3-6 步主路径。
- **Codex 可执行任务**：在 `src/pages/scanPage.js` 接入 UX-B 状态机的初始态，统一 loading/error 三态，成功跳转 `ocrConfirmPage`。

---

## 第 3 步：OCR 文本确认页

- **目标**：让用户校对/编辑 OCR 识别出的配料表文本，作为后续拆分与分析的可信输入。
- **涉及页面**：`src/pages/ocrConfirmPage.js`。
- **涉及组件**：Button、Card、Toast、ErrorState/LoadingState——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 待开始（UX-B 核心环节）。
- **对应 Batch**：UX-B。
- **验收标准**：
  1. 识别文本可编辑并可保存为下一步输入；
  2. 状态机覆盖识别中/成功/失败/为空四态；
  3. 三态消费 `dataStatus.js`；
  4. 确认后进入第 4 步拆分。
- **是否需要人工**：状态机流转需 1 次人工走查。
- **是否阻塞后续**：**是**——阻塞第 4-6 步。
- **Codex 可执行任务**：在 `src/pages/ocrConfirmPage.js` 落地 UX-B 状态机的"确认/编辑"态，连接拆分逻辑。

---

## 第 4 步：配料拆分页

- **目标**：将确认后的配料表文本拆分为结构化成分条目，供逐项匹配。
- **涉及页面**：**待确认**——`src/pages/` 中无独立 `splitPage`；拆分能力可能内嵌于 `ocrConfirmPage.js` 或 `analyzePage.js`，具体承载页面待确认后回填。
- **涉及组件**：Card、Badge、Button——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 待开始（归属 UX-B 流程后段）。
- **对应 Batch**：UX-B。
- **验收标准**：
  1. 文本可拆为可编辑成分列表；
  2. 拆分结果可增删改；
  3. 状态走统一三态；
  4. 进入第 5 步匹配。
- **是否需要人工**：拆分规则边界需人工确认。
- **是否阻塞后续**：**是**——阻塞第 5-6 步。
- **Codex 可执行任务**：先确认拆分逻辑承载页面（`ocrConfirmPage.js` 或 `analyzePage.js`），再在该文件实现结构化拆分 UI。

---

## 第 5 步：匹配确认页

- **目标**：将拆分出的成分与成分库进行匹配，让用户确认匹配结果（含未命中项处理）。
- **涉及页面**：`src/pages/analyzePage.js`（匹配/分析阶段；如有独立匹配页**待确认**）。
- **涉及组件**：Card、Badge、Button、EmptyState（未命中）——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 待开始（UX-B 末段，衔接报告）。
- **对应 Batch**：UX-B。
- **验收标准**：
  1. 每条成分显示匹配状态（命中/疑似/未命中），状态来自 `dataStatus.js`；
  2. 未命中可手动指认或跳过；
  3. 确认后生成分析报告（第 6 步）；
  4. 空结果走 EmptyState。
- **是否需要人工**：匹配置信度阈值与未命中交互需人工确认。
- **是否阻塞后续**：**是**——阻塞第 6 步报告。
- **Codex 可执行任务**：在 `src/pages/analyzePage.js` 实现成分匹配确认列表，状态标签统一消费 `dataStatus.js`。

---

## 第 6 步：食品标签解读报告页

- **目标**：按产品化标准呈现食品标签解读报告，优先回答普通消费者的关注项，再折叠展示专业依据。
- **涉及页面**：`src/pages/reportDetailPage.js`、`src/pages/reportsPage.js`、`src/pages/productArchivePage.js`。
- **涉及组件**：Card、Badge、Button、EmptyState/ErrorState/LoadingState——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 待开始（UX-E，大部分由旧 R-A 完成，待按产品化复核）。
- **对应 Batch**：UX-E；三态关联 8-C（✅）。
- **验收标准**：
  1. 报告按“一句话结论 / 我的关注项 / 购买前建议关注 / 配料表解读 / 营养成分解读 / 数据来源”组织；
  2. 报告页消费共享 Card/Badge；
  3. 三态统一；
  4. 报告可进入第 8 步成分详情。
- **是否需要人工**：报告信息架构需 1 次产品化评审。
- **是否阻塞后续**：弱阻塞——是第 8 步成分详情的入口。
- **Codex 可执行任务**：以产品化标准复核 `reportDetailPage.js`/`reportsPage.js`，替换内联组件，对齐可信表达层。

---

## 第 7 步：历史记录页

- **目标**：让用户回看历史识别/报告记录，支持检索与再次查看。
- **涉及页面**：`src/pages/historyPage.js`、`src/pages/reportsPage.js`、`src/pages/searchPage.js`。
- **涉及组件**：Card、EmptyState（无记录）、LoadingState、Button——建议消费 UX-D 共享组件。
- **当前状态**：⏸ 待开始（未单列 UX 批次，归入产品页面统一推进）。
- **对应 Batch**：随 UX-E/统一阶段推进；三态关联 8-C（✅）。
- **验收标准**：
  1. 历史列表可加载并进入对应报告；
  2. 无记录走统一 EmptyState；
  3. 检索可用（如复用 `searchPage`）；
  4. 状态统一。
- **是否需要人工**：否（除非信息架构调整）。
- **是否阻塞后续**：否。
- **Codex 可执行任务**：在 `src/pages/historyPage.js` 统一列表与空态，点击项路由到 `reportDetailPage`。

---

## 第 8 步：成分详情页（GB2760 官方证据展示）

- **目标**：单一成分详情页展示 GB2760 官方证据，强化可信度。
- **涉及页面**：`src/pages/detailPage.js`。
- **涉及组件**：Card、Badge、ErrorState/LoadingState——**需先完成 UX-D 抽取**。
- **当前状态**：⏸ 计划（Batch 1-E）。
- **对应 Batch**：Batch 1-E；可信表达关联 UX-C（✅）。
- **验收标准**：
  1. 展示该成分的 GB2760 官方证据（来源/限量等）；
  2. 可信度标签消费 `dataStatus.js`；
  3. 无数据走 EmptyState、错误走 ErrorState；
  4. 从报告页（第 6 步）可进入。
- **是否需要人工**：GB2760 证据字段映射需人工核对一次。
- **是否阻塞后续**：否（但与第 11 步后台复核数据来源相关）。
- **Codex 可执行任务**：在 `src/pages/detailPage.js` 接入 GB2760 证据展示区块，复用可信表达层。

---

## 第 9 步：我的关注项

- **目标**：让用户管理收藏/关注的成分或产品。
- **涉及页面**：`src/pages/favoritesPage.js`。
- **涉及组件**：Card、Button、EmptyState（无关注）——建议消费 UX-D 共享组件。
- **当前状态**：⏸ 待开始（归入产品页面统一推进）。
- **对应 Batch**：随统一阶段；三态关联 8-C（✅）。
- **验收标准**：
  1. 可查看/取消关注；
  2. 无关注走统一 EmptyState；
  3. 点击进入对应详情/报告；
  4. 状态统一。
- **是否需要人工**：否。
- **是否阻塞后续**：否。
- **Codex 可执行任务**：在 `src/pages/favoritesPage.js` 统一列表与空态，对齐共享组件。

---

## 第 10 步：数据说明页

- **目标**：向用户解释数据来源、可信度等级与免责说明，承接可信表达层语义。
- **涉及页面**：`src/pages/dataPage.js`；关联 `src/pages/legalPage.js`。
- **涉及组件**：Card、Badge——建议消费 UX-D 共享组件。
- **当前状态**：⏸ 待开始（与 UX-C 可信表达语义对齐，UX-C ✅ 已完成）。
- **对应 Batch**：关联 UX-C（✅）。
- **验收标准**：
  1. 数据来源与可信度分级说明与 `dataStatus.js` 语义一致；
  2. 文案与各页 Badge 含义统一；
  3. 含必要免责声明；
  4. 符合 `DESIGN_SYSTEM.md`。
- **是否需要人工**：文案需 1 次人工/合规确认。
- **是否阻塞后续**：否（但应在用户大量看到可信标签前定稿）。
- **Codex 可执行任务**：在 `src/pages/dataPage.js` 编排数据说明，引用 `dataStatus.js` 的等级定义保持一致。

---

## 第 11 步：后台管理端（GB2760 内部复核工作台）

- **目标**：内部人员的 GB2760 复核工作台，补齐手动映射 UI 与后台工作台视觉。
- **涉及页面**：`src/pages/gb2760ReviewPage.js`。
- **涉及组件**：Card、Badge、Button、Toast、表格类组件——后台可独立于移动端共享组件，但建议复用 UX-D 基础元件。
- **当前状态**：⛔ blocked_by_user（Batch 1-F）。已落地复核入口/分页/签核/映射/审计；**待补**手动映射 UI、后台工作台视觉。用户要求暂缓到产品页面设计统一推进时一起做。
- **对应 Batch**：Batch 1-F。
- **验收标准**：
  1. 手动映射 UI 可创建/编辑成分↔GB2760 映射；
  2. 工作台视觉对齐设计系统；
  3. 复用已落地的分页/签核/审计能力；
  4. 操作有审计留痕。
- **是否需要人工**：**是**——需用户解除 block 并确认工作台设计。
- **是否阻塞后续**：影响第 8 步成分详情的证据数据质量（数据侧），但不阻塞其它页面 UI 开发。
- **Codex 可执行任务**：解除 block 后，在 `src/pages/gb2760ReviewPage.js` 补手动映射表单 UI 与工作台布局；当前阶段**不动**（blocked_by_user）。

---

## 第 12 步：微信小程序适配

- **目标**：将核心主路径适配为微信小程序形态。
- **涉及页面**：以主路径页面为先（`homePage`、`scanPage`、`ocrConfirmPage`、`analyzePage`、`reportDetailPage`），其余页面随后。
- **涉及组件**：依赖 UX-D 共享组件的可移植性——**需先完成 UX-D**，否则适配成本翻倍。
- **当前状态**：⏸ 待开始（**待确认**：当前仓库技术栈是否已具备小程序构建/转译能力，需确认后再定方案）。
- **对应 Batch**：暂无对应 UX 批次（**待确认**是否在 `CODEX_TASKS.md` 新增条目）。
- **验收标准**：
  1. 主路径在小程序端可走通；
  2. 共享组件在小程序端有等价实现；
  3. 拍照/上传能力适配小程序 API；
  4. 关键页面通过小程序审核基线。
- **是否需要人工**：**是**——平台账号、审核、API 权限均需人工。
- **是否阻塞后续**：否（与第 13 步并列的多端工作）。
- **Codex 可执行任务**：先输出技术栈适配可行性调研（**待确认**后），不在主路径产品化未收口前动工。

---

## 第 13 步：Android / iOS App 适配

- **目标**：将 Web 形态适配/封装为 Android、iOS 原生或 PWA 安装体验。
- **涉及页面**：全部页面（以主路径为先）。
- **涉及组件**：依赖 UX-D 共享组件——**需先完成 UX-D**。
- **当前状态**：🔄 部分进行中——iPhone Safari 适配 CSS 已完成（Batch 8-B），真机验收待人工；原生/PWA 封装方案**待确认**（仓库已有 `docs/pwa-offline-capability.md`、`docs/ios-plist-additions.md` 可作输入）。
- **对应 Batch**：Batch 8-B（🔄 CSS 已适配，真机待人工验收）。
- **验收标准**：
  1. iPhone Safari 真机验收通过（8-B 收尾）；
  2. 安装/封装方案确定（PWA 或原生）；
  3. 主路径在目标设备可用；
  4. 适配项不破坏既有移动端布局。
- **是否需要人工**：**是**——真机验收与商店上架需人工。
- **是否阻塞后续**：否。
- **Codex 可执行任务**：依据 `docs/ios-plist-additions.md`、`docs/pwa-offline-capability.md` 完成 8-B 收尾的 CSS/配置项，真机验收交人工。

---

## 阻塞关系小结

- **UX-D（第 0 步）阻塞** 第 1/2/3/6/8 步的产品化收口，以及第 12/13 步的低成本适配——应最先落地。
- **UX-B 主路径（第 2-5 步）顺序强依赖**：拍照 → OCR 确认 → 拆分 → 匹配 → 报告，前序不通则后序无法验收。
- **Batch 1-F（第 11 步）blocked_by_user**：当前不动，待用户解除并并入统一阶段。
- **Batch 8-B（第 13 步）** 等真机人工验收收尾。
- 第 7/9/10 步无强阻塞，可在主路径产品化期间并行打磨。
