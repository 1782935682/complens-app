# Data Sources

## 数据原则

当前目标是在可追溯和分层可信前提下，尽最大可能补齐食品成分知识库实际数据。中国官方标准、公告、目录和数据库仍是最高优先级；当中国官方数据不存在或客观不完整时，允许使用国际官方、企业一手资料、权威非官方数据和经过校验的社区/众包数据补充普通原料、标签写法、别名、营养基础信息等非监管事实。任何非官方数据都不得伪装为中国官方监管结论，也不得声称已经达到绝对全量覆盖。

硬性规则：

- 不允许 AI 编造食品成分数据、法规来源、ADI、限量、条款编号或安全结论。
- 不允许把 JECFA 安全评价当成 GB 2760 中国法规使用范围（不允许把 JECFA 数据反推 GB 2760 使用范围）。
- GB 2760-2024 是食品添加剂使用规则的中国官方标准来源；中国监管状态、允许使用范围、最大使用量、食品分类、标签要求、公告新增/修改/废止关系等监管结论，只能使用国家机关、国家标准相关官方平台、国家食品安全风险评估中心等中国官方来源确认。
- 非官方来源可以按来源等级补充普通食品原料、商品标签写法、别名、营养基础信息、品牌规格等非监管事实，但必须保存来源、许可、版本、证据和置信度；第三方网站只能作为 `verified_secondary`、`community_verified`、`community_unverified` 等非官方等级，不能作为 `sourceType: 'official_standard'`、官方 `sourceName` 或中国监管依据。
- 不用无来源、低质量或无法确认许可的数据强行补齐正式库；无法可靠结构化或无法达到正式数据门槛的内容先保留 `rawSourceText`、来源证据和待确认状态。
- `isVerified: true` / `verified_regulation` 只能用于已完成 GB 2760 官方法规依据、来源文本、版本和条款级核验的记录；JECFA 仅能作为安全评价来源。
- **staging 与 verified 有本质区别**：staging（`gb2760_official_records` 等）是官方 PDF 抽取的原始承接层，只代表原文/页码/限量已进入数据库，**不是已核验法规结论**；正式库（`ingredients` 的 `verified_regulation` 行、`additive_usage_rules`）只接收满足"正式库准入规则"的高置信、可追溯数据。
- **`pending_review` 不能当作权威结论**：从官方来源抽取但字段或结构待复核的数据，后端 DB 状态为 `pending_review`（生成源文件仍可能保留 `needs_review`，入库时统一），不得展示为已验证、不得作为官方规则。
- 数据补齐优先级高于单纯表结构完整度：每轮数据任务都应尽量完成下载、解析、导入、校验和覆盖报告；但不得声称绝对全量覆盖，正式库仍按 staging 全量承接 → 高置信 promote → 低置信 `pending_review` → 后续人工复核逐步提高覆盖。

## 归一数据来源类型

为避免 API、前端展示和后台审核使用不同词，来源类型统一按 [`docs/product-blueprint/DATA_TRUST_SPEC.md`](./docs/product-blueprint/DATA_TRUST_SPEC.md) 归一：

| 归一来源类型 | 当前代码/数据映射 | 展示边界 |
|---|---|---|
| `official_standard` | `official_standard` / `gb_2760_regulation` | GB 2760 等官方标准，可在正式库准入后作为法规结论 |
| `safety_evaluation` | `jecfa_safety_evaluation` | 仅安全评价，不代表中国法规使用范围和限量 |
| `manual_review` | 审核签核字段 / reviewer allowlist | 人工复核审计，不单独替代来源证据 |
| `common_ingredient` | `common_ingredient_lexicon` / `common_ingredient` | 普通配料可读性，非法规结论 |
| `ocr_input` | OCR 识别文本 / 用户确认文本 | 用户输入来源，必须确认，不是权威来源 |
| `product_catalog` | GTIN 商品条码 / 包装印刷商品码 / 历史缓存补全结果 | 商品/配料线索来源，需进入成分归一化和官方知识库匹配，不能直接作为官方法规结论 |
| `digital_label` | 数字标签二维码页面解析结果 / 二维码 URL 线索 | 商品标签页面来源，需保留页面 URL/抓取时间/解析置信度，不能替代官方成分知识库 |
| `ai_generated` | AI 解释结果 / DeepSeek 公开信息补全 | 只做解释层或商品线索补全，不作为包装 OCR、成分事实或法规事实来源 |
| `user_feedback` | 用户反馈 / 纠错线索 | 非权威结论，需进入人工校验 |

状态别名说明：产品/跨端规范可使用 `verified_safety` 表达“安全评价已验证”的语义；当前代码和数据库字段仍统一使用 `verified_jecfa`。新增 API 如返回别名，必须同时保留或映射到当前代码状态，避免各端自造枚举。

## 条码与数字标签数据边界

当前用户端仍保持一个拍照入口，不暴露“扫条码 / 扫二维码 / 手动输入编码”等独立入口。图片识别流程按以下顺序处理：

