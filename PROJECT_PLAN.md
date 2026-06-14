# Project Plan — CompLens / 成分镜（CompCheck）

## 1. 当前产品定位

**CompLens / 成分镜 是面向普通用户的食品配料表拍照识别与成分分析 App。**

核心主路径：

```
拍照/上传食品配料表图片 → OCR 识别 → 用户确认修正文本 → 自动拆分配料
→ 匹配食品成分/食品添加剂数据库 → 展示数据来源和可信等级 → 生成分析报告 → 保存产品档案和历史
```

成分搜索只是辅助功能，不是主路径。当前阶段只做食品配料 / 食品添加剂，不混入化妆品、护肤品、药品。

---

## 2. 当前最高优先级

```
1. 数据源准确性
2. GB2760 官方 PDF 可追溯导入（staging → promote → pending_review → 人工复核）
3. 数据库真实对接
4. OCR 拍照识别主流程
5. OCR 文本确认与修正
6. 配料表解析
7. 数据库匹配
8. 食品配料分析报告
9. 产品档案、收藏、历史
10. 移动端 / PWA 使用体验
11. AI 总结解释
12. 登录、云同步
13. 订阅、支付、上架（后置）
```

订阅、支付、上架不排在核心闭环前；登录/云同步不阻塞本地 MVP；AI 不早于数据源和数据库匹配；OCR 是核心主路径不是附属。

---

## 3. 当前真实进度

整体产品进度：**约 66%**（按数据底座 + OCR 主路径闭环口径）。

| 里程碑 | 名称 | 状态 | 完成度 |
|---|---|---|---|
| M1 | 数据源准确性 + GB2760 可追溯导入 | 🔄 进行中 | ~86% |
| M2 | 数据库真实对接（本地完成，生产待补） | 🔄 进行中 | ~70% |
| M3 | OCR 拍照识别主流程（manual/mock 闭环） | 🔄 进行中 | ~78% |
| M4 | 配料解析 + 数据库匹配 | 🔄 进行中 | ~72% |
| M5 | 食品配料分析报告 | 🔄 进行中 | ~70% |
| M6 | 产品档案、收藏、历史、个性化 | 🔄 进行中 | ~55% |
| M7 | 产品体验与信息架构优化（UX） | 🔄 进行中 | ~33% |
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
- OCR 主路径：拍照/上传入口、图片预处理（EXIF/压缩/IndexedDB）、OCR manual/mock/real-provider 抽象、文本确认页、配料解析、批量匹配；后端 `OCR_PROVIDER=mock` 可返回明确标注的 mock OCR 结果，真实 provider 缺 Key 仍降级 manual。
- 分析报告：整体评级、关注摘要、配料顺序、添加剂分类、未收录、特殊人群、来源说明、Markdown/JSON 导出、分享、历史。
- 产品档案 + 收藏 + 历史 + 个人关注/忌口/过敏原 + 全局高亮 + 登录态云同步。
- 前端登录/注册 + 访客模式 + JWT 管理 + 本机数据登录态同步。
- 移动端底部导航 + PWA 安装/离线基础 + 数据治理页人工校验队列。
- loading / empty / error 状态统一复核：搜索初始空态提供拍照/粘贴入口，GB2760 复核页和参考表错误态均有重试，复核空态有重置为待复核行/返回数据页出口。

---

## 5. 未完成

- 成分详情页 GB2760 官方证据展示（Batch 1-E）。
- 真实 OCR / 真实 AI 接入（Batch 3-E / 9-B，待 Key）。
- 内部数据控制台 / GB2760 复核工作台后续 UI（用户要求等产品页面设计统一推进）。
- 低置信度确认交互、统一可信表达、统一移动端组件、报告页产品化复核（阶段 7）。
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
| OCR API Key | 真实 OCR（3-E） | 否：manual/mock 闭环可用 |
| AI API Key | 真实 AI（9-B） | 否：本地 fallback 可用 |
| Apple / Google 账号 | iOS/Android 上架（11-B/C/D） | 否：已后置 |
| 法务复核 / 域名 / 部署平台 | 合规与生产（11-F/G） | 否：已后置 |

遇到阻塞按 `CODEX_TASKS.md` 人工阻塞处理规则：标记 `blocked_by_user`、记录原因、跳过、继续后续任务。

---

