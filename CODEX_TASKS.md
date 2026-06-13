# Codex 开发任务清单

> **使用说明**：每次让 Codex 继续开发时，告诉它"按 CODEX_TASKS.md 中最早未完成的任务执行"。每个批次完成后将状态改为 `✅ 已完成 YYYY-MM-DD`。

---

## 任务执行规则

1. **按顺序执行**，不跳过、不合并跨阶段任务。
2. **每个批次对应一个 PR**，PR 合并后再开始下一批次。
3. 每个批次完成后必须同步更新 `PROJECT_PLAN.md` 的进度和修改记录。
4. `[人工]` 任务需要人工操作完成并在本文件中标注后，Codex 再继续。
5. `[Codex]` 任务由 Codex 独立完成并提交 PR。
6. `[人工+Codex]` 任务需人工先完成前置操作，Codex 再执行编码部分。
7. 每个 Codex 批次结束前必须全部通过：`npm run validate:data && npm run lint && npm run test && npm run build`（后端改为对应命令）。
8. 禁止为通过测试/构建而屏蔽错误、删除断言或使用 mock 假装功能完成。
9. 禁止自动 push 到 `main`，所有代码必须通过 PR 合并。
10. **OCR 是产品核心功能**，未配置 OCR API Key 时必须有手动输入降级路径，不能崩溃报死。
11. **AI 只能作为解释层**，不能编造数据来源、不能生成医疗诊断、不能替代数据库中的原始安全结论。
12. 禁止用 100 条 seed 样本充当完整数据集，禁止把未验证数据展示为权威结论。
13. **禁止用 localStorage 存储图片或大型 blob**，图片必须用 IndexedDB；localStorage 只存索引/元数据。
14. 每个页面必须实现 loading / empty / error 三种状态，不允许只做 happy path。

---

## 技术栈速查

| 层级 | 技术 | 说明 |
|---|---|---|
| 前端语言 | 纯 JS ES2022+ | 无 TypeScript，JSDoc 注释类型 |
| 前端框架 | 无 | 无 React/Vue/Svelte |
| 前端构建 | Vite | 已接入 |
| 前端路由 | 自实现 hash 路由 | window.location.hash |
| 移动端打包 | Capacitor 7.x | 已接入 |
| 后端语言 | Node.js 20 + TypeScript | 位于仓库 `backend/` 子目录 |
| 后端框架 | Hono | 轻量级 |
| ORM | Drizzle ORM + PostgreSQL | |
| 前端本地图片存储 | IndexedDB | localStorage 只存元数据 |
| 前端测试 | Node.js 原生 assert | scripts/test.mjs |
| 后端测试 | Vitest | backend/tests/ |
| CI | GitHub Actions | .github/workflows/ |

---

## 设计语言规范（全局生效）

所有批次必须遵守以下设计规范，**不允许使用内联颜色或魔法数字**，统一在 `src/styles.css` 中通过 CSS 变量引用：

```css
/* 风险色系 */
--color-risk-high:      #ef4444;   /* 红 — 高关注 */
--color-risk-medium:    #f59e0b;   /* 橙 — 需关注 */
--color-risk-low:       #22c55e;   /* 绿 — 较安全 */
--color-unverified:     #9ca3af;   /* 灰 — 数据未验证 */
--color-unknown:        #6b7280;   /* 深灰 — 未收录 */

/* 个性化色系 */
--color-allergen:       #dc2626;   /* 过敏原 */
--color-avoid:          #ea580c;   /* 忌口项 */
--color-watch:          #2563eb;   /* 关注成分 */

/* 交互 */
--color-primary:        #0ea5e9;
--color-primary-dark:   #0284c7;
--radius-card:          12px;
--radius-btn:           8px;
--transition-fast:      150ms ease-out;
--shadow-card:          0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06);

/* 字体 */
--font-size-xs:   12px;
--font-size-sm:   14px;
--font-size-base: 16px;   /* 移动端输入框最小 16px，防止 iOS 自动缩放 */
--font-size-lg:   18px;
--font-size-xl:   20px;
--font-size-2xl:  24px;
```

---

## 产品定位

**CompLens / 成分镜（项目代号 CompCheck）** 是一个面向普通用户的食品配料表拍照识别与成分分析 App。

### 核心用户流程

```
拍照/上传食品配料表图片
  → [客户端] 图片预处理（EXIF 修正 + 压缩 + IndexedDB 存储）
  → OCR 识别文字（real/manual/fallback 三模式）
  → 用户确认和修正识别文本 + 填写产品名称
  → 自动拆分配料（含 OCR 噪声修正 + E-number 识别）
  → 批量匹配食品成分/食品添加剂数据库
  → 标出重点关注项（过敏原/忌口/高风险）
  → 生成食品配料分析报告（含整体风险评级 + 分类统计）
  → 保存产品档案（IndexedDB 存图，JSON 存元数据）
  → 历史查询 / 收藏 / 分享
```

**成分搜索是辅助功能，不是主路径。**

### 产品边界

- 当前阶段只做「食品配料 / 食品添加剂」，不混入化妆品、护肤品、药品。
- 数据必须来自可追溯的官方来源，AI 不能作为原始数据来源。
- 所有风险提示必须谨慎表达，不构成医疗建议。
- 禁止文案：`绝对安全 / 绝对有害 / 治疗疾病 / 一定致敏 / 一定不能吃`
- 推荐文案：`建议关注 / 部分人群可能需要留意 / 仅供配料信息参考 / 不构成医疗建议`

---

## 人工阻塞处理规则

如遇需要人工介入的任务，**不停止自动化流程**：标记 `⏸ blocked_by_user` → 记录原因 → 跳过 → 继续后续任务。

| 阻塞项 | 解锁什么 |
|---|---|
| OCR API Key | 真实 OCR 识别 |
| AI API Key | 真实 AI 解释 |
| 生产数据库连接串 | 生产环境数据查询 |
| Apple Developer 账号 | iOS 打包/上架 |
| Google Play 账号 | Android 打包/上架 |
| 国内应用商店账号 | 国内上架 |
| 服务器/CDN 账号 | 生产部署 |
| 支付/订阅账号 | 订阅功能 |
| 隐私政策法律确认 | 合规上架 |
| 软著/备案/商标材料 | 国内合规 |

---

## 部署资源、成本控制与人工部署原则

当前阶段优先使用已有的 Oracle Cloud 服务器作为默认部署和验证环境。这里的 Oracle 指 Oracle Cloud 服务器，不是 Oracle 数据库。

在 MVP 和内部测试阶段，项目中的后端服务、数据库、Redis、Nginx、OCR 服务、文件临时存储等组件，默认优先部署到现有 Oracle Cloud 机器上。除非明确必要，不要默认引入新的付费云服务器、RDS、OSS、云 Redis、GPU 服务器、CDN 或其他收费基础设施。

如果某个组件因为架构限制、性能不足、系统兼容性、网络访问、备案合规或应用商店上架要求，确实需要购买服务器或云服务，必须先明确提示：

- 为什么现有 Oracle Cloud 机器无法满足；
- 需要购买什么资源；
- 推荐的最低配置和生产配置；
- 是否当前阶段必须购买；
- 是否可以先用替代方案或临时方案继续推进；
- 预计该资源用于哪些组件或场景。

只有在产品进入正式上线、应用商店上架、真实用户访问，或现有 Oracle Cloud 机器无法承载时，才考虑购买新的阿里云、腾讯云等正式服务器。

当前阶段不允许自动部署。Codex 可以生成部署文档、Dockerfile、docker-compose.yml、环境变量模板、初始化脚本和人工执行命令，但不得自动执行任何真实部署动作。

未经明确授权，禁止执行以下操作：

- 自动连接 Oracle Cloud、阿里云、腾讯云或其他远程服务器；
- 自动执行 SSH、scp、rsync 等远程操作；
- 自动执行 docker compose up、docker run、systemctl、nginx reload 等会改变服务器状态的命令；
- 自动初始化或迁移生产/测试数据库；
- 自动修改服务器防火墙、安全组、端口、域名解析、HTTPS 证书；
- 自动创建、购买、开通或变更任何云资源；
- 自动配置 CI/CD 部署流水线并触发上线。

如果某个功能确实需要部署或服务器操作，Codex 只能输出人工操作步骤和命令，并说明：

- 为什么需要部署；
- 需要我在哪台机器执行；
- 每条命令的作用；
- 是否有风险；
- 风险影响范围；
- 如何回滚；
- 是否会影响现有服务。

除非我明确说“可以执行部署”或“现在帮我部署”，否则 Codex 只能修改代码、文档、配置模板和部署说明，不允许进行实际部署。

当前阶段的优先目标是：低成本跑通完整业务链路，包括拍照上传、OCR 识别、成分解析、风险提示、历史记录和基础管理能力，而不是提前做高成本生产化部署。

---

## 当前优先级（2026-06-12 重排）

```
1. 食品成分/食品添加剂数据源准确性
2. 数据完整度
3. 数据库真实对接（生产级）
4. OCR 拍照识别产品闭环   ← 核心，必须前置
5. 配料表文本解析和成分匹配
6. 食品配料分析报告
7. 产品档案、收藏、历史
8. 前端账号登录 UI
9. 移动端 / PWA 使用体验
10. AI 总结和解释
11. 订阅、支付、上架  ← 必须后置
```

---

## 已完成任务归档

| 批次 | 名称 | 完成日期 |
|---|---|---|
| Batch U-B | 关注成分与忌口项跨设备同步 | ✅ 2026-06-12 |
| Batch F-B | 历史列表与产品收藏管理 | ✅ 2026-06-12 |
| Data Batch 1-C | 数据版本管理与审核状态后台化 | ✅ 2026-06-12 |
| Batch F-A | 产品档案与 IndexedDB 图片存储 | ✅ 2026-06-12 |
| Batch R-A | 食品配料分析报告页 | ✅ 2026-06-12 |
| Batch P-B | 数据库批量成分匹配 | ✅ 2026-06-12 |
| Batch P-A | 配料表文本解析增强 | ✅ 2026-06-12 |
| Batch O-C | 识别文本确认与修正页 | ✅ 2026-06-12 |
| Batch O-B | OCR 服务抽象层与模式切换 | ✅ 2026-06-12 |
| Batch O-D | 图片预处理服务（EXIF 修正 + 压缩 + IndexedDB） | ✅ 2026-06-12 |
| Batch O-A | 拍照/上传入口与产品质量体验 | ✅ 2026-06-12 |
| Data Batch 1-A | 来源字段、数据库 API 和前端降级闭环 | ✅ 2026-06-12 |
| Batch 0-A | 修复测试失败（阿斯巴甜/三氯蔗糖风险等级） | ✅ 2026-06-11 |
| Batch 1-A | 食品数据扩充确认（100 条 seed） | ✅ 2026-06-11 |
| Batch 1-B | 前端已知缺口修复（5 个场景） | ✅ 2026-06-11 |
| [人工] 解锁 Vite | readme.md 第 21 节修改 | ✅ 2026-06-11 |
| Batch 2-A | 前端工程化迁移（Vite） | ✅ 2026-06-11 |
| Batch 2-B | Capacitor 项目脚手架 | ✅ 2026-06-11 |
| Batch 2-C | 原生权限与移动端适配 | ✅ 2026-06-11 |
| Batch 3-A | 后端项目初始化（Hono/TS） | ✅ 2026-06-11 |
| Batch 3-B | 数据库 Schema 与成分 API | ✅ 2026-06-11 |
| Batch 3-C | 账号与鉴权 | ✅ 2026-06-11 |
| Batch 3-D | 收藏与历史云同步 | ✅ 2026-06-12 |

---

## 阶段 1：数据源准确性与数据完整度

> 目标：先保证数据可信、可查、可维护、可追溯。所有数据必须有来源依据，不允许 AI 编造安全结论。

### Data Batch 1-B：官方来源导入与逐条审核流程 `[人工+Codex]`

**状态**：🔄 进行中（2026-06-13 已建立基础权威数据底座：5 条 `verified_regulation`、27 条 `verified_jecfa`、12 条 `common_ingredient`、68 条 `unverified`；GB 2760 官方 PDF 已完成 264 页全文转换并接入 `gb2760_official_pages` seed 通路；表 A.1 第 8-148 页已转换为 2404 行 staging，其中 957 行按唯一名称/别名或单一 INS 码精确匹配关联 91 个现有食品添加剂 ID，1447 行尚未匹配本地 ingredient；100 条 seed 中有 A.1 证据的 91 条已全部覆盖，9 条无可结构化 A.1 证据；GB 2760 自动抽取行仍待人工审核、去重/归并和正式库升级）

**目标**：不一次性补齐所有食品配料，先建立“基础权威库 + 持续扩充 + 人工校验队列”的可追溯数据导入流程。

