# 产品蓝图规范集（product-blueprint）

> CompLens / 成分镜（CompCheck）的产品、消费者体验、UI、前端、跨端、数据可信、后台、隐私合规、测试验收完整规范。
> 本目录是规范集合，不重复粘贴根目录入口文档内容；根目录 [`../../readme.md`](../../readme.md)、[`../../AGENTS.md`](../../AGENTS.md)、[`../../CODEX_TASKS.md`](../../CODEX_TASKS.md) 只引用本目录，不重复正文。

产品定位：**面向普通消费者的食品标签拍照解读与消费决策助手**。核心价值：

```
拍一下食品包装，帮普通消费者看懂配料、营养、卖点和需要关注的地方。
```

主路径：

```
拍食品标签 → 识别配料表/营养成分表 → 用户确认 → 我的关注项
→ 食品标签解读报告 → 保存历史
```

用户拍的不一定只有配料表，也可能是营养成分表或包装正面。成分搜索和专业法规查询只是辅助能力，不是主路径。

---

## 文档清单与阅读顺序

| # | 文档 | 作用 | 建议读者 |
|---|---|---|---|
| 1 | [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) | 产品定位、MVP 范围、非目标 | 全员先读 |
| 2 | [`CONSUMER_DECISION_SPEC.md`](CONSUMER_DECISION_SPEC.md) | 消费者场景、关注项、标签解读报告、数据模型规划 | 产品 / 前端 / Codex |
| 3 | [`CONSUMER_UX_SPEC.md`](CONSUMER_UX_SPEC.md) | 消费者体验、话术、普通人报告与专业信息层级 | 产品 / 设计 / 前端 |
| 4 | [`DATA_TRUST_SPEC.md`](DATA_TRUST_SPEC.md) | 数据来源类型、数据可信状态枚举、GB2760/OCR/AI 规则、展示规则 | 全员（数据红线） |
| 5 | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | 设计系统：Design Tokens、组件规范、跨端一致性规则 | 设计 / 前端 |
| 6 | [`VISUAL_STYLE_GUIDE.md`](VISUAL_STYLE_GUIDE.md) | 视觉风格：色彩、字体、图标、页面样式、插画、动效 | 设计 / 前端 |
| 7 | [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) | 前端工程规范（目录、组件、标签类型、OCR 状态机、错误处理等） | 前端 / Codex |
| 8 | [`PAGE_STRUCTURE.md`](PAGE_STRUCTURE.md) | 用户端 + 后台页面结构登记表，主流程 | 产品 / 前端 |
| 9 | [`CROSS_PLATFORM_SPEC.md`](CROSS_PLATFORM_SPEC.md) | 跨端规则、平台差异、平台能力矩阵 | 前端 / 跨端 |
| 10 | [`API_CONTRACT.md`](API_CONTRACT.md) | API 契约：现状已实现接口 + 主流程目标接口 + 计划接口 | 前后端 / Codex |
| 11 | [`UI_ROADMAP.md`](UI_ROADMAP.md) | UI 开发路线与批次状态（对齐 CODEX_TASKS UX 阶段） | 规划 / Codex |
| 12 | [`ADMIN_CONSOLE_SPEC.md`](ADMIN_CONSOLE_SPEC.md) | 后台管理系统第一版规范 | 后台 / Codex |
| 13 | [`PRIVACY_AND_COMPLIANCE_SPEC.md`](PRIVACY_AND_COMPLIANCE_SPEC.md) | 隐私、权限、合规、上架准备 | 合规 / 产品 |
| 14 | [`QA_ACCEPTANCE_SPEC.md`](QA_ACCEPTANCE_SPEC.md) | 测试与验收规范、验收命令矩阵 | QA / Codex |

阅读顺序：先 1（产品）→ 2/3（消费者决策与体验）→ 4（数据红线）→ 5/6（设计视觉）→ 7/8（前端/页面）→ 9/10（跨端/接口）→ 11（路线）→ 12/13/14（后台/合规/验收）。

---

## 强制约束（与 [`../../AGENTS.md`](../../AGENTS.md) 一致）

- 任何页面开发遵守 [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)。
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

- 设计规范已确认采用**薄荷绿主色 + 16px 圆角**（色阶见 `DESIGN_SYSTEM.md` §2.1：`--primary #059669`、主按钮 `#047857`、辅助高亮 `#10b981`、装饰 `#34d399`、浅底 `#ecfdf5`）。**当前 `src/styles.css` 代码仍为深青绿 `#116a5b` + 8px**，切换为规范值是 Codex 实现任务 **Batch FRONTEND-A**（待办，文档为目标，代码后落地）。
- 数据可信状态枚举以 `src/utils/dataStatus.js` 为准（7 个：verified_regulation / verified_jecfa / pending_review / mapped_candidate / common_ingredient / unverified / unknown_from_ocr）。
- API 契约区分「已实现 / 现有等价 / 计划待实现」，不把不存在的接口写成已存在。
- 专业法规、数据库和证据默认服务“数据来源和查看依据”，普通消费者默认看到食品标签解读、我的关注项和购买前建议关注。
- 共享 UI 组件多数尚未抽取（计划 Batch UX-D）；产品页面整体设计按用户要求统一推进。
- 凡标「待确认」的内容需用户或人工拍板后再落地。
