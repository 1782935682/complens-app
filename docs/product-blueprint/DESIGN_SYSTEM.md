# CompLens / 成分镜 · 统一设计系统（Design System）

> 本文件属于 `docs/product-blueprint/` 产品蓝图集。
> 索引见 [`../README.md`](../README.md)（文档总入口）；视觉风格细节见同目录 [`VISUAL_STYLE_GUIDE.md`](VISUAL_STYLE_GUIDE.md)。
> 本文件定义"做什么/用什么 token/组件规范"；视觉风格指南定义"看起来怎样"。两者颜色、状态文案、字号必须保持一致。

## 0. 权威性与现状声明

- 设计规范（本文）已**确认采用「薄荷绿主色 + 16px 圆角」为目标基线**（2026-06-14 用户确认）。本文给出的薄荷绿色阶与 16px 圆角是**规范值（canonical）**，新页面与组件以此为准。
- 数据可信状态以 `src/utils/dataStatus.js` 为准（7 个枚举，文案/语义不变）。
- **代码落地状态（如实记录，防止误读）**：`src/styles.css` 当前仍为旧值——主色深青绿 `#116a5b`、圆角 `8px`，且大量圆角 / 主色 rgba 为硬编码字面量（约 88 处 `border-radius: 8px`、约 34 处 `rgba(17,106,91,…)`）。把 token 从青绿/8px 切换为薄荷绿/16px 是 **Codex 实现任务 Batch FRONTEND-A**（待办，本轮未改代码）。在该任务合并前，运行界面仍显示青绿/8px。
- 共享组件目前**大多内联在各页面**，仅有 `src/components/render.js`。统一组件抽取属 **Batch UX-D（待办）**。本文组件规范为「目标规范 + 当前状态」。
- 切换规则：颜色 / 圆角必须只改 `:root` token 并把硬编码字面量收敛为 `var(--…)`，由全端继承；不得各页单独硬编码。

---

## 1. 品牌风格

CompLens / 成分镜 是面向普通消费者的「食品标签拍照解读与消费决策助手」，移动端优先，跨端目标为 Web / PWA、微信小程序、Android、iOS、Web 管理后台。

设计基调：

- **干净可信**：白底 + 卡片，留白充足，信息分层清晰；不堆砌装饰，让数据与结论可读、可信。
- **轻量现代**：线性图标、克制动效、扁平卡片；不重渐变、不重阴影、不花哨。
- **移动端优先**：单手可达、主操作明确、触控目标足够大（主按钮高度 ≥ 44px）。
- **食品感与消费决策但不过度医疗化**：传达「配料 / 营养 / 卖点核对 / 来源 / 可信等级 / 是否建议关注」，但避免医院化、恐吓化、健康焦虑式的表达；用中性、说明性的语气与配色。

---

## 2. Design Tokens

> 现状以 `src/styles.css :root` 为准。「当前值」列为代码真实值；缺失项标「待补 token（待确认）」。

### 2.1 品牌色（薄荷绿色阶 · 规范值）

主色采用**薄荷绿 / 食品安全绿**色阶（用户确认）。规范值如下；`当前代码值`列为 `src/styles.css` 现状（待 Batch FRONTEND-A 切换）。

| 变量名 | 规范值（目标） | 当前代码值 | 角色 / 用途 |
|---|---|---|---|
| `--primary` / `--color-primary` | `#059669`（薄荷绿） | `#116a5b` | **品牌主色**：已验证强调、重点图标、强调链接、激活态 |
| `--primary-strong` / `--color-primary-dark` | `#047857` | `#0c5146` | **主按钮底色**、pressed/深态、强调标题（白字对比度 ≈ 5.5:1，达标） |
| `--primary-darker`（新增，派生） | `#035c43` | 待补 | 主按钮 hover / pressed 更深态 |
| `--primary-bright`（新增） | `#10b981` | 待补 | **辅助高亮**：次强调、活跃数据点缀 |
| `--primary-tint`（新增） | `#34d399` | 待补 | **小面积装饰 / 插画 / 浅色状态背景** |
| `--color-primary-soft` | `#ecfdf5`（极浅薄荷） | `#e9efeb` | **页面浅背景块 / 软填充**：选中底、轻强调背景 |
| `--accent` | `#c85f38`（暖橙，暂留） | `#c85f38` | 次强调点缀，**不做大面积铺底**（是否调整为可信蓝待确认） |

