# 产品蓝图规范集（product-blueprint）

> CompLens / 成分镜（CompCheck）的产品、消费者体验、统一架构、UI、前端、跨端、数据可信、后台、隐私合规、测试验收完整规范。
> 本目录是规范集合，不重复粘贴根目录入口文档内容；根目录 [`../../README.md`](../../README.md)、[`../../AGENTS.md`](../../AGENTS.md)、[`../../CODEX_TASKS.md`](../../CODEX_TASKS.md) 只引用本目录，不重复正文。

产品定位：**面向普通消费者的食品标签拍照解读与消费决策助手**。核心价值：

```
拍一下食品包装，帮普通消费者看懂配料、营养、卖点和需要关注的地方。
```

主路径：

```
拍照/上传食品标签 → 自动识别标签类型 → OCR → 用户确认和修正识别文本
→ 配料拆分 / 营养字段解析 / 包装卖点识别
→ 匹配食品成分、食品添加剂、营养字段和用户关注项
→ 食品标签解读报告 → 保存历史记录和产品档案
```

用户拍的不一定只有配料表，也可能是营养成分表或包装正面。成分搜索和专业法规查询只是辅助能力，不是主路径。

> ⚠️ **方向已修订（2026-06）。** 当前产品方向与优先级以 [`PRODUCT_DIRECTION_2026H2.md`](PRODUCT_DIRECTION_2026H2.md) 为单一事实来源，与本目录其他较早文档冲突时以其为准。要点：定位收敛为"拍一下，看懂配料表"；第一版收敛为微信小程序单端；新增「添加剂大白话翻译 / 比一比」为核心；GB2760 全量治理与 admin 后台暂停继续投入；OCR 保留自建 RapidOCR。

---

## 文档清单与阅读顺序

| # | 文档 | 作用 | 建议读者 |
|---|---|---|---|
| 0 | [`PRODUCT_DIRECTION_2026H2.md`](PRODUCT_DIRECTION_2026H2.md) | **方向修订（单一事实来源）**：定位收敛、目标人群、优先级、三版路线、正式取舍、免费/付费 | **全员最先读** |
| 0.5 | [`MARKET_APP_ANALYSIS_2026.md`](MARKET_APP_ANALYSIS_2026.md) | 市面食品扫描 / 营养 App 功能拆解、优点总结和成分镜优化清单 | 产品 / 设计 / Codex |
| 0.6 | [`AI_UI_REVIEW_PROMPT.md`](AI_UI_REVIEW_PROMPT.md) | 真实 AI 接通后逐页审查 UI/功能的提示词、页面清单和验收口径 | 产品 / 设计 / Codex |
| 1 | [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) | 产品定位、MVP 范围、非目标 | 全员先读 |
| 2 | [`CONSUMER_DECISION_SPEC.md`](CONSUMER_DECISION_SPEC.md) | 消费者场景、关注项、标签解读报告、数据模型规划 | 产品 / 前端 / Codex |
| 3 | [`CONSUMER_UX_SPEC.md`](CONSUMER_UX_SPEC.md) | 消费者体验、话术、普通人报告与专业信息层级 | 产品 / 设计 / 前端 |
| 4 | [`ARCHITECTURE_SPEC.md`](ARCHITECTURE_SPEC.md) | 统一技术栈、后端必需性、旧前端迁移、OCR 服务链路、后台定位 | 架构 / 全员 |
| 5 | [`DATA_TRUST_SPEC.md`](DATA_TRUST_SPEC.md) | 数据来源类型、数据可信状态枚举、GB2760/OCR/AI 规则、展示规则 | 全员（数据红线） |
| 6 | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | 设计系统：Design Tokens、组件规范、跨端一致性规则 | 设计 / 前端 |
| 7 | [`VISUAL_STYLE_GUIDE.md`](VISUAL_STYLE_GUIDE.md) | 视觉风格：色彩、字体、图标、页面样式、插画、动效 | 设计 / 前端 |
| 8 | [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) | 前端工程规范（正式 user-uniapp + 旧前端迁移边界、标签类型、OCR 状态机等） | 前端 / Codex |
| 9 | [`PAGE_STRUCTURE.md`](PAGE_STRUCTURE.md) | 用户端 + 后台页面结构登记表，主流程 | 产品 / 前端 |
| 10 | [`CROSS_PLATFORM_SPEC.md`](CROSS_PLATFORM_SPEC.md) | 跨端规则、平台差异、平台能力矩阵 | 前端 / 跨端 |
| 11 | [`API_CONTRACT.md`](API_CONTRACT.md) | API 契约：现状已实现接口 + 主流程目标接口 + 后台计划接口 | 前后端 / Codex |
| 12 | [`UI_ROADMAP.md`](UI_ROADMAP.md) | UI / 跨端 / 后台开发路线与批次状态 | 规划 / Codex |
| 13 | [`ADMIN_CONSOLE_SPEC.md`](ADMIN_CONSOLE_SPEC.md) | 产品运营后台 + 数据治理后台 + 系统配置后台规划 | 后台 / Codex |
| 14 | [`PRIVACY_AND_COMPLIANCE_SPEC.md`](PRIVACY_AND_COMPLIANCE_SPEC.md) | 隐私、权限、合规、上架准备 | 合规 / 产品 |
| 15 | [`QA_ACCEPTANCE_SPEC.md`](QA_ACCEPTANCE_SPEC.md) | 测试与验收规范、验收命令矩阵 | QA / Codex |