## 7. 下一步计划（当前阶段目标）

当前阶段：**阶段 1 数据源与 GB2760 导入 + 阶段 7 产品体验优化**。

下一个需要先确认边界：

1. Batch 5-B / UX-C：统一结果可信表达。该项不需要外部账号，但会影响结果页、详情页、搜索页可信标签与文案；因用户要求产品页面设计最后统一推进，开始前需确认是否只做文案/映射层，还是继续暂缓。

暂缓到产品页面设计统一推进：

- Batch 1-E：成分详情页 GB2760 官方证据展示。
- Batch 1-F：内部数据控制台 / GB2760 复核工作台后续 UI。
- Batch UX-A ~ UX-E：首页主路径、OCR 状态机、统一可信表达、移动端组件、报告页产品化。

人工并行：后续 GB2760 新增/变更 staging 行复核签核。

---

## 8. 7 天执行计划

> 每天一个可验证闭环。Codex 按此推进，遇人工阻塞跳过继续。

**Day 1：GB2760 导入审计骨架**
- 状态：✅ 已完成 2026-06-14。
- 结果：`source_documents` / `import_runs` / `import_errors` 表与导入状态查询已建立；`db:seed` 写入 A.1 staging 2404、全文 264、参考表 2800 三条稳定成功批次；登录后 `GET /api/gb2760/import-runs` 可用。
- 是否需要人工：否。

**Day 2：promote 正式库准入脚本**
- 目标：`additive_usage_rules` 表 + `promote:gb2760` 脚本，强制 12 条准入规则，空签核场景产出 0 verified、保留 pending_review。
- Codex 任务：Batch 1-C（脚本与表，不含人工签核数据）。
- 验收标准：脚本幂等；无签核行时不报错不伪造；缺字段行进 `import_errors`。
- 状态：✅ 已完成 2026-06-14。空签核结果：`scanned=2404 approved=0 promoted=0 failed=0 pending_review=2391 already_verified=13`；`additive_usage_rules=0`、`import_errors=0`。
- 是否需要人工：是（人工复核签核行可并行进行，不阻塞脚本）。

**Day 3：GB2760 数据校验命令**
- 目标：`validate:gb2760` 强制准入规则与禁止事项，违规报错退出。
- Codex 任务：Batch 1-D。
- 验收标准：合规通过并出报告；人为违规报错退出码非 0；不影响 `validate:data`。
- 状态：✅ 已完成 2026-06-14。当前 DB 报告：`staging=2404 pending_review=2391 approved=0 promoted=0 legacy_verified=13 additive_usage_rules=0 verified_regulation_ingredients=5 import_errors=0`。
- 是否需要人工：否。

**Day 4：成分详情 GB2760 证据展示**
- 目标：详情页展示 staging + 参考表证据，`pending_review` 明确标注，数据治理页参考表浏览。
- Codex 任务：Batch 1-E。
- 验收标准：`?includeEvidence=1` 返回证据；无证据不显示空块；pending 行不展示为结论。
- 是否需要人工：否。

**Day 5：首页主路径 + OCR 流程状态机**
- 目标：首页第一操作为拍照识别；OCR 全流程状态明确、可回退/重试、无 Key 走 manual、不卡死。
- Codex 任务：Batch UX-A、UX-B。
- 验收标准：首页拍照识别为第一主入口；流程每步有状态；失败可回退；不卡死。
- 是否需要人工：否。

**Day 6：统一可信表达 + 移动端组件**
- 目标：全局 dataStatus 文案/颜色映射统一；抽取 Button/Card/Badge/Toast/EmptyState/ErrorState/LoadingState/BottomNav。
- Codex 任务：Batch UX-C、UX-D。
- 验收标准：各状态文案颜色全页统一；组件复用；无内联颜色。
- 是否需要人工：否。

**Day 7：报告页产品化 + 状态统一收尾**
- 目标：报告页产品化复核（摘要/重点/统计/来源/保存分享/非医疗化）；全页 loading/empty/error 统一。
- Codex 任务：Batch UX-E、Batch 8-C。
- 验收标准：报告页符合产品化标准；禁止文案被 lint 拦截；全页状态统一。
- 状态：Batch 8-C ✅ 已完成 2026-06-14；UX-E 按产品页面设计统一推进暂缓。
- 是否需要人工：否。

