# AGENTS.md

编码 Agent（Codex 等）在本仓库工作的强制规范。详细产品说明和历史完整开发约定见 [`readme.md`](./readme.md)，任务清单见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)。

---

## 1. 项目主路径（不可偏离）

CompLens / 成分镜是**面向普通消费者的食品标签拍照解读与消费决策助手**。主路径：

```
拍食品标签 → 标签类型识别 → OCR 识别 → 文本确认修正
→ 配料拆分 / 营养字段解析 → 我的关注项 → 食品标签解读报告 → 历史
```

**OCR 拍照识别是核心主路径，成分搜索和专业法规查询只是辅助功能。** 不得把成分搜索写成主路径，不得把 OCR 写成附属功能。用户拍的不一定只有配料表，也可能是营养成分表或包装正面。当前阶段只做食品标签，不做化妆品、护肤品、药品。

---

## 2. 不得伪造与不得越界红线

1. **不得伪造数据**：AI 不能编造成分数据、法规来源、ADI、限量、条款编号、安全结论；GB2760 官方来源只用国家卫健委公告和食品安全国家标准数据检索平台。
2. **不得伪造 OCR**：无 Key 不返回假识别文字；`mock` 必须标注；无 Key 必须保留 manual 降级，不崩溃。
3. **AI 不是权威来源**：AI 只做总结、通俗解释、非医疗化提示；不替代 OCR/数据库；不给医疗诊断。
4. **不得把 seed 当完整库**：112 条基础库不是完整食品添加剂库。
5. **不得把不确定数据展示为结论**：`pending_review` / `unverified` / `mapped_candidate` 不能展示为已验证。
6. **不得给购买或医疗结论**：禁止输出可以买、不能买、健康、不健康、安全、有害、致癌、治疗、诊断、一定过敏；推荐“建议关注 / 更适合重点查看 / 部分人群可能需要留意 / 信息不足，建议结合包装原文确认 / 仅供标签信息参考，不构成医疗或营养诊断”。

违反任一条视为任务失败。

---

## 3. 执行流程

1. 改代码前先读：`CODEX_TASKS.md`（当前任务）、相关 page/service/schema、`DATA_SOURCES.md`（数据口径）。
2. 按 `CODEX_TASKS.md` 阶段顺序执行**当前最早未完成且未被阻塞**的 Batch。
3. 一次完成一个可验证的用户流程闭环（数据模型+逻辑+页面+路由+状态+移动端样式+错误/空状态+文档+验证），不只改一个组件就停。
4. 每个 Batch 一个 PR，禁止自动 push 到 `main`。
5. 完成后同步更新 `PROJECT_PLAN.md`、`AI_REVIEW.md`（覆盖式，仅本轮内容）；影响命令更新 `COMMANDS.md`，影响数据更新 `DATA_SOURCES.md`。

---

## 4. 人工阻塞跳过规则

遇到人工阻塞任务**不停止流程**：

```
标记 blocked_by_user → 记录原因 → 跳过 → 继续后续无需人工的任务
```

阻塞清单：生产 `DATABASE_URL`、OCR API Key、AI API Key、Apple Developer、Google Play、国内商店账号、支付/订阅账号、部署平台、隐私政策法律确认、软著/备案/商标、GB2760 人工复核。

阻塞项只阻塞其"真实产出"，不阻塞可先做的脚本/抽象/降级流程（例如：无 OCR Key 仍可做 manual/mock 闭环；无人工签核仍可做 promote 脚本与 pending_review 流程）。

---

## 5. 技术栈约束

- 前端：纯 JS ES2022+（JSDoc，无 TS）、无框架、Vite、自实现 hash 路由、单文件 `src/styles.css` + CSS 变量。
- 禁止引入：React/Vue/Svelte、TypeScript（前端）、webpack/Parcel、Tailwind/Bootstrap、Redux/Zustand/Pinia、路由库、测试框架（前端用 `scripts/test.mjs`）、jQuery。
- 后端：Node.js 20 + TypeScript + Hono + Drizzle/PostgreSQL + Vitest。
- 图片存 IndexedDB；localStorage 只存元数据/索引/设置；禁止 base64 图片入 localStorage。
- 样式只用 CSS 变量，禁止内联颜色和魔法数字。
- API Key 只在后端环境变量；前端不暴露密钥；前端不直连第三方 OCR/AI。
- 不允许自动部署生产；需要部署时由用户人工执行或明确授权具体命令。
- 优先使用本地/Oracle 部署组件；产品化上线时再评估正式服务器和商业服务。