阅读顺序：先 0（方向）→ 0.5（竞品与优化清单）→ 1（产品）→ 2/3（消费者决策与体验）→ 4（架构）→ 5（数据红线）→ 6/7（设计视觉）→ 8/9（前端/页面）→ 10/11（跨端/接口）→ 12（路线）→ 13/14/15（后台/合规/验收）。

---

## 强制约束（与 [`../../AGENTS.md`](../../AGENTS.md) 一致）

- 任何页面开发遵守 [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)。
- 任何技术栈、目录结构、后端/OCR/后台规划遵守 [`ARCHITECTURE_SPEC.md`](ARCHITECTURE_SPEC.md)。
- 任何消费决策体验开发遵守 [`CONSUMER_DECISION_SPEC.md`](CONSUMER_DECISION_SPEC.md) 与 [`CONSUMER_UX_SPEC.md`](CONSUMER_UX_SPEC.md)。
- 任何视觉开发遵守 [`VISUAL_STYLE_GUIDE.md`](VISUAL_STYLE_GUIDE.md)。
- 任何前端开发遵守 [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md)。
- 任何新页面登记到 [`PAGE_STRUCTURE.md`](PAGE_STRUCTURE.md)。
- 任何跨端能力遵守 [`CROSS_PLATFORM_SPEC.md`](CROSS_PLATFORM_SPEC.md)。
- 任何接口变更同步 [`API_CONTRACT.md`](API_CONTRACT.md)。
- 任何数据可信展示遵守 [`DATA_TRUST_SPEC.md`](DATA_TRUST_SPEC.md)。
- 任何隐私/权限功能遵守 [`PRIVACY_AND_COMPLIANCE_SPEC.md`](PRIVACY_AND_COMPLIANCE_SPEC.md)。
- 任何功能完成后按 [`QA_ACCEPTANCE_SPEC.md`](QA_ACCEPTANCE_SPEC.md) 验收。

不允许每个页面单独发明颜色、按钮、卡片、状态文案；不允许前端暴露 OCR/AI Key；不允许 OCR 结果跳过文本确认页；不允许 AI 生成权威结论；不允许提交字体文件；不允许把大图片存入 localStorage。

---

## 现状口径说明（防止误读）

- 正式用户端技术路线调整为 **uni-app + Vue3**，目标覆盖 H5/PWA、微信小程序、Android、iOS。当前 `src/` 纯 JS + Vite 前端保留为历史原型和迁移来源，不继续承载复杂新功能。
- 后台管理端规划为独立 **admin-web：Vue3 + TDesign Web**。后台共用 API 契约、数据状态和设计 token，不与用户端强行共用页面代码。
- 设计规范已确认采用**薄荷绿主色 + 16px 圆角**（色阶见 `DESIGN_SYSTEM.md` §2.1：`--primary #059669`、主按钮 `#047857`、辅助高亮 `#10b981`、装饰 `#34d399`、浅底 `#ecfdf5`）。**当前 `src/styles.css` 代码仍为深青绿 `#116a5b` + 8px**，切换为规范值是迁移/落地任务，文档为目标，代码后落地。
- 数据可信状态枚举以 `src/utils/dataStatus.js` 为准（7 个：verified_regulation / verified_jecfa / pending_review / mapped_candidate / common_ingredient / unverified / unknown_from_ocr）。
- API 契约区分「已实现 / 现有等价 / 计划待实现」，不把不存在的接口写成已存在。
- 专业法规、数据库和证据默认服务“数据来源和查看依据”，普通消费者默认看到食品标签解读、我的关注项和重点提醒。
- 共享 UI 组件多数尚未抽取（计划 Batch UX-D）；产品页面整体设计按用户要求统一推进。
- 凡标「待确认」的内容需用户或人工拍板后再落地。
