# CODEX_TASKS.md

> 本文件是 CompLens / 成分镜（项目代号 CompCheck）的 **Codex 主任务清单**。Codex 每次开发时按"当前最早未完成且未被人工阻塞的任务"执行，完成后把状态改为 `✅ 已完成 YYYY-MM-DD` 并同步 `PROJECT_PLAN.md` / `AI_REVIEW.md`。
>
> 2026-06-14 按"数据源准确性 → GB2760 导入 → 数据库 → OCR 主路径 → 解析匹配 → 报告 → 档案 → 体验 → AI → 登录 → 订阅"的优先级整体重构。订阅、支付、上架已全部后置。

---

## 项目主路径

```
拍照 / 上传食品配料表图片
  → [客户端] 图片预处理（EXIF 修正 + 压缩 + IndexedDB 存储）
  → OCR 识别文字（manual / mock / 真实 provider 三类模式）
  → 用户确认和修正识别文本
  → 自动拆分配料
  → 匹配食品成分 / 食品添加剂数据库
  → 展示每条配料的数据来源和可信等级
  → 生成食品配料分析报告
  → 保存产品档案和分析历史
```

**成分搜索只是辅助功能，不是主路径。OCR 拍照识别配料表 + 分析配料是核心主路径。**

产品边界：

- 当前阶段只做"食品配料 / 食品添加剂"，不混入化妆品、护肤品、药品。
- 数据必须来自可追溯官方来源，AI 不能作为原始数据来源。
- 所有风险提示谨慎表达，不构成医疗建议。
- 禁止文案：`绝对安全 / 绝对有害 / 治疗疾病 / 一定致敏 / 一定不能吃 / 致癌 / 有毒`
- 推荐文案：`建议关注 / 部分人群可能需要留意 / 仅供配料信息参考 / 不构成医疗建议`

---

## 自动化执行规则

1. **按阶段顺序执行**，不跳过、不合并跨阶段任务，除非该任务被标记为 `blocked_by_user`（见下方阻塞规则）。
2. **每个 Batch 对应一个 PR**，PR 合并后再开始下一个 Batch。
3. 每个 Batch 完成后必须同步更新 `PROJECT_PLAN.md` 进度、`AI_REVIEW.md` 审查材料；若影响命令则更新 `COMMANDS.md`，若影响数据口径则更新 `DATA_SOURCES.md`。
4. 每个 Codex Batch 结束前必须全部通过：`npm run validate:data && npm run lint && npm run test && npm run build`；涉及后端时追加 `cd backend && npm run typecheck && npm test && npm run build`。
5. 禁止为通过测试 / 构建而屏蔽错误、删除断言或用 mock 假装功能完成。
6. 禁止自动 push 到 `main`，所有代码必须通过 PR 合并。
7. **OCR 是核心主路径**：未配置 OCR API Key 时必须保留 manual 手动输入降级，App 不得崩溃。
8. **AI 只能作为解释层**，不能编造数据来源、不能生成医疗诊断、不能替代数据库原始结论。
9. **禁止用 localStorage 存图片或大 blob**，图片必须用 IndexedDB（`compcheck-images` / `scan-images`）；localStorage 只存索引、元数据、设置。
10. 每个页面必须实现 loading / empty / error 三种状态，不允许只做 happy path。
11. 不允许把 seed 样本充当完整数据集，不允许把 `pending_review` / `unverified` 展示为权威结论。
12. 样式只用 `src/styles.css` CSS 变量，禁止内联颜色和魔法数字。

---

## 人工阻塞处理规则

遇到需要人工介入的任务，**不要停止整个流程**。正确处理：

```
标记 blocked_by_user
记录阻塞原因
跳过该任务
继续执行后续无需人工介入的任务
```

人工阻塞清单（解锁对应能力）：

| 阻塞项 | 解锁什么 |
|---|---|
| 生产 `DATABASE_URL` | 生产数据库查询（阶段 2 生产部分） |
| OCR API Key + 供应商选型 | 真实 OCR 识别（阶段 3 real provider） |
| AI API Key + 模型选型 | 真实 AI 解释（阶段 9 真实调用） |
| Apple Developer 账号 | iOS 打包 / 上架 |
| Google Play 账号 + 14 天闭测 | Android 打包 / 上架 |
| 国内应用商店账号 | 国内上架 |
| 支付 / 订阅账号 | 订阅功能（阶段 11） |
| 服务器 / 部署平台选择 | 生产部署 |
| 隐私政策最终法律确认 | 合规上架 |
| 软著 / 备案 / 商标材料 | 国内合规 |
| GB2760 人工复核 | staging → 正式库 promote（阶段 1 promote 的数据准入） |

---

## 任务状态定义

| 状态标记 | 含义 |
|---|---|
| ✅ 已完成 YYYY-MM-DD | 已完成并通过验收 |
| 🔄 进行中 | 部分完成，仍有未完成子项 |
| ⏸ 待开始 | 未开始，无阻塞，可执行 |
| ⛔ blocked_by_user | 被人工阻塞，跳过并继续后续任务 |
| 🔁 待重构 | 已有实现但需按新规范调整 |

执行者标记：`[Codex]` 独立完成 / `[人工]` 仅人工 / `[人工+Codex]` 人工前置后 Codex 编码。

---

## 当前最早可执行任务（Codex 立即执行）

```
→ 本轮刚完成：
  1. Batch 3-B：OCR Provider 抽象（manual / mock / aliyun / paddleocr / rapidocr）
  2. Batch 4-C：低置信匹配确认交互（报告待确认区块、确认/驳回持久化、驳回候选进人工校验队列）
  3. Batch 8-C：loading / empty / error 状态统一复核（搜索初始空态、GB2760 复核页、GB2760 参考表错误态补齐动作）
  4. Batch 5-B / UX-C：统一结果可信表达（dataStatus 文案、颜色变量和 Badge class 映射层）

→ 下一个需要人工确认边界：
  1. 是否继续进入产品页面设计统一推进范围（Batch 1-E、UX-A、UX-B、UX-D、UX-E）。
  2. 或先解锁人工/外部依赖项：生产 DATABASE_URL、生产 Aliyun OCR API Key、AI API Key、后续 GB2760 增量复核。

→ 后续暂缓，等待产品页面设计统一推进：
  Batch 1-E：成分详情页 GB2760 官方证据展示
  Batch 1-F：内部数据控制台 / GB2760 复核工作台
  Batch UX-A、UX-B、UX-D、UX-E：产品体验与信息架构优化（UX-C 映射层已完成）

→ 当前人工阻塞（跳过，不阻断 Codex）：
  内部控制台 / 产品页面设计统一方案（用户要求最后一起做）
  GB2760 后续增量人工复核（本轮 2391 条 A.1 staging 已完成签核并 promote）
  生产 DATABASE_URL（阶段 2 生产部分）
  生产 Aliyun OCR API Key（阶段 3-E 生产切换；本机 RapidOCR 已接入）
  AI API Key（阶段 9 真实调用）
```

---

## 已完成任务归档

| Batch | 名称 | 完成日期 |
|---|---|---|
| Batch 0-A | 修复测试失败（阿斯巴甜/三氯蔗糖风险等级） | ✅ 2026-06-11 |
| Batch 1-Seed | 食品数据扩充确认（100 条 seed） | ✅ 2026-06-11 |
| Batch 2-Vite | 前端工程化迁移（Vite） | ✅ 2026-06-11 |
| Batch 2-Cap | Capacitor 项目脚手架 + 原生权限适配 | ✅ 2026-06-11 |
| Batch 3-API | 后端初始化（Hono/TS）+ 数据库 Schema + 成分 API | ✅ 2026-06-11 |
| Batch 3-Auth | 账号鉴权 + 收藏/历史云同步 | ✅ 2026-06-12 |
| Data 旧 1-A | 来源字段、数据库 API、前端降级闭环 | ✅ 2026-06-12 |
| Data 旧 1-C | 数据版本管理与审核状态后台化 | ✅ 2026-06-12 |
| OCR 旧 O-A/B/C/D | 拍照入口 / OCR 抽象 / 文本确认 / 图片预处理 | ✅ 2026-06-12 |
| 解析 旧 P-A/P-B | 配料解析增强 + 数据库批量匹配 | ✅ 2026-06-12 |
| 报告 旧 R-A | 食品配料分析报告页 | ✅ 2026-06-12 |
| 档案 旧 F-A/F-B | 产品档案 + IndexedDB 图片 + 历史/收藏 | ✅ 2026-06-12 |
| 登录 旧 Q-A | 前端登录/注册页 | ✅ 2026-06-12 |
| 个性化 旧 U-A/U-B | 关注/忌口/过敏原 + 跨设备同步 | ✅ 2026-06-12 |
| 移动 旧 M-A/M-B | 首页/导航重构 + PWA 离线 | ✅ 2026-06-12 |
| GB2760 全文 | 264 页官方 PDF 全文转换 + `gb2760_official_pages` 入库 | ✅ 2026-06-13 |
| GB2760 A.1 staging | 2404 行表 A.1 staging + `gb2760_official_records` 入库 | ✅ 2026-06-13 |
| GB2760 参考表 | 2800 行 A.2/B/C/D/E/F 参考表 + `gb2760_official_reference_rows` 入库 | ✅ 2026-06-13 |
| GB2760 边界修复 | 参考表行边界泄漏 / 跨页续行 / INS 续行修复 | ✅ 2026-06-14 |
| Batch 1-A | `source_documents` / `import_runs` / `import_errors` 导入审计骨架 + 查询接口 | ✅ 2026-06-14 |
| Batch 1-C | `additive_usage_rules` 表 + `promote:gb2760` 正式库准入脚本（空签核场景 0 promoted） | ✅ 2026-06-14 |
| Batch 1-D | `validate:gb2760` 数据校验命令 + CI 数据准入校验 | ✅ 2026-06-14 |
| Batch 8-C | loading / empty / error 状态统一复核 | ✅ 2026-06-14 |
| Batch 5-B / UX-C | 统一结果可信表达映射层 | ✅ 2026-06-14 |

