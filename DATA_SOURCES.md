# Data Sources

## 数据原则

当前目标不是一次性补齐所有食品配料，而是建立可用的基础权威数据底座，并通过持续扩充和人工校验逐步提高覆盖。

硬性规则：

- 不允许 AI 编造食品成分数据、法规来源、ADI、限量、条款编号或安全结论。
- 不允许把 JECFA 安全评价当成 GB 2760 中国法规使用范围。
- GB 2760-2024 的权威来源只使用国家卫生健康委公告和食品安全国家标准数据检索平台；第三方网站只能作为辅助检索线索，不能作为 `sourceType: 'official_standard'` 或官方 `sourceName`。
- 不强行补齐所有食品配料；无法可靠结构化的内容先保留 `rawSourceText` 和待确认状态。
- `isVerified: true` 只能用于已完成 GB 2760 官方法规依据、来源文本、版本和条款级核验的记录；JECFA 仅能作为安全评价来源。

## 分层数据状态

食品数据使用以下状态分层：

| dataStatus | 含义 | 当前数量 | 当前说明 |
|---|---:|---:|---|
| `verified_regulation` | 已匹配 GB 2760 官方法规依据 | 5 | 已从 GB 2760-2024 官方 PDF 表 A.1 导入条款级使用范围和限量 |
| `verified_jecfa` | 已匹配 JECFA 安全评价依据 | 27 | 仅代表 JECFA 条目和 ADI 摘要已匹配，不代表中国法规使用限制 |
| `mapped_candidate` | 疑似匹配，待确认 | 0 | 当前用于运行时低置信匹配，不写入权威结论 |
| `common_ingredient` | 常见普通食品配料 | 12 | 来自项目样例标签词库，不是法规或安全评价来源 |
| `unverified` | 未验证 | 68 | 原 100 条 seed 中尚未完成 JECFA/GB 2760 精确审核的添加剂 |
| `unknown_from_ocr` | OCR 识别到但未收录 | 0 | 运行时报表状态；不作为静态权威数据写入 |

当前食品基础库合计 112 条：100 条食品添加剂 seed + 12 条常见普通食品配料词库。

## GB 2760 当前状态

当前 5 条记录已从 GB 2760-2024 官方 PDF 表 A.1 导入条款级使用范围和最大使用量，并标记为 `verified_regulation` / `isVerified: true`：

`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate`。

为后续把官方文档持续导入数据库，已新增两层 GB 2760 官方数据：

- PDF 全文转换层：`src/data/gb2760OfficialFullText.js` 保存官方 PDF 全 264 页的 `pdftotext -layout` 逐页文本、页文本 SHA-256、PDF SHA-256 和官方平台来源字段；后端表 `gb2760_official_pages` 可将全文页入库，确保不是只保存本地 PDF 文件。
- 表 A.1 行级 staging 层：`src/data/gb2760OfficialStaging.js`、`src/data/gb2760OfficialGeneratedA1Staging.js` 和后端表 `gb2760_official_records` 保存已经拆出的“添加剂 × 食品类别 × 限量/备注”结构化行；自动抽取行保持 `needs_review`，不得直接当作正式 `usageLimits`。

- 当前全文页数：264 页，覆盖 GB 2760-2024 官方 PDF 全文。
- 当前表 A.1 行级 staging 行数：2404 行，覆盖表 A.1 的 PDF 第 8-148 页（标准页 5-145）；其中 957 行已关联 91 个现有食品添加剂 ID，1447 行尚未匹配本地 ingredient。
- ingredient 自动关联只使用唯一中文名/别名匹配，或无名称匹配时的单一 INS 码精确匹配；INS 子码不折叠，多 INS、多盐类或多色淀组合默认保留空 `ingredientId`，等待人工归并。
- 自动抽取脚本已加入标题续行、脚注过滤和已定位跨行食品分类校正，避免 `DATEM`、司盘类、吐温类等长标题截断，以及相邻食品分类文字串行；这些校正仍属于 staging 抽取质量控制，不代表人工审核完成。
- 已与正式 `ingredients.usageLimits` 对齐的 verified staging 行：13 行，对应上述 5 条 `verified_regulation` 记录的食品类别/限量。
- 待审核 staging 行：2391 行，来自官方 PDF 表 A.1 的行级抽取结果，状态为 `needs_review`；这些行只代表官方 PDF 原文、页码和限量已进入 staging，不代表正式成分详情已升级。
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

字段解释：

- `dataStatus` 表示数据可信层级。
- `matchConfidence` 表示当前匹配置信度，不等于法规可信度。
- `sourceScope` 标明来源用途，例如 `gb_2760_regulation`、`jecfa_safety_evaluation`、`common_ingredient_lexicon`。
- `regulatoryBasis` 和 `rawSourceText` 必须保留来源原文或可追溯摘要；无法结构化时不得编造结论。

## 后续数据任务

1. 官方 GB 2760 数据导入：先保证官方 PDF 全文逐页进入 `gb2760_official_pages`，再把可可靠拆分的表 A.1 行导入 `gb2760_official_records` staging 表；不能可靠结构化时保留全文页和 `needs_review`，不得编造食品类别或限量。
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
