# 未验证旧数据

生成时间：2026-06-18T13:36:45.194Z

说明：以下来自旧 `ingredients` 兼容表或旧 seed。它们未被本轮伪装为中国官方监管数据；既有 risk_level 保留兼容，不根据官方目录自动生成新风险等级。

| id | 名称 | data_status | source_scope | risk_level |
|---|---|---|---|---|
| common-apple-juice-concentrate | 浓缩苹果汁 | common_ingredient | common_ingredient_lexicon | low |
| common-chili-pepper | 辣椒 | common_ingredient | common_ingredient_lexicon | low |
| common-edible-salt | 食盐 | common_ingredient | common_ingredient_lexicon | low |
| common-fructose-syrup | 果糖糖浆 | common_ingredient | common_ingredient_lexicon | low |
| common-garlic | 大蒜 | common_ingredient | common_ingredient_lexicon | low |
| common-konjac-flour | 魔芋粉 | common_ingredient | common_ingredient_lexicon | low |
| common-refined-vegetable-oil | 精炼植物油 | common_ingredient | common_ingredient_lexicon | low |
| common-shortening | 起酥油 | common_ingredient | common_ingredient_lexicon | low |
| common-water | 水 | common_ingredient | common_ingredient_lexicon | low |
| common-wheat-flour | 小麦粉 | common_ingredient | common_ingredient_lexicon | low |
| common-white-sugar | 白砂糖 | common_ingredient | common_ingredient_lexicon | low |
| common-whole-milk-powder | 全脂奶粉 | common_ingredient | common_ingredient_lexicon | low |
| citral | 柠檬醛 | unverified | seed_reference | low |
| ethyl-maltol | 乙基麦芽酚 | unverified | seed_reference | low |
| ethyl-vanillin | 乙基香兰素 | unverified | seed_reference | low |
| isomalt | 异麦芽酮糖醇 | unverified | seed_reference | medium |
| konjac-gum | 魔芋胶 | unverified | seed_reference | low |
| menthol | 薄荷脑 | unverified | seed_reference | low |
| potassium-benzoate | 苯甲酸钾 | unverified | seed_reference | medium |
| vanillin | 香兰素 | unverified | seed_reference | low |
| calcium-citrate | 柠檬酸钙 | verified_jecfa | jecfa_safety_evaluation | low |

## 建议处理

- 有明确官方依据的旧数据，后续通过 source relation 逐条挂接来源。
- JECFA/国际安全评价只作为安全评价来源，不得覆盖中国 GB 2760 使用范围。
- 普通配料词库继续标记为 internal_lexicon 或 unverified，等待官方标准、企业一手标签或可复核来源。
