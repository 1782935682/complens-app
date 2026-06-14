# Data Sources

## 数据原则

当前目标不是一次性补齐所有食品配料，而是建立可用的基础权威数据底座，并通过持续扩充和人工校验逐步提高覆盖。

硬性规则：

- 不允许 AI 编造食品成分数据、法规来源、ADI、限量、条款编号或安全结论。
- 不允许把 JECFA 安全评价当成 GB 2760 中国法规使用范围（不允许把 JECFA 数据反推 GB 2760 使用范围）。
- GB 2760-2024 是官方标准来源；权威来源只使用国家卫生健康委公告和食品安全国家标准数据检索平台；第三方网站只能作为辅助检索线索，不能作为 `sourceType: 'official_standard'` 或官方 `sourceName`。
- 不强行补齐所有食品配料；无法可靠结构化的内容先保留 `rawSourceText` 和待确认状态。
- `isVerified: true` / `verified_regulation` 只能用于已完成 GB 2760 官方法规依据、来源文本、版本和条款级核验的记录；JECFA 仅能作为安全评价来源。
- **staging 与 verified 有本质区别**：staging（`gb2760_official_records` 等）是官方 PDF 抽取的原始承接层，只代表原文/页码/限量已进入数据库，**不是已核验法规结论**；正式库（`ingredients` 的 `verified_regulation` 行、`additive_usage_rules`）只接收满足"正式库准入规则"的高置信、可追溯数据。
- **`pending_review` 不能当作权威结论**：从官方来源抽取但字段或结构待复核的数据，后端 DB 状态为 `pending_review`（生成源文件仍可能保留 `needs_review`，入库时统一），不得展示为已验证、不得作为官方规则。
- 数据是**持续扩充**的：不追求一次性把全部食品配料人工 verified，而是 staging 全量承接 → 高置信 promote → 低置信 `pending_review` → 后续人工复核逐步提高覆盖。

## 分层数据状态

食品数据使用以下状态分层：

| dataStatus | 含义 | 当前数量 | 能否权威展示 | 当前说明 |
|---|---:|---:|---|---|
| `verified_regulation` | 已匹配 GB 2760 官方法规依据 | DB 308 | ✅ | 本轮 GB 2760 A.1 staging 人工签核并 promote 后，正式法规成分覆盖已扩展到 308 个 ingredient |
| `verified_jecfa` | 已匹配 JECFA 安全评价依据 | DB 1 / 源文件 27 | ⚠️ 仅安全评价 | 仅代表 JECFA 条目和 ADI 摘要已匹配，不代表中国法规使用限制；DB 中部分原 JECFA-only 成分已因 GB 2760 promote 升级为 `verified_regulation` |
| `pending_review` | 已从官方来源抽取，字段/结构待复核 | DB 0 / 源文件 2391 | ❌ | GB 2760 源文件可保留 `needs_review`，后端入库与人工状态由 DB 管理；本轮 DB staging 已全部签核或历史 verified |
| `mapped_candidate` | 疑似匹配，待确认 | 0 | ❌ | 当前用于运行时低置信匹配，不写入权威结论 |
| `common_ingredient` | 常见普通食品配料 | 12 | ⚠️ 仅可读性 | 来自项目样例标签词库，不是法规或安全评价来源 |
| `unverified` | 未验证 | DB 8 / 源文件 68 | ❌ | 原 seed 中部分记录已因 GB 2760 promote 升级；源文件静态口径仍由 `validate:data` 校验 |
| `unknown_from_ocr` | OCR 识别到但未收录 | 0 | ❌ | 运行时报表状态；不作为静态权威数据写入 |

当前 DB 食品基础库合计 329 条：100 条食品添加剂 seed + 12 条常见普通食品配料词库 + 217 条 GB 2760 自动映射生成的添加剂身份。源文件静态 seed 仍为 112 条，`validate:data` 使用源文件口径；GB 2760 staging、正式规则和 promote 状态以 DB / `validate:gb2760` 为准。

## GB 2760 导入流程与正式库准入

GB 2760 官方数据按以下流程导入，逐步提高覆盖，不追求一次性全量 verified：

