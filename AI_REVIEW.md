# AI Review - 2026-06-13 Data Foundation Layer

## 本轮目标

本轮目标不是一次性补齐所有食品配料，而是建立可用的基础权威数据底座：

- 不让 AI 编造食品成分数据、法规来源、ADI、限量或安全结论。
- 不把 JECFA 数据当成 GB 2760 中国法规使用范围。
- GB 2760-2024 只能以国家卫健委公告和食品安全国家标准数据检索平台作为官方来源，第三方网站不得作为 `official_standard`。
- 不强行补齐全部食品配料。
- 建立 `verified_regulation` / `verified_jecfa` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 分层。

## 本轮完成

1. 数据模型新增或贯穿以下字段：`dataStatus`、`matchConfidence`、`sourceScope`、`sourceName`、`sourceVersion`、`sourceUrl`、`regulatoryBasis`、`rawSourceText`、`lastReviewedAt`、`reviewNote`、`isVerified`。
2. 食品基础库当前 112 条：
   - `verified_regulation`: 5 条
   - `verified_jecfa`: 27 条
   - `mapped_candidate`: 0 条静态数据；运行时低置信匹配会显示为候选
   - `common_ingredient`: 12 条
   - `unverified`: 68 条
   - `unknown_from_ocr`: 0 条静态数据；OCR 未匹配时运行时记录
3. JECFA-only 27 条只标记为 `sourceScope: 'jecfa_safety_evaluation'`，不写入 GB 2760 使用范围或限量。
4. 常见普通食品配料新增为独立词库，仅用于分析覆盖和过敏原提示，不作为法规或安全评价来源。
5. 分析报告、报告详情和导出展示已匹配数量、待确认数量、暂未收录数量、每个配料的数据状态、数据来源和低置信度提示。
6. 后端 `ingredients` schema、seed、列表 API 增加数据状态字段和 `dataStatus` 筛选。
7. 数据治理页新增“人工校验队列”，汇总本机 OCR 未收录项、低置信候选和静态未验证数据，并通过数据纠错表单提交校验线索。
8. GB 2760-2024 官方标准文本来源已从食品安全国家标准数据检索平台确认：标准文本 ID `6CA1489A-9570-4906-8CE8-CC86FBFB1941`，附件 ID `43C9B75E-3D84-4577-80FC-0F7D77D36407`，发布日期 `2024-02-08`，实施日期 `2025-02-08`；官方 PDF 已保存到 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`，SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`。
9. 已从官方 PDF 表 A.1 首批导入 5 条条款级法规数据：`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate`，写入 `usageLimits`、适用食品类别、PDF 页码/标准页码、官方来源引用，并升级为 `verified_regulation` / `isVerified: true`。
10. 新增 GB 2760 官方 PDF 全文转换层：`src/data/gb2760OfficialFullText.js` 保存官方 PDF 全 264 页逐页文本、页 SHA-256、PDF SHA-256 和官方平台来源字段，后端 `gb2760_official_pages` 表和 seed 通路可将全文页入库。
11. GB 2760 官方 PDF 表 A.1 已完成第 8-148 页 staging 转换：`src/data/gb2760OfficialStaging.js` 合并人工校对行与 `src/data/gb2760OfficialGeneratedA1Staging.js` 的自动抽取行，保存 2404 行表 A.1 行级抽取记录，后端 `gb2760_official_records` 表和 seed 通路可将这些记录入库；自动抽取行仍需人工审核。
12. staging 数据中 13 行与首批 5 条 `verified_regulation` 的正式 `usageLimits` 对齐，2391 行为 `needs_review`，其中 1017 行关联 91 个现有食品添加剂 ID，1387 行尚未匹配本地 ingredient；ingredient 自动关联只使用唯一中文名/别名匹配，或无名称匹配时的单一 INS 码唯一匹配，多 INS 组合保留待人工归并；100 条 seed 中 91 条在官方 PDF 表 A.1 找到可匹配证据并已覆盖，9 条未找到可结构化 A.1 证据；`needs_review` 只代表官方 PDF 原文和页码已抽取，不自动升级正式成分详情或 `isVerified`。
13. `DATA_SOURCES.md`、`PROJECT_PLAN.md`、`CODEX_TASKS.md` 已同步新口径：基础权威库 + 官方 PDF 全文入库层 + 官方 PDF staging 入库层 + 持续扩充 + 人工校验队列。

## 已验证与未验证