> 这些已完成项被映射到下方各阶段并标记 ✅；详细 GB2760 完成记录见文末"附录：GB2760 导入历史记录"。

---

# 阶段 1：数据源与 GB2760 导入

> 优先级最高。目标：把官方 GB2760-2024 PDF 通过 **staging 全量承接 → 高置信度 promote 到正式库 → 低置信度 pending_review → 人工复核** 的可追溯流程导入。不要求一次性全量 verified，不允许把 PDF 抽取结果直接全部写入正式表。

**数据状态模型**（详见 `DATA_SOURCES.md`）：

| 状态 | 含义 | 能否作为权威展示 |
|---|---|---|
| `verified_regulation` | 已通过 GB2760 官方来源确认 | ✅ 可作为官方规则展示 |
| `pending_review` | 已从官方来源抽取，字段或结构待复核（源文件仍可能保留 `needs_review`；后端入库已统一为 `pending_review`） | ❌ 不能作为权威结论 |
| `mapped_candidate` | 疑似匹配，需用户或人工确认 | ❌ 需确认 |
| `common_ingredient` | 普通食品配料，不一定是添加剂 | ⚠️ 仅用于可读性，不是法规来源 |
| `unverified` | 无可靠来源 | ❌ 不得展示为权威 |
| `unknown_from_ocr` | OCR 识别到但数据库未收录 | ❌ 运行时状态，进人工校验队列 |

> 另：当前数据集已有 27 条 `verified_jecfa`（JECFA 安全评价，仅作安全评价来源，不写 GB2760 使用范围）。这是真实存在的独立状态，保留不动，不得当作中国法规使用范围。

**正式库准入规则**（Batch 1-C 强制校验，全部满足才允许 promote）：

1. 添加剂名称明确。
2. CNS / INS 能明确解析，或原文可追溯。
3. 功能类别明确。
4. 食品分类号或适用范围明确。
5. 最大使用量、最大残留量或"按生产需要适量使用"明确。
6. 备注完整保留。
7. 有 `rawSourceText`。
8. 有 `sourcePage`（`pdfPage` / `standardPage`）。
9. 有 `sourceTable`（`tableName`）。
10. 有 `sourceHash`（`pdfSha256`）。
11. DB staging 行已由人工标记为 `approved` 或已 `promoted`。
12. 没有跨页错配、错行、漏备注。

不满足条件的数据只能留在 staging，`reviewStatus = pending_review`。

**禁止事项**（写入校验，违反则 `validate:gb2760` 报错退出）：

1. 不允许 AI 猜数据。
2. 不允许把 JECFA 数据反推 GB2760 使用范围。
3. 不允许把 `pending_review` 当作 `verified`。
4. 不允许丢失备注。
5. 不允许把"按生产需要适量使用"改写为数值。
6. 不允许伪造导入成功。
7. 不允许把样本 seed 数据当成完整数据库。

**GB2760 表结构规划**（部分已存在，部分为计划表）：

| 表名 | 当前状态 | 说明 |
|---|---|---|
| `source_documents` | ✅ 已存在 | 官方来源文档登记（PDF 文件名、SHA-256、平台记录 ID、附件 ID、版本、发布/实施日期） |
| `gb2760_staging_entries` | ✅ 已存在（实现名 `gb2760_official_records`） | 表 A.1 行级 staging（添加剂×食品类别×限量/备注） |
| `gb2760_official_pages` | ✅ 已存在 | PDF 全文 264 页逐页文本 + 页/PDF SHA-256 |
| `gb2760_official_reference_rows` | ✅ 已存在 | 表 A.2/B/C/D/E/F 参考表 2800 行 |
| `food_additives` | ✅ 已存在（实现名 `ingredients`） | 正式成分库 |
| `additive_usage_rules` | ✅ 已存在 | 正式使用限量规则（添加剂×食品类别×限量），promote 目标表；当前为空，等待人工签核 staging 行后写入 |
| `food_categories` | ⏸ 计划 | GB2760 食品分类系统（附录 E）；当前在 reference_rows |
| `exception_food_categories` | ⏸ 计划 | 表 A.2 例外食品类别；当前在 reference_rows |
| `additive_functions` | ⏸ 计划 | 添加剂功能类别（附录 D）；当前在 reference_rows |
| `import_runs` | ✅ 已存在 | 导入批次记录（开始/结束、来源文档、行数、状态） |
| `import_errors` | ✅ 已存在 | 导入错误日志（行号、原因、原文） |

---

### Batch 1-A：source_documents / import_runs / import_errors 表与导入审计骨架 [Codex]

目标：为 GB2760 导入建立可追溯的审计骨架，记录"导入了哪份官方文档、哪个批次、成功/失败多少行、错在哪"。

涉及文件：
- `backend/src/db/schema.ts`（新增 `source_documents`、`import_runs`、`import_errors` 表）
- `backend/src/db/migrations/`（新增迁移）
- `backend/scripts/seed.ts`（导入时写入 `import_runs` / `import_errors`）
- `backend/src/routes/ingredients.ts` 或新建 `backend/src/routes/gb2760.ts`（导入状态查询接口）
- `COMMANDS.md`（补充 `import:gb2760:status` 计划命令）

实现内容（已完成）：
1. ✅ `source_documents`：`id`、`docCode`（如 `GB 2760-2024`）、`title`、`pdfFileName`、`pdfSha256`、`platformRecordId`、`attachmentId`、`publishDate`、`effectiveDate`、`downloadEndpoint`、`createdAt`。首条记录用已确认的 GB2760-2024 元数据（见 `DATA_SOURCES.md`）。
2. ✅ `import_runs`：`id`、`sourceDocumentId`、`runType`（`fulltext` / `a1_staging` / `reference_tables` / `promote`）、`startedAt`、`endedAt`、`totalRows`、`succeededRows`、`failedRows`、`status`（`running` / `succeeded` / `failed`）、`note`。
3. ✅ `import_errors`：`id`、`importRunId`、`rowRef`（页码/行号）、`reason`、`rawSourceText`、`createdAt`。
4. ✅ `db:seed` 入库时写入 `a1_staging` / `fulltext` / `reference_tables` 三类 `import_runs`；失败时写入批次级 `import_errors` 并继续抛错，不改变现有抽取逻辑。
5. ✅ 新增登录鉴权只读接口 `GET /api/gb2760/import-runs` 和 `GET /api/gb2760/import-runs/:id/errors`。

验收标准：
1. 迁移可执行，三张表创建成功。
2. `db:seed` 后 `import_runs` 至少有 fulltext / a1_staging / reference_tables 三条批次记录，行数与实际入库一致。
3. `GET /api/gb2760/import-runs` 返回批次列表。
4. 不改变现有 `gb2760_official_*` 表数据。

状态：✅ 已完成 2026-06-14。
是否需要人工：否。
阻塞条件：无。
验证命令：`cd backend && npm run db:migrate && npm run db:seed && npm run typecheck && npm test && npm run build`，再携带登录 token 请求 `GET /api/gb2760/import-runs`。本地 seed 后审计表结果：`source_documents` 1 条；`import_runs` 三条稳定成功记录（A.1 staging 2404、全文 264、参考表 2800）；`import_errors` 0。