```
GB 2760 官方 PDF
  → staging 全量承接（gb2760_official_pages 全文 + gb2760_official_records 表 A.1 行 + gb2760_official_reference_rows 参考表）
  → 高置信度数据 promote 到正式库（ingredients / additive_usage_rules）
  → 低置信度数据保持 pending_review
  → 后续人工复核签核后再 promote
```

**正式库准入规则**（promote 时全部满足才允许，详见 `CODEX_TASKS.md` 阶段 1）：添加剂名称明确、CNS/INS 可解析或原文可追溯、功能类别明确、食品分类号或适用范围明确、最大使用量/残留量或"按生产需要适量使用"明确、备注完整保留、有 `rawSourceText`、有 `sourcePage`、有 `sourceTable`、有 `sourceHash`、DB staging 行已由内部 reviewer 标记为 `approved` 或已 `promoted`、签核动作有 `reviewedBy` / `reviewedAt` / `reviewNote` 审计、无跨页错配/错行/漏备注。不满足的行只能留在 staging（`pending_review`）。

**禁止事项**（`validate:gb2760` 强制）：不允许 AI 猜数据；不允许把 JECFA 反推 GB 2760 使用范围；不允许把 `pending_review` 当 `verified`；不允许丢失备注；不允许把"按生产需要适量使用"改写为数值；不允许伪造导入成功；不允许把样本 seed 当完整数据库。

## GB 2760 当前状态

当前 DB 中 308 个 ingredient 已通过 GB 2760-2024 官方 PDF 表 A.1 staging 人工签核并 promote 为 `verified_regulation`；其中早期 5 条源文件 seed 已内置条款级使用范围：

`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate`。

为后续把官方文档持续导入数据库，已新增三层 GB 2760 官方数据：

- 导入审计层：后端表 `source_documents` 保存 GB2760 官方 PDF 文档登记（标准号、标题、平台记录 ID、附件 ID、PDF 文件名和 SHA-256）；`import_runs` 保存 `db:seed` 写入的 `a1_staging`、`fulltext`、`reference_tables` 批次、行数和状态；`import_errors` 保存失败批次的错误明细。该层只记录导入过程，不代表人工法规审核完成。
- PDF 全文转换层：`src/data/gb2760OfficialFullText.js` 保存官方 PDF 全 264 页的 `pdftotext -layout` 逐页文本、页文本 SHA-256、PDF SHA-256 和官方平台来源字段；后端表 `gb2760_official_pages` 可将全文页入库，确保不是只保存本地 PDF 文件。
- 表 A.1 行级 staging 层：`src/data/gb2760OfficialStaging.js`、`src/data/gb2760OfficialGeneratedA1Staging.js` 和后端表 `gb2760_official_records` 保存已经拆出的“添加剂 × 食品类别 × 限量/备注”结构化行；自动抽取源文件保持 `needs_review`，后端入库统一为 `pending_review`，不得直接当作正式 `usageLimits`。`db:seed` 只会在行级法规字段指纹完全一致时保留 DB 中已有的 `mapped_candidate` / `approved` / `promoted` 人工状态、`ingredientId` 和签核审计字段；若限量、食品类别、备注、原文证据、页码或 PDF 来源等字段变化，必须重新回到待复核。
- 官方参考表结构化层：`src/data/gb2760OfficialReferenceTables.js` 和后端表 `gb2760_official_reference_rows` 保存表 A.2、B.1、B.2、B.3、C.1、C.2、C.3、附录 D、E.1 和附录 F 等非限量参考表；当前已结构化 2800 行，B.1 脚注 a 的香料例外和剂量条件已结构化到 `rowData.footnote`，用于解释 A.1 例外范围、食品用香料边界、加工助剂、功能类别、食品分类系统和附录 A 索引；源文件待复核行入库时统一为 `pending_review`。
- 正式使用规则层：后端表 `additive_usage_rules` 已存在，作为人工签核后 promote 的正式“添加剂 × 食品类别 × 限量”目标表；成功 promote 会同步更新对应 `ingredients` 行的 GB2760 法规状态、来源和 `usageLimits`，让既有成分详情 / 搜索 API 可见。当前 2391 行，覆盖 303 个 ingredient 的 A.1 使用规则。
- 数据准入校验层：`npm run validate:gb2760` 已存在，读取后端 DB 并校验正式规则表、DB staging 状态、JECFA-only 边界、最新导入批次和 `import_errors`。该命令校验 DB 口径；源文件抽取质量仍由 `npm run validate:data` 覆盖。

