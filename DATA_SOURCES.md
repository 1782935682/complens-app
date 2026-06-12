# Data Sources

## 当前数据来源

当前项目主线数据来自 `src/data/foodAdditives.js`，内容为食品添加剂 seed 样本和 JECFA 官方来源复核结果。

当前 seed 记录统一保留以下公开来源入口作为后续人工核验线索：

| 来源名称 | 类型 | 当前用途 | 当前状态 |
|---|---|---|---|
| GB 2760 相关公开入口 | `official_standard` | 中国食品添加剂使用标准核验入口 | 待人工逐条确认标准版本、条款、适用食品类别和限量 |
| Codex INS / CXG 36 | `official_standard` | INS 编码和国际编号对照入口 | 待人工逐条确认版本和编码 |
| WHO JECFA Food Additives and Contaminants Database | `public_database` | ADI 和安全评估信息核验入口 | 32 条添加剂已按精确或直接映射条目完成 reviewed 级别初核；其余待人工逐条确认原文和适用条件 |
| EU Food Additives Database | `public_database` | E-number 和欧盟法规状态核验入口 | 待人工逐条确认条款和状态 |

2026-06-12 官方来源导入只使用 WHO JECFA 官方数据库查询结果，没有用 AI 生成新的权威成分结论。

JECFA 数据库入口：https://apps.who.int/food-additives-contaminants-jecfa-database/

## 当前数据量

- 食品添加剂：100 条 seed 样本，其中 32 条已有 JECFA reviewed 级别初核。
- 化妆品成分：仍是原型数据，不纳入本阶段可信食品添加剂数据底座。
- 当前数据不能视为完整成分库，也不能视为完整食品添加剂库。

## 当前数据可信等级

当前 100 条食品添加剂状态为：

```js
reviewStatus: 'reviewed'       // 32 条
confidenceLevel: 'medium'      // 32 条
confidenceLevel: 'unverified'  // 68 条
isVerified: false              // 100 条
```

原因：

- 32 条 reviewed 仅确认 JECFA 精确名称或可直接映射条目和 ADI 摘要，尚未导入 GB 2760 逐食品类别限量。
- 未逐条核验 GB 2760 标准版本、条款编号、生效日期和中国适用条件。
- 未逐条确认 EU/Codex 编码冲突、过敏原、特殊人群提醒和风险文案。
- 因此本批次不把任何条目标记为 `isVerified: true` 或 `confidenceLevel: 'high'`。

## 2026-06-12 JECFA 导入批次

数据版本：`food-additives-official-review-v2`

来源版本：`JECFA database updates through 101st JECFA meeting (October 2025)`

### Batch 1

| ID | 中文名 | JECFA 条目 | JECFA ID | ADI 摘要 | 当前状态 |
|---|---|---|---:|---|---|
| `citric-acid` | 柠檬酸 | CITRIC ACID | 3594 | NOT LIMITED | reviewed / medium |
| `sodium-citrate` | 柠檬酸钠 | SODIUM CITRATE | 1649 | NOT LIMITED (Not specified) | reviewed / medium |
| `potassium-sorbate` | 山梨酸钾 | POTASSIUM SORBATE | 2724 | 0-25 mg/kg bw | reviewed / medium |
| `sodium-benzoate` | 苯甲酸钠 | SODIUM BENZOATE | 1098 | 0-20 mg/kg bw | reviewed / medium |
| `ascorbic-acid` | 抗坏血酸 | ASCORBIC ACID | 59 | NOT SPECIFIED | reviewed / medium |
| `xanthan-gum` | 黄原胶 | XANTHAN GUM | 802 | NOT SPECIFIED | reviewed / medium |
| `aspartame` | 阿斯巴甜 | ASPARTAME | 62 | 0-40 mg/kg bw | reviewed / medium |
| `sucralose` | 三氯蔗糖 | SUCRALOSE | 2340 | 0-15 mg/kg bw | reviewed / medium |
| `sodium-bicarbonate` | 碳酸氢钠 | SODIUM BICARBONATE | 1099 | NOT LIMITED | reviewed / medium |
| `sodium-cyclamate` | 环己基氨基磺酸钠 | SODIUM CYCLAMATE | 1653 | 0-11 mg/kg bw | reviewed / medium |

### Batch 2