---

### Batch 1-B：GB2760 PDF staging 导入器（已完成，巩固） [Codex]

目标：把官方 PDF 转换为 staging 数据并入库，全量承接、保留原文与页码，不直接写正式库。

涉及文件：
- `scripts/generate-gb2760-fulltext.mjs`、`scripts/generate-gb2760-a1-staging.mjs`、`scripts/generate-gb2760-reference-tables.mjs`
- `src/data/gb2760OfficialFullText.js`、`src/data/gb2760OfficialGeneratedA1Staging.js`、`src/data/gb2760OfficialStaging.js`、`src/data/gb2760OfficialReferenceTables.js`
- `backend/src/db/schema.ts`、`backend/scripts/seed.ts`

实现内容（已完成）：
1. ✅ 264 页全文 → `gb2760_official_pages`。
2. ✅ 表 A.1 第 8-148 页 → 2404 行 `gb2760_official_records`（staging），保留 `pdfPage`/`standardPage`/`rawSourceText`/`pdfSha256`，`reviewStatus = needs_review`。
3. ✅ 表 A.2/B.1/B.2/B.3/C.1/C.2/C.3/附录 D/E.1/附录 F → 2800 行 `gb2760_official_reference_rows`。
4. ✅ 行边界、跨页续行、INS 续行修复。
5. ✅ 后端入库时把 staging 的 `reviewStatus` 取值与状态模型统一（源文件 `needs_review` → DB `pending_review`）。

状态：✅ 已完成 2026-06-14（staging 全量承接已完成；后端 DB 状态统一在 1-C 完成）。
是否需要人工：否（staging 抽取）。后续 promote 需人工复核。
阻塞条件：无。
验证命令：`npm run validate:data`（输出 GB2760 staging / 参考表 / 全文 / seed 覆盖报告）。

---

### Batch 1-C：promote:gb2760 正式库准入脚本 [人工+Codex]

目标：把 staging 中满足"正式库准入规则"的高置信行 promote 到正式 `ingredients` / `additive_usage_rules`；低置信行保持 `pending_review`，等待人工复核。

涉及文件：
- `backend/scripts/promote-gb2760.ts`（新建）
- `backend/src/db/schema.ts`（新增 `additive_usage_rules` 表）
- `backend/src/db/migrations/`
- `backend/package.json`（新增 `promote:gb2760` 脚本）
- `COMMANDS.md`、`DATA_SOURCES.md`

实现内容（Codex 编码已完成）：
1. ✅ 新增 `additive_usage_rules` 表：`id`、`ingredientId`、`foodCategoryCode`、`foodCategoryName`、`maxUseLevel`、`unit`、`functionText`、`note`、`sourceStagingId`、`sourcePage`、`sourceTable`、`sourceHash`、`dataStatus`、`createdAt`。
2. ✅ `promote-gb2760.ts` 逐行校验 staging 行是否满足正式库准入字段；满足且已人工 `approved` 才 `dataStatus = verified_regulation` 写入 `additive_usage_rules`，同步更新对应 `ingredients` 行的 GB2760 可见字段，并把 staging 行 `reviewStatus` 标为 `promoted`。
3. ✅ 后端 seed 入库时把现有 `needs_review` 统一为 `pending_review`；不满足或未签核行保持待复核，缺字段的已签核行会记录到 `import_errors`。
4. ✅ 人工签核闸门：promote 只处理 DB staging 中 `reviewStatus = approved` 或已 `promoted` 的行；空签核场景产出 0 条 verified，不把历史 `verified` staging 行自动写入新规则表。本轮人工复核后已成功 promote 2391 条 A.1 staging 行。
5. ✅ 幂等：按 `sourceStagingId` 唯一约束 upsert，不产生重复 `additive_usage_rules`。
6. ✅ 绝不把"按生产需要适量使用"改写为数值；`maxUseLevel` 和 `unit` 分字段原样保存。

人工操作（前置，阻塞 promote 实际 verified 输出，但不阻塞脚本编码）：
- [x] 人工复核高置信 staging 行并标记 `approved`。
- [x] 在此标注：`[人工完成 ✅ 2026-06-14]`

验收标准：
1. ✅ `additive_usage_rules` 表迁移成功。
2. ✅ `promote:gb2760` 在无人工签核行时输出 0 条 verified、2391 条保持 pending_review，不报错、不伪造。
3. ✅ 有签核行时只把签核且字段齐全行 promote，缺字段行进 `import_errors`；成功 promote 的规则会在既有成分详情 / 搜索 API 的 `ingredients` 行中可见（单元测试覆盖）。
4. ✅ 幂等重跑不重复写入（`sourceStagingId` 唯一约束 + upsert）。

状态：✅ 已完成 2026-06-14（脚本、空签核场景和本轮人工签核 promote 均完成）。
是否需要人工：后续增量仍需要人工；本轮 A.1 staging 复核已完成。
阻塞条件：无（本轮已解除；后续新抽取或变更行继续走人工复核）。
验证命令：`npm run map:gb2760 && npm run promote:gb2760 && npm run validate:gb2760`，`cd backend && npm run typecheck && npm test`。本轮结果：`staging=2404 pending_review=0 approved=0 promoted=2391 legacy_verified=13 mapped_candidate=0 additive_usage_rules=2391 verified_regulation_ingredients=308 import_errors=0`。

---

### Batch 1-D：validate:gb2760 数据校验命令 [Codex]

目标：新增独立 GB2760 校验命令，强制执行"正式库准入规则"和"禁止事项"，违反则报错退出。

涉及文件：
- `backend/src/services/gb2760ValidateService.ts`（新增）
- `backend/scripts/validate-gb2760.ts`（新增）
- `backend/package.json` / `package.json`（新增 `validate:gb2760` 脚本）
- `.github/workflows/ci.yml`（Postgres + migrate/seed + validate）
- `COMMANDS.md`

实现内容（已完成）：
1. ✅ 校验正式库（`additive_usage_rules` / `ingredients` 中 `verified_regulation` 行）必须满足准入规则，否则报错。
2. ✅ 校验 DB staging 行字段完整性、`reviewStatus` 取值合法（`pending_review` / `mapped_candidate` / `approved` / `promoted`；历史 `verified` 行单独报告，不得自动当作新 promote 输入）。
3. ✅ 校验禁止事项：无"按生产需要适量使用"被改写为数值；JECFA 来源未写入 GB2760 使用范围；`pending_review` 未被写入正式规则表。
4. ✅ 输出报告：staging 行数、pending_review 数、promoted 数、legacy verified 数、正式规则表行数、最新导入批次状态和错误明细。
5. ✅ 与 CI 集成：CI 启动 Postgres，执行 backend `db:migrate` / `db:seed` / `validate:gb2760`，失败即阻断。

验收标准：
1. `validate:gb2760` 在数据合规时通过并输出报告。
2. 人为制造违规（如把 pending_review 标 verified）时命令报错退出码非 0。
3. 不影响现有 `validate:data`。

状态：✅ 已完成 2026-06-14。
是否需要人工：否。
阻塞条件：无（可在 staging 数据上运行，正式库为空时只校验 staging）。
验证命令：`npm run validate:gb2760 && npm run validate:data`。本地 DB 输出：`staging=2404 pending_review=2391 approved=0 promoted=0 legacy_verified=13 mapped_candidate=0 additive_usage_rules=0 verified_regulation_ingredients=5 import_errors=0`；最新导入批次 `a1_staging` / `fulltext` / `reference_tables` / `promote` 均为 `succeeded`。

---

### Batch 1-E：成分详情页 GB2760 官方证据展示 [Codex]

目标：在成分详情页展示对应的 GB2760 官方证据（参考表行 + staging 行），让用户和人工审核者直接看到来源原文、页码和可信状态。

涉及文件：
- `backend/src/routes/ingredients.ts`（详情接口新增 `?includeEvidence=1` 返回 staging/reference 行）
- `backend/src/routes/gb2760.ts`（新增 `GET /api/gb2760/reference-rows`）
- `src/services/ingredientApiService.js`、`src/pages/detailPage.js`、`src/pages/dataPage.js`
- `src/styles.css`、`scripts/test.mjs`

