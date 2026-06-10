/** @type {import('../types/ingredient.js').Ingredient[]} */
export const ingredients = [
  {
    id: 'niacinamide',
    nameCn: '烟酰胺',
    nameEn: 'Niacinamide',
    aliases: ['维生素B3', '烟碱酰胺', 'Nicotinamide'],
    category: '功效成分',
    functions: ['保湿', '提亮', '屏障支持'],
    description: '常见于护肤品中的维生素 B3 衍生成分，常用于帮助改善肤色暗沉和支持皮肤屏障。',
    riskLevel: 'low',
    riskSummary: '多数人耐受性较好，但高浓度产品可能让部分敏感人群感到刺痒或泛红。',
    suitableFor: ['暗沉肌肤', '油性肌肤', '屏障护理需求人群'],
    cautionFor: ['极敏感肌初次使用建议先小范围尝试'],
    sourceNote: '基于公开化妆品成分资料整理，仅作日常选购参考。'
  },
  {
    id: 'hyaluronic-acid',
    nameCn: '透明质酸钠',
    nameEn: 'Sodium Hyaluronate',
    aliases: ['玻尿酸钠', 'Hyaluronic Acid Sodium Salt'],
    category: '保湿剂',
    functions: ['保湿', '肤感调节'],
    description: '常见保湿成分，可帮助配方保持水润肤感，广泛用于精华、面霜和面膜。',
    riskLevel: 'low',
    riskSummary: '一般认为刺激性较低，实际肤感与配方浓度和搭配成分有关。',
    suitableFor: ['干性肌肤', '混合性肌肤', '多数日常保湿场景'],
    cautionFor: ['对黏腻肤感敏感的人群可关注产品质地'],
    sourceNote: '基于公开化妆品成分资料整理，仅作日常选购参考。'
  },
  {
    id: 'salicylic-acid',
    nameCn: '水杨酸',
    nameEn: 'Salicylic Acid',
    aliases: ['BHA', '邻羟基苯甲酸'],
    category: '角质调理',
    functions: ['角质调理', '油脂护理'],
    description: '脂溶性角质调理成分，常用于油性肌肤和毛孔护理类产品。',
    riskLevel: 'medium',
    riskSummary: '可能带来干燥、刺痛或脱屑感，敏感肌、孕期或儿童场景应谨慎评估。',
    suitableFor: ['油性肌肤', '闭口粉刺困扰人群'],
    cautionFor: ['敏感肌', '孕期人群', '儿童', '屏障受损时'],
    sourceNote: '不同地区对浓度和用途有不同限制，购买时建议查看产品标识。'
  },
  {
    id: 'retinol',
    nameCn: '视黄醇',
    nameEn: 'Retinol',
    aliases: ['维A醇', 'Vitamin A Alcohol'],
    category: '功效成分',
    functions: ['细纹护理', '肤质调理'],
    description: '维生素 A 类成分，常见于抗老和肤质调理产品中，对使用频率和搭配较敏感。',
    riskLevel: 'medium',
    riskSummary: '部分人可能出现干燥、脱皮或刺激感，孕期及备孕场景建议先咨询专业人士。',
    suitableFor: ['有抗老护理需求且耐受较好的人群'],
    cautionFor: ['敏感肌', '孕期人群', '备孕人群', '屏障受损时'],
    sourceNote: '仅作护肤品成分理解参考，不替代专业医学建议。'
  },
  {
    id: 'fragrance',
    nameCn: '香精',
    nameEn: 'Fragrance',
    aliases: ['香料', 'Parfum', '香水香精'],
    category: '香味成分',
    functions: ['赋香'],
    description: '用于改善产品气味体验的复合成分，具体组成通常不会在成分表中完全展开。',
    riskLevel: 'medium',
    riskSummary: '对香味或过敏原敏感的人群可能需要关注，敏感肌可优先选择无香型产品。',
    suitableFor: ['偏好香味体验且耐受良好的人群'],
    cautionFor: ['敏感肌', '香精过敏史人群', '婴幼儿护理场景'],
    sourceNote: '香精风险与具体组成和个人耐受有关，不能仅凭名称作绝对判断。'
  },
  {
    id: 'methylparaben',
    nameCn: '羟苯甲酯',
    nameEn: 'Methylparaben',
    aliases: ['尼泊金甲酯', 'Methyl 4-hydroxybenzoate'],
    category: '防腐剂',
    functions: ['防腐'],
    description: '常见防腐剂，用于帮助产品在开封和使用过程中保持稳定。',
    riskLevel: 'low',
    riskSummary: '在法规允许范围内使用时通常用于防腐目的，少数人可能存在不耐受。',
    suitableFor: ['多数常规护肤场景'],
    cautionFor: ['对防腐剂敏感或有相关过敏史的人群'],
    sourceNote: '应结合产品整体配方和个人耐受情况判断。'
  },
  {
    id: 'phenoxyethanol',
    nameCn: '苯氧乙醇',
    nameEn: 'Phenoxyethanol',
    aliases: ['2-苯氧乙醇'],
    category: '防腐剂',
    functions: ['防腐'],
    description: '广泛使用的防腐成分，常与其他防腐体系搭配以维持产品稳定性。',
    riskLevel: 'low',
    riskSummary: '多数常规产品中使用风险较低，极敏感人群可关注皮肤反应。',
    suitableFor: ['多数常规护肤场景'],
    cautionFor: ['极敏感肌', '婴幼儿护理场景需关注产品适用说明'],
    sourceNote: '不同产品适用人群和浓度不同，以产品说明为准。'
  },
  {
    id: 'alcohol-denat',
    nameCn: '变性乙醇',
    nameEn: 'Alcohol Denat.',
    aliases: ['酒精', '乙醇', 'Denatured Alcohol'],
    category: '溶剂',
    functions: ['溶剂', '清爽肤感'],
    description: '常用于带来清爽挥发感或帮助部分成分溶解，常见于防晒、爽肤水和控油产品。',
    riskLevel: 'medium',
    riskSummary: '可能让干性或屏障较弱人群感到紧绷、干燥或刺痛。',
    suitableFor: ['偏油肌肤且耐受良好的人群'],
    cautionFor: ['干性肌肤', '敏感肌', '屏障受损时'],
    sourceNote: '是否适合需结合配方位置、产品类型和个人耐受。'
  }
];

export const popularIngredientIds = [
  'niacinamide',
  'hyaluronic-acid',
  'salicylic-acid',
  'retinol',
  'fragrance'
];
