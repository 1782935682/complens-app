# AGENTS.md

编码 Agent（Codex 等）在本仓库工作的强制规范。详细产品说明和历史完整开发约定见 [`readme.md`](./readme.md)，任务清单见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)。

---

## 1. 项目主路径（不可偏离）

CompLens / 成分镜是**食品配料表拍照识别与成分分析 App**。主路径：

```
拍照/上传 → OCR 识别 → 文本确认修正 → 配料拆分 → 数据库匹配
→ 数据来源/可信等级展示 → 分析报告 → 产品档案/历史
```

**OCR 拍照识别是核心主路径，成分搜索只是辅助功能。** 不得把成分搜索写成主路径，不得把 OCR 写成附属功能。当前阶段只做食品配料/食品添加剂。

---

## 2. 五条不得伪造红线

1. **不得伪造数据**：AI 不能编造成分数据、法规来源、ADI、限量、条款编号、安全结论；GB2760 官方来源只用国家卫健委公告和食品安全国家标准数据检索平台。
2. **不得伪造 OCR**：无 Key 不返回假识别文字；`mock` 必须标注；无 Key 必须保留 manual 降级，不崩溃。
3. **AI 不是权威来源**：AI 只做总结、通俗解释、非医疗化提示；不替代 OCR/数据库；不给医疗诊断。
4. **不得把 seed 当完整库**：112 条基础库不是完整食品添加剂库。
5. **不得把不确定数据展示为结论**：`pending_review` / `unverified` / `mapped_candidate` 不能展示为已验证。

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

---

## 6. 每个 Batch 验收

```bash
npm run validate:data && npm run lint && npm run test && npm run build
# 涉及后端：
cd backend && npm run typecheck && npm test && npm run build
# 涉及 GB2760（Batch 1-D 实现后）：
npm run validate:gb2760
```

禁止为通过测试屏蔽错误、删除断言或用 mock 假装完成。每个页面必须有 loading/empty/error 三态。纯文档修改至少 `git diff --check` 并说明未运行命令原因。

---

## 7. 页面与体验要求

移动端优先；统一组件与 CSS 变量；loading/empty/error 不空白不丑陋；iPhone Safari/PWA 安全区适配；报告页不医疗化。禁止文案：`绝对安全/绝对有害/治疗疾病/一定致敏/一定不能吃/致癌/有毒`。

---

## 8. 输出格式

每轮任务完成后输出：完成内容、修改文件、验证结果（已执行命令+通过/失败+失败原因）、当前进度百分比、后续建议。不要只说"已完成"。