**涉及文件**：
- `DATA_SOURCES.md`
- `src/data/foodAdditives.js`
- `src/data/gb2760OfficialStaging.js`
- `src/data/gb2760OfficialGeneratedA1Staging.js`
- `src/data/commonFoodIngredients.js`
- `scripts/generate-gb2760-a1-staging.mjs`
- `scripts/validate-data.mjs`
- `backend/src/db/schema.ts`
- `backend/src/db/migrations/`
- `backend/scripts/seed.ts`
- `PROJECT_PLAN.md`、`AI_REVIEW.md`

**人工操作（先做，阻塞 Codex 部分）**：
- [x] 确认本阶段先从官方来源导入（2026-06-12 用户确认“继续加官方数据”）
- [x] 首批 10 条高频食品添加剂按已有字段格式补充 JECFA 可追溯条目（`sourceName`、`sourceVersion`、`effectiveDate`、`regulatoryBasis`、`rawSourceText`）
- [x] 第二批 22 条食品添加剂按已有字段格式补充 JECFA 可追溯条目
- [x] 确认 JECFA-only 数据只能从 `'unverified'` 升级为 `'reviewed'` / `'medium'`，不能升级为 `'verified'` / `'high'`
- [x] 确认 JECFA 只作为安全评价来源，不作为 GB 2760 中国法规使用范围
- [x] 确认 GB 2760-2024 官方来源：国家卫健委公告（2024 年第 1 号）和食品安全国家标准数据检索平台标准文本记录（发布日期 2024-02-08，实施日期 2025-02-08，附件 ID `43C9B75E-3D84-4577-80FC-0F7D77D36407`）
- [x] 从官方 PDF 表 A.1 首批确认 5 条 GB 2760 条款级使用范围和限量：`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate`
- [ ] 继续确认 GB 2760-2024 条款编号、逐食品类别限量和中国适用条件
- [ ] 在此处标注完整来源清单人工完成：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. [x] 官方数据导入：为每条人工审核过的数据补全来源字段，未被确认的继续保留 `unverified`/`false`，不得随意升级。
2. [x] JECFA 映射：已匹配 32 条 JECFA 安全评价条目，其中 27 条仍为 `verified_jecfa`；5 条在完成 GB 2760 官方 PDF 条款核验后升级为 `verified_regulation`，JECFA 仅保留为补充来源。
3. [x] 常见配料词库：新增 12 条 `common_ingredient`，只用于普通食品配料识别，不作为法规或安全评价来源。
4. [x] 数据可信等级展示：搜索、详情、数据页、分析报告和导出展示数据状态、来源、待确认和低置信提示。
5. [x] 建立硬性规则：任何新增条目缺失来源字段、状态字段或误把 JECFA 标成法规验证时，`validate:data` 必须报错退出。
6. [x] GB 2760 官方来源导入：已导入 GB 2760-2024 官方标准文本基础字段、平台 `rawSourceText` 和首批 5 条官方 PDF 表 A.1 条款级限量；无法可靠结构化的其余逐项限量、条款编号和适用类别不得编造结构化结论。
7. [x] GB 2760 官方 PDF staging 入库：新增 `gb2760_official_records` 表和 seed 通路，将官方 PDF 表 A.1 按“添加剂 × 食品类别 × 限量/备注”逐行存储，保留 PDF 页码、标准页码、平台记录 ID、附件 ID、PDF SHA-256 和审核状态。
8. [x] GB 2760 官方 PDF 全文转换：新增 `src/data/gb2760OfficialFullText.js`、`gb2760_official_pages` 表和 seed 通路，将官方 PDF 全 264 页按页保存为可追溯文本、页 SHA-256 和官方来源元数据。
9. [x] GB 2760 表 A.1 全页 staging 转换：新增 `scripts/generate-gb2760-a1-staging.mjs`，用 `pdftotext -bbox-layout` 将表 A.1 PDF 第 8-148 页转换为 `src/data/gb2760OfficialGeneratedA1Staging.js`，再与人工校对行合并为 2404 行 staging；脚本已加入标题续行、脚注过滤和已定位跨行食品分类校正；自动抽取行保持 `needs_review`。
10. [x] OCR 未匹配收集：OCR 来源报告的未收录条目以 `unknown_from_ocr` / `ocr_unmatched` 汇总到数据治理页人工校验队列。
11. [x] 人工校验队列：`/data` 页提供 OCR 未收录、低置信候选和静态未验证数据的只读审核入口，并通过数据纠错表单提交校验线索；真实升级仍需人工来源确认。
12. [x] 继续输出数据质量报告：`validate:data` 和数据治理页继续展示总数、JECFA 匹配、普通配料、未验证、待确认、来源版本分布和复核清单。

**验收标准**：

```bash
npm run validate:data   # 通过并输出数据质量报告
npm run lint && npm run test && npm run build
cd backend && npm run db:migrate && npm run db:seed && npm run typecheck && npm test
```

**阻塞条件**：完整 GB 2760 条款级限量、68 条未审核记录和 OCR 未匹配人工校验仍需人工来源核验。  **是否需要人工**：是，人工先行。

**2026-06-12 自动化处理记录**：已识别为人工前置任务；未新增或伪造任何官方来源数据，跳过 Codex 部分并继续执行后续不依赖该人工项的 OCR/解析/匹配任务。

**2026-06-12 首批官方数据导入记录**：用户确认继续加官方数据后，已从 WHO JECFA Food Additives and Contaminants Database 导入 10 条高频添加剂精确名称条目和 ADI 摘要：`citric-acid`、`sodium-citrate`、`potassium-sorbate`、`sodium-benzoate`、`ascorbic-acid`、`xanthan-gum`、`aspartame`、`sucralose`、`sodium-bicarbonate`、`sodium-cyclamate`。这些条目升级为 `reviewStatus: 'reviewed'`、`confidenceLevel: 'medium'`，但 `isVerified` 仍为 `false`，`usageLimits` 仍为空数组，避免伪造 GB 2760 逐食品类别限量。`npm run validate:data` 已输出数据质量报告：reviewed=10、verified=0、unverified=90、missingSourceFields=0、missingUsageLimits=100。

**2026-06-12 第二批官方数据导入记录**：PR #66 合并后继续从 WHO JECFA Food Additives and Contaminants Database 导入 22 条可直接映射的 JECFA 条目和 ADI 摘要：`pectin`、`calcium-carbonate`、`tartrazine`、`sunset-yellow-fcf`、`allura-red-ac`、`glycerol`、`calcium-chloride`、`sodium-alginate`、`acesulfame-potassium`、`carrageenan`、`guar-gum`、`polysorbate-80`、`sodium-nitrite`、`potassium-nitrate`、`potassium-citrate`、`calcium-citrate`、`lactic-acid`、`sodium-acetate`、`calcium-propionate`、`natamycin`、`propylene-glycol-alginate`、`sodium-carboxymethyl-cellulose`。累计 32 条为 `reviewStatus: 'reviewed'`、`confidenceLevel: 'medium'`，但 `isVerified` 仍为 `false`，`usageLimits` 仍为空数组。`npm run validate:data` 输出：reviewed=32、verified=0、unverified=68、missingSourceFields=0、missingUsageLimits=100。

**2026-06-12 基础权威数据底座记录**：新增分层字段 `dataStatus`、`matchConfidence`、`sourceScope`、`reviewNote`，后端 schema/seed/API 同步；当前食品基础库 112 条，其中 `verified_regulation=5`、`verified_jecfa=27`、`mapped_candidate=0`、`common_ingredient=12`、`unverified=68`、`unknown_from_ocr=0`。分析报告已展示已匹配数量、待确认数量、暂未收录数量、每个配料的数据状态、数据来源和低置信度提示。本批次不新增 AI 编造数据，不把 JECFA 当成 GB 2760 使用范围，不强行补齐全部食品配料。

**2026-06-12 人工校验队列记录**：新增 `reviewQueueService` 和数据治理页“人工校验队列”，从本机报告聚合 OCR 未收录项、低置信候选项，并从静态数据聚合 `unverified` / `mapped_candidate` / `seed_reference` 记录。队列仅作为人工校验入口和数据纠错线索，不自动升级 `dataStatus`、`isVerified`、GB 2760 使用范围或限量。

**2026-06-12 GB 2760-2024 官方来源记录**：用户确认 GB 2760-2024 官方来源以国家卫健委公告和食品安全国家标准数据检索平台为准。已从食品安全国家标准数据检索平台检索到标准文本记录：`CODE=GB 2760-2024`、`TITLE=食品安全国家标准 食品添加剂使用标准`、发布日期 `2024-02-08`、实施日期 `2025-02-08`、标准文本 ID `6CA1489A-9570-4906-8CE8-CC86FBFB1941`、附件 ID `43C9B75E-3D84-4577-80FC-0F7D77D36407`、平台文件名 `1747898473246.pdf`。官方 PDF 已保存到 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`（`2600140` bytes，SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`），不提交到应用仓库。该步先将未验证 seed 的主来源更新为“国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台”，并把平台记录写入 `rawSourceText`；条款级结构化导入见下一条记录。

**2026-06-12 GB 2760 首批官方 PDF 条款级导入记录**：基于 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`（SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`）和食品安全国家标准数据检索平台官方记录，首批导入 5 条可可靠结构化的表 A.1 数据：`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate`。这些条目升级为 `reviewStatus: 'verified'`、`dataStatus: 'verified_regulation'`、`sourceScope: 'gb_2760_regulation'`、`confidenceLevel: 'high'`、`isVerified: true`，并写入 `usageLimits`、适用食品类别、PDF 页码/标准页码和官方来源引用；其余记录继续保持未验证或 JECFA-only 状态。

**2026-06-13 GB 2760 官方 PDF staging 入库初始记录**：新增 `src/data/gb2760OfficialStaging.js` 和后端 `gb2760_official_records` 表，将官方 PDF 表 A.1 抽取结果按行存入数据库 staging 层。初始行级 staging 数据为 446 行：其中 414 行关联 91 个现有添加剂 ID，32 行为尚未匹配本地 ingredient 的官方 PDF 第 8-11 页记录；13 行与首批 5 条 `verified_regulation` 的正式 `usageLimits` 对齐，433 行为 `needs_review`。100 条食品添加剂 seed 中，91 条在官方 PDF 表 A.1 找到可匹配条目并已进入 staging；`calcium-citrate`、`citral`、`ethyl-maltol`、`ethyl-vanillin`、`isomalt`、`konjac-gum`、`menthol`、`potassium-benzoate`、`vanillin` 这 9 条未找到可结构化 A.1 证据，当前不强行编造 staging 行。这些 `needs_review` 行只代表官方 PDF 原文、页码和限量已进入 staging，不自动升级正式成分详情、不修改 `isVerified`。

**2026-06-13 GB 2760 官方 PDF 第 8-14 页继续抽取记录**：继续从官方 PDF 表 A.1 第 8-11 页补入未匹配本地 ingredient 的官方记录，包括 `4-己基间苯二酚`、`5'-肌苷酸二钠`、`5'-鸟苷酸二钠`、`D-甘露糖醇`、`DL-苹果酸钠`、`L-半胱氨酸盐酸盐`、`L-丙氨酸`、`L(+)-酒石酸，dl-酒石酸`、`L-苹果酸钠`、`α-环状糊精`、`β-阿朴-8'-胡萝卜素醛`；同时补齐第 12-14 页 `β-胡萝卜素` 续表。新增记录均保持 `reviewStatus: 'needs_review'`，只作为官方 PDF 行级 staging 证据。

**2026-06-13 GB 2760 官方 PDF 第 15-35 页继续抽取检查点**：继续补入 `β-环状糊精`、`γ-环状糊精`、`ε-聚赖氨酸`、`ε-聚赖氨酸盐酸盐`、`阿拉伯胶`、`阿力甜`、`阿斯巴甜`、`爱德万甜`、`安赛蜜`、`氨基乙酸`、`铵磷脂`、`巴西棕榈蜡`、`白油`、`半乳甘露聚糖`、`苯甲酸及其钠盐`、`冰结构蛋白`、`冰乙酸（低压羰基化法）`、`丙二醇`、`丙二醇脂肪酸酯`、`茶多酚`、`茶多酚棕榈酸酯`、`茶黄素`、`赤藓红及其铝色淀`、`刺梧桐胶`、`刺云实胶`、`醋酸酯淀粉`、`达瓦树胶`、`单辛酸甘油酯`、`氮气`、`淀粉磷酸酯钠`、`靛蓝及其铝色淀`、`丁基羟基茴香醚（BHA）`、`二丁基羟基甲苯（BHT）`、`二甲基二碳酸盐` 等表 A.1 行。该检查点曾为 750 行，其中 737 行 `needs_review`；已被后续全页转换记录扩展。