色阶角色映射（用户确认 2026-06-14）：

```
#047857  主按钮 / pressed / 深态
#059669  品牌主色 / 已验证强调 / 重点图标
#10B981  辅助高亮
#34D399  小面积装饰 / 插画 / 浅色状态背景
#ECFDF5  页面浅背景块 / 软填充
```

> 注意：填充主按钮用 `--primary-strong #047857`（白字对比度达标），品牌识别 / 图标 / 链接用 `--primary #059669`。语义状态色（risk-low/medium/high、verified_jecfa 的信息蓝等）不随品牌色改变，保持 §2.4 不变。

### 2.2 背景与表面

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--bg` | `#f6f7f4` | App 全局背景（浅灰绿） |
| `--surface` | `#ffffff` | 卡片 / 表面背景 |
| `--color-surface-subtle` | `#f7fbf8` | 次级表面：分组底、弱化区块 |

### 2.3 文字与边框

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--text` | `#18211f` | 正文主文字 |
| `--muted` | `#66736f` | 次要文字、说明、占位 |
| `--line` | `#dce3df` | 分割线、卡片边框、输入框边框 |

### 2.4 风险 / 状态色

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--color-risk-low` | `#22c55e` | 低风险 / 已验证（成功语义） |
| `--color-risk-medium` | `#f59e0b` | 中等关注 / 疑似匹配（警告语义） |
| `--color-risk-high` | `#ef4444` | 高风险 / 危险（危险语义） |
| `--color-unverified` | `#9ca3af` | 未验证 / 待复核（中性灰） |
| `--color-unknown` | `#6b7280` | 暂未收录 / 未知（中性深灰） |
| `--color-watch` | `#2563eb` | 信息 / 安全评价（信息蓝，用于 verified_jecfa） |

### 2.5 个性化标记色

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--color-allergen` | `#dc2626` | 用户过敏原命中 |
| `--color-avoid` | `#ea580c` | 用户回避项命中 |
| `--color-watch` | `#2563eb` | 用户关注项命中（与信息蓝复用） |

### 2.6 Badge 背景（半透明底色）

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--color-badge-verified-bg` | `rgba(34, 197, 94, 0.14)` | 已验证 badge 底 |
| `--color-badge-jecfa-bg` | `rgba(37, 99, 235, 0.12)` | 安全评价 badge 底 |
| `--color-badge-candidate-bg` | `rgba(245, 158, 11, 0.18)` | 疑似匹配 badge 底 |
| `--color-badge-unverified-bg` | `rgba(156, 163, 175, 0.18)` | 未验证 / 待复核 badge 底 |
| `--color-badge-unknown-bg` | `rgba(107, 114, 128, 0.16)` | 暂未收录 badge 底 |

### 2.7 字体族与字号

字体族目标采用系统字体优先，不提交字体文件：

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "PingFang SC",
  "HarmonyOS Sans SC",
  "MiSans",
  "Microsoft YaHei",
  sans-serif;
```

字号 token：

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--font-size-xs` | `12px` | caption / 辅助标注 |
| `--font-size-sm` | `14px` | bodySmall / 标签 / 次要正文（中文正文下限） |
| `--font-size-base` | `16px` | body 核心正文；输入框最小字号（防 iOS 缩放） |
| `--font-size-lg` | `18px` | cardTitle / 小标题 |
| `--font-size-xl` | `20px` | sectionTitle / 区块标题 |
| `--font-size-2xl` | `24px` | pageTitle / 页面标题 |

### 2.8 字重 / 行高（现状）

| 项 | 当前值 | 说明 |
|---|---|---|
| 正文行高 | `1.5`（body `line-height`） | 全局基准 |
| 强调字重 | `800` | 按钮、导航激活、标题等大量使用 |
| 次强调字重 | `700` | 标签、部分小标题 |
| 字重 token | 待补 token（待确认） | 当前字重为硬编码，未抽 `--font-weight-*` 变量 |

### 2.9 间距

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--space-xs` | `4px` | 紧凑间隙 |
| `--space-sm` | `8px` | 小间距 |
| `--space-md` | `12px` | 中间距 / 组件内距 |
| `--space-lg` | `16px` | 卡片内边距、左右安全边距、区块间距基准 |
| `--space-xl` | `24px` | 大区块间距 |