实现内容：
1. `GET /api/ingredients/:id?includeEvidence=1` 附加 `stagingRows`（来自 `gb2760_official_records`，按 `ingredientId` 匹配，最多 50 行，按 `pdfPage` 排序）和 `referenceRows`（按中文名/别名/INS 匹配，最多 20 行）。默认不返回，避免常规流量加载过多。
2. `GET /api/gb2760/reference-rows?table=B.2&page=1&limit=50` 分页浏览参考表。
3. 详情页"官方 GB2760-2024 证据"可折叠区块：staging 行显示食品类别、最大用量、页码、`pending_review` 灰色提示；reference 行按表名分组。
4. 数据治理页 `/data` 新增"参考表浏览"折叠区块，按表名分页查看。
5. 颜色用 CSS 变量：`pending_review` → `--color-unverified`，`verified_regulation` → `--color-risk-low`。

验收标准：
1. `?includeEvidence=1` 返回证据数组；无该参数时不返回（字段不存在）。
2. 有 staging 行的成分（如 `citric-acid`）详情页显示证据区块；无证据成分不显示空标题。
3. `pending_review` 行有明确"待复核来源数据"视觉提示，不展示为结论。
4. 参考表浏览可翻页。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run lint && npm run test && npm run build`，`cd backend && npm run typecheck && npm test`，`curl "http://127.0.0.1:3000/api/ingredients/citric-acid?includeEvidence=1"`。

---

### Batch 1-F：内部数据控制台 / GB2760 复核工作台 [Codex]

目标：建立内部数据控制台，支撑 GB2760 staging 行的高质量人工复核、批量签核、映射修正和 promote 前预检；这是数据工具，不是面向普通用户的消费端页面。

定位：
- 放在阶段 1 数据源链路内，优先级高于用户端 UX 美化。
- 只服务内部数据复核与发布准入，不替代用户端首页 / 搜索 / 报告体验优化。
- 初期仅覆盖 GB2760 staging → approved → promote；后续可扩展到 OCR 未收录、候选映射、来源纠错等队列。

涉及文件：
- `backend/src/routes/gb2760.ts`（内部复核列表、批量更新、预检接口）
- `backend/src/services/gb2760Service.ts`（staging 查询、promote eligibility、批量状态更新）
- `backend/src/services/gb2760PromoteService.ts`（复用正式库准入校验）
- `backend/src/db/schema.ts` / migrations（`reviewedBy`、`reviewedByUserId`、`reviewedAt`、`reviewNote` 审计字段）
- `src/pages/gb2760ReviewPage.js`（内部复核工作台）
- `src/services/gb2760ApiService.js`、`src/router/router.js`、`src/main.js`
- `src/styles.css`
- `backend/tests/gb2760.test.ts`、`scripts/test.mjs`

实现内容：
1. 内部入口：新增 `#/food/gb2760-review` 或后续 `/admin/gb2760-review`，与普通用户主路径区分。
2. 复核列表：按 `reviewStatus`、可签核状态、添加剂名、CNS/INS、食品类别、原文关键词筛选；支持分页和状态统计。
3. 证据核对：每行必须展示添加剂中文/英文名、CNS/INS、功能、食品分类号/名称、最大使用量、单位、备注、PDF 页、标准页、`rawSourceText`、来源 SHA。
4. promote 预检：复用 Batch 1-C 的正式库准入规则，明确区分"可签核"和"需补映射/缺字段/不可 promote"。
5. 单条操作：支持标记 `approved`、`mapped_candidate`、退回 `pending_review`；禁止编辑 `promoted` / 历史 `verified` 行。
6. 批量操作：支持批量签核当前筛选或当前选中行；后端逐行校验，合格行更新，不合格行跳过并返回原因，禁止前端绕过准入规则。
7. 映射修正：支持为未映射 staging 行绑定或修正 `ingredientId`，并在保存前显示候选成分信息。
8. ✅ 审计记录：单条签核、批量签核和映射修正会写入 `reviewedBy`、`reviewedByUserId`、`reviewedAt`、`reviewNote`；历史已签核/已 promote 行通过迁移回填 legacy 审计说明。
9. 发布前检查：批量签核后提供 `validate:gb2760` / `promote:gb2760` 前置检查结果，展示将 promote、将跳过、将失败的数量和原因。
10. ✅ 权限边界：只读接口要求登录；写接口除登录外还要求账号命中 `GB2760_INTERNAL_REVIEWERS` 内部 reviewer allowlist，普通登录用户返回 `403 forbidden`。

验收标准：
1. 登录后可打开内部复核工作台，未登录返回登录提示；签核/映射写操作必须使用内部 reviewer 账号。
2. 待复核 staging 行可筛选、分页、查看证据和状态统计。
3. 可签核行支持单条和批量 `approved`；不满足准入规则的行不能被签核，批量操作会跳过并显示原因。
4. 未映射行能完成 `ingredientId` 绑定后再签核。
5. `approved` 行运行 `promote:gb2760` 后只把字段完整、来源可追溯的行写入 `additive_usage_rules`。
6. `validate:gb2760` 能报告签核、promote、跳过和错误数量。
7. 内部控制台 UI 采用后台工作台形态：密集列表/表格、批量工具栏、详情/原文区域、统一状态标签；不使用消费端大卡片堆叠。
8. 不影响普通用户端首页、搜索、详情、报告主路径。

状态：⛔ blocked_by_user（已落地内部复核入口、分页/每页条数、ready 筛选、单条/批量签核、自动映射脚本、审计字段、内部 reviewer allowlist 和 promote 闭环；用户要求内部控制台先不继续，后续等产品页面设计统一推进时再补手动映射 UI、后台工作台视觉和更完整角色系统）。
是否需要人工：是（复核动作本身需要人工判断）；Codex 负责工具链和校验闭环。
阻塞条件：用户要求暂缓内部控制台和产品页面设计。
验证命令：`npm run validate:gb2760 && npm run lint && npm run test && npm run build`，`cd backend && npm run typecheck && npm test && npm run build`。

---

# 阶段 2：数据库与 API

### Batch 2-A：本地数据库连接 [Codex]

目标：本地 / 开发环境 Drizzle + PostgreSQL schema、迁移、seed 可用。

状态：✅ 已完成 2026-06-11（schema、migration、seed、`ingredients` 等表、Docker Compose 已可用）。
涉及文件：`backend/src/db/*`、`backend/scripts/seed.ts`、`backend/drizzle.config.ts`。
验收标准：✅ `cd backend && npm run db:migrate && npm run db:seed` 成功；本地查询返回数据。
是否需要人工：否。
阻塞条件：生产 `DATABASE_URL` 为 `blocked_by_user`（仅阻塞生产部分，见 Batch 2-D）。
验证命令：`cd backend && npm run db:migrate && npm run db:seed && npm test`。

---

### Batch 2-B：成分 API [Codex]

目标：只读成分 API（列表、详情、分类、搜索、批量匹配、可信等级筛选）。

状态：✅ 已完成 2026-06-12。
涉及文件：`backend/src/routes/ingredients.ts`、`backend/src/services/ingredientService.ts`。
验收标准：✅ `GET /api/ingredients`、`/:id`、`/categories`、`/search`、`POST /api/ingredients/batch-search`、`?confidenceLevel=` 均可用。
是否需要人工：否。
阻塞条件：无。
验证命令：见 `COMMANDS.md` 成分 API 验收段。

---

### Batch 2-C：前端优先 API、失败降级本地 [Codex]

目标：前端成分搜索/详情优先请求后端 API，后端不可用时降级本地 seed 并显示未验证标识。