**2026-06-13 GB 2760 官方 PDF 表 A.1 全页转换记录**：新增 `scripts/generate-gb2760-a1-staging.mjs`，基于官方 PDF 和 `pdftotext -bbox-layout` 的坐标文本，将表 A.1 PDF 第 8-148 页（标准页 5-145）转换为 `src/data/gb2760OfficialGeneratedA1Staging.js`，再与人工校对过的 750 行合并、过滤重复，形成 2404 行 `gb2760_official_records` staging 数据。当前 13 行为 `verified`，2391 行为 `needs_review`，覆盖 141 个表 A.1 PDF 页；自动 ingredient 关联只使用唯一名称/别名或单一 INS 码精确匹配，INS 子码不折叠，多 INS 组合继续留待人工归并；抽取脚本已加入标题续行、脚注过滤和已定位跨行食品分类校正；新增自动抽取行只作为原文、页码和限量进入 staging 的证据，不自动升级正式 `ingredients.usageLimits`。

**2026-06-13 GB 2760 官方 PDF 全文转换记录**：新增 `scripts/generate-gb2760-fulltext.mjs`、`src/data/gb2760OfficialFullText.js`、后端 `gb2760_official_pages` 表和 seed 通路，将官方 PDF 全 264 页按页转换为文本并保存页 SHA-256、PDF SHA-256、平台记录 ID、附件 ID、下载接口和提取工具信息。该全文层用于保证官方 PDF 全量可追溯；表 A.1 逐食品类别限量仍需从全文层继续拆分到 `gb2760_official_records`，不能把全文页自动当成正式 `usageLimits`。

**2026-06-13 GB 2760 seed 覆盖审计记录**：`scripts/validate-data.mjs` 新增 seed 覆盖报告，校验 `src/data/foodAdditives.js` 的 100 条食品添加剂 seed 与 `gb2760_official_records` staging 的覆盖关系。当前输出为 `matchingCovered=91/91`、`noA1Evidence=9`、`unexpectedUncovered=none`；这表示有 A.1 证据的 seed 已 100% 进入 staging，而不是 PDF 只有 100 条。官方 PDF 全 264 页仍由 `gb2760_official_pages` 全文层完整保存，表 A.1 PDF 第 8-148 页已进入行级 staging。

---

### Data Batch 1-C：数据版本管理与审核状态后台化 `[Codex]`

**状态**：✅ 已完成 2026-06-12（Data Batch 1-B 人工来源审核仍保持 blocked_by_user）

**目标**：建立数据版本追踪和审核状态的可持续流程。

**涉及文件**：
- `backend/src/db/schema.ts`（追加字段）
- `backend/src/routes/ingredients.ts`（新增 confidenceLevel 筛选）
- `src/services/ingredientApiService.js`
- `src/pages/dataPage.js`
- `scripts/validate-data.mjs`

**实现内容**：

1. `ingredients` 表追加：`data_version VARCHAR`（批次标识，如 `"2026-06-v1"`）、`reviewed_by VARCHAR`（审核人，可为 `"system"` 或人名）、`reviewed_at TIMESTAMP`、`change_note TEXT`。
2. seed 脚本支持版本号参数 `--version`，幂等导入，版本不同时写入 `change_note`。
3. `GET /api/ingredients` 支持 `?confidenceLevel=high|medium|low|unverified` 筛选。
4. 前端 `/data` 页新增：
   - 来源筛选下拉（按 `sourceName`）
   - 可信等级筛选（high / medium / low / unverified）
   - 未验证数据比例指标（如"90% 待审核"）
5. 文档明确：本地开发数据库已完成，生产数据库属于人工阻塞项。

**验收标准**：

```bash
npm run validate:data && npm run lint && npm run test && npm run build
cd backend && npm run db:migrate && npm run db:seed && npm run typecheck && npm test
curl "http://127.0.0.1:3000/api/ingredients?confidenceLevel=unverified&limit=5"
```

**阻塞条件**：无。  **是否需要人工**：否。

**2026-06-12 完成记录**：已新增 `reviewed_by`、`reviewed_at`、`change_note` 字段和 `confidence_level` / `data_version` 索引；seed 脚本支持 `--version`、`--reviewed-by`、`--change-note`，版本变更时写入变更说明；后端列表/search API 支持可信等级筛选；前端 `/data` 页支持来源和可信等级筛选，并展示可信等级统计和待审核比例。本批次没有把任何 seed 数据升级为 reviewed/verified。

---

## 阶段 2：数据库真实对接（生产级补完）

### Batch D-A：生产数据库选型与配置 `[人工]`

**状态**：⏸ blocked_by_user

- [ ] 选择数据库托管平台（推荐 Railway PostgreSQL 或 Supabase）
- [ ] 选择后端部署平台（推荐 Railway 或 Fly.io）
- [ ] 在对应平台创建账号，获取生产连接字符串
- [ ] 数据库平台：`[填写]`  /  后端部署平台：`[填写]`
- [ ] 生产 `DATABASE_URL` 配置到平台环境变量，**不提交代码**
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch D-B：生产数据库迁移与数据首次导入 `[人工+Codex]`

**状态**：⏸ blocked_by_user（依赖 D-A）

**Codex 任务**：

1. 新建 `backend/scripts/migrate-prod.sh`：读取 `DATABASE_URL` 环境变量，执行 Drizzle 迁移，幂等安全（已迁移的跳过）。
2. 新建 `backend/scripts/seed-prod.sh`：将当前食品添加剂 seed 导入生产库，幂等 upsert，避免重复导入。
3. 补充 `COMMANDS.md` 生产迁移/seed 命令说明。
4. 更新 `PROJECT_PLAN.md` 生产数据库状态。

**验收标准**：

```bash
# 生产（人工运行）
DATABASE_URL=<prod> bash backend/scripts/migrate-prod.sh
DATABASE_URL=<prod> bash backend/scripts/seed-prod.sh
curl https://api.your-domain.com/health    # db: "ok"
curl "https://api.your-domain.com/api/ingredients?limit=3"
# 本地
cd backend && npm run db:migrate && npm run db:seed && npm test
```

---

## 阶段 3：OCR 拍照识别产品闭环

> 核心阶段，必须前置。OCR API Key 属于人工阻塞，但没有 Key 时必须用 manual 模式走通完整主路径，不能崩溃。

---

### Batch O-A：拍照/上传入口与产品质量体验 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：把扫描页从"占位壳子"升级为真正可用的产品拍照入口，覆盖相机、相册、权限异常、图片预览、质量引导全链路。

**涉及文件**：
- `src/pages/scanPage.js`（大幅增强）
- `src/pages/homePage.js`（首页主入口突出显示）
- `src/services/nativeBridgeService.js`（增强）
- `src/styles.css`（扫描页专属样式）
- `scripts/test.mjs`（新增测试）

**实现内容**：

#### 1. 首页主入口

首页主操作区（Hero 区，页面最显眼位置）：

```
┌────────────────────────────────────┐
│  成分镜                             │
│  拍照识别食品配料表，了解每种成分     │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  📷  拍照识别配料表           │  │   ← 主 CTA，全宽，height 56px
│  └──────────────────────────────┘  │
│                                    │
│  最近分析  ·  成分搜索               │   ← 次要入口，文字链接即可
└────────────────────────────────────┘
```

- 主 CTA 按钮样式：背景 `--color-primary`，字体 18px，font-weight 600，border-radius `--radius-btn`
- 点击后跳转 `#/scan`

#### 2. 扫描页布局

```
┌────────────────────────────────────┐
│  ← 返回        拍照识别             │   ← 顶部导航
├────────────────────────────────────┤
│                                    │
│  [图片预览区 / 占位区]               │   ← 固定高度 220px，object-fit cover
│  未选择图片时：灰色虚线框             │
│  "点击选择食品配料表照片"             │
│                                    │
├────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  │
│  │  📷 拍照    │  │  🖼 相册    │  │   ← 两个等宽按钮，height 48px
│  └─────────────┘  └─────────────┘  │
├────────────────────────────────────┤
│  📌 拍摄技巧                        │   ← 可折叠提示区（默认展开，看一次后折叠）
│  • 将配料表放置在画面中央             │
│  • 光线充足，避免反光                 │
│  • 字体区域占满画面，不需要全包装      │
└────────────────────────────────────┘
│  [ 确认并识别 ]                      │   ← 已选图片后才显示，fixed bottom
└────────────────────────────────────┘
```

#### 3. 相机/相册入口逻辑

```js
// Capacitor 原生环境
Camera.getPhoto({ resultType: 'base64', source: CameraSource.Camera })
Camera.getPhoto({ resultType: 'base64', source: CameraSource.Photos })

// Web 降级
<input type="file" accept="image/*" capture="environment">  // 拍照
<input type="file" accept="image/*">                         // 相册
```

- 全部包裹 `try/catch`，任何失败静默降级到 Web input
- 相机权限被拒时，显示 toast 提示："相机权限未开启，请在系统设置中允许本 App 访问相机"，同时显示相册选择入口

#### 4. 图片预览与交互

- 选中图片后：图片预览区展示缩略图，图片右上角显示「✕ 重选」按钮
- 图片下方显示文件大小（如"图片大小：1.2 MB"）
- 若图片超过 8MB 限制，立即提示并清除预览

#### 5. 图片格式验证

支持：`jpg/jpeg/png/webp/heic/heif`
- 超过 8MB：提示"图片过大，请选择 8MB 以内的图片或重新拍摄"
- 非图片格式：提示"请选择图片文件（JPG/PNG/WebP）"

#### 6. 移动端安全区

```css
.scan-page { padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px); }
.scan-page-bottom-bar { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

#### 7. 首次使用引导

- `localStorage` 键 `compcheck:scan-tips-seen`：未见过时，拍摄技巧区默认展开并高亮；见过后折叠
- 首次进入扫描页时，图片预览区显示动画脉冲边框提示用户点击

**测试覆盖（必须在 test.mjs 新增）**：

```js
// 1. 首页有拍照识别主 CTA，链接到 #/scan
// 2. 扫描页渲染，包含相机和相册两个按钮
// 3. 非 native 环境下，nativeBridgeService.getPhoto() 不崩溃
// 4. 文件超大校验（8MB 限制）
// 5. 非图片文件类型校验
// 6. 首次使用标志存取
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# 手动验证：
# - 首页拍照识别按钮最显眼，点击跳转扫描页
# - 扫描页相机和相册按钮均可触发
# - 选中图片后预览正常显示
# - 重选图片功能正常
# - 桌面浏览器 file input 降级正常
# - iPhone Safari 底部按钮不被 Home Bar 遮挡
```

**阻塞条件**：无。  **是否需要人工**：否。

---

### Batch O-D：图片预处理服务（EXIF修正 + 压缩 + IndexedDB） `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：在 OCR 之前对图片进行客户端预处理，修正手机拍照方向、压缩体积、存储到 IndexedDB，提升 OCR 识别质量，同时不占满 localStorage。

**背景**：
- 手机拍照的 JPEG 文件通常带 EXIF Orientation 标签（值 3/6/8 等），浏览器不总是自动修正，导致 OCR 服务收到横躺的图片，识别率大幅下降。
- localStorage 上限约 5–10MB，直接存 base64 图片会很快填满。
- OCR 服务通常对超过 1MB 的图片计费更高或响应更慢，需要客户端压缩。

**涉及文件**：
- `src/utils/imageProcessor.js`（新建）
- `src/services/imageStoreService.js`（新建，IndexedDB 封装）
- `src/pages/scanPage.js`（接入预处理）
- `scripts/test.mjs`（新增测试）

**实现内容**：

#### 1. EXIF 方向修正（`imageProcessor.js`）

```js
/**
 * 通过 canvas 重绘修正 EXIF 方向，返回方向已修正的 canvas/blob。
 * 不引入外部依赖，纯 canvas 实现。
 *
 * EXIF orientation 对应的旋转：
 *   1 → 不旋转, 3 → 180°, 6 → 顺时针90°, 8 → 逆时针90°
 */
export async function fixImageOrientation(file) { ... }
```

实现步骤：
1. 读取文件的前 64KB，查找 EXIF Orientation 标签（不引入 exif-js 等库，手动解析 JPEG APP1 segment）
2. 用 `createImageBitmap` 解码图片（比 `new Image()` 性能更好）
3. 按 Orientation 值在 canvas 上做对应旋转变换
4. 输出方向正确的 ImageBitmap

#### 2. 客户端压缩（`imageProcessor.js`）