### 2.10 圆角（16px · 规范值）

| 变量名 | 规范值（目标） | 当前代码值 | 用途 |
|---|---|---|---|
| `--radius-card` | `16px` | `8px` | 卡片 / 弹层 / 大容器圆角 |
| `--radius-btn` | `16px` | `8px` | 按钮 / 输入框 / 文本域圆角 |
| 胶囊 / 小标签 | `999px` / 保持 `4–8px` | 同 | 胶囊按钮、状态点、细小控件不强制 16px |

> 规范值为 16px（用户确认）。**当前代码为 8px**，且多数为硬编码 `border-radius: 8px`（约 88 处），切换由 Batch FRONTEND-A 统一：把字面量收敛为 `var(--radius-card)` / `var(--radius-btn)` 后改 token 值。胶囊（999px）与 4–8px 的极小控件不参与本次 16px 化。

### 2.11 阴影

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--shadow` / `--shadow-card` | `0 12px 32px rgba(23, 39, 35, 0.08)` | 卡片基础阴影 |
| `--shadow-raised-tab` | 规范值 `0 10px 24px rgba(5, 150, 105, 0.24)`；当前代码 `rgba(17, 106, 91, 0.24)` | 凸起 tab / 悬浮主操作阴影（随主色切换为薄荷绿 rgb，Batch FRONTEND-A） |

### 2.12 过渡 / 动效

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--transition-fast` | `150ms ease-out` | 轻量交互过渡 |

### 2.13 组件相关辅助 token

| 变量名 | 当前值 | 用途 |
|---|---|---|
| `--color-nav-inactive` | `#9ca3af` | BottomNav 未激活项 |
| `--color-skeleton-base` | `#eef2ef` | Loading 骨架基色 |
| `--color-skeleton-highlight` | `#f8faf8` | Loading 骨架高光 |
| `--color-error-text` | `#7a3b10` | ErrorState 文字 |
| `--color-error-border` | `#f4c790` | ErrorState 边框 |
| `--color-error-bg` | `#fff8ec` | ErrorState 背景 |
| `--low` | `#14734f` | 旧风险等级标记（低） |
| `--medium` | `#a85516` | 旧风险等级标记（中） |
| `--high` | `#b42318` | 旧风险等级标记（高） |
| `--unknown` | `#667085` | 旧风险等级标记（未知） |
| `--connection-banner-height` | `0px` | 连接状态条占位高度（运行时调整） |

### 2.14 已落地交互与高阶设计规范 (Canonic UI Standards)

以下为本次 UI 深度优化中全面落地的跨端高阶组件交互与设计系统规范：

1. **模态框模组 (Modal & AppModal) 规范**：
   - **遮罩层 (Mask Backdrop)**：采用高级磨砂毛玻璃特效，背景值 `rgba(24, 33, 31, 0.4)`，并通过 `backdrop-filter: blur(8px)` 实现跨端深度聚焦。
   - **面板容器 (Panel Card)**：采用立体悬浮阴影 `box-shadow: 0 20px 40px rgba(23, 39, 35, 0.16)`，圆角固定为 `--radius-card` (`16px`)。
   - **进入动画 (Damping Slide-up)**：入场使用阻尼滑入缓动动画（`slide-up 150ms ease-out`），淡入的同时向上平移 24px。
   - **高度可定制化**：彻底解耦按钮，支持 `confirmLabel` 与 `cancelLabel` 以应对不同的用户决策路径（如“确认删除”）。

2. **轻提示模组 (Toast) 规范**：
   - **色彩及描边**：使用微透极轻量底色，配以 1px 细微高亮边框和 4px 轻阴影，例如成功态 (`tone="success"`) 为 `background: rgba(34, 197, 94, 0.06); border-color: rgba(34, 197, 94, 0.15)`。
   - **滑落动画 (Slide-down & Fade)**：入场使用平滑下降淡入过渡（`slide-in 220ms ease-out`），从顶部向下飘移 12px。
   - **多场景图标引导**：引入语意 Emojis 标志（成功：`✅`，警示：`⚠️`，提示：`💡`），丰富可读性。