状态：✅ 已完成 2026-06-12。
涉及文件：`src/services/ingredientApiService.js`、`src/services/ingredientService.js`、`vite.config.js`。
验收标准：✅ 后端可用时走 API；后端关闭时降级本地并显示错误/未验证态。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`（含降级断言）。

---

### Batch 2-D：生产数据库迁移与首次导入 [人工+Codex]

目标：提供生产迁移/seed 脚本和文档；人工提供生产连接串后执行。

状态：⛔ blocked_by_user（依赖生产 `DATABASE_URL` 与部署平台选型）。
涉及文件：`backend/scripts/migrate-prod.sh`（计划）、`backend/scripts/seed-prod.sh`（计划）、`COMMANDS.md`。
实现内容：
1. 幂等生产迁移脚本，读取 `DATABASE_URL`，已迁移跳过。
2. 幂等生产 seed（upsert），避免重复导入。
3. `COMMANDS.md` 补充生产迁移/seed 说明。

人工操作：
- [ ] 选择数据库托管平台与后端部署平台。
- [ ] 提供生产 `DATABASE_URL`（不提交代码）。
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

是否需要人工：是。
阻塞条件：生产 `DATABASE_URL`、部署平台选择（`blocked_by_user`）。Codex 可先编写脚本与文档骨架。
验证命令：（人工）`DATABASE_URL=<prod> bash backend/scripts/migrate-prod.sh`。

---

# 阶段 3：OCR 主流程

> OCR 是核心主路径，必须前置。无 OCR API Key 时必须 manual 走通完整闭环，不崩溃。

### Batch 3-A：拍照/上传入口 [Codex]

目标：首页主入口是"拍照识别配料表"，扫描页支持拍照、相册、预览、重选、权限异常、图片质量提示、iPhone Safari/PWA 安全区。

状态：✅ 已完成 2026-06-12（首页 Hero CTA、`/scan` 页、Camera/相册/Web 降级、8MB 校验、预览、重选、拍摄技巧、安全区）。
涉及文件：`src/pages/scanPage.js`、`src/pages/homePage.js`、`src/services/nativeBridgeService.js`、`src/styles.css`、`scripts/test.mjs`。
验收标准：✅ 首页第一操作是拍照识别；可选图预览；移动端不溢出；搜索不是首页第一主按钮。
是否需要人工：否。
阻塞条件：无（真机相机验收待 Batch 8-B）。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch 3-B：OCR Provider 抽象 [Codex]

目标：OCR Provider 抽象，不写死某一家。Provider 设计为 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，无 Key 自动降级 manual，密钥只在后端。

涉及文件：
- `src/services/ocrService.js`（前端调用抽象，当前为 real/manual/fallback，待扩展 provider 命名）
- `backend/src/routes/ocr.ts`（后端代理，当前无 Key 返回 503 / provider 未接入返回 501）
- `backend/src/services/ocrProviders/`（计划新建，按 provider 分文件）
- `backend/.env.example`（`OCR_PROVIDER`、`OCR_SERVICE_URL`、`OCR_API_KEY`）
- `INTEGRATIONS.md`（本机 OCR、数据库和外部组件台账）
- `scripts/test.mjs`、`COMMANDS.md`

实现内容：
1. ✅ 后端按 `OCR_PROVIDER` 选择 provider：`manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`。
2. ✅ `mock` 无需真实 Key，返回固定 OCR 结构并明确标注 `provider: "mock"`，不冒充真实供应商。
3. ✅ `rapidocr` 通过本机 `/home/downloads/tools/complens-ocr` FastAPI 服务接入，使用 `OCR_SERVICE_URL`，不需要 `OCR_API_KEY`。
4. ✅ `aliyun` / `paddleocr` 属于生产/外部供应商；缺少 `OCR_API_KEY` 时返回 `503 ocr_not_configured`，已配置但适配未实现时返回 `501 ocr_provider_pending`。
5. ✅ 前端 OCR response 校验只接受上述 provider 名称，API Key 只在后端环境变量中读取。
6. ✅ 前端继续在失败或未配置时降级 manual/fallback，不伪造真实 OCR。
7. OCR 原文、置信度、provider、图片引用需要保存（图片在 IndexedDB，元数据在 localStorage，后续可选 `ocr_results` 表见 Batch 4 计划）。

验收标准：
1. 无 Key 时 `POST /api/ocr` 返回 503，前端进入 manual。
2. `OCR_PROVIDER=mock` 返回标注为 mock 的固定结果，不冒充真实。
3. `OcrResult` 字段齐全。
4. 前端不出现任何 OCR 厂商密钥。

状态：✅ 已完成 2026-06-14（本机 `rapidocr` 已接入；生产 `aliyun` 切换待 Key）。
是否需要人工：否（本机接入）。生产 Aliyun 切换见 Batch 3-E。
阻塞条件：无（本机 RapidOCR 不阻塞；生产 Aliyun OCR Key 仍属生产切换阻塞）。
验证命令：前端 OCR 协议定向断言 + `cd backend && npm run test -- ocr.test.ts` + `cd backend && npm run typecheck`。

---

### Batch 3-C：识别文本确认与修正 [Codex]

目标：OCR 后进入文本确认页，展示原文、可编辑、可清空、可重新上传、可手动粘贴，OCR 失败不阻塞，确认后进入配料拆分。

状态：✅ 已完成 2026-06-12（`/ocr-confirm` 页、可编辑 textarea、产品名、实时配料数预览、loading/empty/error/manual 状态机、pending 状态持久化）。
涉及文件：`src/pages/ocrConfirmPage.js`、`src/pages/scanPage.js`、`src/router/router.js`、`src/store/userStore.js`、`scripts/test.mjs`。
验收标准：✅ OCR 原文可编辑/清空；可重新上传；可手动粘贴；失败降级 manual 不卡死；确认后进入分析。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch 3-D：OCR fallback [Codex]

目标：OCR 识别中、识别失败、重试、手动输入降级状态完整，不卡死中间状态。

状态：✅ 已完成 2026-06-12（real→fallback→manual 降级、15s 超时、503/429/402/网络错误分类、确认页状态机）。
涉及文件：`src/services/ocrService.js`、`src/pages/ocrConfirmPage.js`、`scripts/test.mjs`。
验收标准：✅ 各错误码降级提示明确；超时降级 manual；不卡死。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`（含 fallback 断言）。

---

### Batch 3-E：真实 OCR 服务接入 [人工+Codex]

目标：接入真实 OCR 供应商（推荐阿里云通用文字识别或自建 PaddleOCR/RapidOCR），后端代理，图片二次压缩，真实识别。

状态：🔄 进行中（本机 RapidOCR 已接入；生产 Aliyun OCR 待 Key）。
涉及文件：`backend/src/services/ocrProviders/*.ts`、`backend/src/routes/ocr.ts`、`backend/.env.example`。
实现内容：
1. ✅ 本机自建 RapidOCR 服务地址：`/home/downloads/tools/complens-ocr`，`OCR_PROVIDER=rapidocr`，`OCR_SERVICE_URL=http://127.0.0.1:8000`。
2. ✅ 后端 `rapidocr` provider 通过 multipart `file` 调用本机 FastAPI `/ocr`，并映射为前端 OCR 契约。
3. ⏸ 生产 provider 切换到 Aliyun OCR，待生产 Key 后实现/验收。
4. 图片后端二次压缩到 1MB 内再发送（生产供应商适配时补）。
5. 真实包装图片测试（≥3 张，识别可用率达标）。

人工操作：
- [x] 本机 OCR 服务目录确认：`/home/downloads/tools/complens-ocr`。
- [ ] 生产 Aliyun OCR 申请 Key → `OCR_PROVIDER=aliyun` / `OCR_API_KEY`。
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

是否需要人工：是。
阻塞条件：生产 Aliyun OCR API Key（`blocked_by_user`）。本机 rapidocr/manual/mock 闭环不受阻。
验证命令：（接入后）`cd backend && npm test`，真机/真实图片验证。

---

# 阶段 4：配料表解析与匹配

### Batch 4-A：配料文本解析 [Codex]

目标：支持"配料：/配料表：/原料：/食品添加剂："前缀，中英文逗号/顿号/分号，中英文括号，复合配料括号展开，未识别项保留，不强行匹配未知项。

状态：✅ 已完成 2026-06-12（`parseIngredientList` 支持 OCR 噪声修正、前缀、复配括号、E-number、顺序、去重、未知项保留，12 个用例通过）。
涉及文件：`src/utils/text.js`、`src/pages/analyzePage.js`、`src/pages/ocrConfirmPage.js`、`scripts/test.mjs`。
验收标准：✅ 示例 `配料：水、白砂糖、麦芽糖浆、食品添加剂（柠檬酸、山梨酸钾）、食用香精` 正确拆分为 6 项；未知项保留。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`（12 用例）。

---

### Batch 4-B：数据库匹配 [Codex]

目标：中文名/英文名/别名/模糊匹配 + 匹配置信度，未匹配保留，低置信度提示，结果展示数据来源和可信等级。

状态：✅ 已完成 2026-06-12（`ingredientMatchService` + 后端 `batch-search`，E-number 直查、精确/别名/前缀/包含匹配、置信度、客户端缓存、本地降级）。
涉及文件：`src/services/ingredientMatchService.js`、`backend/src/routes/ingredients.ts`、`src/pages/analyzePage.js`、`scripts/test.mjs`。
验收标准：✅ E-number 命中；精确匹配高置信；未匹配保留；低置信度入 lowConfidence 列表；展示来源与可信等级。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`，`cd backend && npm test`。

---

### Batch 4-C：低置信度确认 [Codex]

目标：低置信度匹配在报告中单独列"待确认匹配"，用户可确认/驳回。