```js
/**
 * @param {File|Blob} file
 * @param {Object} opts
 * @param {number} opts.maxWidth - 最大宽度，默认 1200px
 * @param {number} opts.quality - JPEG 质量，默认 0.82
 * @param {number} opts.maxBytes - 目标最大体积，默认 800_000 (800KB)
 * @returns {Promise<{blob: Blob, width: number, height: number, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file, opts = {}) { ... }
```

压缩逻辑：
1. 先修正 EXIF 方向（调用 `fixImageOrientation`）
2. 如果原始尺寸 ≤ maxWidth 且体积 ≤ maxBytes，不压缩直接返回
3. 按比例缩放到 maxWidth，保持宽高比
4. Canvas `toBlob('image/jpeg', quality)` 输出
5. 如果压缩后仍 > maxBytes，递减 quality 0.05 重试，最多 3 次
6. 返回压缩结果和体积对比

#### 3. IndexedDB 图片存储（`imageStoreService.js`）

```js
const DB_NAME = 'compcheck-images';
const DB_VERSION = 1;
const STORE_NAME = 'scan-images';

/**
 * 存储一张图片，返回 id（UUID）
 * @param {Blob} blob
 * @param {Object} meta - { originalName, mimeType, width, height, compressedSize }
 * @returns {Promise<string>} id
 */
export async function saveImage(blob, meta) { ... }

/**
 * 读取图片，返回 { blob, meta }
 */
export async function getImage(id) { ... }

/**
 * 删除图片
 */
export async function deleteImage(id) { ... }

/**
 * 列出所有图片 meta（不返回 blob，避免内存问题）
 */
export async function listImages() { ... }

/**
 * 清理 N 天前的图片（用于自动清理历史，默认 30 天）
 */
export async function cleanOldImages(daysToKeep = 30) { ... }
```

IndexedDB schema：
```js
db.createObjectStore(STORE_NAME, { keyPath: 'id' })
// 每条记录: { id, blob, meta: { originalName, mimeType, width, height, compressedSize, createdAt } }
```

降级处理：
- IndexedDB 不可用（隐私模式等）：回退到 URL.createObjectURL，仅当前会话有效，显示提示"图片在刷新后将丢失"
- IndexedDB 配额满：提示"本地存储已满，请清理历史后重试"，调用 `cleanOldImages(7)`

#### 4. 扫描页接入

```js
// scanPage.js 中，用户选中图片后：
import { compressImage } from '../utils/imageProcessor.js';
import { saveImage } from '../services/imageStoreService.js';

const result = await compressImage(file, { maxWidth: 1200, maxBytes: 800_000 });
// 展示压缩信息（开发模式下）: "从 3.2MB 压缩到 760KB"
const imageId = await saveImage(result.blob, { ... });
// 把 imageId 存入 userStore 的 scan:pendingImageId，不存 base64
```

扫描页图片预览从 IndexedDB 读取：
```js
const { blob } = await getImage(imageId);
const objectUrl = URL.createObjectURL(blob);
imgEl.src = objectUrl;
// 组件卸载时 URL.revokeObjectURL(objectUrl)
```

#### 5. 测试覆盖

```js
// 1. compressImage 对小图（< 800KB）不压缩，直接通过
// 2. compressImage 对大图返回压缩后体积 < 原始体积
// 3. saveImage 写入 IndexedDB，getImage 可读回
// 4. IndexedDB 不可用时 saveImage 不崩溃
// 5. cleanOldImages 删除旧记录
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# 手动验证：
# - 选择手机横拍的图片，预览显示方向正确
# - 选择 3MB+ 图片，控制台显示压缩到 < 800KB
# - 刷新页面后，ImageDB 中的图片仍可读取（如果在最近历史中）
# - 隐私模式下（IndexedDB 不可用）不崩溃，显示降级提示
```

**阻塞条件**：无。  **是否需要人工**：否。

---

### Batch O-B：OCR 服务抽象层与模式切换 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：重构现有 `ocrService.js`，建立三模式（real/manual/fallback）抽象，处理超时/重试/错误分类，未配置 Key 时不崩溃。

**涉及文件**：
- `src/services/ocrService.js`（重构）
- `backend/src/routes/ocr.ts`（新建，代理占位）
- `backend/.env.example`（确认 OCR_API_KEY 占位存在）
- `scripts/test.mjs`（新增测试）
- `COMMANDS.md`（补充 OCR 说明）

**实现内容**：

#### 1. OcrResult 类型（JSDoc）

```js
/**
 * @typedef {Object} OcrResult
 * @property {'real'|'manual'|'fallback'} mode - 识别模式
 * @property {string} rawText          - 识别文本（real/fallback 为 OCR 原始文本，manual 为用户输入）
 * @property {number} confidence       - 整体置信度 0–1（manual 模式固定为 1）
 * @property {string} provider         - 'aliyun'|'tencent'|'manual'|'mock'
 * @property {boolean} requiresConfirm - 是否需要用户在确认页校对（始终为 true）
 * @property {OcrBlock[]|undefined} blocks - 分块识别结果（有则传）
 * @property {string|undefined} errorCode  - 错误码（fallback 时有）
 * @property {string|undefined} errorMsg   - 用户可读的错误描述
 */

/**
 * @typedef {Object} OcrBlock
 * @property {string} text
 * @property {number} confidence
 * @property {{ x: number, y: number, w: number, h: number }|undefined} bounds
 */
```

#### 2. 核心函数

```js
/**
 * 主入口：对压缩后的图片 blob 进行 OCR
 * @param {Blob} imageBlob - 已经过 O-D 预处理的压缩图片
 * @param {{ category?: string }} opts
 * @returns {Promise<OcrResult>}
 */
export async function recognizeImage(imageBlob, opts = {}) {
  const mode = detectMode();
  if (mode === 'real') {
    return await callRealOcr(imageBlob, opts);
  }
  return buildManualResult();
}

function detectMode() {
  // 后端 /api/ocr 可达 + 用户已登录 → 'real'
  // 否则 → 'manual'
}
```

#### 3. real 模式

```js
async function callRealOcr(blob, opts) {
  const base64 = await blobToBase64(blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);  // 15s 超时

  try {
    const resp = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ imageBase64: base64, mimeType: blob.type }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (resp.status === 503) return buildFallback('ocr_not_configured', 'OCR 服务未配置，请手动输入文字');
    if (resp.status === 429) return buildFallback('rate_limited', '识别次数已达上限，请稍后再试');
    if (resp.status === 402) return buildFallback('quota_exceeded', '本月 OCR 额度已用完');
    if (!resp.ok) return buildFallback('server_error', 'OCR 服务异常，请手动输入文字');

    const data = await resp.json();
    if (!validateOCRResponse(data).ok) return buildFallback('invalid_response', '识别结果格式异常');
    return { mode: 'real', rawText: data.text, confidence: data.confidence ?? 0.9, provider: data.provider, requiresConfirm: true, blocks: data.blocks };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') return buildFallback('timeout', '识别超时（>15s），请检查网络或手动输入');
    return buildFallback('network_error', '网络异常，请手动输入文字');
  }
}
```

#### 4. fallback / manual 模式

```js
function buildFallback(errorCode, errorMsg) {
  return { mode: 'fallback', rawText: '', confidence: 0, provider: 'none', requiresConfirm: true, errorCode, errorMsg };
}
function buildManualResult() {
  return { mode: 'manual', rawText: '', confidence: 1, provider: 'manual', requiresConfirm: true };
}
```

#### 5. 后端代理占位（`backend/src/routes/ocr.ts`）

```ts
// POST /api/ocr
// 需要 JWT 鉴权
// OCR_API_KEY 未配置 → 503 { error: 'ocr_not_configured' }
// 已配置但供应商未选型 → 501 { error: 'ocr_provider_pending' }
// 绝不返回伪造的识别文本
```

#### 6. 禁止事项

- 不允许在没有真实 Key 的情况下返回假装识别成功的文字
- 不允许把 `mode: 'manual'` 的结果展示为真实 OCR 结果
- 不允许对超时不做任何提示直接卡死

#### 7. 测试覆盖

```js
// 1. detectMode 在未登录时返回 'manual'
// 2. buildManualResult 返回 mode:'manual', isMock: 不崩溃
// 3. callRealOcr 后端返回 503 时降级为 fallback，不崩溃
// 4. callRealOcr 超时后降级为 fallback，不崩溃
// 5. validateOCRResponse 格式校验
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test
# 手动验证：
# - 扫描页（无 OCR Key）不崩溃，显示"OCR 服务未接入，请手动输入"
# - 后端 POST /api/ocr 无 Key 返回 503
```

**阻塞条件**：OCR API Key 属于 blocked_by_user，本批次只做抽象层。  **是否需要人工**：否。

---

### Batch O-C：识别文本确认与修正页 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：OCR 完成后进入专属确认页，用户可编辑文本、填写产品名、确认后进入解析流程。这是 OCR 到分析之间的关键中间页，不能省略。

**涉及文件**：
- `src/pages/ocrConfirmPage.js`（新建）
- `src/pages/scanPage.js`（增加跳转逻辑）
- `src/router/router.js`（新增路由 `#/ocr-confirm`）
- `src/main.js`（路由注册）
- `src/styles.css`（确认页样式）
- `src/store/userStore.js`（pending 状态管理）
- `scripts/test.mjs`（新增测试）

**实现内容**：

#### 1. 页面布局

```
┌────────────────────────────────────┐
│  ←        确认配料表内容             │   ← 顶部导航
├────────────────────────────────────┤
│  [图片缩略图 72×72]  识别来源：手动输入 │   ← OCR 来源状态（或"实时识别"）
│                     置信度：高 ✓    │   ← 只有 real 模式才显示置信度
├────────────────────────────────────┤
│  产品名称（选填）                    │
│  ┌──────────────────────────────┐  │
│  │  如：旺旺仙贝 原味            │  │   ← input，placeholder 示例
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  配料表内容                  14 项  │   ← 实时解析预览：右侧显示成分数量
│  ┌──────────────────────────────┐  │
│  │  水、白砂糖、麦芽糖浆、        │  │   ← textarea，最少 5 行，自动扩展
│  │  食品添加剂（柠檬酸...        │  │
│  └──────────────────────────────┘  │
│  💡 识别有误？直接在上方修改文字      │
├────────────────────────────────────┤
│  [清空重填]     [返回重拍]           │   ← 次要操作
├────────────────────────────────────┤
│  [ 开始分析配料 →  ]                │   ← 主 CTA，fixed bottom，文本不为空才激活
└────────────────────────────────────┘
```

#### 2. 成分数量实时预览

- 用户每次编辑 textarea（input 事件），调用 `splitIngredientInput` 实时解析
- 右上角显示解析到的配料数量（如 "14 项"），帮助用户确认
- 数量为 0 时显示"未识别到配料，请检查文本"

#### 3. OCR 识别中的 loading 状态

- 从扫描页跳转到确认页时，如果 OCR 还在进行中：
  - textarea 显示为 disabled，显示 skeleton 占位动画
  - 顶部 toast："正在识别图片文字…"
  - 15s 超时后自动切换到 manual 模式

#### 4. 状态机

| 状态 | 描述 | 显示 |
|---|---|---|
| `loading` | OCR 识别中 | textarea disabled，顶部 loading toast |
| `success` | OCR 完成，文本可编辑 | 正常显示，置信度标识 |
| `empty` | OCR 结果为空 | 提示"未识别到文字，请手动输入配料表" |
| `error` | OCR 失败/超时 | 提示具体错误 + 降级到手动输入 |
| `manual` | 手动输入模式 | 提示"手动输入模式" |

#### 5. 产品名称字段

- 非必填，placeholder：`如：旺旺仙贝（选填，便于日后查找）`
- 最大长度：50 个字符
- 保存到 `userStore` 的 `scan:pendingProductName`

#### 6. 状态持久化

```js
// userStore 中维护
scan: {
  pendingImageId: string|null,         // IndexedDB 图片 ID
  pendingText: string,                  // 用户确认/修正后的文本
  pendingProductName: string,           // 产品名称（选填）
  pendingSource: 'ocr'|'manual',       // 来源
  pendingOcrMode: 'real'|'manual'|'fallback',
}
```

- 用户编辑 textarea 时实时保存到 userStore
- 跳转分析后清空 pending 状态
- 用户点返回时，pending 状态保留，重新进入确认页恢复

#### 7. 键盘体验（移动端）

- textarea 获取焦点时，页面滚动到 textarea 可见范围（`scrollIntoView({ behavior: 'smooth', block: 'nearest' }`）
- 主 CTA 按钮在虚拟键盘弹出时不遮挡 textarea

#### 8. 测试覆盖