| ID | 中文名 | JECFA 条目 | JECFA ID | ADI 摘要 | 当前状态 |
|---|---|---|---:|---|---|
| `pectin` | 果胶 | PECTINS | 3043 | NOT SPECIFIED | reviewed / medium |
| `calcium-carbonate` | 碳酸钙 | CALCIUM CARBONATE | 457 | NOT LIMITED | reviewed / medium |
| `tartrazine` | 柠檬黄 | TARTRAZINE | 3885 | 0-10 mg/kg bw | reviewed / medium |
| `sunset-yellow-fcf` | 日落黄 FCF | SUNSET YELLOW FCF | 2703 | 0-4 mg/kg bw | reviewed / medium |
| `allura-red-ac` | 诱惑红 AC | ALLURA RED AC | 2361 | 0-7 mg/kg bw | reviewed / medium |
| `glycerol` | 甘油 | GLYCEROL | 1565 | NOT SPECIFIED (1976) | reviewed / medium |
| `calcium-chloride` | 氯化钙 | CALCIUM CHLORIDE | 458 | NOT LIMITED | reviewed / medium |
| `sodium-alginate` | 海藻酸钠 | SODIUM ALGINATE | 1823 | NOT SPECIFIED | reviewed / medium |
| `acesulfame-potassium` | 安赛蜜 | ACESULFAME POTASSIUM | 926 | 0-15 mg/kg bw | reviewed / medium |
| `carrageenan` | 卡拉胶 | CARRAGEENAN | 377 | NOT SPECIFIED | reviewed / medium |
| `guar-gum` | 瓜尔胶 | GUAR GUM | 863 | NOT SPECIFIED | reviewed / medium |
| `polysorbate-80` | 聚山梨酯 80 | POLYSORBATE 80 | 3735 | 0-25 mg/kg bw | reviewed / medium |
| `sodium-nitrite` | 亚硝酸钠 | SODIUM NITRITE | 4792 | 0-0.07 mg/kg bw | reviewed / medium |
| `potassium-nitrate` | 硝酸钾 | POTASSIUM NITRATE | 390 | 0-3.7 mg/kg bw | reviewed / medium |
| `potassium-citrate` | 柠檬酸钾 | POTASSIUM CITRATE | 1875 | NOT LIMITED | reviewed / medium |
| `calcium-citrate` | 柠檬酸钙 | CALCIUM CITRATE | 2938 | NOT LIMITED (not specified) | reviewed / medium |
| `lactic-acid` | 乳酸 | LACTIC ACID | 3367 | NOT LIMITED (1973) | reviewed / medium |
| `sodium-acetate` | 乙酸钠 | SODIUM ACETATE | 2970 | NOT LIMITED | reviewed / medium |
| `calcium-propionate` | 丙酸钙 | CALCIUM PROPIONATE | 2163 | NOT LIMITED | reviewed / medium |
| `natamycin` | 纳他霉素 | NATAMYCIN | 3255 | 0-0.3 mg/kg bw | reviewed / medium |
| `propylene-glycol-alginate` | 丙二醇海藻酸酯 | PROPYLENE GLYCOL ALGINATE | 585 | 0-70 mg/kg bw | reviewed / medium |
| `sodium-carboxymethyl-cellulose` | 羧甲基纤维素钠 | SODIUM CARBOXYMETHYL CELLULOSE | 3773 | NOT SPECIFIED | reviewed / medium |

本批次仍不导入 `usageLimits`，因为逐食品类别限量必须来自 GB 2760 条款级核验。

## 数据版本与审核记录

2026-06-12 已完成 Data Batch 1-C 的基础设施：

- 后端 `ingredients` 表保留 `data_version`，并新增 `reviewed_by`、`reviewed_at`、`change_note` 用于记录导入批次和审核状态变更说明。
- 后端 `GET /api/ingredients` 和 `GET /api/ingredients/search` 支持 `confidenceLevel=high|medium|low|unverified` 筛选。
- seed 脚本支持 `--version`、`--reviewed-by`、`--change-note` 参数；版本变化时才更新 `change_note` 和 `reviewed_at`。
- 前端 `/data` 页支持按 `sourceName` 和 `confidenceLevel` 查看当前 seed 的来源、版本、分类和待审核比例。

2026-06-12 已完成 Data Batch 1-B 的两批 JECFA 官方来源导入：32 条记录升级为 `reviewStatus: 'reviewed'`、`confidenceLevel: 'medium'`，其余 68 条仍为 `confidenceLevel: 'unverified'`。所有记录仍为 `isVerified: false`。

## 缺失数据范围

- GB 2760 全量食品添加剂条目。
- 每个添加剂允许使用的食品类别。
- 每个食品类别的最大使用量、残留量或使用限制。
- 标准版本号、发布日期、生效日期和废止状态。
- 原始标准条款、法规依据和可追溯来源片段。
- JECFA ADI 原文和适用条件。
- E-number、INS、GB 编码之间的冲突核验。
- 过敏原、特殊人群提醒和风险文案的人工复核。
- 数据变更记录、审核人、审核时间和发布批次。

## 后续应补充的数据来源

优先补充：

1. 国家标准或官方公开发布入口中的 GB 2760 版本文件。
2. 国家食品安全风险评估中心或标准公开系统中可追溯的标准信息。
3. Codex INS / CXG 36 官方文件。
4. JECFA 官方数据库或公开评估摘要。
5. EU Food Additives Database 官方入口。

后续扩展到营养成分或天然食品原料时，再单独确认中国食物成分表、USDA FoodData Central 等来源；本阶段不混入这些数据。

## 必须人工确认的字段

以下字段必须由可信来源或人工审核确认，不能只依赖 AI 生成：

- `sourceName`
- `sourceType`
- `sourceVersion`
- `sourceUrl`
- `effectiveDate`
- `confidenceLevel`
- `lastReviewedAt`
- `regulatoryBasis`
- `rawSourceText`
- `isVerified`
- `gbStatus`
- `adi`
- `usageLimits`
- `foodCategories`
- `allergenTypes`
- `cautionFor`
- `cautionGroups`
- 风险说明、特殊人群提醒和适用边界

## AI 不得编造的数据

AI 不能作为原始数据来源，不能编造或补全以下内容：

- 成分是否安全、是否有害、是否适合某人群的权威结论。
- 法规允许、限制或禁止状态。
- 最大使用量、残留量、ADI、每日摄入建议。
- 标准版本、发布日期、生效日期、废止日期。
- 官方来源链接、条款编号、原始法规文本。
- `isVerified: true` 或高可信等级。
- 医疗、治疗、诊断、预防疾病相关结论。

AI 只能在已有可信数据基础上做解释、摘要、格式转换和风险边界提示。
