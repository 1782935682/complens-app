# Project Plan — CompLens / 成分镜（CompCheck）

## 1. 当前产品定位

**CompLens / 成分镜 是面向普通消费者的食品标签拍照解读与消费决策助手。**

核心主路径：

```
拍食品标签 → 识别配料表/营养成分表 → 用户确认修正文本
→ 配料拆分 + 营养字段解析 → 我的关注项 → 食品标签解读报告 → 保存历史
```

用户拍的不一定只有配料表，也可能是营养成分表或包装正面。成分搜索和专业法规查询只是辅助能力，不是主路径。当前阶段只做食品标签，不混入化妆品、护肤品、药品。

---

## 2. 当前最高优先级

```
1. 数据源准确性
2. GB2760 官方 PDF 可追溯导入（staging → promote → pending_review → 人工复核）
3. 数据库真实对接
4. OCR 拍照识别主流程
5. 标签类型识别（配料表 / 营养成分表 / 包装正面 / 未知）
6. OCR 文本确认与修正
7. 配料表解析 + 营养字段解析
8. 我的关注项
9. 食品标签解读报告
10. 产品档案、收藏、历史
11. 移动端 / PWA 使用体验
12. AI 总结解释
13. 登录、云同步
14. 订阅、支付、上架（后置）
```

订阅、支付、上架不排在核心闭环前；登录/云同步不阻塞本地 MVP；AI 不早于数据源和数据库匹配；OCR 是核心主路径不是附属；专业法规和数据库证据默认服务“查看依据”，不抢占消费者报告第一屏。

---

## 3. 当前真实进度

整体产品进度：**约 67%**（按数据底座 + OCR 主路径闭环口径）。

| 里程碑 | 名称 | 状态 | 完成度 |
|---|---|---|---|
| M1 | 数据源准确性 + GB2760 可追溯导入 | 🔄 进行中 | ~86% |
| M2 | 数据库真实对接（本地完成，生产待补） | 🔄 进行中 | ~70% |
| M3 | OCR 拍照识别主流程（manual/mock/本机 RapidOCR 闭环） | 🔄 进行中 | ~82% |
| M4 | 配料解析 + 数据库匹配 | 🔄 进行中 | ~72% |
| M5 | 食品标签解读报告（配料 + 营养 + 关注项） | 🔄 新规划 / 进行中 | ~35% |
| M6 | 我的关注项、产品档案、收藏、历史、个性化 | 🔄 进行中 | ~55% |
| M7 | 消费者体验与信息架构优化（UX） | 🔄 进行中 | ~36% |
| M8 | 移动端 / PWA 体验 | 🔄 进行中 | ~45% |
| M9 | AI 总结解释（本地 fallback 可用，真实待 Key） | 🔄 进行中 | ~15% |
| M10 | 登录、云同步（本地完成，跨设备验收待补） | 🔄 进行中 | ~40% |
| M11 | 订阅、支付、上架 | ⏸ 后置 | 0% |

数据底座真实口径（详见 `DATA_SOURCES.md`）：

- 食品基础库 DB 当前 329 条：`verified_regulation` 308、`verified_jecfa` 1、`common_ingredient` 12、`unverified` 8；源文件静态 seed 仍为 112 条，`validate:data` 继续校验源文件口径。
- GB2760 官方 PDF：264 页全文入库；表 A.1 第 8-148 页 → 2404 行 staging（后端 DB 2391 行已人工签核并 `promoted`，13 行历史 `verified`，缺映射 0）；A.2/B/C/D/E/F → 2800 行参考表，边界已修复；`source_documents` / `import_runs` / `import_errors` 导入审计骨架已落地；`additive_usage_rules`、`promote:gb2760` 与 `validate:gb2760` 已落地，当前正式规则 2391 行、错误数 0；内部复核写接口已加 `GB2760_INTERNAL_REVIEWERS` allowlist 和 reviewer 审计字段。
- 这不是完整成分库，也不是完整 GB2760 法规库；正式库只接收高置信、可追溯、字段完整的 promote 数据。

---

## 4. 已完成