```js
// 1. ocrConfirmPage 渲染，textarea、产品名称输入框、3 个按钮均存在
// 2. textarea 空时"开始分析"按钮禁用/提示
// 3. 实时解析预览：输入"水、糖"时成分数量显示 2
// 4. 状态机各状态下页面显示正确
// 5. pending 状态存取（存入/读出一致）
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# 手动验证完整闭环：
# 1. 扫描页选图 → 进入确认页（loading 中有动画）
# 2. OCR 不可用时，确认页显示"手动输入模式"，textarea 可用
# 3. 输入配料表文字 → 成分数量实时变化
# 4. 填写产品名称
# 5. 点击"开始分析配料" → 跳转分析页，携带文本和产品名
# 6. 返回确认页，文本未丢失
# 7. iPhone Safari 下键盘弹出后 CTA 按钮仍可操作
```

**阻塞条件**：无。  **是否需要人工**：否。

---

## 阶段 4：食品配料表解析与成分匹配

### Batch P-A：配料表文本解析增强 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：在现有 `splitIngredientInput` 基础上大幅增强，覆盖 OCR 噪声、E-number 识别、配料顺序保留、去重，输出结构化 `ParsedIngredient[]`。

**涉及文件**：
- `src/utils/text.js`（增强，保持向后兼容）
- `src/pages/analyzePage.js`（接入结构化输出）
- `src/pages/ocrConfirmPage.js`（成分数量预览接入）
- `scripts/test.mjs`（新增测试，必须全部通过）

**实现内容**：

#### 1. 输出类型

```js
/**
 * @typedef {Object} ParsedIngredient
 * @property {number}  index           - 在原始文本中的顺序（0-based，越小含量越高）
 * @property {string}  rawText         - 解析前的原始文本片段
 * @property {string}  normalizedText  - 标准化后文本（全半角、空格、大小写统一）
 * @property {string|null} eNumber     - 若匹配 E-number 格式则提取（如 "E211"）
 * @property {boolean} isSubIngredient - 是否为复合配料的子项
 * @property {string|undefined} parentLabel - 父级标签（如"食品添加剂"）
 * @property {boolean} isUnknown       - 无法识别
 * @property {boolean} isDuplicate     - 是否在原始文本中重复出现
 */
```

#### 2. 新增：OCR 噪声修正

OCR 经常产生以下错误，解析前先做修正：

```js
const OCR_CORRECTIONS = [
  // 全角/半角混淆
  [/（/g, '（'], [/）/g, '）'],  // 已由 NFKC 处理
  // 数字-字母混淆（常见于配料表 OCR）
  [/\b0(?=[a-zA-Z一-鿿])/g, 'O'],   // 0→O，如"0CT"→"OCT"
  // 空格误插（OCR 在中文字间插入空格）
  [/([^\x00-\x7F])\s+([^\x00-\x7F])/g, '$1$2'],  // 中文字之间的空格
  // 换行处理（OCR 多行扫描）
  [/\r?\n/g, '，'],
  // 重复标点
  [/[,，、]{2,}/g, '，'],
];

export function applyOcrCorrections(text) { ... }
```

#### 3. 支持的配料表前缀（完整列表）

```js
const LABEL_PREFIXES = /^\s*(?:配料表?|原料|原材料|食品添加剂|配方|成分表?|ingredients?)\s*[:：\-]\s*/gi;
```

#### 4. 支持的分隔符

- 逗号：`，` `,`
- 顿号：`、`
- 分号：`；` `;`
- 换行（OCR 多行）：`\n` `\r`（已转为逗号）

#### 5. 复合配料括号解析（已有，确认逻辑）

- `食品添加剂（柠檬酸、山梨酸钾）` → 子项 `柠檬酸`、`山梨酸钾`，父级标签 `食品添加剂`
- 嵌套括号最多 2 层
- 括号内容为百分比时不展开（如 `水（50%）`）

#### 6. E-number 识别

```js
const E_NUMBER_PATTERN = /^[Ee]\d{3,4}[a-z]?$/i;  // E211, E330, E471

function extractENumber(text) {
  const match = normalizedText.match(E_NUMBER_PATTERN);
  return match ? match[0].toUpperCase() : null;
}
```

- E-number 成分保留原始文本，同时记录 `eNumber` 字段
- 这让 P-B 匹配时可以通过 E-number 直接查到中文名

#### 7. 配料顺序

- 保留 `index` 字段，反映在原始配料表中的位置
- 分析报告中用顺序提示："前几位成分含量通常较高"

#### 8. 去重

- 如果同一成分名（normalizedText 相同）出现多次，第二次起标记 `isDuplicate: true`
- 去重不删除，只标记，便于报告中提示"该成分出现多次"

#### 9. 主函数签名

```js
/**
 * 主解析函数（向后兼容：若只需要字符串数组，调用旧的 splitIngredientInput）
 * @param {string} rawInput - 用户确认后的配料表文本（已经过 OCR 修正）
 * @returns {ParsedIngredient[]}
 */
export function parseIngredientList(rawInput) { ... }
```

#### 10. 完整测试用例（必须全部通过）

```js
// 用例 1：标准格式
input:    "配料：水、白砂糖、麦芽糖浆、食品添加剂（柠檬酸、山梨酸钾）、食用香精"
expected: ["水","白砂糖","麦芽糖浆","柠檬酸","山梨酸钾","食用香精"]
// 山梨酸钾 isSubIngredient=true, parentLabel="食品添加剂"

// 用例 2：OCR 中文空格噪声
input:    "配 料 ：水 、白 砂 糖 、防 腐 剂（苯 甲 酸 钠）"
expected: ["水","白砂糖","苯甲酸钠"]

// 用例 3：OCR 换行
input:    "配料：水\n白砂糖\n柠檬酸"
expected: ["水","白砂糖","柠檬酸"]

// 用例 4：E-number
input:    "配料：水、E211、E330、白砂糖"
result:   [{ normalizedText:"水" }, { normalizedText:"E211", eNumber:"E211" }, { normalizedText:"E330", eNumber:"E330" }, ...]

// 用例 5：含量百分比剥离
input:    "配料：水（50%）、白砂糖（30%）、食用盐（2%）"
expected: ["水","白砂糖","食用盐"]

// 用例 6：未知成分保留
input:    "配料：水、XYZ-Unknown-999、白砂糖"
result:   [{ normalizedText:"水" }, { normalizedText:"XYZ-Unknown-999", isUnknown:true }, { normalizedText:"白砂糖" }]

// 用例 7：重复去重标记
input:    "配料：水、白砂糖、水、柠檬酸"
result:   4 项，第3项"水" isDuplicate=true

// 用例 8：英文配料表
input:    "Ingredients: Water, Sugar, Citric Acid (E330), Sodium Benzoate (E211)"
expected: ["Water","Sugar","Citric Acid","Sodium Benzoate"]，E330/E211 提取为 eNumber

// 用例 9：仅有添加剂括号
input:    "配料：小麦粉、白砂糖、食品添加剂（碳酸氢钠、碳酸氢铵、焦亚硫酸钠）"
expected: ["小麦粉","白砂糖","碳酸氢钠","碳酸氢铵","焦亚硫酸钠"]

// 用例 10：空输入
input:    ""
result:   []，不崩溃

// 用例 11：仅有前缀无内容
input:    "配料："
result:   []

// 用例 12：顺序（index）
input:    "配料：水、糖、盐"
result:   水 index=0，糖 index=1，盐 index=2
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# 所有 12 个用例通过
# 旧有 splitIngredientInput 测试不回归
```

**阻塞条件**：无。  **是否需要人工**：否。

---

### Batch P-B：数据库批量成分匹配 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：将解析后的 `ParsedIngredient[]` 与数据库进行高效批量匹配，支持 E-number 直查、别名匹配、模糊匹配，有客户端缓存，低置信度需用户确认。

**涉及文件**：
- `src/services/ingredientMatchService.js`（新建）
- `src/services/ingredientApiService.js`（增强批量接口）
- `backend/src/routes/ingredients.ts`（新增 `POST /api/ingredients/batch-search`）
- `backend/src/services/ingredientService.ts`（新增批量搜索逻辑）
- `src/pages/analyzePage.js`（接入匹配结果）
- `scripts/test.mjs`（新增匹配测试）

**实现内容**：

#### 1. 后端批量搜索接口

```ts
// POST /api/ingredients/batch-search
// Body: { terms: string[], includeENumbers?: boolean }
// Response: { results: BatchSearchResult[] }

interface BatchSearchResult {
  term: string;           // 原始搜索词
  eNumber: string | null; // 如果是 E-number 格式
  match: IngredientSummary | null;
  confidence: number;     // 0–1
  matchType: 'exact' | 'alias' | 'eNumber' | 'fuzzy' | 'none';
  alternates?: IngredientSummary[];  // 次选匹配（最多 2 个）
}
```

匹配逻辑（优先级从高到低）：
1. **E-number 直查**（`eNumber` 字段不为 null）→ confidence 0.99
2. **中文名/英文名完全精确**（normalizedText 去空格后完全相等）→ confidence 1.0
3. **别名精确**（aliases 数组包含）→ confidence 0.92
4. **前缀匹配**（startsWith）→ confidence 0.75
5. **包含匹配**（includes）→ confidence 0.55
6. 无匹配 → confidence 0

批量大小限制：单次最多 200 个 term，超出则分批调用（后端限制）。

#### 2. 前端文本标准化（匹配前做）

```js
function normalizeTerm(text) {
  return text
    .normalize('NFKC')           // 全半角统一
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')         // 去所有空格
    .replace(/[·•・]/g, '')      // 去中文间隔号
    .replace(/^(?:食品添加剂|添加剂)\s*[:：]?\s*/, ''); // 去前缀
}
```

#### 3. 客户端缓存

```js
// 5 分钟 TTL 的内存缓存，避免重复请求相同成分
const matchCache = new Map();  // key: normalizedTerm → value: { result, expiry }
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(term) { ... }
function setCached(term, result) { ... }
```

#### 4. 前端匹配服务

```js
/**
 * @param {ParsedIngredient[]} parsedIngredients
 * @returns {Promise<MatchSummary>}
 */
export async function matchIngredients(parsedIngredients) {
  // 1. 提取待查询 term（跳过 isDuplicate 的重复项）
  // 2. 查客户端缓存
  // 3. 未命中缓存的走批量 API
  // 4. API 不可用时降级到本地 ingredientService 逐个搜索
  // 5. 合并结果，写入缓存
  // 6. 计算 matchRate、unmatchedList
}

/**
 * @typedef {Object} MatchSummary
 * @property {IngredientMatchResult[]} results  - 每个 ParsedIngredient 的匹配结果
 * @property {number}  matchRate                 - 已匹配/总数 (0–1)
 * @property {string[]} unmatchedTerms           - 未匹配的 normalizedText 列表
 * @property {string[]} lowConfidenceTerms       - 低置信度（0.55–0.79）的 normalizedText 列表
 */
```

#### 5. 展示规则

| 置信度 | 展示 | 颜色 |
|---|---|---|
| ≥ 0.9 | 确定匹配，直接展示 | 正常 |
| 0.6–0.89 | 展示 + "⚠️ 请确认" badge | `--color-risk-medium` |
| 0.1–0.59 | 展示候选 + 用户可确认/驳回 | `--color-unverified` |
| 0 | "未收录"标记，展示原始文本 | `--color-unknown` |

低置信度项在分析报告中单独列出"待确认匹配"区块。

#### 6. 测试覆盖

```js
// 1. E-number "E211" 匹配到苯甲酸钠（若数据库有）
// 2. 精确匹配"柠檬酸" confidence ≥ 0.9
// 3. 无匹配项"XYZ-UNKNOWN" confidence = 0
// 4. 低置信度项在 lowConfidenceTerms 列表中
// 5. API 不可用时降级到本地搜索，不崩溃
// 6. 缓存命中时不重复调用 API
// 7. 200 个 term 的批量请求分批处理
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test
# 手动验证：
# - 输入标准配料表 → 分析页显示匹配/未匹配/低置信度列表
# - E-number 成分被正确识别
# - 未匹配项有"未收录"标记
# - 低置信度项有"请确认"标记
# - API 不可用时，本地降级正常
```

**阻塞条件**：无。  **是否需要人工**：否。

---

## 阶段 5：食品配料分析报告

### Batch R-A：食品配料分析报告页 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：生成完整、信息密度高、视觉清晰的食品配料分析报告，包含整体风险评级、分类统计、配料顺序意义、特殊人群提示、数据来源说明。

**涉及文件**：
- `src/pages/reportDetailPage.js`（新建，单报告详情）
- `src/pages/reportsPage.js`（已有，报告列表，接入新入口）
- `src/pages/analyzePage.js`（生成报告，跳转详情）
- `src/services/reportService.js`（新建，报告数据模型与计算）
- `src/store/userStore.js`（报告持久化）
- `src/router/router.js`（新增路由 `#/report/:id`）
- `scripts/test.mjs`（新增报告测试）

