# CompLens / 成分镜 · 视觉风格指南（Visual Style Guide）

> 本文件属于 `docs/product-blueprint/` 产品蓝图集。
> 索引见 [`../README.md`](../README.md)（文档总入口）；token 与组件规范见同目录 [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)。
> 本文件定义"看起来怎样"；token 定义、状态枚举与组件清单以 `DESIGN_SYSTEM.md` 为准，两者必须一致。

## 0. 权威性声明

- 视觉规范**已确认采用「薄荷绿主色 + 16px 圆角」为基线**（2026-06-14 用户确认）；色阶与圆角规范值见 `DESIGN_SYSTEM.md` §2.1 / §2.10。
- 字号映射以 `src/styles.css :root` 为准（不变）。
- **代码落地状态（如实记录）**：`src/styles.css` 当前仍为旧值（深青绿 `#116a5b` + 8px 圆角，含大量硬编码字面量）；切换为薄荷绿 / 16px 是 **Codex 实现任务 Batch FRONTEND-A**（待办，本轮未改代码）。落地前运行界面仍显示旧值。
- 不引入私有字体文件，不下载 / 不提交字体文件。

---

## 1. 视觉定位

CompLens / 成分镜帮助普通消费者拍照解读食品标签，理解配料、营养、包装卖点、数据来源、可信等级和需要关注的地方。视觉应传达：**清爽、可信、轻量、食品感、消费决策感、移动端优先**。

明确禁止：

- 医院化 / 临床化的冷白 + 高饱和红配色；
- 恐吓化、健康焦虑式的表达（大字警告、大面积红 / 黑）；
- 过度科技黑 / 暗黑炫酷风；
- 花哨渐变、复杂插画、拟物特效；
- 每页风格不一致、各页自创配色与排版。

---

## 2. 色彩风格

以下语义命名映射到**真实 token 值**（见 `DESIGN_SYSTEM.md` 第 2 节）。

### 2.1 品牌色（薄荷绿色阶 · 规范值）

| 语义 | 映射变量 | 规范值（目标） | 当前代码值 |
|---|---|---|---|
| `brand.primary`（品牌识别 / 图标 / 链接） | `--primary` | `#059669`（薄荷绿） | `#116a5b` |
| `brand.primaryStrong`（主按钮 / 深态） | `--primary-strong` | `#047857` | `#0c5146` |
| `brand.primaryBright`（辅助高亮） | `--primary-bright` | `#10b981` | 待补 |
| `brand.primaryTint`（装饰 / 插画 / 浅状态底） | `--primary-tint` | `#34d399` | 待补 |
| `brand.primarySoft`（页面浅底 / 软填充） | `--color-primary-soft` | `#ecfdf5` | `#e9efeb` |
| `brand.secondary` | `--accent` | `#c85f38`（暖橙，点缀；是否改可信蓝待确认） | `#c85f38` |

> 填充主按钮用更深的 `#047857`（白字对比度 ≈ 5.5:1 达标），品牌识别 / 图标 / 强调链接用 `#059669`。代码切换为 Batch FRONTEND-A（待办）。状态色（§2.4）不随品牌色改变。

### 2.2 背景与表面

| 语义 | 映射变量 | 当前值 |
|---|---|---|
| `background.app` | `--bg` | `#f6f7f4` |
| `background.card` | `--surface` | `#ffffff` |
| `background.subtle` | `--color-surface-subtle` | `#f7fbf8` |

### 2.3 文字与边框

| 语义 | 映射变量 | 当前值 |
|---|---|---|
| `text.primary` | `--text` | `#18211f` |
| `text.secondary` | `--muted` | `#66736f` |
| `text.muted` | `--muted` | `#66736f`（当前与 secondary 共用，细分待补 token，待确认） |
| `border.default` | `--line` | `#dce3df` |

### 2.4 状态色

| 语义 | 映射变量 | 当前值 |
|---|---|---|
| `status.verified` | `--color-risk-low` | `#22c55e` |
| `status.pending` | `--color-unverified` | `#9ca3af` |
| `status.unknown` | `--color-unknown` | `#6b7280` |
| `status.warning` | `--color-risk-medium` | `#f59e0b` |
| `status.danger` | `--color-risk-high` | `#ef4444` |
| `status.info` | `--color-watch` | `#2563eb` |

### 2.5 用色约束

- **不允许大面积高饱和红 / 黑**：危险色 `#ef4444` 仅用于小面积标记（badge / 点 / 图标），不铺底。
- 报告页以中性 + 绿（已验证）+ 灰（待复核 / 未收录）为主，少量蓝（信息）/ 橙黄（关注），克制使用红。
- 个性化命中（过敏 / 回避）可用红 / 橙，但限于标记与文案，不制造整页恐慌氛围。

---