- 后端 Hono/TS + Drizzle/PostgreSQL schema、迁移、seed、Docker Compose（本地/开发环境）。
- 成分 API：列表/详情/分类/搜索/批量匹配/可信等级筛选。
- 前端优先 API、失败降级本地 seed 并显示未验证标识。
- 数据溯源字段：`dataStatus`/`matchConfidence`/`sourceScope`/`sourceName`/`sourceVersion`/`sourceUrl`/`regulatoryBasis`/`rawSourceText`/`lastReviewedAt`/`reviewNote`/`isVerified`。
- GB2760 官方来源确认 + 264 页全文 + 2404 行 A.1 staging + 2800 行参考表（边界修复完成）+ 导入审计骨架（来源文档、批次、错误表和查询接口）+ `additive_usage_rules` 正式规则表 + `promote:gb2760` 准入脚本 + 本轮人工签核 promote 2391 条正式规则 + `validate:gb2760` 数据准入校验。
- OCR 主路径：拍照/上传入口、图片预处理（EXIF/压缩/IndexedDB）、OCR manual/mock/real-provider 抽象、文本确认页、配料解析、批量匹配；后端 `OCR_PROVIDER=mock` 可返回明确标注的 mock OCR 结果，`OCR_PROVIDER=rapidocr` 已接入本机 `/home/downloads/tools/complens-ocr` 服务，生产 Aliyun OCR 待 Key 后切换。
- 分析报告：整体评级、关注摘要、配料顺序、添加剂分类、未收录、特殊人群、来源说明、Markdown/JSON 导出、分享、历史。
- 产品档案 + 收藏 + 历史 + 个人关注/忌口/过敏原 + 全局高亮 + 登录态云同步。
- 前端登录/注册 + 访客模式 + JWT 管理 + 本机数据登录态同步。
- 移动端底部导航 + PWA 安装/离线基础 + 数据治理页人工校验队列。
- loading / empty / error 状态统一复核：搜索初始空态提供拍照/粘贴入口，GB2760 复核页和参考表错误态均有重试，复核空态有重置为待复核行/返回数据页出口。
- 统一结果可信表达映射层：`src/utils/dataStatus.js` 统一 `verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 的文案、颜色变量、Badge class 和 normalize 逻辑；搜索、详情、分析、报告、导出、数据治理页已引用。
- 产品蓝图文档集：`docs/product-blueprint/` 已覆盖产品、设计系统、视觉、前端、页面、跨端、API、数据可信、UI 路线、后台、隐私、测试验收；2026-06-15 已二次复核并同步 `CODEX_TASKS.md` / `AGENTS.md` / `COMMANDS.md` / `DATA_SOURCES.md`。
- 消费者食品标签解读规划：已新增 `CONSUMER_DECISION_SPEC.md` 与 `CONSUMER_UX_SPEC.md`，明确产品从“配料表识别/添加剂查询”升级为“食品标签拍照解读 + 消费决策助手”。

---

## 5. 未完成

- 成分详情页 GB2760 官方证据展示（Batch 1-E）。
- 生产 Aliyun OCR / 真实 AI 接入（Batch 3-E / 9-B，待 Key；本机 RapidOCR 已接入）。
- 标签类型识别、营养成分表结构化、我的关注项主路径化、食品标签解读报告结构改造（阶段 13）。
- 包装正面卖点核对、两款商品对比、扫码识别（MVP 后置）。
- 内部数据控制台 / GB2760 复核工作台后续 UI（用户要求等产品页面设计统一推进）。
- 移动端组件统一、报告页产品化复核、首页/OCR 产品体验整体复核（阶段 7；统一可信表达映射层已完成）。
- iPhone Safari 真机验收（阶段 8）。
- 生产数据库、生产部署、跨设备真实验收、离线同步队列。
- 订阅、支付、上架（后置）。

---

## 6. 当前人工阻塞

| 阻塞项 | 阻塞内容 | 是否阻塞核心 |
|---|---|---|
| GB2760 后续增量复核 | 新抽取或变更 staging 行再次 promote | 否：本轮 2391 条已 promote，后续增量继续人工复核 |
| 内部控制台 / 产品页面设计 | 用户要求内部控制台先不做，等产品页面设计统一推进 | 否：当前数据复核/promote 闭环已可用 |
| 生产 DATABASE_URL | 生产数据库（2-D） | 否：本地闭环可用 |
| 生产 Aliyun OCR API Key | 生产 OCR 切换（3-E） | 否：本机 rapidocr/manual/mock 闭环可用 |
| AI API Key | 真实 AI（9-B） | 否：本地 fallback 可用 |
| Apple / Google 账号 | iOS/Android 上架（11-B/C/D） | 否：已后置 |
| 法务复核 / 域名 / 部署平台 | 合规与生产（11-F/G） | 否：已后置 |

遇到阻塞按 `CODEX_TASKS.md` 人工阻塞处理规则：标记 `blocked_by_user`、记录原因、跳过、继续后续任务。

---

## 7. 下一步计划（当前阶段目标）

当前阶段：**阶段 13 消费者食品标签解读规划 → 阶段 14 前端规范落地准备**。

当前策略：

1. 优先 Web/PWA 跑通并打磨“拍食品标签 → 标签类型识别 → OCR → 文本确认 → 配料/营养解析 → 我的关注项 → 食品标签解读报告 → 历史”主流程。
2. 后续以统一设计系统和 API 迁移到微信小程序、Android、iOS。
3. 后台管理端单独建设，不与用户端强行共用页面代码。
4. 统一的是产品流程、design tokens、数据状态、API 契约和文案规范。
5. 内部控制台暂缓，等产品页面设计统一推进时再做。

Codex 下一步任务：

1. 完成本轮消费者标签解读文档更新 PR。
2. PR 合并后优先执行 `CONSUMER-LABEL-A` 标签类型识别，再做 `CONSUMER-LABEL-B` 营养成分表结构化。
3. 后续进入实现时先做轻量本地 review，再按改动范围验证，不默认跑完整测试。

人工并行：后续 GB2760 新增/变更 staging 行复核签核；生产 DATABASE_URL、Aliyun OCR Key、AI Key、商店账号和法务材料均不阻塞当前本地 MVP。

---

## 7.5 跨端策略、产品蓝图与中长期目标

**这是一个面向普通消费者的产品**：一切规划以用户端"食品标签拍照解读 + 消费决策辅助"主路径体验为中心；内部数据控制台、GB2760 复核工作台等是支撑工具，不得喧宾夺主。

跨端策略：

```
当前优先 Web/PWA 跑通用户主流程
后续以统一设计系统和 API 迁移到微信小程序、Android、iOS
后台管理端单独建设，不与用户端强行共用页面代码
统一的是：产品流程、设计 token、数据状态、API 契约
```

完整规范收敛在 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)（产品 / 消费者决策 / 消费者体验 / 设计系统 / 视觉 / 前端 / 页面 / 跨端 / API / 数据可信 / UI 路线 / 后台 / 隐私 / 测试验收）。

- **短期目标（消费者主路径打磨）**：标签类型识别（CONSUMER-LABEL-A）、营养成分表结构化（CONSUMER-LABEL-B）、我的关注项本地设置（CONSUMER-LABEL-C）、食品标签解读报告（CONSUMER-LABEL-D）；同时保留 design tokens 与基础组件落地（FRONTEND-A/B）。
- **设计基线（已确认 2026-06-14）**：主色薄荷绿色阶（`--primary #059669`、主按钮 `#047857`、辅助高亮 `#10b981`、装饰 `#34d399`、浅底 `#ecfdf5`）+ 16px 圆角；规范已写入 `docs/product-blueprint/DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md`，代码切换待 Batch FRONTEND-A（`src/styles.css` 当前仍为青绿/8px）。
- **中期目标（数据 + 标签能力 + 跨端）**：包装正面卖点核对、两款商品对比、GB2760 增量人工复核扩大正式库覆盖、生产数据库与生产 OCR（Aliyun）接入、微信小程序 / Android / iOS 适配落地、独立后台第一版。
- **长期目标（增值与上架）**：扫码、真实 AI 总结、登录云同步跨设备验收、订阅支付、应用商店上架与合规材料（阶段 11，后置）。
- **人工阻塞项**：生产 DATABASE_URL、生产 Aliyun OCR Key、AI API Key、Apple/Google/国内商店账号、支付订阅账号、隐私政策法律确认、软著/备案/商标、GB2760 后续增量复核、后台/产品页面设计统一推进边界。
- **Codex 下一步**：先提交消费者标签解读文档 PR；合并后执行 `CONSUMER-LABEL-A`，不要先做包装卖点、对比、扫码、AI、订阅支付或上架。