---

## 6. 每个 Batch 验收

按改动范围选择验证，**不要每次默认跑完整测试**：

- 纯文档修改：至少 `git diff --check`。
- 前端小改：优先 `npm run lint` + 相关现有测试；必要时再 `npm run test`。
- 触达构建入口、路由、PWA、跨端配置时：加 `npm run build`。
- 涉及后端：`cd backend && npm run typecheck` + 相关测试；必要时再 `npm test` / `npm run build`。
- 涉及 GB2760 数据准入：按任务要求运行 `npm run validate:gb2760` 或对应数据校验命令。

禁止为通过测试屏蔽错误、删除断言或用 mock 假装完成。每个页面必须有 loading/empty/error 三态。未运行某类验证时要说明原因。

---

## 7. 页面与体验要求

移动端优先；统一组件与 CSS 变量；loading/empty/error 不空白不丑陋；iPhone Safari/PWA 安全区适配；报告页不医疗化。禁止文案：`可以买/不能买/健康/不健康/安全/有害/致癌/治疗/诊断/一定过敏/绝对安全/绝对有害/一定致敏/一定不能吃/有毒`。

**产品蓝图规范（强制，详见 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)）：**

- 任何页面开发必须遵守 [`docs/product-blueprint/DESIGN_SYSTEM.md`](./docs/product-blueprint/DESIGN_SYSTEM.md)。
- 任何消费者决策体验必须遵守 [`docs/product-blueprint/CONSUMER_DECISION_SPEC.md`](./docs/product-blueprint/CONSUMER_DECISION_SPEC.md) 与 [`docs/product-blueprint/CONSUMER_UX_SPEC.md`](./docs/product-blueprint/CONSUMER_UX_SPEC.md)。
- 任何视觉开发必须遵守 [`docs/product-blueprint/VISUAL_STYLE_GUIDE.md`](./docs/product-blueprint/VISUAL_STYLE_GUIDE.md)。
- 任何前端开发必须遵守 [`docs/product-blueprint/FRONTEND_SPEC.md`](./docs/product-blueprint/FRONTEND_SPEC.md)。
- 任何新页面必须登记到 [`docs/product-blueprint/PAGE_STRUCTURE.md`](./docs/product-blueprint/PAGE_STRUCTURE.md)。
- 任何跨端能力必须遵守 [`docs/product-blueprint/CROSS_PLATFORM_SPEC.md`](./docs/product-blueprint/CROSS_PLATFORM_SPEC.md)。
- 任何接口变更必须同步 [`docs/product-blueprint/API_CONTRACT.md`](./docs/product-blueprint/API_CONTRACT.md)。
- 任何数据可信展示必须遵守 [`docs/product-blueprint/DATA_TRUST_SPEC.md`](./docs/product-blueprint/DATA_TRUST_SPEC.md)。
- 任何隐私/权限相关功能必须遵守 [`docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`](./docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md)。
- 任何功能完成后必须按 [`docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`](./docs/product-blueprint/QA_ACCEPTANCE_SPEC.md) 验收。

补充红线：不允许每个页面单独发明颜色、按钮、卡片、状态文案；不允许前端暴露 OCR Key / AI Key；不允许 OCR 结果跳过文本确认页；不允许 AI 生成权威结论；不允许提交字体文件；不允许把大图片存入 localStorage；不允许自动部署生产。

---

## 8. 输出格式

每轮任务完成后输出：完成内容、修改文件、验证结果（已执行命令+通过/失败+失败原因）、当前进度百分比、后续建议。不要只说"已完成"。
