# Data Sources

## 数据原则

当前目标不是一次性补齐所有食品配料，而是建立可用的基础权威数据底座，并通过持续扩充和人工校验逐步提高覆盖。

硬性规则：

- 不允许 AI 编造食品成分数据、法规来源、ADI、限量、条款编号或安全结论。
- 不允许把 JECFA 安全评价当成 GB 2760 中国法规使用范围。
- 不强行补齐所有食品配料；无法可靠结构化的内容先保留 `rawSourceText` 和待确认状态。
- `isVerified: true` 只能用于已完成法规依据、来源文本、版本和人工审核的记录；当前食品数据没有 `isVerified: true` 记录。

## 分层数据状态

食品数据使用以下状态分层：

| dataStatus | 含义 | 当前数量 | 当前说明 |
|---|---:|---:|---|
| `verified_regulation` | 已匹配 GB 2760 官方法规依据 | 0 | 尚未导入可条款级确认的 GB 2760 结构化数据 |
| `verified_jecfa` | 已匹配 JECFA 安全评价依据 | 32 | 仅代表 JECFA 条目和 ADI 摘要已匹配，不代表中国法规使用限制 |
| `mapped_candidate` | 疑似匹配，待确认 | 0 | 当前用于运行时低置信匹配，不写入权威结论 |
| `common_ingredient` | 常见普通食品配料 | 12 | 来自项目样例标签词库，不是法规或安全评价来源 |
| `unverified` | 未验证 | 68 | 原 100 条 seed 中尚未完成 JECFA/GB 2760 精确审核的添加剂 |
| `unknown_from_ocr` | OCR 识别到但未收录 | 0 | 运行时报表状态；不作为静态权威数据写入 |

当前食品基础库合计 112 条：100 条食品添加剂 seed + 12 条常见普通食品配料词库。

## GB 2760 当前状态

当前没有任何记录被标记为 `verified_regulation`。

现有 68 条未验证添加剂保留了 GB 2760 公开入口作为后续核验线索，但这些字段仍属于 seed reference，不代表已经完成：

- 标准版本确认
- 条款编号确认
- 适用食品类别确认
- 最大使用量或残留量确认
- 原始法规文本结构化
- 人工审核签核

因此当前不导入 `usageLimits`，也不把 `gbStatus`、`foodCategories` 或 seed 来源展示为已核验法规结论。

## JECFA 当前状态

当前 32 条添加剂为 `verified_jecfa`：

`citric-acid`、`sodium-citrate`、`potassium-sorbate`、`sodium-benzoate`、`ascorbic-acid`、`xanthan-gum`、`aspartame`、`sucralose`、`sodium-bicarbonate`、`sodium-cyclamate`、`pectin`、`calcium-carbonate`、`tartrazine`、`sunset-yellow-fcf`、`allura-red-ac`、`glycerol`、`calcium-chloride`、`sodium-alginate`、`acesulfame-potassium`、`carrageenan`、`guar-gum`、`polysorbate-80`、`sodium-nitrite`、`potassium-nitrate`、`potassium-citrate`、`calcium-citrate`、`lactic-acid`、`sodium-acetate`、`calcium-propionate`、`natamycin`、`propylene-glycol-alginate`、`sodium-carboxymethyl-cellulose`。

来源版本：`JECFA database updates through 101st JECFA meeting (October 2025)`

JECFA 数据库入口：https://apps.who.int/food-additives-contaminants-jecfa-database/

JECFA 字段使用边界：

- 可以作为安全评价来源：`sourceScope: 'jecfa_safety_evaluation'`、ADI 摘要、JECFA 条目 URL、`rawSourceText`。
- 不能作为中国法规使用范围：不写入 GB 2760 使用类别、最大使用量或中国允许/限制结论。
- `isVerified` 仍为 `false`，因为 GB 2760 条款级法规核验未完成。

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

字段解释：

- `dataStatus` 表示数据可信层级。
- `matchConfidence` 表示当前匹配置信度，不等于法规可信度。
- `sourceScope` 标明来源用途，例如 `gb_2760_regulation`、`jecfa_safety_evaluation`、`common_ingredient_lexicon`。
- `regulatoryBasis` 和 `rawSourceText` 必须保留来源原文或可追溯摘要；无法结构化时不得编造结论。

## 后续数据任务

1. 官方 GB 2760 数据导入：优先导入基础字段和原文片段，不能可靠结构化时保留 `rawSourceText`。
2. JECFA 映射扩充：只扩充安全评价来源，不写中国法规使用限制。
3. 常见配料词库：继续从真实标签样本和可信词表扩展，并保持 `common_ingredient` 状态。
4. OCR 未匹配收集：保存未收录条目、来源上下文和置信度，进入人工校验队列。
5. 人工校验队列：审核后才能升级 `dataStatus` 或 `isVerified`。
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