## 8. 7 天执行计划

> 每天一个可验证闭环。遇人工阻塞时记录并继续后续无需人工的任务。

**Day 1：消费者标签解读文档收口**
- 目标：新增 `CONSUMER_DECISION_SPEC.md` / `CONSUMER_UX_SPEC.md`，同步产品、页面、前端、API、任务和计划文档。
- 验收标准：所有文档体现“食品标签拍照解读 + 消费决策助手”，计划 API 不写成已实现。
- 是否需要人工：否。

**Day 2：CONSUMER-LABEL-A 标签类型识别**
- 目标：支持 `ingredient_list` / `nutrition_facts` / `front_claims` / `unknown_label` 的前端识别与用户选择。
- 验收标准：无法判断时允许用户选择，不跳过文本确认。
- 是否需要人工：否。

**Day 3：CONSUMER-LABEL-B 营养成分表结构化**
- 目标：支持营养表 OCR 文本确认与能量、蛋白质、脂肪、碳水、糖、钠等字段解析。
- 验收标准：字段可编辑；信息不足提示结合包装原文确认。
- 是否需要人工：否。

**Day 4：CONSUMER-LABEL-C 我的关注项本地设置**
- 目标：支持控糖、低钠、少添加、给孩子看、过敏/忌口等本地关注项。
- 验收标准：不登录可保存；报告按关注项排序。
- 是否需要人工：否。