3. **空状态占位 (EmptyState) 规范**：
   - **原生无感标识 (Emojis)**：移除未过滤字符 `□`。缺省值采用品牌自然绿叶 `🌱`。
   - **高灵敏上下文适配**：在不同功能页面，传入专属轻量符号以增强代入感：
     - 历史记录页：`📜` (历史卷轴)
     - 成分搜索页：`🔍` (搜索镜)
     - 配料拆分页：`🥗` (沙拉配料)
     - 营养解析页：`📊` (营养图表)
     - 文本确认页：`📝` (文书修改)
     - 报告结果页：无命中目标 `🎯`、无营养表 `📊`、零添加剂 `🍃`、过敏原安全 `🛡️`、匹配成功 `✅`、未找到报告 `❌`。

4. **全局阻尼页面切换 (Global Page Entry)**：
   - 全局 `.page` 容器统一添加贝塞尔缓冲滑入动画：`animation: page-entry 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards`。
   - 慢出、快起阻尼过渡（向内淡入并向上轻滑 6px），使得每次页面加载与 Tab 切换如原生 App 般轻盈平滑。

5. **平台底层操作拦截**：
   - **消除灰色闪烁**：添加 `-webkit-tap-highlight-color: transparent` 拦截手机端 Web 视图中所有按钮和卡片点按时的灰色滞重闪烁块。
   - **定制滚动条 (Micro-Scrollbars)**：配置宽度仅为 `6px` 的滑槽，滑块使用轻薄透明度的 `background: rgba(5, 150, 105, 0.15)`，让界面极简干净、绝不生硬。

### 2.15 待补 token（待确认）

- 字重 token `--font-weight-regular/medium/bold`：待补 token（待确认）。
- z-index 层级 token：待补 token（待确认，部分硬编码如导航 z-index、banner z-index 40）。

---

## 3. 食品配料分析专用状态

### 3.1 真实 dataStatus 枚举（权威，来自 `src/utils/dataStatus.js`）

以下 7 个为**真实数据库 / 代码状态**，文案与颜色变量均为权威值，不得改写、不得新增。

| dataStatus | 文案 | 颜色变量 | 颜色值 | 图标语义（目标） |
|---|---|---|---|---|
| `verified_regulation` | 官方标准已验证 | `--color-risk-low` | `#22c55e` | shield-check（盾+勾） |
| `verified_jecfa` | 安全评价已匹配（非中国法规范围） | `--color-watch` | `#2563eb` | shield / info（信息蓝盾） |
| `pending_review` | 待复核来源数据 | `--color-unverified` | `#9ca3af` | alert-circle（待复核） |
| `mapped_candidate` | 疑似匹配，待确认 | `--color-risk-medium` | `#f59e0b` | alert-circle（疑似） |
| `common_ingredient` | 普通配料 | `--color-risk-low` | `#22c55e` | check / leaf（普通） |
| `unverified` | 未验证 | `--color-unverified` | `#9ca3af` | alert-circle（中性） |
| `unknown_from_ocr` | 暂未收录 | `--color-unknown` | `#6b7280` | help-circle（未知） |

### 3.2 产品状态名映射对照（如实区分真实状态与展示概念）

产品讨论中出现的状态名称与本项目对照如下：

| 产品语义名 | 本项目对应 | 性质 | 说明 |
|---|---|---|---|
| `verified_regulation` | `verified_regulation`（真实） | 真实 dataStatus | 官方标准已验证 |
| `verified_safety` | `verified_jecfa`（真实） | 真实 dataStatus | `verified_safety` 约等于本项目 `verified_jecfa`（JECFA 安全评价，非中国法规范围） |
| `pending_review` | `pending_review`（真实） | 真实 dataStatus | 待复核来源数据 |
| `mapped_candidate` | `mapped_candidate`（真实） | 真实 dataStatus | 疑似匹配，待确认 |
| `common_ingredient` | `common_ingredient`（真实） | 真实 dataStatus | 普通配料 |
| `unverified` | `unverified`（真实） | 真实 dataStatus | 未验证 |
| `unknown_from_ocr` | `unknown_from_ocr`（真实） | 真实 dataStatus | 暂未收录 |
| `low_confidence` | —（**非 dataStatus**） | 展示 / 运行时概念 | 是运行时匹配置信度 `matchConfidence` 0.55–0.79 的区间，**不是独立 dataStatus**，不入库为状态 |
| `attention` / 重点关注 | —（**非 dataStatus**） | 报告展示概念 | 报告层面对「需重点关注」配料的展示聚合，**不是 dataStatus**，由个性化命中 / 风险等级派生 |

