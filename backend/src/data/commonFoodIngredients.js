const dataVersion = 'food-authority-foundation-v1';
const retrievedAt = '2026-06-12';
const commonSourceName = 'CompCheck sample-label common ingredient lexicon';
const commonSourceVersion = 'common-ingredient-lexicon-v1';
const commonSourceUrl = 'src/utils/text.js#SAMPLES';
const commonRegulatoryBasis = '普通食品配料词库仅用于标签文本识别和匹配覆盖统计；不提供 GB 2760 使用范围、使用限量或 JECFA 安全评价结论。';
const commonRawSourceText = 'Terms are limited to ordinary ingredient words already present in the project sample label set; no regulatory conclusion is inferred.';

const commonSourceReference = {
  title: 'CompCheck sample label text',
  standard: 'Internal common ingredient lexicon',
  region: 'Internal',
  url: commonSourceUrl,
  retrievedAt
};

function commonIngredient({
  id,
  nameCn,
  nameEn,
  aliases = [],
  description,
  allergenTypes = []
}) {
  return {
    id,
    kind: 'common-food-ingredient',
    dataCategory: 'food',
    nameCn,
    nameEn,
    aliases,
    category: '普通食品配料',
    functions: ['普通食品原料'],
    description,
    riskLevel: 'low',
    riskSummary: '普通食品配料识别项；不代表添加剂、法规限量或安全评价结论。',
    suitableFor: ['食品标签普通配料识别'],
    cautionFor: ['仍需结合包装原文、过敏原提示和产品类别人工确认'],
    sourceNote: '内部普通配料词库，用于减少 OCR/文本分析中普通食品原料被误报为未收录；不作为法规来源。',
    sourceReferences: [commonSourceReference],
    reviewStatus: 'draft',
    dataStatus: 'common_ingredient',
    dataVersion,
    updatedAt: retrievedAt,
    sourceName: commonSourceName,
    sourceType: 'unknown',
    sourceScope: 'common_ingredient_lexicon',
    sourceVersion: commonSourceVersion,
    sourceUrl: commonSourceUrl,
    effectiveDate: 'not applicable',
    confidenceLevel: 'low',
    matchConfidence: 'high',
    lastReviewedAt: retrievedAt,
    reviewNote: '普通配料词库项，只用于匹配和展示；不得展示为 GB 2760 或 JECFA 结论。',
    regulatoryBasis: commonRegulatoryBasis,
    rawSourceText: commonRawSourceText,
    isVerified: false,
    gbCode: 'N/A',
    gbStatus: 'unknown',
    eNumber: '',
    adi: 'not applicable',
    usageLimits: [],
    foodCategories: ['普通食品配料'],
    allergenTypes,
    cautionGroups: []
  };
}

/** @type {import('../types/ingredient.js').FoodAdditive[]} */
export const commonFoodIngredients = [
  commonIngredient({
    id: 'common-water',
    nameCn: '水',
    nameEn: 'Water',
    aliases: ['饮用水'],
    description: '食品标签中的普通配料水。'
  }),
  commonIngredient({
    id: 'common-white-sugar',
    nameCn: '白砂糖',
    nameEn: 'White sugar',
    aliases: ['蔗糖', '砂糖'],
    description: '食品标签中的普通甜味原料，不等同于食品添加剂甜味剂。'
  }),
  commonIngredient({
    id: 'common-wheat-flour',
    nameCn: '小麦粉',
    nameEn: 'Wheat flour',
    aliases: ['面粉'],
    description: '食品标签中的普通谷物原料。',
    allergenTypes: ['cereals-gluten']
  }),
  commonIngredient({
    id: 'common-refined-vegetable-oil',
    nameCn: '精炼植物油',
    nameEn: 'Refined vegetable oil',
    aliases: ['植物油'],
    description: '食品标签中的普通油脂原料。'
  }),
  commonIngredient({
    id: 'common-shortening',
    nameCn: '起酥油',
    nameEn: 'Shortening',
    aliases: [],
    description: '食品标签中的普通油脂加工原料。'
  }),
  commonIngredient({
    id: 'common-whole-milk-powder',
    nameCn: '全脂奶粉',
    nameEn: 'Whole milk powder',
    aliases: ['奶粉'],
    description: '食品标签中的乳制品普通配料。',
    allergenTypes: ['milk']
  }),
  commonIngredient({
    id: 'common-edible-salt',
    nameCn: '食盐',
    nameEn: 'Edible salt',
    aliases: ['盐'],
    description: '食品标签中的普通调味原料。'
  }),
  commonIngredient({
    id: 'common-chili-pepper',
    nameCn: '辣椒',
    nameEn: 'Chili pepper',
    aliases: ['辣椒粉'],
    description: '食品标签中的普通香辛料或蔬菜原料。'
  }),
  commonIngredient({
    id: 'common-garlic',
    nameCn: '大蒜',
    nameEn: 'Garlic',
    aliases: ['蒜'],
    description: '食品标签中的普通香辛料或蔬菜原料。'
  }),
  commonIngredient({
    id: 'common-fructose-syrup',
    nameCn: '果糖糖浆',
    nameEn: 'Fructose syrup',
    aliases: ['果葡糖浆'],
    description: '食品标签中的普通糖浆原料。'
  }),
  commonIngredient({
    id: 'common-apple-juice-concentrate',
    nameCn: '浓缩苹果汁',
    nameEn: 'Apple juice concentrate',
    aliases: [],
    description: '食品标签中的普通果汁原料。'
  }),
  commonIngredient({
    id: 'common-konjac-flour',
    nameCn: '魔芋粉',
    nameEn: 'Konjac flour',
    aliases: [],
    description: '食品标签中的普通植物原料。'
  })
];