**Day 5：CONSUMER-LABEL-D 食品标签解读报告**
- 目标：报告页改为一句话结论、我的关注项、购买前建议关注、配料/营养/来源结构。
- 验收标准：报告名为食品标签解读；专业依据默认折叠；无禁用文案。
- 是否需要人工：建议产品文案走查。

**Day 6：消费者主路径回归**
- 目标：首页 → 拍食品标签 → 标签类型 → OCR 确认 → 配料/营养解析 → 报告 → 历史闭环。
- 验收标准：任一步失败可重试/手动输入；拍一张也能分析。
- 是否需要人工：否。

**Day 7：后续功能规划复核**
- 目标：确认包装卖点核对、两款商品对比、扫码、云同步、AI、小程序/App、订阅支付均后置。
- 验收标准：后置功能不阻塞 MVP，不被误写成已实现。
- 是否需要人工：需要用户确认后续优先级。

---

## 9. 阶段验收标准

每个 Codex Batch 结束前必须按改动范围验证：

- 纯文档修改：`git diff --check`。
- 前端样式/组件小改：`npm run lint` + 相关现有测试；必要时 `npm run test`。
- 触达构建入口、路由、PWA、跨端配置：加 `npm run build`。
- 涉及后端：`cd backend && npm run typecheck` + 相关测试；必要时 `npm test` / `npm run build`。
- 涉及 GB2760 数据准入：按任务要求运行 `npm run validate:gb2760` 或对应校验。

禁止为了省时间跳过必要验证；也不要每次无差别跑完整测试。纯文档修改需说明未运行 build/test 的原因。

---

## 10. 维护规则

每次 Codex 修改后必须同步更新本文件（进度、阶段、已完成、未完成、阻塞、下一步），以及 `CODEX_TASKS.md`、`AI_REVIEW.md`；影响命令更新 `COMMANDS.md`，影响数据口径更新 `DATA_SOURCES.md`。未同步视为任务未完成。

不允许伪造进度，不允许把未完成写成已完成，不允许把 seed 样本当完整数据集，不允许把 `pending_review` / `unverified` 当 `verified`。

---