- 当前导入审计：`source_documents` 1 条（GB 2760-2024，PDF SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`）；最近一次 `db:seed` 写入三条成功 `import_runs`：A.1 staging 2404 行、PDF 全文 264 页、参考表 2800 行；最近一次 `promote` 批次成功，`approved=2391`、`promoted=2391`、`failed=0`；`import_errors` 0。后续新签核会记录登录用户 email/id、时间和备注；迁移对既有已签核/已 promote 行回填 legacy 审计说明。
- 当前全文页数：264 页，覆盖 GB 2760-2024 官方 PDF 全文。
- 当前表 A.1 行级 staging 行数：2404 行，覆盖表 A.1 的 PDF 第 8-148 页（标准页 5-145）；其中 2391 行已人工签核并 `promoted`，13 行为历史 `verified`，缺失 `ingredientId` 为 0。
- 当前参考表行数：2800 行，覆盖 PDF 第 149-264 页中的参考表区域：表 A.2=68、表 B.1=29、表 B.2=388、表 B.3=1504、表 C.1=37、表 C.2=80、表 C.3=66、附录 D=23、表 E.1=318、附录 F=287；保存例外食品类别、香料清单、加工助剂、酶制剂、功能类别、食品分类系统和附录 A 索引等结构化字段及原始行证据。
- ingredient 自动关联只使用唯一中文名/别名匹配，或无名称匹配时的单一 INS 码精确匹配；INS 子码不折叠，多 INS、多盐类或多色淀组合默认保留空 `ingredientId`，等待人工归并。
- 自动抽取脚本已加入标题续行、脚注过滤和已定位跨行食品分类校正，避免 `DATEM`、司盘类、吐温类等长标题截断，以及相邻食品分类文字串行；这些校正仍属于 staging 抽取质量控制，不代表人工审核完成。
- 已与正式 `ingredients.usageLimits` 对齐的历史 verified staging 行：13 行，对应上述 5 条 `verified_regulation` 记录的食品类别/限量；`promote:gb2760` 会把这些行报告为 `already_verified`，但不会自动写入新 `additive_usage_rules` 表。
- 待审核 DB staging 行：0 行。本轮 2391 行来自官方 PDF 表 A.1 的行级抽取结果已完成人工签核并 promote；后续若源字段指纹变化或新增行，仍必须重新进入 `pending_review` 并复核。
- 100 条食品添加剂 seed 的 A.1 覆盖审计：91 条在官方 PDF 表 A.1 中找到可匹配条目并已进入 staging；9 条未找到可结构化的 A.1 证据，当前不强行编造 staging 行：`calcium-citrate`、`citral`、`ethyl-maltol`、`ethyl-vanillin`、`isomalt`、`konjac-gum`、`menthol`、`potassium-benzoate`、`vanillin`。
- staging 表按“添加剂 × 食品类别 × 最大使用量/备注”逐行存储，保留 `pdfPage`、`standardPage`、`rawSourceText`、平台记录 ID、附件 ID 和 PDF SHA-256，供后续人工审核后再聚合进正式 `ingredients.usageLimits`。

已确认的 GB 2760-2024 官方来源：

- 公告来源：国家卫生健康委公告（2024 年第 1 号），食品安全国家标准数据检索平台记录标题为“关于发布《食品安全国家标准 食品添加剂使用标准》（GB 2760-2024）等47项食品安全国家标准和6项修改单的公告（2024年 第1号）”，发布日期 `2024-02-08`，平台记录 ID `3D0601E8-A77C-4EC5-B148-30E2E7020822`。
- 标准文本：`GB 2760-2024 食品安全国家标准 食品添加剂使用标准`，食品安全国家标准数据检索平台记录 ID `6CA1489A-9570-4906-8CE8-CC86FBFB1941`，发布日期 `2024-02-08`，实施日期 `2025-02-08`。
- 官方附件：平台附件 ID `43C9B75E-3D84-4577-80FC-0F7D77D36407`，平台文件名 `1747898473246.pdf`，下载接口为 `https://sppt.cfsa.net.cn:8086/cfsa_aiguo`（POST `task=d_p` + `file_guid`）。
- 本地保存：官方 PDF 已保存到 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`，文件大小 `2600140` bytes，SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`；该文件不提交到应用仓库。
- 平台提示：2026-06-12 抓取页面时，平台页面提示“系统维护中，暂时无法使用标准预览和下载功能。”下载接口可返回官方 PDF；不得改用第三方镜像作为官方来源。