状态：✅ 已完成 2026-06-14（低置信项已独立展示；确认/驳回会持久化到报告快照；驳回项按未收录候选进入人工校验队列）。
涉及文件：`src/pages/reportDetailPage.js`、`src/services/reportService.js`、`src/store/userStore.js`、`src/services/reviewQueueService.js`、`src/pages/dataPage.js`、`src/main.js`、`src/styles.css`、`scripts/test.mjs`。
实现内容：
1. 报告/分析页低置信项（0.55–0.79）单独区块，标注"⚠️ 请确认"。
2. 用户可"确认匹配"或"驳回"；驳回后该项标为未收录，进人工校验队列。
3. 确认/驳回结果保存到本机报告快照。

验收标准：
1. 低置信项单独展示，颜色用 `--color-risk-medium`。
2. 用户可确认/驳回，状态持久化。
3. 驳回项进入 `reviewQueueService` 队列。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch 4-D：未匹配收集 [Codex]

目标：未匹配/OCR 未收录项以 `unknown_from_ocr` 汇总到数据治理页人工校验队列，并支持数据纠错反馈。

状态：✅ 已完成 2026-06-12（`reviewQueueService` + `/data` 页人工校验队列 + 数据纠错表单）。
涉及文件：`src/services/reviewQueueService.js`、`src/pages/dataPage.js`、`src/services/supportService.js`。
验收标准：✅ OCR 未收录项进队列；可提交纠错线索；不自动升级 `dataStatus` / `isVerified`。
是否需要人工：否（升级仍需人工来源确认）。
阻塞条件：无。
验证命令：`npm run test`。

---

# 阶段 5：分析报告

### Batch 5-A：报告页 [Codex]

目标：报告含已识别/已匹配/待确认/未收录数量、添加剂列表、重点关注、数据来源、可信等级、保存、分享、重新分析、非医疗化提示。

状态：✅ 已完成 2026-06-12（`reportDetailPage` 结构化报告：整体评级、关注摘要、配料顺序、添加剂分类、未收录、特殊人群、来源说明、Markdown/JSON 导出、分享、重新分析）。
涉及文件：`src/pages/reportDetailPage.js`、`src/pages/reportsPage.js`、`src/pages/analyzePage.js`、`src/services/reportService.js`、`scripts/test.mjs`。
验收标准：✅ 报告含全部必需区块；禁止文案被 lint 拦截；可保存/分享/重新分析。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run validate:data && npm run lint && npm run test && npm run build`。

---

### Batch 5-B：可信等级展示 [Codex]

目标：报告所有结果明确数据状态：`verified_regulation` 显示"官方标准已验证"，`pending_review` 显示"待复核来源数据"，`unknown_from_ocr` 显示"暂未收录"，不确定数据不展示为结论。

状态：✅ 已完成 2026-06-14（新增 `src/utils/dataStatus.js`，统一 dataStatus 文案、颜色变量、Badge class 和 normalize 逻辑；搜索、详情、分析、报告、导出、数据治理页均引用统一映射。产品页面整体设计仍按用户要求后续统一推进）。
涉及文件：`src/utils/dataStatus.js`、`src/pages/reportDetailPage.js`、`src/pages/detailPage.js`、`src/pages/searchPage.js`、`src/pages/analyzePage.js`、`src/pages/dataPage.js`、`src/services/reportExportService.js`、`src/services/reportService.js`、`src/services/ingredientService.js`、`src/styles.css`、`scripts/test.mjs`。
实现内容：
1. ✅ 统一可信等级文案映射（见 UX-C），全页面一致。
2. ✅ `verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 各有明确 Badge 文案与颜色。
3. ✅ 不允许把不确定数据展示成结论。

验收标准：
1. 各状态文案与颜色全页面统一。
2. `pending_review` 不显示为"已验证"。
3. 测试覆盖文案映射。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test && npm run lint && npm run build && git diff --check`。

---

### Batch 5-C：保存与分享 [Codex]

目标：报告可保存本地、分享文字摘要、导出 Markdown/JSON。

状态：✅ 已完成 2026-06-12。
涉及文件：`src/services/reportExportService.js`、`src/services/shareService.js`、`src/pages/reportDetailPage.js`。
验收标准：✅ 可复制/下载 Markdown、下载 JSON、原生/Web Share/复制 fallback。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`。

---

### Batch 5-D：历史记录 [Codex]

目标：历史分析记录列表，产品名/品牌、分析时间、匹配摘要，可重新打开报告。

状态：✅ 已完成 2026-06-12（`/history` + `/reports` + 首页最近分析）。
涉及文件：`src/pages/historyPage.js`、`src/pages/reportsPage.js`、`src/pages/homePage.js`。
验收标准：✅ 历史列表含缩略图/产品名/评级/日期；可重开报告；移动端左滑删除。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`。

---

# 阶段 6：产品档案与个性化

### Batch 6-A：产品档案 [Codex]

目标：报告可建档为产品档案，完整图片存 IndexedDB，localStorage 只存 `imageId`+元数据+缩略图；后端 `product_archives` 表 + CRUD/搜索。

状态：✅ 已完成 2026-06-12。
涉及文件：`src/services/productArchiveService.js`、`src/pages/productArchivePage.js`、`backend/src/routes/user.ts`、`backend/src/db/schema.ts`。
验收标准：✅ 可建档、列表、详情；图片在 IndexedDB；元数据在 localStorage；后端 `/api/user/products` CRUD 可用。
是否需要人工：否。
阻塞条件：无（生产 CDN 图片存储待生产部署）。
验证命令：`npm run test`，`cd backend && npm test`。

---

### Batch 6-B：收藏 [Codex]

目标：收藏成分/产品，取消收藏，本地持久化 + 登录态云同步。

状态：✅ 已完成 2026-06-12（成分收藏 + 收藏产品 Tab + `/api/user/favorites` 同步）。
涉及文件：`src/pages/favoritesPage.js`、`src/services/storageService.js`、`backend/src/routes/user.ts`。
验收标准：✅ 收藏/取消/展示正常；登录后云同步。
是否需要人工：否。
阻塞条件：无（真实跨设备验收待人工）。
验证命令：`npm run test`，`cd backend && npm test`。

---

### Batch 6-C：历史 [Codex]

目标：分析历史搜索/筛选/清空/删除。

状态：✅ 已完成 2026-06-12（见 Batch 5-D，历史与档案打通）。
涉及文件：`src/pages/historyPage.js`、`src/services/productArchiveService.js`。
验收标准：✅ 历史搜索/全部-收藏-高关注筛选/清空/左滑删除。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`。

---

### Batch 6-D：关注项/过敏原本地设置 [Codex]

目标：我的关注成分、忌口项、过敏原本机设置 + 全局高亮（过敏原>忌口>关注），登录态云同步。

状态：✅ 已完成 2026-06-12（`personalProfileService` + 设置页三区块 + `/api/user/profile/:kind` + `/api/user/allergens` 同步）。
涉及文件：`src/services/personalProfileService.js`、`src/pages/settingsPage.js`、`backend/src/routes/user.ts`、`src/data/allergens.js`。
验收标准：✅ 三类档案可增删；报告/搜索/详情全局高亮；登录态同步。
是否需要人工：否（真实跨设备验收待人工）。
阻塞条件：无。
验证命令：`npm run test`，`cd backend && npm test`。

---

# 阶段 7：产品体验与信息架构优化

> 目标：解决"用户不知道下一步、OCR 失败中断、未匹配被丢弃、来源不透明、移动端按钮过小、状态不统一、报告过度医疗化"等体验问题。

### Batch UX-A：首页主路径重构 [Codex 🔁 待重构]

目标：用户一打开就知道可以拍照识别配料表，搜索成分是辅助。

涉及文件：`src/pages/homePage.js`、`src/main.js`、`src/styles.css`、`scripts/test.mjs`。
实现内容：
1. 首页第一操作是"拍照识别配料表"全宽主 CTA。
2. 上传图片、粘贴配料表为次级入口。
3. 搜索成分为辅助入口（非首屏第一主按钮）。
4. 最近分析记录可见。
5. 常见关注项、数据可信说明入口。
6. 移动端优先，安全区适配。

验收标准：
1. 首页第一操作是拍照识别配料表。
2. 搜索成分是辅助入口。
3. 最近分析记录可见。
4. 移动端不溢出、不错位。

是否需要人工：否。
阻塞条件：无（部分由旧 M-A 完成，本批次按新优先级复核首页层级）。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch UX-B：OCR 流程状态机 [Codex]

目标：拍照→上传→识别→确认→解析→匹配→报告全流程状态明确，失败可回退/重试，无 Key 走手动，不卡死。