**实现内容**：

#### 1. 报告数据模型

```js
/**
 * @typedef {Object} IngredientReport
 * @property {string}  id
 * @property {string}  createdAt
 * @property {string}  productName       - 用户填写（可为"未命名产品"）
 * @property {string|undefined} brandName
 * @property {string|null} imageId       - IndexedDB 图片 ID
 * @property {string}  originalText      - 原始 OCR/手动输入文本
 * @property {'ocr'|'manual'} source
 * @property {ParsedIngredient[]}  parsedIngredients
 * @property {IngredientMatchResult[]} matchResults
 * @property {RiskGrade}  riskGrade      - 整体风险评级
 * @property {RiskSummary} riskSummary   - 分类统计
 * @property {string[]} unmatchedTerms
 * @property {string[]} lowConfidenceTerms
 * @property {number}  matchRate
 */

/**
 * @typedef {'A'|'B'|'C'|'D'|'F'} RiskGrade
 * A = 0 高风险成分     B = 0 高风险, ≤1 中等   C = 1-2 高风险
 * D = 3+ 高风险       F = 5+ 高风险 或 数据严重不足
 */

/**
 * @typedef {Object} RiskSummary
 * @property {number} highRisk
 * @property {number} mediumRisk
 * @property {number} lowRisk
 * @property {number} unmatched
 * @property {number} unverifiedData   - 匹配到但数据未验证的成分数量
 * @property {Record<string, number>} categoryBreakdown  - 添加剂分类统计
 */
```

#### 2. 风险评级算法

```js
export function computeRiskGrade(matchResults) {
  const highCount = matchResults.filter(r => r.match?.riskLevel === 'high').length;
  const medCount  = matchResults.filter(r => r.match?.riskLevel === 'medium').length;
  if (highCount === 0 && medCount === 0) return 'A';
  if (highCount === 0 && medCount <= 1)  return 'B';
  if (highCount <= 2)                    return 'C';
  if (highCount <= 4)                    return 'D';
  return 'F';
}
```

评级颜色：A→`#22c55e`，B→`#84cc16`，C→`#f59e0b`，D→`#ef4444`，F→`#7f1d1d`

#### 3. 报告页布局（`/report/:id`）

```
┌────────────────────────────────────┐
│  ←        旺旺仙贝 原味              │   ← 产品名 + 品牌
├────────────────────────────────────┤
│  ┌────────────────────────────┐    │
│  │  整体评级  B               │    │   ← 大字评级，颜色对应
│  │  含 1 种中等关注成分         │    │
│  │  共识别 14 种配料           │    │
│  └────────────────────────────┘    │
├────────────────────────────────────┤
│  ⚠️ 关注摘要（最多 3 条）           │   ← 最重要的信息，折叠前可见
│  • 含阿斯巴甜（甜味剂，苯丙酮尿症患者禁用）│
│  • 3 种成分数据仍待审核             │
├────────────────────────────────────┤
│  📋 配料顺序说明                    │   ← 可折叠
│  "配料表中排列越靠前，含量通常越高。  │
│   本产品中含量最高的前 3 种成分为：  │
│   水、白砂糖、麦芽糖浆"             │
├────────────────────────────────────┤
│  食品添加剂（5种）                  │
│  防腐剂 ×2  甜味剂 ×1  增稠剂 ×2  │   ← 分类统计 chips
│  ────────────────────────────────  │
│  • 山梨酸钾 [防腐剂] ●低关注        │
│  • 阿斯巴甜 [甜味剂] ●需关注  ⚠️   │
│  • ...                             │
├────────────────────────────────────┤
│  天然原料（9种）                    │
│  • 水 ✓  白砂糖 ✓  麦芽糖浆 ✓     │
├────────────────────────────────────┤
│  未收录（2种）                      │   ← 灰色，"数据库暂未收录此成分"
│  • XYZ物质                         │
├────────────────────────────────────┤
│  👶 特殊人群提醒                    │   ← 仅当 cautionGroups 有匹配时显示
│  • 阿斯巴甜：苯丙酮尿症患者禁用      │
│  不构成医疗建议，如有疑虑请咨询医生   │
├────────────────────────────────────┤
│  📚 数据来源                        │
│  部分数据仍在审核中（基础库 112 条； │
│  GB 2760 PDF 全文 264 页已入库）     │
│  来源：GB 2760、Codex INS、JECFA   │
├────────────────────────────────────┤
│  ℹ️ 本报告仅供配料信息参考，          │
│     不构成医疗建议                   │
└────────────────────────────────────┘

底部操作：[保存] [分享] [重新分析]
```

#### 4. 成分条目展示格式

每个成分条目（`li`）显示：
- 成分名 + 功能分类 chip（如 `[防腐剂]`）
- 风险标识（颜色圆点 + 文字）
- 数据可信等级标识（`unverified` 显示灰色"待审核"）
- 点击可展开：ADI 值、GB 状态、来源链接、过敏原标注
- 若命中用户过敏原/忌口/关注：显示对应 badge（颜色见设计语言规范）

#### 5. 分享内容

点击「分享」时，生成可读的文字摘要：

```
【成分镜分析报告】旺旺仙贝 原味
整体评级：B（较安全）
共 14 种配料，含 5 种食品添加剂
主要关注：阿斯巴甜（甜味剂，苯丙酮尿症患者禁用）
排名前三：水、白砂糖、麦芽糖浆
---
仅供参考，不构成医疗建议
由成分镜 App 生成
```

#### 6. 报告本地存储

- 元数据（不含图片）存 localStorage（键：`compcheck:reports`，JSON 数组）
- 图片 ID 仅存 reference，实际 blob 在 IndexedDB
- 最多保留 50 条报告；超出时删除最旧的

**2026-06-12 自动化处理记录**：已完成报告数据模型、整体评级、关注摘要、配料顺序说明、食品添加剂分类统计、特殊人群提示、数据来源说明、报告分享文案、Markdown/JSON 导出和 `/report/:id` 路由别名；保存报告上限提升到 50 条。验证：`npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过。

#### 7. 禁止文案（`lint` 脚本检查）

```
绝对安全 / 绝对有害 / 治疗 / 一定致敏 / 一定不能吃 / 致癌 / 有毒
```

#### 8. 测试覆盖

```js
// 1. computeRiskGrade 各级别算法验证（0/1/3/5 个高风险）
// 2. 报告数据模型完整性（所有必填字段存在）
// 3. 报告保存到 localStorage，刷新后可读取
// 4. 最多 50 条，超出删除最旧
// 5. 分享文字摘要生成（包含产品名、评级、关注点）
// 6. 禁止文案检查（lint 脚本覆盖）
```

**验收标准**：

```bash
npm run validate:data && npm run lint && npm run test && npm run build
# 手动验证完整主路径：
# 1. 扫描页选图 → 确认文本（含产品名）→ 点击分析 →
# 2. 显示分析报告：评级、关注摘要、配料顺序说明、添加剂列表、未收录清单
# 3. 点击保存 → 报告列表可查看
# 4. 点击分享 → 生成文字摘要
# 5. 点击重新分析 → 返回确认页
# 6. 刷新后报告仍可查看
```

**阻塞条件**：无。  **是否需要人工**：否。

---

## 阶段 6：产品档案、收藏、历史

### Batch F-A：产品档案与 IndexedDB 图片存储 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：建立产品档案概念，将报告与具体产品关联；图片存储用 IndexedDB（O-D 已建），不用 localStorage。

**涉及文件**：
- `src/services/productArchiveService.js`（新建）
- `src/pages/productArchivePage.js`（新建）
- `src/pages/reportDetailPage.js`（增加保存档案入口）
- `src/router/router.js`（新增路由 `#/product/:id`）
- `backend/src/db/schema.ts`（新增 `product_archives` 表）
- `backend/src/routes/user.ts`（新增产品档案 API）
- `scripts/test.mjs`

**实现内容**：

#### 1. 产品档案数据模型

```js
/**
 * @typedef {Object} ProductArchive
 * @property {string}  id
 * @property {string}  createdAt
 * @property {string}  updatedAt
 * @property {string}  productName
 * @property {string|undefined} brandName
 * @property {string|null} imageId    - IndexedDB 图片 ID（NOT base64）
 * @property {string|null} thumbnailDataUrl  - 200px 缩略图 data URL（localStorage 安全，< 20KB）
 * @property {string}  originalText
 * @property {ParsedIngredient[]} parsedIngredients
 * @property {IngredientMatchResult[]} matchResults
 * @property {string}  reportId
 * @property {RiskGrade} riskGrade
 * @property {boolean} isFavorite
 * @property {string[]} tags
 */
```

图片存储策略：
- 完整图片 blob → IndexedDB（imageId）
- 200px 缩略图 → canvas 生成 → data URL → localStorage（< 20KB，用于列表展示）
- localStorage 存 ProductArchive 元数据（不含完整图片）

#### 2. 后端 product_archives 表

```sql
product_archives (
  id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  brand_name VARCHAR(100),
  thumbnail_url TEXT,          -- 生产环境可存 CDN URL
  original_text TEXT NOT NULL,
  parsed_ingredients JSONB,
  match_results JSONB,
  report_id VARCHAR(36),
  risk_grade CHAR(1),
  is_favorite BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

#### 3. 产品档案 API（需 JWT）

- `GET /api/user/products?search=&isFavorite=&riskGrade=&page=1&limit=20`
- `GET /api/user/products/:id`
- `POST /api/user/products`
- `PATCH /api/user/products/:id`（更新名称/品牌/收藏/标签）
- `DELETE /api/user/products/:id`

#### 4. 未登录用户本地存储

- localStorage 键：`compcheck:products`（JSON 数组，最多 100 条）
- 超出时删除最旧的 `isFavorite: false` 的记录
- 收藏的记录不自动删除

#### 5. 产品档案页（`/product/:id`）

```
┌────────────────────────────────────┐
│  ←  旺旺仙贝 原味        ⭐ 收藏   │
├────────────────────────────────────┤
│  [图片]     评级 B                  │
│             2026-06-12 分析         │
├────────────────────────────────────┤
│  配料：水、白砂糖、麦芽糖浆...       │
│  [展开全部]                         │
├────────────────────────────────────┤
│  [ 查看完整报告 →  ]                │
└────────────────────────────────────┘
```

#### 6. 产品档案搜索

`GET /api/user/products?search=旺旺` 支持按产品名/品牌模糊搜索。

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test
# - 完成分析后保存为产品档案
# - 产品档案列表可查看，缩略图正常显示
# - 刷新后数据不丢失
# - IndexedDB 中存有完整图片，localStorage 只存元数据+缩略图
```

---

### Batch F-B：历史列表与产品收藏管理 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**涉及文件**：
- `src/pages/historyPage.js`（新建）
- `src/pages/favoritesPage.js`（扩展）
- `src/pages/homePage.js`（最近历史入口）
- `src/router/router.js`（新增 `#/history`）
- `scripts/test.mjs`

**实现内容**：

#### 1. 历史列表页（`/history`）

```
┌──────────────────────────────────┐
│  分析历史            [清空全部]   │
├──────────────────────────────────┤
│  🔍 搜索产品名...                 │
├──────────────────────────────────┤
│  筛选：全部 | 收藏 | 高关注       │   ← Tab 筛选
├──────────────────────────────────┤
│  [缩略图] 旺旺仙贝    B  6月12日  │   ← 每条记录
│           14种配料  1种需关注     │
│           ← 左滑可删除（移动端）  │
├──────────────────────────────────┤
│  空状态：                         │
│  还没有分析历史                   │
│  [📷 去拍照识别]                  │
└──────────────────────────────────┘
```

移动端左滑删除：CSS `touch-action: pan-y`，监听 `touchstart/touchmove/touchend` 实现。

#### 2. 收藏页扩展

- 新增"收藏产品"Tab（与已有"收藏成分"Tab 并列）
- 产品卡片展示：缩略图 + 名称 + 评级 + 日期

#### 3. 首页最近历史

```
最近分析
─────────
[缩略图] 旺旺仙贝    [缩略图] 奥利奥
6月12日              6月11日
[查看全部历史 →]
```

#### 4. 存储策略