其余 68 条未验证添加剂已将 GB 2760-2024 官方标准文本记录作为后续核验来源，但这些字段仍属于 seed reference，不代表已经完成：

- 条款编号确认
- 适用食品类别确认
- 最大使用量或残留量确认
- 原始法规文本结构化
- 人工审核签核

因此除上述 5 条外，当前不导入 `usageLimits`，也不把 `gbStatus`、`foodCategories` 或 seed 来源展示为已核验法规结论。

## JECFA 当前状态

当前 27 条添加剂为 `verified_jecfa`：

`potassium-sorbate`、`sodium-benzoate`、`ascorbic-acid`、`aspartame`、`sucralose`、`sodium-cyclamate`、`pectin`、`tartrazine`、`sunset-yellow-fcf`、`allura-red-ac`、`glycerol`、`calcium-chloride`、`sodium-alginate`、`acesulfame-potassium`、`carrageenan`、`guar-gum`、`polysorbate-80`、`sodium-nitrite`、`potassium-nitrate`、`potassium-citrate`、`calcium-citrate`、`lactic-acid`、`sodium-acetate`、`calcium-propionate`、`natamycin`、`propylene-glycol-alginate`、`sodium-carboxymethyl-cellulose`。

另有 5 条已升级为 `verified_regulation`，但在 `sourceReferences` 中保留 JECFA 条目作为补充安全评价来源。

来源版本：`JECFA database updates through 101st JECFA meeting (October 2025)`

JECFA 数据库入口：https://apps.who.int/food-additives-contaminants-jecfa-database/

JECFA 字段使用边界：

- 可以作为安全评价来源：`sourceScope: 'jecfa_safety_evaluation'`、ADI 摘要、JECFA 条目 URL、`rawSourceText`。
- 不能作为中国法规使用范围：不写入 GB 2760 使用类别、最大使用量或中国允许/限制结论。
- JECFA-only 记录的 `isVerified` 仍为 `false`，因为 GB 2760 条款级法规核验未完成。

## Common Ingredient 当前状态

当前 12 条 `common_ingredient` 来自项目样例标签和普通配料词库：

`common-water`、`common-white-sugar`、`common-wheat-flour`、`common-refined-vegetable-oil`、`common-shortening`、`common-whole-milk-powder`、`common-edible-salt`、`common-chili-pepper`、`common-garlic`、`common-fructose-syrup`、`common-apple-juice-concentrate`、`common-konjac-flour`。

这些记录用于改善配料表分析的可读性和匹配覆盖，但不代表：

- GB 2760 法规依据
- JECFA 安全评价
- 完整食品原料库
- 营养成分数据库

## 未验证与待确认

当前 68 条 `unverified` 食品添加剂仍需后续人工确认：

- 是否能精确匹配 JECFA 条目
- 是否存在 JECFA 分组、拆分、盐类、构型或语境差异
- 是否能匹配 GB 2760 官方版本和条款
- 是否需要拆分现有 seed 分组条目
- 是否存在 Codex/EU/GB 编码冲突
- 风险文案、特殊人群提醒和过敏原标注是否需要修正

OCR 未匹配数据不直接写入权威库。运行时只记录为 `unknown_from_ocr`，后续进入人工校验队列，确认来源后再升级为相应状态。