涉及文件：`src/services/ocrService.js`、`src/pages/scanPage.js`、`src/pages/ocrConfirmPage.js`、`src/pages/analyzePage.js`、`src/store/userStore.js`、`scripts/test.mjs`。
实现内容：
1. 定义并文档化流程状态：`idle / capturing / processing / ocr_loading / confirm / parsing / matching / report / error`。
2. 每步有明确状态与可见反馈。
3. 任一步失败可回退上一步或重试。
4. 无 API Key 全程可走 manual。
5. 不出现无出口的中间状态。

验收标准：
1. 每一步都有明确状态。
2. 失败可回退或重试。
3. 无 API Key 可走手动输入。
4. 不会卡死在中间状态。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch UX-C：统一结果可信表达 [Codex]

目标：所有结果都明确数据状态，建立全局可信等级文案与颜色映射。

涉及文件：`src/utils/dataStatus.js`（计划新建，统一映射）、`src/pages/detailPage.js`、`src/pages/searchPage.js`、`src/pages/reportDetailPage.js`、`src/styles.css`、`scripts/test.mjs`。
实现内容：
1. 统一映射：

   | dataStatus | 文案 | 颜色变量 |
   |---|---|---|
   | `verified_regulation` | 官方标准已验证 | `--color-risk-low` |
   | `verified_jecfa` | 安全评价已匹配（非中国法规范围） | `--color-watch` |
   | `pending_review` | 待复核来源数据 | `--color-unverified` |
   | `mapped_candidate` | 疑似匹配，待确认 | `--color-risk-medium` |
   | `common_ingredient` | 普通配料 | `--color-risk-low` |
   | `unverified` | 未验证 | `--color-unverified` |
   | `unknown_from_ocr` | 暂未收录 | `--color-unknown` |

2. 搜索、详情、报告统一引用该映射。
3. 不允许把不确定数据展示成结论。

验收标准：
1. `verified_regulation` 显示"官方标准已验证"。
2. `pending_review` 显示"待复核来源数据"。
3. `unknown_from_ocr` 显示"暂未收录"。
4. 不把不确定数据展示成结论。

状态：✅ 已完成 2026-06-14（映射层与现有页面引用已完成；不包含产品页面整体视觉重构）。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test && npm run lint && npm run build && git diff --check`。

---

### Batch UX-D：移动端组件统一 [Codex]

目标：统一 Button、Card、Badge、Toast、EmptyState、ErrorState、LoadingState、BottomNav。

涉及文件：`src/components/`（计划补齐共享组件）、`src/styles.css`、各 page 引用、`scripts/test.mjs`。
实现内容：
1. 抽取统一组件：`Button`、`Card`、`Badge`、`Toast`、`EmptyState`、`ErrorState`、`LoadingState`、`BottomNav`。
2. 各页面复用，不再各写一套视觉。
3. 全部用 CSS 变量，无内联颜色、无魔法数字。
4. iPhone Safari 正常，安全区适配。

验收标准：
1. 页面风格统一。
2. iPhone Safari 正常。
3. 不出现默认丑页面。
4. 不出现内联硬编码颜色。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run lint && npm run test && npm run build`。

---

### Batch UX-E：报告页产品化 [Codex]

目标：报告页是用户能看懂的分析结果，不是简单列表，文案不医疗化。

涉及文件：`src/pages/reportDetailPage.js`、`src/services/reportService.js`、`src/styles.css`、`scripts/test.mjs`。
实现内容：
1. 报告摘要 + 重点关注前置。
2. 已匹配/待确认/未收录统计可视化。
3. 数据来源说明明确。
4. 保存、分享、重新分析。
5. 文案非医疗化（禁止文案被 lint 拦截）。

验收标准：
1. 有摘要、有重点关注。
2. 有已匹配/待确认/未收录统计。
3. 有数据来源说明。
4. 有保存和分享。
5. 文案不医疗化。

是否需要人工：否。
阻塞条件：无（大部分由旧 R-A 完成，本批次按产品化标准复核与补强）。
验证命令：`npm run validate:data && npm run lint && npm run test && npm run build`。

---

# 阶段 8：移动端 / PWA 体验

### Batch 8-A：底部导航 [Codex]

目标：底部主导航（首页/识别/搜索/历史/我的），识别 Tab 视觉突出，active 态清晰。

状态：✅ 已完成 2026-06-12（5 Tab 底部导航 + `aria-current`）。
涉及文件：`src/index.html`、`src/main.js`、`src/styles.css`。
验收标准：✅ 5 Tab 清晰，识别突出，active 态正确。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`。

---

### Batch 8-B：iPhone Safari 适配 [Codex]

目标：`100dvh`、输入框 16px 防缩放、安全区、底部导航不被 Home Bar 遮挡。

状态：🔄 进行中（CSS 已适配；真机验收待人工）。
涉及文件：`src/styles.css`、`src/index.html`、`public/manifest.webmanifest`、`public/sw.js`。
实现内容：
1. `100vh`/`100dvh` 修复、输入框 `font-size >= 16px`、`env(safe-area-inset-*)`。
2. PWA 安装/离线已有；真机 Lighthouse PWA 检查待补。

验收标准：
1. iPhone Safari 全屏 100vh 正确。
2. 输入框不触发自动缩放。
3. 底部 Tab 不被 Home Bar 遮挡。

是否需要人工：是（真机验收）。CSS 编码无需人工。
阻塞条件：真机验收（可记录为待人工，不阻塞 CSS 实现）。
验证命令：`npm run lint && npm run build`，真机 / Lighthouse 验证。

---

### Batch 8-C：loading/empty/error 状态统一 [Codex]

目标：所有页面 loading 用 skeleton、empty 有操作按钮、error 有重试，不空白不丑陋。

状态：✅ 已完成 2026-06-14（全页面复核已完成；本轮补齐搜索页初始空态下一步入口、GB2760 复核页错误重试/空态出口、GB2760 参考表错误重试；UX-D 的共享组件抽取仍按产品页面设计计划单独推进）。
涉及文件：`src/styles.css`、各 page、`scripts/test.mjs`。
实现内容：
1. ✅ 全页面 loading → skeleton。
2. ✅ 全页面 empty → 含"下一步"操作按钮。
3. ✅ 全页面 error → 含重试。

验收标准：
1. 无页面用空白替代 loading。
2. 每个 empty 有操作按钮。
3. 每个 error 有重试。

是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test && npm run lint && npm run build && git diff --check`。

---

# 阶段 9：AI 总结解释

> AI 只能总结数据库匹配结果、通俗解释、生成非医疗化提示。AI 不能编造成分数据、不能编造 GB2760 结论、不能替代 OCR、不能替代数据库匹配、不能给医疗诊断。AI 排在数据源和数据库匹配之后。

### Batch 9-A：AI Provider 抽象 [Codex]

目标：AI Provider 抽象（协议、endpoint、payload、输出 contract、本地 fallback），密钥只在后端。

状态：✅ 已完成 2026-06-12（`aiAnalysisService` 协议版本、endpoint 占位、payload、响应校验、本地 fallback）。
涉及文件：`src/services/aiAnalysisService.js`、`backend/.env.example`。
验收标准：✅ 协议结构清晰；未配置 Key 时本地 fallback；前端不暴露密钥。
是否需要人工：否。
阻塞条件：无（抽象层）。
验证命令：`npm run test`。

---

### Batch 9-B：基于数据库结果的总结 [人工+Codex]

目标：后端 `POST /api/analyze`，AI 只基于传入 `matchResults` 生成解释，强制 system prompt 约束，加免责声明。

状态：⛔ blocked_by_user（AI API Key）。
涉及文件：`backend/src/routes/analyze.ts`（计划）、`src/services/aiAnalysisService.js`。
实现内容：
1. `cd backend && npm install @anthropic-ai/sdk`（人工提供 Key 后）。
2. `POST /api/analyze` 接收 `{ matchResults, productName }`，AI 只基于传入结果解释，不凭空描述。
3. System prompt 强制：禁止编造来源/安全结论、禁止医疗诊断、禁止绝对化、禁止提及不在结果中的成分、必须加"本解释仅供参考，不构成医疗建议"。
4. 未配置 Key → 503，不崩溃。

人工操作：
- [ ] 选 AI 模型（推荐 Anthropic Claude，`claude-haiku-4-5` 控成本），提供 `AI_API_KEY` / `AI_PROVIDER`。
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

是否需要人工：是。
阻塞条件：AI API Key（`blocked_by_user`）。
验证命令：（接入后）`cd backend && npm run typecheck && npm test`。

---

### Batch 9-C：未配置 API Key 降级 [Codex]