## 11. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 2026-06-15 | 消费者食品标签解读文档优化：新增 `CONSUMER_DECISION_SPEC.md` / `CONSUMER_UX_SPEC.md`，将产品定位统一为“食品标签拍照解读 + 消费决策助手”，同步产品、页面、前端、API、数据可信、UI 路线、QA、任务清单、Agent 规则和入口 README；仅文档，不改业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-14 | 确认设计基线为薄荷绿主色 + 16px 圆角：更新 `DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md` / `FRONTEND_SPEC.md` / `product-blueprint/README.md` 为规范值（含用户给定 5 色阶与角色），并把 `CODEX_TASKS.md` Batch FRONTEND-A 细化为可执行落地任务。仅文档，未改业务代码（曾试改 `src/styles.css` 后按用户要求 `git checkout` 还原） | Claude (Opus 4.8) | `git diff --check`（纯文档；`src/styles.css` 已还原为青绿/8px 原状） |
| 2026-06-14 | 新增产品蓝图规范集 `docs/product-blueprint/`（PRODUCT/DESIGN_SYSTEM/VISUAL_STYLE/FRONTEND/PAGE_STRUCTURE/CROSS_PLATFORM/API_CONTRACT/DATA_TRUST/UI_ROADMAP/ADMIN_CONSOLE/PRIVACY/QA 共 12 份 + README 索引）；同步 `CODEX_TASKS.md`（阶段 12-14：UI-SPEC/PLATFORM/FRONTEND 批次）、`AGENTS.md`、`COMMANDS.md`、`readme.md`、`docs/README.md`、`PROJECT_PLAN.md`。仅文档，不改业务代码 | Claude (Opus 4.8) | `git diff --check`（未运行 build/test：纯文档修改，不影响代码/依赖/构建/运行方式） |
| 2026-06-14 | 接入本机 RapidOCR：后端 `rapidocr` provider 调用 `/home/downloads/tools/complens-ocr` FastAPI 服务，新增 `OCR_SERVICE_URL` 配置与外部组件台账 `INTEGRATIONS.md`；生产后续切换 Aliyun OCR | Codex | `backend ocr.test.ts` / 后端 `typecheck` / 后端 `build` / `npm test` / `lint` / `build` / `validate:data` / provider 实连本机 OCR 通过 |
| 2026-06-14 | Batch 5-B / UX-C：新增统一 dataStatus 映射工具，统一结果可信表达文案、颜色变量和 Badge class；搜索、详情、分析、报告、导出、数据治理页改为引用同一映射；产品页面整体设计仍暂缓 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 8-C：全页 loading / empty / error 状态复核，补齐搜索初始空态拍照/粘贴入口、GB2760 复核页错误重试与空态出口、GB2760 参考表错误重试；后续 5-B/UX-C 可信表达需先确认是否纳入产品页面设计暂缓范围 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 3-B：OCR Provider 抽象命名闭环，后端支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，mock 明确标注且真实 provider 仍需后端 Key；内部控制台后续 UI 按用户要求暂缓到产品页面设计统一推进 | Codex | 针对性验证：`backend ocr.test.ts`、后端 `typecheck`、前端 OCR 协议断言 |
| 2026-06-14 | GB2760 复核闭环：自动创建缺失成分映射、人工批量签核 1447 条剩余 staging 行，并 promote 全部 2391 条 A.1 staging 到 `additive_usage_rules`；根目录新增 `map:gb2760` / `promote:gb2760` 委托命令 | Codex + 人工 | `validate:gb2760` 通过；报告：staging 2404、pending_review 0、promoted 2391、legacy_verified 13、additive_usage_rules 2391、verified_regulation_ingredients 308、import_errors 0 |
| 2026-06-14 | Batch 1-D：新增 `validate:gb2760` 数据准入校验服务和后端 CLI，根目录命令委托到 backend；CI 增加 Postgres、migrate、seed、validate 链路 | Codex | `npm run validate:gb2760` 通过；报告：staging 2404、pending_review 2391、legacy_verified 13、additive_usage_rules 0、import_errors 0 |
| 2026-06-14 | Batch 1-C：新增 `additive_usage_rules` 表、`promote:gb2760` 后端脚本和 promote 准入服务；只处理人工 `approved` / `promoted` 行，空签核场景 0 promoted，不把历史 `verified` staging 行自动写入新规则表 | Codex | `db:migrate` / `db:seed` / `promote:gb2760` / 后端 `typecheck` / 后端 `test` 通过；查询：additive_usage_rules 0、pending_review 2391、verified 13、import_errors 0 |
| 2026-06-14 | Batch 1-A：新增 `source_documents` / `import_runs` / `import_errors`，`db:seed` 写入 GB2760 三类导入批次，新增需登录的 `GET /api/gb2760/import-runs` 与错误明细接口 | Codex | `db:migrate` / `db:seed` / 后端 `typecheck` / 后端 `test` 通过；审计表查询：source 1、runs 3、errors 0 |
| 2026-06-14 | 文档与任务计划重构：`CODEX_TASKS.md` 重排为阶段 1-11，新增 GB2760 staging→promote→validate 流程、UX 阶段、人工阻塞跳过规则；`PROJECT_PLAN.md` 加入 7 天计划；补 `AGENTS.md` 并把产品入口合并到既有 `readme.md`；更新 `COMMANDS.md` 计划命令、`DATA_SOURCES.md` 状态模型、`AI_REVIEW.md` | Claude (Opus 4.8) + Codex | `validate:data` / `lint` / `test` / `build` / `git diff --check` 通过 |
| 2026-06-14 | GB2760 参考表行边界修复，`validate:data` 通过，2800 行分表数量与官方 PDF 一致 | Codex | `validate:data` / `lint` / `test` / `build` 通过 |