约束：

- **绝不新增数据库不存在的 dataStatus**；展示层概念（low_confidence、attention）只在 UI 表达，不冒充数据状态。
- 状态文案以 `dataStatus.js` 为准；UI 通过 `dataStatusLabel()` / `dataStatusColorVar()` / `dataStatusBadgeClass()` 取值，不在页面里写死。
- 未知 / 兜底统一归 `unverified`（见 `normalizeDataStatus` fallback）。

---

## 4. 组件规范

> **当前实现状态：多数组件未抽取为独立组件，统一抽取见 Batch UX-D（待办）。** 现仅 `src/components/render.js` 为共享渲染。以下为「目标规范」，落地时收敛各页面内联样式。

### 4.1 Button
- 用途：触发操作。
- 变体：primary（实底 `--primary-strong #047857`，白字，对比度 ≈ 5.5:1）/ secondary（描边或浅底）/ text（`.button-link`）/ icon（`.icon-button`）/ danger（用 `--color-risk-high`，仅破坏性操作）。
- 状态：default（`--primary-strong`）/ hover · pressed（`--primary-darker #035c43`）/ disabled（降透明、`cursor` 禁用）/ loading（内联 spinner）。
- 约束：每页只突出**一个主操作**；按钮高度 ≥ 44px；圆角用 `--radius-btn`（规范 16px）；字重 800。品牌识别 / 图标 / 链接用 `--primary #059669`，填充按钮用更深的 `--primary-strong` 保证白字对比度。

### 4.2 Card
- 用途：信息分组容器。
- 变体：基础卡片 / 分组卡片（报告页）/ 可点击卡片。
- 状态：default / hover / 选中（`--color-primary-soft` 底）。
- 约束：白底 `--surface`，内边距 `--space-lg`（16px），圆角 `--radius-card`（规范 16px），阴影 `--shadow-card`；不在卡片内自创颜色。

### 4.3 Badge
- 用途：状态徽标（数据可信度、来源类型）。
- 变体：对应 7 个 dataStatus，底色用 `--color-badge-*-bg`，文字 / 描边用对应状态色。
- 约束：文案与配色必须来自 `dataStatus.js`；类名用 `dataStatusBadgeClass()`（`data-badge--<status>`）。

### 4.4 Tag
- 用途：分类 / 个性化命中标记（过敏原 / 回避 / 关注）。
- 变体：allergen（`--color-allergen`）/ avoid（`--color-avoid`）/ watch（`--color-watch`）/ 普通分类（中性）。
- 约束：个性化标记色固定，不复用为其它语义。

### 4.5 Input
- 用途：单行文本输入。
- 状态：default / focus（主色描边）/ error（`--color-risk-high` 描边）/ disabled。
- 约束：**字号 ≥ 16px**（防 iOS 缩放，见全局 `font-size: max(16px,1rem)`）；圆角 `--radius-btn`；边框 `--line`。

### 4.6 Textarea
- 用途：多行输入（OCR 文本确认 / 编辑）。
- 状态：同 Input。
- 约束：同 Input；最小高度足以显示多行配料文本。

### 4.7 ImageUploader
- 用途：拍照 / 相册上传配料表图片。
- 变体：拍照入口（camera）/ 相册入口（image）/ 已选预览（可删除 / 重拍）。
- 状态：空态 / 已选 / 上传中 / 上传失败。
- 约束：主入口为拍照；预览可重拍；失败走 ErrorState 语气。

### 4.8 StepIndicator
- 用途：识别流程进度（拍照 → 识别 → 确认文本 → 报告）。
- 状态：未开始 / 进行中（主色高亮）/ 已完成（成功色）。
- 约束：步骤文案跨端一致；不喧宾夺主。

### 4.9 IngredientChip
- 用途：单条配料展示（名称 + 状态色点 / badge）。
- 状态：对应 dataStatus 色；个性化命中叠加 Tag。
- 约束：状态色来自 `dataStatusColorVar()`；不在 chip 内发明颜色。