目标：未登录或 API 不可用时本地 fallback 解释（基于已有 riskLevel 描述拼接），报告页"AI 解释"区块默认折叠，标注"AI 生成，仅供参考"。

状态：✅ 已完成 2026-06-12（本地 fallback 解读 + 协议状态展示）。
涉及文件：`src/services/aiAnalysisService.js`、`src/pages/analyzePage.js`。
验收标准：✅ 无 Key 时显示 fallback，不崩溃；AI 区块标注仅供参考。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`。

---

# 阶段 10：登录、云同步

> 登录/云同步不阻塞本地 MVP。访客模式下所有核心功能可用。

### Batch 10-A：登录 UI [Codex]

目标：前端登录/注册页，JWT 管理，访客模式，登录后本机数据同步。

状态：✅ 已完成 2026-06-12（`authPage` + `authService` + 设置页登录/退出 + 访客模式 + JWT 过期清理）。
涉及文件：`src/pages/authPage.js`、`src/services/authService.js`、`src/pages/settingsPage.js`、`backend/src/routes/auth.ts`。
验收标准：✅ 注册/登录/退出；访客模式核心功能可用；登录后云同步触发。
是否需要人工：否。
阻塞条件：无。
验证命令：`npm run test`，`cd backend && npm test`。

---

### Batch 10-B：云同步接口预留 [Codex]

目标：收藏/历史/过敏原/关注/忌口/报告/产品档案登录态同步。

状态：✅ 已完成 2026-06-12（`/api/user/*` 同步接口 + 前端 hydrate-before-write 流程）。
涉及文件：`backend/src/routes/user.ts`、`src/services/storageService.js`。
验收标准：✅ 各类数据登录后同步；未登录保持本机行为。
是否需要人工：否（真实跨设备验收 + 离线队列待补）。
阻塞条件：无。
验证命令：`cd backend && npm test`，`npm run test`。

---

### Batch 10-C：真实生产配置与跨设备验收 [人工+Codex]

目标：真实跨设备同步验收 + 离线同步队列。

状态：⛔ blocked_by_user（生产环境 + 真实多设备）。
涉及文件：`src/services/storageService.js`、`backend/src/routes/user.ts`。
实现内容：
1. 离线同步队列（离线写入排队，恢复网络后回放）。
2. 真实两设备/两浏览器 profile 端到端验收。

人工操作：
- [ ] 提供生产环境或两台真实设备做跨设备验收。
- [ ] 标注：`[人工完成 ✅ YYYY-MM-DD]`

是否需要人工：是。
阻塞条件：生产环境 / 多设备（`blocked_by_user`）。离线队列编码可先做。
验证命令：（人工）两设备登录同账号验证数据一致。

---

# 阶段 11：订阅、支付、上架（全部后置）

> 等核心产品闭环（阶段 1-10）稳定后才推进。全部标记 `[人工]` 或 `[人工+Codex]`，当前不计入核心进度。

### Batch 11-A：套餐设计与权益服务 [Codex]

状态：⏸ 后置（依赖阶段 1-10 稳定）。
实现内容：`entitlements` 表、`entitlementService`、免费额度（OCR 5 次/月、AI 报告 3 次/月）、`GET /api/user/entitlement`、用量限制中间件。
是否需要人工：否（但后置）。
阻塞条件：核心闭环稳定前不启动。

### Batch 11-B：Apple IAP 接入 [人工+Codex]

状态：⛔ blocked_by_user（Apple Developer + 4-A）。
人工：App Store Connect 订阅商品、沙盒账号、.p8 Key。Codex：前端购买流程、服务端 JWS 验证、Webhook。

### Batch 11-C：Google Play Billing [人工+Codex]

状态：⛔ blocked_by_user（Google Play + 14 天闭测）。
人工：Play Console 订阅、Pub/Sub 通知、服务账号 JSON。Codex：购买流程、服务端验证、Webhook。

### Batch 11-D：iOS / Android 工程签名 [人工]

状态：⛔ blocked_by_user。
iOS：Apple Developer Program、Bundle ID、权限描述、TestFlight。Android：Google Play 开发者、applicationId、keystore、14 天闭测。

### Batch 11-E：E2E 测试 [Codex]

状态：⏸ 后置（依赖阶段 1-10 稳定）。
实现内容：Playwright 覆盖拍照识别→分析→保存报告、搜索→详情→收藏主流程，CI 集成。

### Batch 11-F：合规材料最终版 [人工+Codex]

状态：⛔ blocked_by_user（法务复核）。
人工：法务复核隐私政策、服务条款、数据安全问卷、客服邮箱。Codex：更新 `src/data/legalContent.js`、`docs/app-store-metadata.md`。

### Batch 11-G：生产基础设施与监控 [人工+Codex]

状态：⛔ blocked_by_user（依赖 2-D + 域名）。
人工：域名、DNS、生产库、部署平台、生产环境变量。Codex：生产 Dockerfile、CI/CD、Sentry、`/health` 数据库检查、结构化日志。

### Batch 11-H：提交商店审核与发布 [人工]

状态：⛔ blocked_by_user。
App Store Connect / Google Play Console 提交审核、灰度发布、回滚。

---

## 完整依赖关系

```
阶段 1（数据源 GB2760）：1-A → 1-B✅ → 1-C[人工+Codex] → 1-D → 1-E → 1-F
阶段 2（数据库 API）：2-A✅ → 2-B✅ → 2-C✅ → 2-D[人工+Codex, blocked]
阶段 3（OCR）：3-A✅ → 3-B🔁 → 3-C✅ → 3-D✅ → 3-E[人工+Codex, blocked]
阶段 4（解析匹配）：4-A✅ → 4-B✅ → 4-C🔄 → 4-D✅
阶段 5（报告）：5-A✅ → 5-B✅ → 5-C✅ → 5-D✅
阶段 6（档案个性化）：6-A✅ → 6-B✅ → 6-C✅ → 6-D✅
阶段 7（体验 UX）：UX-A🔁 → UX-B → UX-C✅ → UX-D → UX-E
阶段 8（移动 PWA）：8-A✅ → 8-B🔄 → 8-C✅
阶段 9（AI）：9-A✅ → 9-B[人工+Codex, blocked] → 9-C✅
阶段 10（登录同步）：10-A✅ → 10-B✅ → 10-C[人工+Codex, blocked]
阶段 11（订阅支付上架）：全部后置 / blocked_by_user
```

关键人工卡点：

| 卡点 | 解锁 | 当前是否阻塞核心 |
|---|---|---|
| GB2760 人工复核 | 1-C promote 实际 verified 增量产出 | 否（pending_review 流程与 promote 脚本已可用） |
| 生产 DATABASE_URL | 2-D | 否（本地闭环可用） |
| OCR API Key | 3-E | 否（manual/mock 闭环可用） |
| AI API Key | 9-B | 否（本地 fallback 可用） |
| Apple / Google 账号 | 11-B/C/D/H | 否（已后置） |

---

## 附录：GB2760 导入历史记录（保留追溯，勿删）

- **2026-06-12 官方来源确认**：GB 2760-2024 官方来源为国家卫健委公告（2024 年第 1 号）和食品安全国家标准数据检索平台；标准文本 ID `6CA1489A-9570-4906-8CE8-CC86FBFB1941`，附件 ID `43C9B75E-3D84-4577-80FC-0F7D77D36407`，发布 `2024-02-08`，实施 `2025-02-08`；官方 PDF SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`（不入应用仓库）。
- **2026-06-12 首批 5 条条款级导入**：`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate` 升级为 `verified_regulation` / `isVerified: true`。
- **2026-06-13 全文转换**：264 页 → `gb2760_official_pages`。
- **2026-06-13 表 A.1 staging**：第 8-148 页 → 2404 行 `gb2760_official_records`，2391 行 `needs_review`，957 行关联 91 个 ingredient，1447 行未匹配；100 条 seed 中 91 条有 A.1 证据（9 条无：`calcium-citrate`/`citral`/`ethyl-maltol`/`ethyl-vanillin`/`isomalt`/`konjac-gum`/`menthol`/`potassium-benzoate`/`vanillin`）。
- **2026-06-13 参考表全量**：A.2=68、B.1=29、B.2=388、B.3=1504、C.1=37、C.2=80、C.3=66、附录 D=23、E.1=318、附录 F=287，合计 2800 行 `gb2760_official_reference_rows`。
- **2026-06-14 边界修复**：表 C.3/附录 F 行边界泄漏、C3 跨页续行所有权、INS 续行解析、C2 加工助剂包裹行修复；`validate:data` 通过，分表行数与官方 PDF 一致。