| 范围 | 当前状态 | 说明 |
|---|---:|---|
| GB 2760 官方标准文本来源 | 已确认 | 来源为国家卫健委公告（2024年第1号）和食品安全国家标准数据检索平台；仅代表标准文本来源确认 |
| GB 2760 条款级法规依据 | 5 条已验证 | 已导入首批官方 PDF 表 A.1 使用范围和限量；其余不得展示为 GB 2760 已验证 |
| GB 2760 官方 PDF 全文 | 264 页可入库 | 覆盖官方 PDF 全页文本、页 SHA-256 和官方来源元数据；用于追溯，不自动生成正式 `usageLimits` |
| GB 2760 官方 PDF staging | 2404 行可入库 | 覆盖表 A.1 的 PDF 第 8-148 页；13 行已与正式 verified 记录对齐；2391 行为 `needs_review`，覆盖 91/91 条有 A.1 证据的 seed，另有 1387 行未匹配本地 ingredient；抽取脚本已加入标题续行、脚注过滤和已定位跨行食品分类校正；自动抽取行仍需人工审核，自动 ingredient 关联不代表正式法规升级 |
| JECFA 安全评价 | 27 条 JECFA-only，另 5 条作为补充来源 | 可作为安全评价来源；不得当作中国使用限制 |
| 常见普通配料 | 12 条词库命中 | 来自项目样例标签词库；不是法规来源 |
| 未验证食品添加剂 | 68 条 | 保留 seed reference 和来源线索，等待人工核验 |
| OCR 未匹配 | 运行时记录 | 不直接写入权威库，后续进入人工校验队列 |

除上述 5 条 GB 2760 条款级记录外，其余食品记录当前仍为 `isVerified: false`。

## 明确不做的事

- 不新增 AI 生成的食品成分、法规结论、限量或来源链接。
- 不把 JECFA ADI 或安全评价写成 GB 2760 允许使用范围。
- 不为无法可靠结构化的法规文本编造食品类别、最大使用量或条款编号；staging 行必须保留 `rawSourceText` 和审核状态。
- 不把 common ingredient 词库展示为官方法规数据。
- 不承诺一次性补齐全部食品配料。

## 需要后续人工确认

| 阻塞项 | 需要确认 |
|---|---|
| GB 2760 条款级核验 | 2391 行 `needs_review` staging 需要人工确认、去重/归并和 ingredient 匹配后才能进入正式 `ingredients.usageLimits` |
| 分组/拆分规则 | 焦糖色、糖精类、胡萝卜素、苹果酸、Nisin 等是否拆分 |
| 未验证 68 条添加剂 | 是否可匹配 JECFA、GB 2760 或其他官方依据 |
| OCR 未匹配队列 | 是否为普通配料、添加剂、错字、噪声或需新增条目 |
| 普通配料词库扩展 | 来源词表、标签样本、过敏原标注和命名规范 |

## 本轮新增队列边界

- `unknown_from_ocr` 只来自运行时 OCR 来源报告的未匹配条目，不写入静态权威库。
- 人工校验队列是只读入口：可以聚合 OCR 未收录、低置信候选和静态未验证数据，但不能自动升级为 `verified_regulation` 或 `isVerified: true`。
- 任何升级仍需要人工补充官方来源、原文片段、条款编号、适用范围或拆分/归并说明。

## 验证结果

本轮 GB 2760-2024 官方来源、首批 PDF 条款级数据、2404 行 staging 数据、100 条 seed 的 A.1 覆盖审计和 264 页 PDF 全文转换已通过完整验证链；表 A.1 第 8-148 页已转换到 staging：

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run db:seed -- --version gb2760-staging-coverage-20260613 --reviewed-by codex --change-note "GB 2760 official Table A.1 staging extraction quality and ingredient auto-link"
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
git diff --check
```

`npm run validate:data` 输出：112 条食品记录；`verified_regulation=5`、`verified_jecfa=27`、`common_ingredient=12`、`unverified=68`、`missingSourceFields=0`、`missingUsageLimits=95`。GB 2760 staging 输出：`rows=2404`、`linkedIngredients=91`、`unlinked=1387`、`pdfPages=141`、`verified=13`、`needs_review=2391`。GB 2760 seed coverage 输出：`matchingCovered=91/91`、`noA1Evidence=9`、`unexpectedUncovered=none`。GB 2760 full-text 输出：`pages=264`、`standardPageLabels=260`、`textSha256=264`、`emptyTextPages=none`。`npm run test` 已覆盖已定位的标题截断、脚注污染和跨行食品分类串行回归；`npm run lint`、`npm run test`、`npm run build`、后端 `db:seed` / `typecheck` / `test` / `build` 和 `git diff --check` 均已通过。

上一轮基础数据分层与后端同步验证：

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
cd backend && npm run db:generate
cd backend && npm run db:migrate
cd backend && npm run db:seed -- --version food-authority-foundation-v1 --reviewed-by codex --change-note "foundation data status layer"
```

以上已通过。`npm run validate:data` 输出：112 条食品记录；`verified_regulation=0`、`verified_jecfa=32`、`common_ingredient=12`、`unverified=68`、`unknown_from_ocr=0`、`missingSourceFields=0`、`missingUsageLimits=100`。`db:generate` 结果为 no schema changes，`db:migrate` applied successfully，seed 写入 112 条。