> 低置信度确认（Batch 4-C）已完成；真实 OCR/AI、生产部署、跨设备验收等待人工解锁。

---

## 9. 阶段验收标准

每个 Codex Batch 结束前必须通过：

```bash
npm run validate:data && npm run lint && npm run test && npm run build
# 涉及后端：
cd backend && npm run typecheck && npm test && npm run build
# 涉及 GB2760（Batch 1-D 后）：
npm run validate:gb2760
```

纯文档修改至少执行 `git diff --check`，并说明未运行 build/test 的原因。

---

## 10. 维护规则

每次 Codex 修改后必须同步更新本文件（进度、阶段、已完成、未完成、阻塞、下一步），以及 `CODEX_TASKS.md`、`AI_REVIEW.md`；影响命令更新 `COMMANDS.md`，影响数据口径更新 `DATA_SOURCES.md`。未同步视为任务未完成。

不允许伪造进度，不允许把未完成写成已完成，不允许把 seed 样本当完整数据集，不允许把 `pending_review` / `unverified` 当 `verified`。

---

## 11. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 2026-06-14 | Batch 8-C：全页 loading / empty / error 状态复核，补齐搜索初始空态拍照/粘贴入口、GB2760 复核页错误重试与空态出口、GB2760 参考表错误重试；后续 5-B/UX-C 可信表达需先确认是否纳入产品页面设计暂缓范围 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 3-B：OCR Provider 抽象命名闭环，后端支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，mock 明确标注且真实 provider 仍需后端 Key；内部控制台后续 UI 按用户要求暂缓到产品页面设计统一推进 | Codex | 针对性验证：`backend ocr.test.ts`、后端 `typecheck`、前端 OCR 协议断言 |
| 2026-06-14 | GB2760 复核闭环：自动创建缺失成分映射、人工批量签核 1447 条剩余 staging 行，并 promote 全部 2391 条 A.1 staging 到 `additive_usage_rules`；根目录新增 `map:gb2760` / `promote:gb2760` 委托命令 | Codex + 人工 | `validate:gb2760` 通过；报告：staging 2404、pending_review 0、promoted 2391、legacy_verified 13、additive_usage_rules 2391、verified_regulation_ingredients 308、import_errors 0 |
| 2026-06-14 | Batch 1-D：新增 `validate:gb2760` 数据准入校验服务和后端 CLI，根目录命令委托到 backend；CI 增加 Postgres、migrate、seed、validate 链路 | Codex | `npm run validate:gb2760` 通过；报告：staging 2404、pending_review 2391、legacy_verified 13、additive_usage_rules 0、import_errors 0 |
| 2026-06-14 | Batch 1-C：新增 `additive_usage_rules` 表、`promote:gb2760` 后端脚本和 promote 准入服务；只处理人工 `approved` / `promoted` 行，空签核场景 0 promoted，不把历史 `verified` staging 行自动写入新规则表 | Codex | `db:migrate` / `db:seed` / `promote:gb2760` / 后端 `typecheck` / 后端 `test` 通过；查询：additive_usage_rules 0、pending_review 2391、verified 13、import_errors 0 |
| 2026-06-14 | Batch 1-A：新增 `source_documents` / `import_runs` / `import_errors`，`db:seed` 写入 GB2760 三类导入批次，新增需登录的 `GET /api/gb2760/import-runs` 与错误明细接口 | Codex | `db:migrate` / `db:seed` / 后端 `typecheck` / 后端 `test` 通过；审计表查询：source 1、runs 3、errors 0 |
| 2026-06-14 | 文档与任务计划重构：`CODEX_TASKS.md` 重排为阶段 1-11，新增 GB2760 staging→promote→validate 流程、UX 阶段、人工阻塞跳过规则；`PROJECT_PLAN.md` 加入 7 天计划；补 `AGENTS.md` 并把产品入口合并到既有 `readme.md`；更新 `COMMANDS.md` 计划命令、`DATA_SOURCES.md` 状态模型、`AI_REVIEW.md` | Claude (Opus 4.8) + Codex | `validate:data` / `lint` / `test` / `build` / `git diff --check` 通过 |
| 2026-06-14 | GB2760 参考表行边界修复，`validate:data` 通过，2800 行分表数量与官方 PDF 一致 | Codex | `validate:data` / `lint` / `test` / `build` 通过 |