## 3. 字体规范

### 3.1 字体族策略

- **当前代码栈（权威现状）**：`Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif`。
- **目标跨端栈**：
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
  以系统字体优先，覆盖 iOS / macOS（PingFang）、HarmonyOS、小米（MiSans）、Windows（雅黑），保证跨端中文观感一致。
- **不引入私有字体文件**，全部使用系统 / 已加载字体；不下载、不提交字体文件。

### 3.2 字号语义（映射真实字号 token）

中文正文 ≥ 14px，核心正文 15/16px（当前 base 为 16px）。

| 语义 | 映射 token | 当前值 | 用途 |
|---|---|---|---|
| `display` | `--font-size-2xl` | `24px` | 大标题 / 着陆强调 |
| `pageTitle` | `--font-size-2xl` | `24px` | 页面标题 |
| `sectionTitle` | `--font-size-xl` | `20px` | 区块标题 |
| `cardTitle` | `--font-size-lg` | `18px` | 卡片标题 |
| `body` | `--font-size-base` | `16px` | 核心正文 |
| `bodySmall` | `--font-size-sm` | `14px` | 次要正文（中文正文下限） |
| `caption` | `--font-size-xs` | `12px` | 辅助标注 |
| `tag` | `--font-size-sm` | `14px` | 标签 / badge 文字 |
| `button` | `--font-size-base` | `16px` | 按钮文字 |

> 输入框字号 ≥ 16px（防 iOS 自动缩放）。display 与 pageTitle 当前同为 24px，如需更大层级差异需补 token（待确认）。

---

## 4. 图标规范

- 风格：**线性、圆角端点、统一粗细与尺寸**；同一语义在所有端保持同尺寸、同线性风格。
- 不混用填充 / 线性 / 拟物风格。

### 4.1 场景 → 图标语义表

| 场景 | 图标语义 |
|---|---|
| 拍照 | camera |
| 上传 | image / upload |
| OCR 识别 | scan |
| 文本确认 / 编辑 | edit |
| 已验证 | shield-check |
| 待复核 | alert-circle |
| 暂未收录 | help-circle |
| 重点关注 | warning / flag |
| 历史 | clock |
| 我的 | user |
| 数据来源 | database / file-text |

### 4.2 各端图标库（同语义、同尺寸、同线性风格）

| 端 | 图标库 |
|---|---|
| Web / PWA | Lucide 或 TDesign Icons |
| 微信小程序 | TDesign Miniprogram Icons |
| Web 管理后台 | TDesign 或 Ant Design Icons |

> 跨端选用不同库时，必须保证**同语义对应同视觉**（粗细、尺寸、圆角端点一致），不得出现风格断层。

---

## 5. 页面样式规范

- **移动端优先**：白底 + 卡片布局；主操作固定、清晰；每页只突出**一个主操作**。
- **报告页**：分组卡片呈现（概要 / 配料明细 / 个性化命中 / 数据来源）；**数据来源可见**；状态标签统一取自 `dataStatus.js`。
- **状态标签统一**：badge 配色、文案、图标语义全站一致，不就地改写。

### 5.1 布局基准

| 项 | 基准 |
|---|---|
| 左右安全边距 | 16px（`--space-lg`） |
| 卡片内边距 | 16px（`--space-lg`） |
| 区块间距 | 16 / 24px（`--space-lg` / `--space-xl`） |
| 主按钮高度 | ≥ 44px |
| 底部导航 | 适配 iPhone safe-area（`env(safe-area-inset-bottom)`） |
| 横向滚动 | 禁止（内容自适应换行 / 纵向） |

> 圆角规范值为 **16px**（`--radius-card` / `--radius-btn`，用户确认）；胶囊与极小控件不参与。当前代码为 8px（含约 88 处硬编码），切换为 Batch FRONTEND-A（待 Codex 落地）。

---

## 6. 插画与图片风格

- 轻量**线性**风格，主题围绕食品 / 配料表 / 扫码 / 相机。
- 低饱和、与品牌薄荷绿协调（可用 `--primary-tint #34d399` 作浅色点缀）。
- 不卡通过度、不医疗恐惧、不复杂背景、不写实拟物。
- 空态 / 引导插画简洁，一图一意，不喧宾夺主。

---

## 7. 动效规范

- **克制为先**，不复杂、不阻塞主流程、低端机可用。
- 页面切换：轻微淡入 / 过渡（参考 `--transition-fast` 150ms ease-out）。
- 按钮：轻反馈（hover / pressed 颜色或缩放微动）。
- OCR 识别中：可用扫描线 / 进度条 / 骨架屏（`--color-skeleton-base` / `--color-skeleton-highlight`）。
- 禁止：大幅位移、连续弹跳、炫光、长动画；动效不得阻断用户操作或拖慢识别主流程。