### 4.10 ConfidenceBadge
- 用途：表达**运行时匹配置信度**（matchConfidence），非 dataStatus。
- 变体：high（≥0.8）/ low_confidence（0.55–0.79，提示「疑似 / 待确认」语气）/ 低于阈值不展示匹配。
- 约束：必须与 dataStatus badge **视觉可区分**，避免误读为数据库状态；low_confidence 是展示概念。

### 4.11 SourceBadge
- 用途：标注数据来源（GB2760 / JECFA / 来源文件等）。
- 变体：法规来源 / 安全评价来源 / 待复核来源。
- 约束：报告中数据来源必须可见、可追溯；图标语义 database / file-text。

### 4.12 ReportSummaryCard
- 用途：报告页顶部摘要（总体结论 / 关注项数量 / 个性化命中）。
- 约束：以中性、说明性语气总结；「重点关注（attention）」为展示聚合概念，不标为 dataStatus；不使用大面积红 / 黑制造恐慌。

### 4.13 BottomNav
- 用途：底部主导航（如 拍照 / 历史 / 我的）。
- 状态：激活（`--primary`，字重 800）/ 未激活（`--color-nav-inactive`）。
- 约束：图标 + 文案；适配 iPhone safe-area（`env(safe-area-inset-bottom)`）；跨端层级与图标语义一致。

### 4.14 Toast
- 用途：轻量、临时反馈（保存成功 / 网络错误）。
- 变体：success / error / info（映射 `--color-risk-low` / `--color-risk-high` / `--color-watch`）。
- 约束：不阻塞主流程；专用 token 为待补 token（待确认）。

### 4.15 Modal
- 用途：需要确认或聚焦的操作（删除确认 / 重要提示）。
- 状态：打开 / 关闭；含遮罩。
- 约束：移动端优先底部抽屉或居中卡片；专用 token 为待补 token（待确认）。

### 4.16 EmptyState
- 用途：列表 / 历史 / 搜索无结果。
- 约束：轻量线性插画 + 一句说明 + 一个主操作引导；语气中性、不焦虑；专用 token 为待补 token（待确认）。

### 4.17 ErrorState
- 用途：识别失败 / 网络失败 / 服务异常。
- 约束：使用 `--color-error-bg` / `--color-error-border` / `--color-error-text`（暖色，非高饱和红），给出可重试操作；不恐吓。

### 4.18 LoadingState
- 用途：OCR 识别中 / 数据加载中。
- 变体：骨架屏（`--color-skeleton-base` / `--color-skeleton-highlight`）/ 进度 / OCR 扫描线动效。
- 约束：克制、可在低端机运行；不阻断、不闪烁。

---

## 5. 跨端规则

适用于 Web / PWA、微信小程序、Android、iOS、Web 管理后台。

1. **颜色一致**：所有端统一使用本文 Design Tokens 的语义；同一语义同一颜色，禁止各端 / 各页单独发明颜色值。
2. **状态文案一致**：数据可信状态文案统一取自 `src/utils/dataStatus.js`，跨端不得改写措辞（如「官方标准已验证」「暂未收录」）。
3. **按钮层级一致**：primary / secondary / text / danger 的语义与层级跨端一致；每页只突出一个主操作。
4. **卡片风格一致**：白底 + `--radius-card`（规范 16px）+ `--shadow-card`，内边距 16px；跨端视觉一致。
5. **数据可信等级表达一致**：badge 配色、图标语义、置信度（low_confidence）与重点关注（attention）的展示约定跨端一致；展示概念不冒充 dataStatus。
6. **禁止每页单独发明颜色 / 样式**：新页面必须复用 token 与组件规范；新增语义需先补 token（标注待确认），不得就地硬编码。
7. **薄荷绿 + 16px 已确认为规范基线**：所有端统一切换为薄荷绿主色（§2.1 色阶）与 16px 圆角；切换只改 `:root` token 并把硬编码字面量收敛为 `var(--…)`，由全端继承，不得各页单独硬编码。代码落地为 Batch FRONTEND-A（待 Codex 执行）。
8. **禁止提交字体文件**：字体统一走系统字体栈，仓库不得新增 `.ttf` / `.otf` / `.woff` / `.woff2` 字体资源。