当前数据治理页会从本机报告聚合 OCR 未收录项和低置信候选项，并和静态 `unverified` / `mapped_candidate` / `seed_reference` 记录一起展示为人工校验队列。该队列只保存待核对线索和反馈入口，不代表任何记录已完成法规或安全评价验证。

## 数据模型字段

食品数据和后端 `ingredients` 表需要保留以下可信度字段：

- `dataStatus`
- `matchConfidence`
- `sourceScope`
- `sourceName`
- `sourceVersion`
- `sourceUrl`
- `regulatoryBasis`
- `rawSourceText`
- `lastReviewedAt`
- `reviewNote`
- `isVerified`

GB 2760 官方 PDF 全文先进入后端 `gb2760_official_pages` 表，核心字段包括：

- `pdfPage`
- `standardPageLabel`
- `text`
- `textSha256`
- `pdfSha256`
- `extractionTool`
- `extractionScope`
- `sourceName`
- `sourceUrl`
- `downloadEndpoint`
- `platformRecordId`
- `fileGuid`
- `generatedAt`

GB 2760 官方 PDF 表 A.1 结构化抽取数据再进入后端 `gb2760_official_records` staging 表，核心字段包括：

- `ingredientId`
- `standardCode`
- `tableName`
- `additiveNameCn`
- `cnsNumber`
- `insNumber`
- `functionText`
- `foodCategoryCode`
- `foodCategoryName`
- `maxUseLevel`
- `unit`
- `note`
- `pdfPage`
- `standardPage`
- `rawSourceText`
- `pdfSha256`
- `extractionStatus`
- `reviewStatus`

GB 2760 官方 PDF 非限量参考表数据进入后端 `gb2760_official_reference_rows` 表，核心字段包括：

- `tableName`
- `tableTitle`
- `rowNumber`
- `rowCode`
- `rowName`
- `rowData`
- `pdfPage`
- `standardPage`
- `rawSourceText`
- `pdfSha256`
- `extractionTool`
- `extractionScope`
- `reviewStatus`

字段解释：

- `dataStatus` 表示数据可信层级。
- `matchConfidence` 表示当前匹配置信度，不等于法规可信度。
- `sourceScope` 标明来源用途，例如 `gb_2760_regulation`、`jecfa_safety_evaluation`、`common_ingredient_lexicon`。
- `regulatoryBasis` 和 `rawSourceText` 必须保留来源原文或可追溯摘要；无法结构化时不得编造结论。

## 后续数据任务

1. 官方 GB 2760 数据审核：官方 PDF 全文、表 A.1 staging 和 A.2/B/C/D/E/F 参考表已进入对应后端表；下一步是人工审核 staging 行、去重/归并、补 ingredient 匹配，并将可验证条款升级到正式 `additive_usage_rules` 或既有 `ingredients.usageLimits`；不能可靠结构化时保留全文页和 `pending_review`（源文件可保留 `needs_review`），不得编造食品类别或限量。
2. JECFA 映射扩充：只扩充安全评价来源，不写中国法规使用限制。
3. 常见配料词库：继续从真实标签样本和可信词表扩展，并保持 `common_ingredient` 状态。
4. OCR 未匹配收集：保存未收录条目、来源上下文和置信度，进入人工校验队列。
5. 人工校验队列：数据治理页只读展示 OCR 未收录、低置信候选和未验证静态数据；审核后才能通过后续数据批次升级 `dataStatus` 或 `isVerified`。
6. 数据可信等级展示：搜索、详情、分析报告和导出都必须展示状态、来源和低置信提示。

## AI 不得编造的数据

AI 不能作为原始数据来源，不能编造或补全以下内容：

- 食品成分是否安全、是否有害、是否适合某人群的权威结论。
- GB 2760 允许、限制或禁止状态。
- 最大使用量、残留量、ADI、每日摄入建议。
- 标准版本、发布日期、生效日期、废止日期。
- 官方来源链接、条款编号、原始法规文本。
- `isVerified: true`、`verified_regulation` 或高可信法规结论。
- 医疗、治疗、诊断、预防疾病相关结论。

AI 只能在已有可信数据基础上做解释、摘要、格式转换和风险边界提示。
