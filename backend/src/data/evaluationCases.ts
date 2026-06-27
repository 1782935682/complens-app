export type EvaluationProfileTag = 'default' | 'sugar_control' | 'fat_loss' | 'children' | 'allergy' | 'lactose_intolerance';
export type EvaluationRecommendation = '推荐' | '谨慎' | '不建议' | '信息不足';

export type EvaluationCase = {
  schemaVersion: 'evaluation_case-v1';
  id: string;
  profileTag: EvaluationProfileTag;
  title: string;
  productName: string;
  labelText: string;
  userProfile: {
    goals?: string[];
    allergens?: string[];
    forChild?: boolean;
    lactoseIntolerant?: boolean;
  };
  expected: {
    recommendation: EvaluationRecommendation;
    riskReasonIncludes: string[];
    unsuitableForIncludes: string[];
    alternativeIncludes: string[];
  };
};

export type ComparisonEvaluationCase = {
  schemaVersion: 'comparison_evaluation_case-v1';
  id: string;
  title: string;
  userProfile: EvaluationCase['userProfile'];
  left: Pick<EvaluationCase, 'productName' | 'labelText'>;
  right: Pick<EvaluationCase, 'productName' | 'labelText'>;
  expected: {
    healthier: 'left' | 'right' | 'tie';
    lowerRisk: 'left' | 'right' | 'tie';
    betterForProfile: 'left' | 'right' | 'tie';
    summaryIncludes: string;
  };
};

