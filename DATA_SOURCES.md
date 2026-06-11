# Data Sources

## 当前数据来源

当前项目主线数据来自 `src/data/foodAdditives.js`，内容为食品添加剂 seed 样本。

当前 seed 记录统一保留以下公开来源入口作为后续人工核验线索：

| 来源名称 | 类型 | 当前用途 | 当前状态 |
|---|---|---|---|
| GB 2760 相关公开入口 | `official_standard` | 中国食品添加剂使用标准核验入口 | 待人工逐条确认标准版本、条款、适用食品类别和限量 |
| Codex INS / CXG 36 | `official_standard` | INS 编码和国际编号对照入口 | 待人工逐条确认版本和编码 |
| JECFA | `public_database` | ADI 和安全评估信息核验入口 | 待人工逐条确认原文和适用条件 |
| EU Food Additives Database | `public_database` | E-number 和欧盟法规状态核验入口 | 待人工逐条确认条款和状态 |

本轮没有联网扩充官方数据，也没有用 AI 生成新的权威成分结论。

## 当前数据量

- 食品添加剂：100 条 seed 样本。
- 化妆品成分：仍是原型数据，不纳入本阶段可信食品添加剂数据底座。
- 当前数据不能视为完整成分库，也不能视为完整食品添加剂库。

## 当前数据可信等级

当前 100 条食品添加剂 seed 统一设置为：

```js
confidenceLevel: 'unverified'
isVerified: false
```

原因：

- 未逐条核验官方标准版本。
- 未逐条记录法规条款编号。
- 未逐条摘录原始来源文本。
- 未逐条确认生效日期。
- 未逐条确认 ADI 原文、适用条件和逐食品类别限量。

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