- 商品条码 / 商品编码：识别 GTIN 后先查本机历史；历史没有完整标签时，后端可选调用 DeepSeek 补全公开商品线索。
- 数字标签二维码：保留二维码原始内容；URL 可作为公开页面线索，但页面不可访问或格式不支持时只保留空态。
- 配料表 OCR：识别包装上的配料表文字，并经用户确认。
- 营养成分表 OCR：识别营养数字，并和配料表一起进入统一报告。

这些来源只负责获取商品/标签文本和结构化线索，统一进入：

```text
成分归一化 → 官方成分知识库匹配 → 成分分析
```

条码商品库、数字标签页面、历史缓存和 DeepSeek 联网搜索都不是官方成分知识库，也不能直接生成 `verified_regulation`、GB 2760 使用范围、限量、ADI 或安全结论。DeepSeek 搜索结果必须标明为“AI 联网搜索推测”，不得伪装成包装实拍 OCR。若无法获得完整配料或营养成分表，只提示用户重新拍摄包装其他区域或手动补充，不自动跳转其他分支，不伪造缺失字段。

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
- 本地保存：官方 PDF 已保存到 `docs/source-materials/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`，文件大小 `2600140` bytes，SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`。
- 平台提示：2026-06-12 抓取页面时，平台页面提示“系统维护中，暂时无法使用标准预览和下载功能。”下载接口可返回官方 PDF；不得改用第三方镜像作为官方来源。

其余 68 条未验证添加剂已将 GB 2760-2024 官方标准文本记录作为后续核验来源，但这些字段仍属于 seed reference，不代表已经完成：

- 条款编号确认
- 适用食品类别确认
- 最大使用量或残留量确认
- 原始法规文本结构化
- 人工审核签核

因此除上述 5 条外，当前不导入 `usageLimits`，也不把 `gbStatus`、`foodCategories` 或 seed 来源展示为已核验法规结论。

## 食品成分知识库扩展层（2026-06-18）

本轮已把 `docs/source-materials/` 作为唯一官方材料输入目录，建立 `data/official_sources/` manifest、extracted、staging、failed、reports 和 checksums 目录，并把本地开发 PostgreSQL 写入为 DB 口径报告。该层不替换现有 `ingredients` 表，不改变现有 `/api/ingredients` 返回结构，也不破坏 OCR 添加剂匹配。

新增或扩展的数据表包括：`official_sources`、`ingredient_master`、`ingredient_aliases`、`ingredient_type_tags`、`ingredient_source_relations`、`ingredient_regulatory_rules`、`ingredient_relations`、`ingredient_import_staging`、`nutrition_fortifier_rules`、`allergen_categories`、`ingredient_allergen_relations`、`nutrients`、`nutrition_aliases`、`nutrition_reference_values`、`nutrition_claim_rules`、`microorganism_strains`、`novel_food_ingredient_rules` 和 `food_medicine_rules`。

本轮实际扫描的本地官方材料：

- `GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`
- `GB-14880-2012营养强化剂.pdf`
- `1401948086918.pdf`（GB 7718-2011，CFSA/SPPT 官方附件）
- `GB_28050-2011_预包装食品营养标签通则.pdf`（GB 28050-2011，CFSA/SPPT 官方附件）
- `1742974306979.pdf`（GB 7718-2025，CFSA/SPPT 官方附件）
- `1742974382329.pdf`（GB 28050-2025，CFSA/SPPT 官方附件）
- `cfsa-gb7718-2025-qa.html`
- `cfsa-gb28050-2025-qa.html`
- `cfsa-2025-no2-food-safety-standards-notice.html`
- `2023年“三新食品”汇总目录.pdf`
- `党参等 9 种食药物质目录.pdf`
- `地黄等 4 种食药物质目录.pdf`
- `可用于食品的菌种名单.pdf`
- `可用于婴幼儿食品的菌种名单.pdf`

当前 DB 口径（覆盖率报告由 `npm run ingredient:coverage` 本地生成，已 gitignore 不入库）：

| 指标 | 数量 |
|---|---:|
| `ingredient_master` | 3041 |
| `food_additive` | 2311 |
| `nutrition_fortifier` | 21 |
| `novel_food_ingredient` | 95 |
| `food_medicine_substance` | 13 |
| `food_microorganism` | 40 |
| `other`（GB 2760 C.3 酶制剂来源/供体引用） | 81 |
| `ordinary_ingredient` | 480 |
| S2 普通配料种子 | 479 |
| `ingredient_aliases` | 8735 |
| `ingredient_source_relations` | 5631 |
| `ingredient_type_tags` | 3033 |
| `ingredient_regulatory_rules` | 2587 |
| `additive_usage_rules` | 2391 |
| `nutrition_fortifier_rules` | 116 |
| `nutrition_reference_values` | 32 |
| `nutrition_claim_rules` | 15 |
| `official_sources` | 15 |
| `ingredient_import_staging` | 462 |
| `verified_regulation` | 2452 |
| `pending_review ingredient` | 563 |
| `pending_review staging` | 198 |
| 正式提升数量（current source relations） | 4426 |
| 需阻断自动匹配的别名冲突 | 0 |
| 当前正式匹配冲突 | 0 |
| 解析失败 | 0 |
| `import_errors` | 0 |

source-materials staging 口径：

| record_type | 数量 |
|---|---:|
| `novel_food_ingredient` | 95 |
| `food_additive_new_variety` | 14 |
| `nutrition_fortifier_rule` | 116 |
| `food_medicine_substance` | 13 |
| `food_microorganism` | 40 |
| `label_rule_*` | 16 |
| `nutrition_label_rule_*` | 7 |
| `nutrition_reference_value` | 32 |
| `nutrition_comparative_claim_rule` | 8 |
| `nutrition_content_claim_rule` | 7 |
| `allergen_*` | 90 |
| `digital_label_rule` | 12 |
| `official_qa_*` | 11 |
| `official_notice_standard_release` | 1 |

状态边界：

- GB 2760 已有人工签核并 promote 的正式规则保持 `current`；pending-review 报告通过后，已通过本地文件内容和 SHA-256 校验、证据字段完整的 S0 官方来源成分提升为正式层。当前 DB 中 `verified_regulation=2452`、`current source relations=4426`；NHC 通用食品菌种目录中 26 条非 OCR 记录保持 verified，14 条婴幼儿菌种 OCR 辅助记录继续 pending_review。GB 2760 表 C.3 酶制剂来源/供体微生物归入 `other`，只保留 `enzyme_source` / `enzyme_donor` 关系证据，不计入 NHC 可用于食品菌种覆盖。
- 三新食品、食药物质和通用食品菌种目录已补齐 NHC 官方公告页/附件 URL 并完成非 OCR 目录项受控提升；GB 7718/GB 28050 标签营养规则、解读材料、公告抽取结果、营养声称阈值、数字标签规则和过敏原规则继续保持 `pending_review`，不得展示为已验证监管结论。
- GB 28050-2025 的 NRV 和可结构化比较声称已进入 `nutrition_reference_values` / `nutrition_claim_rules`，但状态仍为 `pending_review`。
- `可用于婴幼儿食品的菌种名单.pdf` 本地文件无文本层；本轮已保存 RapidOCR 原始 JSON 作为 OCR 辅助证据，并抽取 14 条婴幼儿食品菌种候选进入 staging/pending_review。该批记录仍需人工核对扫描件，不得展示为 S0 verified 结论。
- 本轮未导入 S1/S3/S4 来源；额外导入的 S2 普通配料种子为人工整理 OCR 高频基础词库，其中 468 条普通配料成分仍保持 `pending_review`，不得展示为 S0 或 verified。
- 480 条普通食品配料包含 S2 种子和旧内部词库归并结果，不是官方普通食品原料全量目录。
- GB 28050-2011 官方 PDF 已从 CFSA/SPPT 官方附件下载并进入 manifest/official_sources；此前超时生成的不完整片段已保留在 `docs/source-materials/_invalid/1401947724374.pdf.partial`，未进入有效扫描。
- `source-materials` 管线将单个来源失败分层记录到 `data/official_sources/failed/extract-failures.json`：`failed_extract` 表示文本抽取、`pdftotext` 依赖或 PDF 文本层问题，`failed_parse` 表示文本已抽取但结构化解析失败；失败来源不会进入 verified 层，其他来源继续处理。
- 独立的“国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告”官方页面已定位，但本地 curl 保存返回 WAF/412；本轮仅使用 GB 7718-2025 正文和 CFSA/SPPT 解读中的数字标签规则，公告专属规则继续 manual_required。
- 仍需用户/人工处理的数据来源决策（本地生成报告 `docs/decision-required.md`，已 gitignore）：数字标签独立公告官方原文缺失、GB 28050-2025 糖醇能量规则原文未定位。未确认前不导入为 S0，不标 verified，也不用于用户结果页官方结论。
- 缺失和人工补齐步骤见本地生成报告 `docs/source-materials-missing-official.md`（已 gitignore，运行源材料管线脚本重新生成）。

统一更新命令：

```bash
npm run ingredient:inventory
npm run ingredient:fetch
npm run ingredient:extract
npm --prefix backend run db:migrate
npm run ingredient:import
npm run ingredient:ordinary-seed
npm run ingredient:promote-reviewed
npm run ingredient:validate
npm run ingredient:report
npm run ingredient:coverage
npm run ingredient:update-all
```

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

完整数据库表设计、字段含义、初始化 SQL 清单和 seed/promote 写入关系见 [`docs/database.md`](./docs/database.md)。本节只保留数据可信度和 GB2760 数据治理的核心字段口径。

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