export const profileDecisionEvaluationCases: EvaluationCase[] = [
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_sugar_control_sweet_drink',
    profileTag: 'sugar_control',
    title: '控糖画像遇到含添加糖饮料',
    productName: '蜂蜜柚子茶饮',
    labelText: [
      '产品名称：蜂蜜柚子茶饮',
      '配料表：水、白砂糖、果葡糖浆、蜂蜜、柚子汁、柠檬酸。',
      '营养成分表 每100mL 能量210kJ 蛋白质0g 脂肪0g 碳水化合物12g 糖11g 钠35mg'
    ].join('\n'),
    userProfile: {
      goals: ['sugar']
    },
    expected: {
      recommendation: '不建议',
      riskReasonIncludes: ['控糖'],
      unsuitableForIncludes: ['控糖人群'],
      alternativeIncludes: ['糖']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_default_high_sugar_drink',
    profileTag: 'default',
    title: '默认画像遇到高糖饮料也要保守提醒',
    productName: '高糖乳酸菌饮料',
    labelText: [
      '产品名称：高糖乳酸菌饮料',
      '配料表：水、白砂糖、脱脂乳粉、乳酸菌、三氯蔗糖、食用香精。',
      '致敏原提示：含有牛奶。',
      '营养成分表 每100mL 能量260kJ 蛋白质1.2g 脂肪1.2g 碳水化合物13.6g 糖12.8g 钠68mg'
    ].join('\n'),
    userProfile: {},
    expected: {
      recommendation: '谨慎',
      riskReasonIncludes: ['高糖'],
      unsuitableForIncludes: ['控糖人群'],
      alternativeIncludes: ['糖']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_sugar_control_high_sugar_soda',
    profileTag: 'sugar_control',
    title: '控糖画像遇到明确高糖饮料不能回到推荐',
    productName: '葡萄风味汽水',
    labelText: [
      '产品名称：葡萄风味汽水',
      '配料表：水、白砂糖、果葡糖浆、浓缩葡萄汁、柠檬酸、食用香精。',
      '营养成分表 每100mL 能量285kJ 蛋白质0g 脂肪0g 碳水化合物18g 糖16g 钠0mg'
    ].join('\n'),
    userProfile: {
      goals: ['sugar']
    },
    expected: {
      recommendation: '谨慎',
      riskReasonIncludes: ['控糖'],
      unsuitableForIncludes: ['控糖人群'],
      alternativeIncludes: ['糖']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_fat_loss_cookie',
    profileTag: 'fat_loss',
    title: '减脂画像遇到高脂饼干',
    productName: '芝士夹心饼干',
    labelText: [
      '产品名称：芝士夹心饼干',
      '配料表：小麦粉、植物油、白砂糖、起酥油、奶粉、芝士粉、食用盐。',
      '营养成分表 每100g 能量2100kJ 蛋白质6g 脂肪24g 碳水化合物64g 钠260mg'
    ].join('\n'),
    userProfile: {
      goals: ['fatLoss']
    },
    expected: {
      recommendation: '谨慎',
      riskReasonIncludes: ['减脂'],
      unsuitableForIncludes: ['减脂期'],
      alternativeIncludes: ['脂肪']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_children_caffeine_jelly',
    profileTag: 'children',
    title: '儿童画像遇到咖啡因零食',
    productName: '茶味果冻饮料',
    labelText: [
      '产品名称：茶味果冻饮料',
      '配料表：水、白砂糖、果冻粉、茶粉、咖啡因、柠檬酸、食用色素。',
      '营养成分表 每100g 能量260kJ 蛋白质0g 脂肪0g 碳水化合物13g 钠45mg'
    ].join('\n'),
    userProfile: {
      goals: ['children'],
      forChild: true
    },
    expected: {
      recommendation: '谨慎',
      riskReasonIncludes: ['儿童'],
      unsuitableForIncludes: ['儿童高频食用'],
      alternativeIncludes: ['儿童']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_allergy_peanut_bar',
    profileTag: 'allergy',
    title: '过敏画像遇到命中过敏原商品',
    productName: '坚果燕麦棒',
    labelText: [
      '产品名称：坚果燕麦棒',
      '配料表：燕麦片、花生、杏仁、蜂蜜、植物油、食用盐。',
      '营养成分表 每100g 能量1580kJ 蛋白质12g 脂肪12g 碳水化合物45g 钠80mg'
    ].join('\n'),
    userProfile: {
      allergens: ['花生']
    },
    expected: {
      recommendation: '不建议',
      riskReasonIncludes: ['过敏'],
      unsuitableForIncludes: ['花生过敏或忌口人群'],
      alternativeIncludes: ['过敏']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_general_allergy_milk_soy_drink',
    profileTag: 'allergy',
    title: '泛过敏画像遇到常见过敏原提示',
    productName: '橙味饮料',
    labelText: [
      '产品名称：橙味饮料',
      '配料表：水、白砂糖、果葡糖浆、浓缩橙汁、柠檬酸、食用香精、山梨酸钾。',
      '致敏原提示：本品可能含有微量牛奶和大豆成分。',
      '营养成分表 每100mL 能量190kJ 蛋白质0g 脂肪0g 碳水化合物11.2g 糖10.8g 钠36mg'
    ].join('\n'),
    userProfile: {
      goals: ['allergy']
    },
    expected: {
      recommendation: '谨慎',
      riskReasonIncludes: ['过敏原'],
      unsuitableForIncludes: ['过敏'],
      alternativeIncludes: ['过敏']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_lactose_milk',
    profileTag: 'lactose_intolerance',
    title: '乳糖不耐画像遇到乳制品',
    productName: '全脂牛奶',
    labelText: [
      '产品名称：全脂牛奶',
      '配料表：生牛乳。',
      '营养成分表 每100mL 能量270kJ 蛋白质3.3g 脂肪3.5g 碳水化合物5g 钠55mg'
    ].join('\n'),
    userProfile: {
      lactoseIntolerant: true
    },
    expected: {
      recommendation: '不建议',
      riskReasonIncludes: ['乳'],
      unsuitableForIncludes: ['乳糖不耐人群'],
      alternativeIncludes: ['无乳糖']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_ingredient_only_no_purchase_decision',
    profileTag: 'default',
    title: '只有配料表时不能生成购买结论',
    productName: '橙味饮料',
    labelText: [
      '产品名称：橙味饮料',
      '配料表：水、白砂糖、果葡糖浆、浓缩橙汁、柠檬酸、食用香精、山梨酸钾。'
    ].join('\n'),
    userProfile: {},
    expected: {
      recommendation: '信息不足',
      riskReasonIncludes: ['缺少营养'],
      unsuitableForIncludes: ['需要明确'],
      alternativeIncludes: ['补拍营养']
    }
  },
  {
    schemaVersion: 'evaluation_case-v1',
    id: 'evaluation_case_nutrition_only_no_purchase_decision',
    profileTag: 'sugar_control',
    title: '只有营养数字时不能生成控糖购买结论',
    productName: '无糖风味饮料',
    labelText: [
      '产品名称：无糖风味饮料',
      '营养成分表 每100mL 能量20kJ 蛋白质0g 脂肪0g 碳水化合物0g 糖0g 钠15mg'
    ].join('\n'),
    userProfile: {
      goals: ['sugar']
    },
    expected: {
      recommendation: '信息不足',
      riskReasonIncludes: ['缺少配料'],
      unsuitableForIncludes: ['需要明确'],
      alternativeIncludes: ['补拍配料']
    }
  }
];

export const profileComparisonEvaluationCases: ComparisonEvaluationCase[] = [
  {
    schemaVersion: 'comparison_evaluation_case-v1',
    id: 'comparison_case_sugar_drink_vs_plain_tea',
    title: '控糖画像下，高糖饮料应输给无糖茶',
    userProfile: {
      goals: ['sugar']
    },
    left: {
      productName: '蜂蜜柚子茶饮',
      labelText: [
        '产品名称：蜂蜜柚子茶饮',
        '配料表：水、白砂糖、果葡糖浆、蜂蜜、柚子汁、柠檬酸。',
        '营养成分表 每100mL 能量210kJ 蛋白质0g 脂肪0g 碳水化合物12g 糖11g 钠35mg'
      ].join('\n')
    },
    right: {
      productName: '无糖乌龙茶',
      labelText: [
        '产品名称：无糖乌龙茶',
        '配料表：水、乌龙茶叶。',
        '营养成分表 每100mL 能量0kJ 蛋白质0g 脂肪0g 碳水化合物0g 糖0g 钠12mg'
      ].join('\n')
    },
    expected: {
      healthier: 'right',
      lowerRisk: 'right',
      betterForProfile: 'right',
      summaryIncludes: 'B'
    }
  },
  {
    schemaVersion: 'comparison_evaluation_case-v1',
    id: 'comparison_case_children_caffeine_vs_plain_yogurt',
    title: '儿童画像下，咖啡因果冻应输给简单酸奶',
    userProfile: {
      goals: ['children'],
      forChild: true
    },
    left: {
      productName: '茶味果冻饮料',
      labelText: [
        '产品名称：茶味果冻饮料',
        '配料表：水、白砂糖、果冻粉、茶粉、咖啡因、柠檬酸、食用色素。',
        '营养成分表 每100g 能量260kJ 蛋白质0g 脂肪0g 碳水化合物13g 钠45mg'
      ].join('\n')
    },
    right: {
      productName: '原味酸奶',
      labelText: [
        '产品名称：原味酸奶',
        '配料表：生牛乳、乳酸菌。',
        '营养成分表 每100g 能量320kJ 蛋白质4g 脂肪3g 碳水化合物5g 糖4g 钠55mg'
      ].join('\n')
    },
    expected: {
      healthier: 'right',
      lowerRisk: 'right',
      betterForProfile: 'right',
      summaryIncludes: 'B'
    }
  },
  {
    schemaVersion: 'comparison_evaluation_case-v1',
    id: 'comparison_case_allergy_peanut_vs_oat',
    title: '过敏画像下，命中过敏原商品应输给无花生燕麦棒',
    userProfile: {
      allergens: ['花生']
    },
    left: {
      productName: '坚果燕麦棒',
      labelText: [
        '产品名称：坚果燕麦棒',
        '配料表：燕麦片、花生、杏仁、蜂蜜、植物油、食用盐。',
        '营养成分表 每100g 能量1580kJ 蛋白质12g 脂肪12g 碳水化合物45g 钠80mg'
      ].join('\n')
    },
    right: {
      productName: '无花生燕麦棒',
      labelText: [
        '产品名称：无花生燕麦棒',
        '配料表：燕麦片、蜂蜜、南瓜籽、植物油、食用盐。',
        '营养成分表 每100g 能量1480kJ 蛋白质10g 脂肪9g 碳水化合物43g 钠75mg'
      ].join('\n')
    },
    expected: {
      healthier: 'right',
      lowerRisk: 'right',
      betterForProfile: 'right',
      summaryIncludes: 'B'
    }
  },
  {
    schemaVersion: 'comparison_evaluation_case-v1',
    id: 'comparison_case_allergy_two_milk_products_no_forced_winner',
    title: '过敏画像下，两款都命中牛奶时不强行给画像胜出',
    userProfile: {
      allergens: ['牛奶']
    },
    left: {
      productName: '原味酸奶',
      labelText: [
        '产品名称：原味酸奶',
        '配料表：生牛乳、乳酸菌。',
        '致敏原提示：含有牛奶。',
        '营养成分表 每100g 能量280kJ 蛋白质3.4g 脂肪3.2g 碳水化合物4.8g 糖4.8g 钠55mg'
      ].join('\n')
    },
    right: {
      productName: '奶油夹心饼干',
      labelText: [
        '产品名称：奶油夹心饼干',
        '配料表：小麦粉、白砂糖、植物油、奶粉、起酥油、食用盐、碳酸氢钠。',
        '致敏原提示：含有小麦和牛奶。',
        '营养成分表 每100g 能量2050kJ 蛋白质6g 脂肪22g 碳水化合物63g 糖18g 钠320mg'
      ].join('\n')
    },
    expected: {
      healthier: 'left',
      lowerRisk: 'left',
      betterForProfile: 'tie',
      summaryIncludes: '两款都不适合'
    }
  }
];