- 最多显示 50 条历史（UI 层面，存储层不限）
- 超出 100 条本地存储时：删除最旧的非收藏记录

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# - 历史页显示分析记录，有缩略图
# - 移动端左滑可删除
# - 筛选 Tab 正常工作
# - 空状态有引导
# - 首页最近历史可见
```

---

## 阶段 7：前端账号登录 UI

> 后端账号 API（注册/登录/鉴权/退出）已在 Batch 3-C 完成，本阶段补前端 UI。

### Batch Q-A：前端登录/注册页面 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：让用户能在前端完成注册、登录、退出；登录后启用云同步、跨设备历史。

**涉及文件**：
- `src/pages/authPage.js`（新建，登录/注册同页切换）
- `src/services/authService.js`（新建，前端 JWT 管理）
- `src/store/userStore.js`（增加 currentUser 状态）
- `src/pages/settingsPage.js`（增加登录/退出入口）
- `src/router/router.js`（新增路由 `#/login`）
- `scripts/test.mjs`

**实现内容**：

#### 1. 页面布局（登录/注册切换）

```
┌──────────────────────────────────┐
│  ←        账号登录                │
├──────────────────────────────────┤
│  [登录] [注册]                    │   ← Tab 切换
├──────────────────────────────────┤
│  邮箱                             │
│  ┌────────────────────────────┐  │
│  │  your@email.com            │  │
│  └────────────────────────────┘  │
│  密码（8 位以上）                  │
│  ┌────────────────────────────┐  │
│  │  ••••••••      [👁 显示]  │  │
│  └────────────────────────────┘  │
│  [ 登录 / 注册 ]                  │
│  ────────── 或 ──────────         │
│  [ 暂不登录，以访客模式继续 ]       │
└──────────────────────────────────┘
```

#### 2. 前端 JWT 管理（`authService.js`）

```js
const TOKEN_KEY = 'compcheck:auth-token';
const USER_KEY  = 'compcheck:auth-user';

export async function login(email, password) { ... }  // POST /api/auth/login
export async function register(email, password) { ... }  // POST /api/auth/register
export async function logout() { ... }               // POST /api/auth/logout + 清除本地
export function getToken() { ... }                   // 从 localStorage 读取
export function getCurrentUser() { ... }             // 从 localStorage 读取缓存用户
export function isLoggedIn() { ... }                 // token 存在且未过期（解析 JWT exp）
export async function syncLocalDataToServer() { ... }  // 登录后同步本地数据到服务器
```

token 过期检测：解析 JWT payload 的 `exp` 字段（无需验证签名，只看时间），过期则清除并重定向 `/login`。

#### 3. 登录后操作

1. 保存 token 和 user 到 localStorage
2. 调用 `syncLocalDataToServer()`：将本地收藏、历史、过敏原、报告批量同步到后端（避免数据丢失）
3. 更新 `userStore.currentUser`
4. 跳转到来源页面（或首页）

#### 4. 错误状态

| 错误 | 提示文案 |
|---|---|
| 邮箱格式错误 | "请输入有效的邮箱地址" |
| 密码不足 8 位 | "密码至少需要 8 个字符" |
| 邮箱已注册 | "该邮箱已被注册，请直接登录" |
| 密码错误 | "邮箱或密码错误，请重试" |
| 服务器错误 | "服务器异常，请稍后再试" |
| 网络失败 | "网络连接失败，请检查网络" |

#### 5. 设置页登录/退出入口

- 未登录：显示"登录账号，开启云同步"按钮，点击跳转 `#/login`
- 已登录：显示用户邮箱 + "退出登录"按钮

#### 6. 访客模式

- "暂不登录"后，所有功能在本地运行（已有逻辑）
- 不强制登录，不阻断主流程

#### 7. 测试覆盖

```js
// 1. authPage 渲染，登录/注册 Tab 切换
// 2. 邮箱格式校验（本地，不发请求）
// 3. 密码长度校验
// 4. isLoggedIn() 在 token 过期时返回 false
// 5. 退出登录清除 localStorage
// 6. 未登录时不崩溃，各页面访客模式正常
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test
# 手动验证：
# - 注册新账号 → 自动登录 → 本地数据同步
# - 退出登录 → 再登录 → 历史恢复
# - 访客模式下全部核心功能可用
# - 设置页显示登录状态
```

---

## 阶段 8：个性化关注项

### Batch U-A：关注成分、忌口项、过敏原与全局高亮 `[Codex]`

**状态**：✅ 已完成（2026-06-12）

**目标**：整合现有过敏原设置，新增关注成分和忌口项，在报告/搜索/详情中全局高亮，所有提示谨慎表达。

**涉及文件**：
- `src/services/personalProfileService.js`（新建，整合三类个性化项）
- `src/pages/settingsPage.js`（扩展设置 UI）
- `src/pages/reportDetailPage.js`（接入高亮）
- `src/pages/searchPage.js`（接入高亮）
- `src/pages/detailPage.js`（接入高亮）
- `src/pages/onboardingPage.js`（接入首次设置）
- `scripts/test.mjs`

**实现内容**：

#### 1. 三类个性化项

```js
/**
 * @typedef {Object} PersonalProfile
 * @property {string[]} allergenIds     - EU 14 类标准过敏原 ID
 * @property {string[]} watchIds        - 关注成分 ID（"我想重点了解"）
 * @property {string[]} avoidIds        - 忌口项 ID（"我尽量少吃"）
 */
```

localStorage 键：
- `compcheck:allergens`（已有）
- `compcheck:watch-ingredients`（新增）
- `compcheck:avoid-ingredients`（新增）

#### 2. 设置页 UI

三个区块，各自可展开/折叠：

**过敏原**（已有，稍作优化）：
- EU 14 类标准，按 chip 选择
- 已选 N 种过敏原

**我的关注成分**：
- 搜索框 + 成分列表，点击添加
- 已添加的显示为 chip，可删除
- 文案："添加后在分析报告中重点展示，不代表有害"

**我的忌口项**：
- 同上
- 文案："添加后在分析报告中标注提醒，**不构成医疗建议**"

#### 3. 报告高亮（优先级和颜色）

同一成分可以同时命中多类，优先级：过敏原 > 忌口 > 关注

```
过敏原   →  红色 badge "⚠️ 含过敏原"    --color-allergen
忌口项   →  橙色 badge "• 你的忌口项"   --color-avoid
关注成分 →  蓝色 badge "★ 你关注的"    --color-watch
```

报告页新增"个人命中摘要"区块（在关注摘要下方）：
```
你的个人设置命中了 2 种成分：
• 阿斯巴甜 ⚠️ 过敏原（苯丙酮尿症）
• 山梨酸钾 ★ 你关注的成分
不构成医疗建议。如有疑虑请咨询专业人士。
```

#### 4. 搜索/详情高亮

- 搜索结果列表：命中成分的卡片右上角显示对应角标
- 详情页顶部：如果命中，显示 banner（同颜色体系）

#### 5. 首次设置引导集成

onboardingPage 在已有步骤后新增一步：
- "设置你的过敏原" → 引导选择过敏原
- "以后可以在设置中修改"

#### 6. 存储策略

- 过敏原沿用 `compcheck:allergens`，登录后仍通过既有 `/api/user/allergens` 同步
- 关注成分和忌口项使用 `compcheck:watch-ingredients`、`compcheck:avoid-ingredients`，未登录时保持本机 `localStorage`
- Batch U-B 后，登录态会通过 `/api/user/profile/watch`、`/api/user/profile/avoid` 云同步；本机 JSON 快照导出/导入/清空仍保留

#### 7. 测试覆盖

```js
// 1. 添加/删除关注成分，存取一致
// 2. 添加/删除忌口项，存取一致
// 3. getPersonalProfile 整合三类
// 4. 报告页 personal hit 正确高亮
// 5. 设置清空后高亮消失
```

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# - 设置页可添加/删除三类个性化项
# - 分析报告命中项有 badge
# - 搜索结果命中项有角标
# - 刷新后设置不丢失
```

---

### Batch U-B：关注成分与忌口项跨设备同步 `[Codex]`

**状态**：✅ 已完成 2026-06-12

**目标**：把 Batch U-A 的关注成分和忌口项从“本机账号隔离”升级为登录态云同步，补齐个人成分档案跨设备恢复基础。

**涉及文件**：
- `backend/src/db/schema.ts`
- `backend/src/routes/user.ts`
- `backend/src/services/userService.ts`
- `src/services/storageService.js`
- `backend/tests/user.test.ts`
- `scripts/test.mjs`
- `PROJECT_PLAN.md`、`COMMANDS.md`、`AI_REVIEW.md`

**实现内容**：

1. 新增 `user_profile_ingredients` 表，按 `user_id + kind(watch/avoid) + ingredient_id` 存储个人关注/忌口成分。
2. 新增 `GET/PUT /api/user/profile/:kind`，支持 `watch` 和 `avoid` 两类 whole-set replace，同步语义与过敏原一致。
3. 前端 `storageService` 将 `compcheck:watch-ingredients`、`compcheck:avoid-ingredients` 接入现有 hydrate-before-write 云同步流程。
4. 未登录时继续使用本机 localStorage；登录后按当前 JWT 用户做本机缓存隔离并自动云端恢复。
5. 补充后端 route 测试和前端同步结构测试。

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test && npm run build && npm run db:migrate
```

**阻塞条件**：无。  **是否需要人工**：否。

**2026-06-12 完成记录**：已补齐关注成分与忌口项 profile 同步基础；仍需后续用两个真实设备或浏览器 profile 做端到端跨设备验收，并补离线队列。

---

## 阶段 9：移动端和 PWA 产品体验

### Batch M-A：首页与导航重构 + 设计系统落地 `[Codex]`

**状态**：✅ 2026-06-12

**目标**：以"拍照识别"为核心重构首页信息架构，落地全局设计系统（CSS 变量），统一 loading/empty/error 状态。

**涉及文件**：
- `src/pages/homePage.js`（重构）
- `src/main.js`（底部导航调整）
- `src/styles.css`（设计系统落地 + 首页样式 + skeleton）
- `scripts/test.mjs`

**实现内容**：

#### 1. CSS 变量落地

在 `src/styles.css` 的 `:root` 中补全"设计语言规范"章节定义的所有 CSS 变量，所有页面必须通过变量引用颜色。

#### 2. 统一 Loading Skeleton 组件

```css
/* 骨架屏动画 */
@keyframes skeleton-shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-text  { height: 16px; margin: 8px 0; }
.skeleton-card  { height: 80px; border-radius: var(--radius-card); }
```

所有数据加载中的页面必须用 skeleton 替代空白或 spinner。

#### 3. 统一 Empty State 组件

```html
<!-- empty-state 结构 -->
<div class="empty-state">
  <div class="empty-state-icon">图标（纯文字或 SVG）</div>
  <p class="empty-state-title">主提示文字</p>
  <p class="empty-state-desc">次要说明</p>
  <button class="btn-primary">操作按钮</button>
</div>
```

每个页面的 empty state 都要有"下一步"操作按钮，不能只显示文字。

#### 4. 统一 Error State

```html
<div class="error-state">
  <p>⚠️ 加载失败</p>
  <p class="error-desc">具体原因</p>
  <button onclick="retry()">重试</button>
</div>
```

#### 5. 首页信息架构

```
┌────────────────────────────────────┐
│  成分镜               [设置图标]   │   ← 顶部
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  📷  拍照识别配料表           │  │   ← Hero CTA，全宽，高 56px
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  最近分析                          │   ← 有历史才显示，skeleton 加载中
│  [缩略图] 旺旺仙贝   [缩略图] 奥利奥│
│  2分钟前             昨天           │
│                  [查看全部历史]     │
├────────────────────────────────────┤
│  成分搜索                          │
│  [🔍 搜索成分名称...]              │
├────────────────────────────────────┤
│  热门类别                          │
│  [防腐剂] [甜味剂] [着色剂] [增稠剂]│
└────────────────────────────────────┘
```

#### 6. 底部导航（5 个 Tab）

```
[首页]  [📷 识别]  [搜索]  [历史]  [我的]
```

- 中间"识别"Tab 视觉突出（稍大图标，或圆形背景）
- active Tab 颜色：`--color-primary`，未选中：`#9ca3af`

#### 7. 页面过渡动画

```css
.page-enter {
  animation: slide-in-right 150ms var(--transition-fast);
}
@keyframes slide-in-right {
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

#### 8. 无障碍（Accessibility）

- 所有图标按钮必须有 `aria-label`
- 底部导航是视觉 Tab，但语义保留 `nav` + link；运行时用 `aria-current="page"` 标识当前入口，避免伪装成没有 tabpanel 的 tab widget
- 图片预览 `alt` 属性不能为空
- 主 CTA 按钮 font-size ≥ 16px（防止 iOS Safari 自动缩放表单）

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# - 首页 Hero CTA 最显眼
# - 底部 5 个 Tab 清晰，中间"识别"视觉突出
# - 所有页面 loading 用 skeleton，不用空白
# - 所有页面 empty state 有操作按钮
# - iPhone Safari 底部 Tab 不被 Home Bar 遮挡
# - 基础 Accessibility 检查（手动或 axe-core）
```

---

### Batch M-B：PWA 体验优化与离线能力 `[Codex]`

**状态**：✅ 2026-06-12

**目标**：优化 PWA 安装体验，明确离线能力边界，修复 iPhone Safari 常见问题。

**涉及文件**：
- `public/manifest.webmanifest`（优化）
- `public/sw.js`（离线策略优化）
- `src/main.js`（离线状态和安装提示）
- `src/styles.css`（iOS 修复）
- `src/index.html`
- `src/pages/settingsPage.js`（离线能力说明）
- `docs/pwa-offline-capability.md`（新建）

**实现内容**：

#### 1. manifest 完整配置

```json
{
  "name": "成分镜",
  "short_name": "成分镜",
  "description": "拍照识别食品配料表，了解每种成分",
  "start_url": "./#/food",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#116a5b",
  "orientation": "portrait",
  "icons": [72,96,128,144,152,192,384,512 的各尺寸 PNG],
  "shortcuts": [{
    "name": "拍照识别",
    "url": "./#/food/scan",
    "icons": [...]
  }]
}
```

#### 2. Service Worker 离线策略

| 资源类型 | 策略 |
|---|---|
| App Shell（HTML/CSS/JS）| Install 阶段预缓存 HTML/manifest/icons，并解析 `index.html` 预热 Vite JS/CSS bundles；运行时 Stale-While-Revalidate，替换 HTML 前先缓存新 HTML 引用的 bundles |
| 成分 API `/api/ingredients` | Network First，失败时返回缓存 |
| 图片和图标 | Cache First，图标首次离线可回退读取 App Shell 预缓存 |
| OCR API `/api/ocr` | Network Only（不缓存） |
| 登录态 API `/api/auth/*`、`/api/user/*` | Network Only（不缓存），失败时提示离线 |

#### 3. 离线能力说明文档（`docs/pwa-offline-capability.md`）

明确哪些功能离线可用：
- ✅ 查看本地历史报告
- ✅ 成分搜索（已缓存数据）
- ✅ 查看收藏
- ⚠️ 拍照识别（需要网络，OCR API）
- ⚠️ 云同步（需要网络）
- ❌ 登录/注册（需要网络）

在 App 中展示全局离线状态提示：检测到 `!navigator.onLine` 时顶部显示“当前离线，部分功能不可用”，并在设置页展示“离线与安装”能力说明。

#### 4. iPhone Safari 修复

```css
/* 修复 100vh 问题 */
.full-height {
  min-height: 100vh;
  min-height: 100dvh;
}

/* 输入框 zoom 防止 */
input, textarea, select { font-size: max(16px, 1rem); }

/* 状态栏处理（PWA 模式下） */
/* meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" */
/* 顶部使用 env(safe-area-inset-top) 避免状态栏遮挡 */
```

#### 5. PWA 安装提示

- 检测 `beforeinstallprompt` 事件（Android Chrome）
- 用户第 3 次打开时在底部显示 "添加到主屏幕" 提示条
- iOS Safari 提示："点击分享，然后选择添加到主屏幕"

**验收标准**：

```bash
npm run lint && npm run test && npm run build
# Lighthouse PWA 检查得分 ≥ 80
# - 离线时历史页可查看
# - iPhone Safari 全屏模式下 100vh 正确
# - 输入框在 iOS 下不触发自动缩放
# - manifest shortcuts 可在 Android 长按图标显示
```

---

## 阶段 10：AI 总结和解释

### Batch A-A：AI 解释层集成 `[人工+Codex]`

**状态**：⏸ blocked_by_user（等待 AI API Key）

**目标**：AI 基于已匹配的数据库结果生成可读解释，不编造来源，不替代数据库，不生成医疗诊断。

**人工操作（先做）**：
- [ ] 选择 AI 模型（推荐 Anthropic Claude，`claude-haiku-4-5-20251001` 控制成本）
- [ ] 获取 API Key → 后端环境变量 `AI_API_KEY`、`AI_PROVIDER=anthropic`
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. `cd backend && npm install @anthropic-ai/sdk`

2. `backend/src/routes/analyze.ts`（需 JWT）：
   - `POST /api/analyze` 接收 `{ matchResults: MatchResult[], productName: string }`
   - AI **只能**基于传入的 `matchResults` 生成解释，不得凭空描述成分性质
   - System prompt 强制约束：
     ```
     你是食品配料信息助手。根据以下数据库匹配结果，用通俗语言解释这些食品添加剂的常见用途和在食品中的作用。
     严格禁止：编造来源或安全结论 / 生成医疗诊断 / 使用"绝对安全/绝对有害"等绝对化表述 / 提及不在匹配结果中的成分。
     最后必须加：本解释仅供参考，不构成医疗建议。
     ```
   - 未配置 Key → `503 { error: 'ai_not_configured' }`，不崩溃

3. 前端 `aiAnalysisService.js`：
   - 登录后调用 `/api/analyze`
   - 未登录或 API 不可用 → 本地 fallback 解释（基于已有 riskLevel 描述拼接）
   - AI 结果在报告页"AI 解释"区块展示（可折叠，默认折叠，标注"AI 生成，仅供参考"）

**验收标准**：

```bash
npm run lint && npm run test && npm run build
cd backend && npm run typecheck && npm test
# 未配置 Key 时 AI 区块显示 fallback，不崩溃
# 配置 Key 后 AI 解释基于传入数据生成
```

---

## 阶段 11：订阅、支付、上架（必须后置）

> 所有任务等核心产品闭环（阶段 3-9）稳定后才能推进。

### Batch L-A：真实 OCR 服务接入 `[人工+Codex]`

**状态**：⏸ blocked_by_user（OCR API Key + O-B 完成）

**人工操作**：
- [ ] 选择 OCR 供应商（推荐：阿里云通用文字识别 或 腾讯云 OCR）
- [ ] 申请 API Key → `OCR_API_KEY`、`OCR_PROVIDER=aliyun`
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：
1. `cd backend && npm install sharp`
2. 实现 `backend/src/services/ocrProviders/aliyunOcr.ts`（或对应供应商）
3. 图片在后端用 sharp 二次压缩到 1MB 以内再发送
4. 更新 `backend/src/routes/ocr.ts` 接入真实供应商
5. 真实食品包装图片测试（至少 3 张，识别准确率 ≥ 70%）

---

### Batch 2-D：iOS 工程配置 `[人工]`

**状态**：⏸ blocked_by_user

- [ ] 注册 Apple Developer Program（$99/年）
- [ ] Xcode 配置：Bundle ID `com.compcheck.app`，App 名称"成分镜"
- [ ] 添加相机/相册权限描述（见 `docs/ios-plist-additions.md`）
- [ ] 真机 Build & Run，验证拍照识别主流程可用
- [ ] TestFlight 内测
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 2-E：Android 工程配置 `[人工]`

**状态**：⏸ blocked_by_user

- [ ] 注册 Google Play Developer（$25）
- [ ] Android Studio 配置：applicationId `com.compcheck.app`
- [ ] 签名 keystore（妥善备份密码）
- [ ] 真机 Build & Run，验证拍照识别主流程可用
- [ ] Google Play 内测轨道（14 天闭测计时）
  - 内测开始日期：`[填写]`
  - 可申请正式发布日期：`[填写 = 开始 + 14 天]`
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 4-A：套餐设计与权益服务 `[Codex]`

**状态**：⏸ 后移（依赖阶段 3-9 稳定）

主要内容：`entitlements` 表、`entitlementService.ts`、免费额度（OCR 5次/月、AI报告 3次/月）、`GET /api/user/entitlement`、`POST /api/user/entitlement/verify`、用量限制中间件。

---

### Batch 4-B：Apple IAP 接入 `[人工+Codex]`

**状态**：⏸ blocked_by_user（依赖 4-A + Apple Developer 账号）

人工：App Store Connect 创建订阅商品、沙盒账号、.p8 API Key。
Codex：前端购买流程、服务端 JWS 验证、Webhook 处理。

---

### Batch 4-C：Google Play Billing 接入 `[人工+Codex]`

**状态**：⏸ blocked_by_user（依赖 4-B + Google Play 账号）

人工：Play Console 配置订阅、Pub/Sub 通知、服务账号 JSON。
Codex：购买流程、服务端验证、Webhook。

---

### Batch 6-A：E2E 测试 `[Codex]`

**状态**：⏸ 后移（依赖阶段 3-9 功能稳定）

主要内容：Playwright，覆盖拍照识别→配料分析→保存报告、成分搜索→详情→收藏等主流程，CI 集成。

---

### Batch 6-B：合规材料最终版 `[人工+Codex]`

**状态**：⏸ blocked_by_user（法务复核）

人工：法务复核隐私政策、服务条款、数据安全问卷、客服邮箱。
Codex：更新 `legalContent.js`，新建 `docs/app-store-metadata.md`。

---

### Batch 6-C：上架资源准备 `[人工]`

**状态**：⏸ blocked_by_user

- [ ] App Icon 1024×1024 PNG
- [ ] iOS 截图（6.7"、6.5"、5.5"）、Android 截图
- [ ] 短描述（≤ 30 字）、完整描述（中英文）
- [ ] 审核 demo 账号

---

### Batch 6-D：生产基础设施配置 `[人工+Codex]`

**状态**：⏸ blocked_by_user（依赖 D-A 选型 + 域名）

人工：域名、DNS、生产数据库、部署平台、所有生产环境变量。
Codex：生产多阶段 Dockerfile、CI/CD deploy.yml。

---

### Batch 7-A：监控与可观测性 `[Codex]`

**状态**：⏸ 后移（依赖 6-D）

主要内容：Sentry 接入、`/health` 数据库检查、前端全局错误上报、关键操作结构化日志。

---

### Batch 7-B：提交商店审核 `[人工]`

**状态**：⏸ blocked_by_user（依赖 M6 全部完成）

App Store Connect 和 Google Play Console 提交审核所需所有人工操作。

---

### Batch 7-C：正式发布与验收 `[人工+Codex]`

**状态**：⏸ 后移（依赖审核通过）

Codex：`scripts/post-launch-check.sh`，更新 `PROJECT_PLAN.md` 进度至 100%。

---

## 快速参考：当前最早未完成任务

```
→ 无阻塞，Codex 可立即执行（按顺序）：
  暂无（下一项 A-A 需要 AI Key 人工前置）

→ 当前需要人工并行处理：
  Data Batch 1-B：官方来源清单确认和 10-20 条逐条审核样例（不阻塞 OCR 流程）
  Batch D-A：生产数据库选型（不阻塞 OCR 流程）
  OCR API Key：解锁真实 OCR 供应商调用（不阻塞 manual/fallback 闭环）
```

---

## 完整依赖关系

```
【已完成】Data 1-A, 0-A, 1-A, 1-B, 2-A~C, 3-A~D

【数据主线】Data 1-B[人工+Codex，blocked_by_user] → 【已完成】Data 1-C（数据版本/审核状态基础设施） → D-A[人工] → D-B[人工+Codex]

【OCR 产品闭环（Codex 主线）】
【已完成】O-A（拍照入口）→ O-D（图片预处理）→ O-B（OCR 抽象）→ O-C（文本确认）
→ P-A（配料解析）→ P-B（数据库匹配）
【已完成】R-A（分析报告）→ F-A（产品档案）→ F-B（历史收藏）
【已完成】Q-A（登录 UI）
【已完成】U-A（个性化）→ U-B（关注/忌口云同步）
【已完成】M-A（首页重构）
【已完成】M-B（PWA 优化）
【下一步】A-A[人工+Codex，需 AI Key]

【后置：订阅支付上架（等核心稳定）】
L-A[人工+Codex] → 2-D[人工] → 2-E[人工]
→ 4-A → 4-B[人工+Codex] → 4-C[人工+Codex]
→ 6-A → 6-B[人工+Codex] → 6-C[人工] → 6-D[人工+Codex]
→ 7-A → 7-B[人工] → 7-C[人工+Codex]
```

**关键人工卡点**：

| 卡点 | 解锁什么 | 最晚时机 |
|---|---|---|
| GB 2760 等来源确认 | Data 1-B Codex 部分 | OCR 闭环进行中可并行 |
| 生产数据库连接串 | D-A/D-B | M-B 完成前 |
| OCR API Key | L-A | A-A 完成后 |
| AI API Key | A-A | M-B 完成后 |
| Apple Developer | 2-D、4-B | 4-A 完成后 |
| Google Play + 14天闭测 | 2-E、4-C | **尽早启动，闭测需时间** |
| 法务合规复核 | 6-B | 6-A 完成后 |
| 域名 + 生产环境 | 6-D | 6-B 完成后 |
