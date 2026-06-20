import type { AdditiveCategory, AdditiveRecognition, AttentionSettings, IngredientMatch } from '@/types';

type AdditiveDisplayLevel = AdditiveRecognition['displayLevel'];

export type AdditiveRule = {
  name: string;
  aliases: string[];
  category: AdditiveCategory;
  effect: string;
  reminder: string;
  keywords: string[];
  displayLevel: AdditiveDisplayLevel;
  targetReminders?: Record<string, string>;
};

type RecognitionInput = {
  text: string;
  ingredients?: IngredientMatch[];
  attention?: AttentionSettings;
};

export const additiveCategoryOrder: AdditiveCategory[] = [
  '防腐剂',
  '甜味剂',
  '色素',
  '质地改良剂',
  '香精香料',
  '其他添加剂'
];

const commonReminder = '常见食品添加剂，重点看种类、数量和你是否介意添加剂。';

export const foodAdditiveRules: AdditiveRule[] = [
  {
    name: '山梨酸钾',
    aliases: ['山梨酸钾', '山梨酸', 'Potassium Sorbate', 'potassium sorbate'],
    category: '防腐剂',
    effect: '帮助延长保质期。',
    reminder: commonReminder,
    keywords: ['山梨酸钾', '山梨酸', 'Potassium Sorbate', 'potassium sorbate'],
    displayLevel: 'normal',
    targetReminders: {
      fewer_additives: '如果追求配料简单，防腐剂种类和配料表长短会一起进入提醒。'
    }
  },
  {
    name: '苯甲酸钠',
    aliases: ['苯甲酸钠', '苯甲酸', 'Sodium Benzoate', 'sodium benzoate'],
    category: '防腐剂',
    effect: '帮助抑制微生物生长，常见于饮料、调味品等。',
    reminder: commonReminder,
    keywords: ['苯甲酸钠', '苯甲酸', 'Sodium Benzoate', 'sodium benzoate'],
    displayLevel: 'normal'
  },
  {
    name: '脱氢乙酸钠',
    aliases: ['脱氢乙酸钠', '脱氢乙酸'],
    category: '防腐剂',
    effect: '用于帮助食品保持稳定。',
    reminder: '介意防腐剂时可以留意配料表整体长度和同类添加剂数量。',
    keywords: ['脱氢乙酸钠', '脱氢乙酸'],
    displayLevel: 'watch'
  },
  {
    name: '阿斯巴甜',
    aliases: ['阿斯巴甜', 'Aspartame', 'aspartame'],
    category: '甜味剂',
    effect: '提供甜味，常用于低糖或无糖风味食品。',
    reminder: '介意甜味剂的人可以留意；儿童模式下甜味剂种类会单独进入提醒。',
    keywords: ['阿斯巴甜', 'Aspartame', 'aspartame'],
    displayLevel: 'watch',
    targetReminders: {
      sugar_control: '控糖时也要看甜味剂和整体碳水，不只看白砂糖。',
      for_children: '儿童模式下，甜味剂会排到更靠前的位置提醒。'
    }
  },
  {
    name: '安赛蜜',
    aliases: ['安赛蜜', '乙酰磺胺酸钾', 'Acesulfame-K', 'acesulfame-k', 'Acesulfame K', 'acesulfame potassium'],
    category: '甜味剂',
    effect: '提供甜味，常和其他甜味剂一起使用。',
    reminder: '介意甜味剂时，配料表复杂度会一起进入提醒。',
    keywords: ['安赛蜜', '乙酰磺胺酸钾', 'Acesulfame-K', 'acesulfame-k', 'Acesulfame K', 'acesulfame potassium'],
    displayLevel: 'watch',
    targetReminders: {
      sugar_control: '控糖时需要同时看甜味剂和整体碳水，不代表不需要看份量。',
      for_children: '儿童高频食用时，甜味剂种类和一份吃多少会排到前面提醒。'
    }
  },
  {
    name: '三氯蔗糖',
    aliases: ['三氯蔗糖', '蔗糖素', 'Sucralose', 'sucralose'],
    category: '甜味剂',
    effect: '提供甜味，常用于低糖饮料和零食。',
    reminder: '如果儿童经常吃同类零食或饮料，甜味剂种类和一份吃多少会一起进入提醒。',
    keywords: ['三氯蔗糖', '蔗糖素', 'Sucralose', 'sucralose'],
    displayLevel: 'watch',
    targetReminders: {
      sugar_control: '控糖人群需要注意，仍建议看一份吃多少。',
      for_children: '儿童高频食用时，甜味剂种类和一份吃多少会排到前面提醒。'
    }
  },
  {
    name: '赤藓糖醇',
    aliases: ['赤藓糖醇'],
    category: '甜味剂',
    effect: '提供甜味，也常见于低糖食品。',
    reminder: '介意代糖或肠胃敏感时，留意自己的食用反应。',
    keywords: ['赤藓糖醇'],
    displayLevel: 'watch'
  },
  {
    name: '柠檬黄',
    aliases: ['柠檬黄'],
    category: '色素',
    effect: '用于给食品上色。',
    reminder: '给儿童高频食用时可以留意色素类添加剂。',
    keywords: ['柠檬黄'],
    displayLevel: 'watch',
    targetReminders: {
      for_children: '儿童模式下，色素会作为重点提醒。'
    }
  },
  {
    name: '日落黄',
    aliases: ['日落黄', '日落黄FCF'],
    category: '色素',
    effect: '用于给食品上色。',
    reminder: '如果追求配料简单，色素类配料会单独进入提醒。',
    keywords: ['日落黄', '日落黄FCF'],
    displayLevel: 'watch'
  },
  {
    name: '胭脂红',
    aliases: ['胭脂红'],
    category: '色素',
    effect: '用于调整食品颜色。',
    reminder: '给儿童高频食用时可以留意。',
    keywords: ['胭脂红'],
    displayLevel: 'watch'
  },
  {
    name: '焦糖色',
    aliases: ['焦糖色', '焦糖色素', 'Caramel Color', 'caramel color', 'Caramel Colour', 'caramel colour'],
    category: '色素',
    effect: '用于调整食品颜色，常见于饮料和调味品。',
    reminder: '常见于饮料和调味品，介意色素时可以留意。',
    keywords: ['焦糖色', '焦糖色素', 'Caramel Color', 'caramel color', 'Caramel Colour', 'caramel colour'],
    displayLevel: 'normal'
  },
  {
    name: '黄原胶',
    aliases: ['黄原胶', 'Xanthan Gum', 'xanthan gum'],
    category: '质地改良剂',
    effect: '帮助增加稠度或保持口感稳定。',
    reminder: '常见于酸奶、饮料、调味品，介意增稠剂时可以留意。',
    keywords: ['黄原胶', 'Xanthan Gum', 'xanthan gum'],
    displayLevel: 'normal'
  },
  {
    name: '羧甲基纤维素钠',
    aliases: ['羧甲基纤维素钠', '羧甲基纤维素', 'CMC', 'cmc', 'Sodium Carboxymethyl Cellulose', 'sodium carboxymethyl cellulose'],
    category: '质地改良剂',
    effect: '帮助增稠、稳定组织状态或改善口感。',
    reminder: '常见质地改良剂，重点看配料表里同类增稠剂是否较多。',
    keywords: ['羧甲基纤维素钠', '羧甲基纤维素', 'CMC', 'Sodium Carboxymethyl Cellulose'],
    displayLevel: 'normal'
  },
  {
    name: '卡拉胶',
    aliases: ['卡拉胶'],
    category: '质地改良剂',
    effect: '帮助形成或保持稠度和口感。',
    reminder: '常见于乳制品、饮料和甜品，介意增稠剂时可以留意。',
    keywords: ['卡拉胶'],
    displayLevel: 'normal'
  },
  {
    name: '果胶',
    aliases: ['果胶'],
    category: '质地改良剂',
    effect: '帮助增稠或形成凝胶口感。',
    reminder: '常见于果酱、酸奶和饮品，介意增稠剂时可以留意。',
    keywords: ['果胶'],
    displayLevel: 'normal'
  },
  {
    name: '海藻酸钠',
    aliases: ['海藻酸钠'],
    category: '质地改良剂',
    effect: '帮助稳定质地或改善口感。',
    reminder: '介意增稠剂时可以留意。',
    keywords: ['海藻酸钠'],
    displayLevel: 'normal'
  },
  {
    name: '大豆磷脂',
    aliases: ['大豆磷脂', '磷脂'],
    category: '质地改良剂',
    effect: '帮助油和水混合，改善口感。',
    reminder: '大豆过敏或忌口人群需要查看包装过敏原提示。',
    keywords: ['大豆磷脂', '磷脂'],
    displayLevel: 'watch',
    targetReminders: {
      avoidance: '大豆忌口人群需要重点查看。'
    }
  },
  {
    name: '单双甘油脂肪酸酯',
    aliases: ['单，双甘油脂肪酸酯', '单、双甘油脂肪酸酯', '单双甘油脂肪酸酯', 'Mono- and Diglycerides', 'mono- and diglycerides', 'Mono and Diglycerides', 'mono and diglycerides'],
    category: '质地改良剂',
    effect: '帮助改善组织状态和口感。',
    reminder: '常见于烘焙、冰淇淋和饮料类食品。',
    keywords: ['单，双甘油脂肪酸酯', '单、双甘油脂肪酸酯', '单双甘油脂肪酸酯', 'Mono- and Diglycerides', 'Mono and Diglycerides'],
    displayLevel: 'normal'
  },
  {
    name: '味精',
    aliases: ['味精', '谷氨酸钠', 'L-谷氨酸钠', 'Monosodium Glutamate', 'MSG'],
    category: '其他添加剂',
    effect: '用于增强咸鲜味，本身不是“越少越好”的单一判断，仍要和钠含量、食用份量一起看。',
    reminder: '少盐/低钠目标下，建议同时看营养成分表里的钠。',
    keywords: ['味精', '谷氨酸钠', 'L-谷氨酸钠', 'MSG', 'Monosodium Glutamate'],
    displayLevel: 'normal',
    targetReminders: {
      low_sodium: '低钠关注时，味精和谷氨酸钠应与钠数字一起看。'
    }
  },
  {
    name: "5'-呈味核苷酸二钠",
    aliases: ["5'-呈味核苷酸二钠", '5’-呈味核苷酸二钠', '呈味核苷酸二钠', "5'-肌苷酸二钠", '5-肌苷酸二钠', '肌苷酸二钠', "Disodium 5'-ribonucleotide", 'disodium 5-ribonucleotide', "Disodium 5'-Ribonucleotides"],
    category: '其他添加剂',
    effect: '用于增强鲜味，常与味精等鲜味物质搭配。',
    reminder: '低钠关注人群可以结合营养成分表里的钠一起看。',
    keywords: ["5'-呈味核苷酸二钠", '呈味核苷酸二钠', "5'-肌苷酸二钠", '5-肌苷酸二钠', '肌苷酸二钠', "Disodium 5'-ribonucleotide"],
    displayLevel: 'normal',
    targetReminders: {
      low_sodium: '少盐/低钠目标下，建议同时看营养成分表的钠。'
    }
  },
  {
    name: '蔗糖脂肪酸酯',
    aliases: ['蔗糖脂肪酸酯'],
    category: '质地改良剂',
    effect: '帮助乳化和稳定口感。',
    reminder: '介意乳化剂时可以留意。',
    keywords: ['蔗糖脂肪酸酯'],
    displayLevel: 'normal'
  },
  {
    name: '柠檬酸',
    aliases: ['柠檬酸'],
    category: '其他添加剂',
    effect: '调节酸味和口感。',
    reminder: '常见于饮料、酸奶和糖果，介意酸味调节剂时可以留意。',
    keywords: ['柠檬酸'],
    displayLevel: 'normal'
  },
  {
    name: '柠檬酸钠',
    aliases: ['柠檬酸钠'],
    category: '其他添加剂',
    effect: '调节酸度，也帮助口感稳定。',
    reminder: '低钠关注人群可以结合营养成分表里的钠一起看。',
    keywords: ['柠檬酸钠'],
    displayLevel: 'normal',
    targetReminders: {
      low_sodium: '少盐/低钠目标下，建议同时看营养成分表的钠。'
    }
  },
  {
    name: '乳酸',
    aliases: ['乳酸'],
    category: '其他添加剂',
    effect: '调节酸味和风味。',
    reminder: '常见于酸味食品，通常用于调节风味。',
    keywords: ['乳酸'],
    displayLevel: 'normal'
  },
  {
    name: '抗坏血酸',
    aliases: ['抗坏血酸', '维生素C'],
    category: '其他添加剂',
    effect: '帮助减少氧化，保持风味或颜色。',
    reminder: '常见抗氧化剂，通常用于帮助保持风味或颜色。',
    keywords: ['抗坏血酸', '维生素C'],
    displayLevel: 'normal'
  },
  {
    name: '异抗坏血酸钠',
    aliases: ['异抗坏血酸钠'],
    category: '其他添加剂',
    effect: '帮助减少氧化，保持食品状态。',
    reminder: '低钠关注人群可以结合钠含量一起看。',
    keywords: ['异抗坏血酸钠'],
    displayLevel: 'normal'
  },
  {
    name: '茶多酚',
    aliases: ['茶多酚'],
    category: '其他添加剂',
    effect: '用于帮助抗氧化或保持风味。',
    reminder: '对咖啡因或茶类成分敏感的人可以留意。',
    keywords: ['茶多酚'],
    displayLevel: 'watch'
  },
  {
    name: '食用香精',
    aliases: ['食用香精', '香精', '食用香料', '香料'],
    category: '香精香料',
    effect: '用于调味或增强风味。',
    reminder: '如果追求配料简单，香精香料类配料会单独进入提醒。',
    keywords: ['食用香精', '香精', '食用香料', '香料'],
    displayLevel: 'normal'
  },
  {
    name: '乙基麦芽酚',
    aliases: ['乙基麦芽酚'],
    category: '香精香料',
    effect: '用于增强甜香或烘焙风味。',
    reminder: '介意香精香料时可以留意。',
    keywords: ['乙基麦芽酚'],
    displayLevel: 'normal'
  },
  {
    name: '香兰素',
    aliases: ['香兰素', '香草醛'],
    category: '香精香料',
    effect: '用于提供香草风味。',
    reminder: '介意香精香料时可以留意。',
    keywords: ['香兰素', '香草醛'],
    displayLevel: 'normal'
  },
  {
    name: '碳酸氢钠',
    aliases: ['碳酸氢钠', '小苏打'],
    category: '其他添加剂',
    effect: '帮助烘焙食品膨松，也可能调节酸碱度。',
    reminder: '低钠关注人群可以结合营养成分表里的钠一起看。',
    keywords: ['碳酸氢钠', '小苏打'],
    displayLevel: 'normal',
    targetReminders: {
      low_sodium: '少盐/低钠目标下，建议同时看钠含量。'
    }
  },
  {
    name: '碳酸氢铵',
    aliases: ['碳酸氢铵'],
    category: '其他添加剂',
    effect: '帮助饼干、糕点等形成蓬松口感。',
    reminder: '常见于烘焙食品，介意膨松剂时可以留意。',
    keywords: ['碳酸氢铵'],
    displayLevel: 'normal'
  },
  {
    name: '磷酸氢钙',
    aliases: ['磷酸氢钙'],
    category: '其他添加剂',
    effect: '常用于膨松或调节食品质地。',
    reminder: '介意膨松剂时可以留意。',
    keywords: ['磷酸氢钙'],
    displayLevel: 'normal'
  }
];

let activeFoodAdditiveRules: AdditiveRule[] = foodAdditiveRules;

export function getActiveFoodAdditiveRules(): AdditiveRule[] {
  return activeFoodAdditiveRules;
}

export function setActiveFoodAdditiveRules(rules: AdditiveRule[]): void {
  if (!Array.isArray(rules) || !rules.length) return;
  activeFoodAdditiveRules = rules;
}

export function recognizeAdditives(input: RecognitionInput): AdditiveRecognition[] {
  const text = normalizeText(input.text);
  const ingredientText = (input.ingredients || [])
    .map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
    .join(' ');
  const combinedText = normalizeText(`${text} ${ingredientText}`);
  const recognitions = new Map<string, AdditiveRecognition>();

  getActiveFoodAdditiveRules().forEach((rule) => {
    const matchedTerms = unique(getRuleTerms(rule).filter((term) => combinedText.includes(normalizeText(term))));
    if (!matchedTerms.length) return;
    recognitions.set(rule.name, buildRecognitionFromRule(rule, matchedTerms, input.attention));
  });

  (input.ingredients || []).forEach((item) => {
    if (!item.isAdditive) return;
    const matchedRule = findRuleForText(`${item.normalizedText}${item.ingredientName || ''}`);
    const rule = matchedRule || buildFallbackRule(item.normalizedText);
    if (recognitions.has(rule.name)) return;
    recognitions.set(rule.name, buildRecognitionFromRule(rule, [item.normalizedText], input.attention, item.id));
  });

  return [...recognitions.values()].sort((left, right) => {
    const levelDiff = displayLevelWeight(right.displayLevel) - displayLevelWeight(left.displayLevel);
    if (levelDiff) return levelDiff;
    return additiveCategoryOrder.indexOf(left.category) - additiveCategoryOrder.indexOf(right.category);
  });
}

export function summarizeAdditiveRecognitions(items: AdditiveRecognition[]) {
  return {
    total: items.length,
    categoryCount: new Set(items.map((item) => item.category)).size,
    items
  };
}

export function recognizeAdditivesFromText(text: string, attention?: AttentionSettings): AdditiveRecognition[] {
  return recognizeAdditives({ text, attention });
}

function buildRecognitionFromRule(
  rule: AdditiveRule,
  matchedTerms: string[],
  attention?: AttentionSettings,
  idSeed = rule.name
): AdditiveRecognition {
  const targetNotes = Object.entries(rule.targetReminders || {})
    .filter(([key]) => hasAttentionTarget(attention, key))
    .map(([, value]) => value);
  return {
    id: `additive-${normalizeText(idSeed).slice(0, 24)}`,
    name: rule.name,
    category: rule.category,
    effect: rule.effect,
    reminder: rule.reminder,
    displayLevel: targetNotes.length ? promoteLevel(rule.displayLevel) : rule.displayLevel,
    matchedTerms,
    targetNotes
  };
}

function findRuleForText(value: string): AdditiveRule | undefined {
  const text = normalizeText(value);
  return getActiveFoodAdditiveRules().find((rule) => getRuleTerms(rule).some((alias) => text.includes(normalizeText(alias))));
}

function buildFallbackRule(name: string): AdditiveRule {
  const category = inferCategory(name);
  return {
    name,
    aliases: [name],
    category,
    effect: fallbackEffect(category),
    reminder: fallbackReminder(category),
    keywords: [name],
    displayLevel: category === '甜味剂' || category === '色素' ? 'watch' : 'normal'
  };
}

function inferCategory(value: string): AdditiveCategory {
  const text = normalizeText(value);
  if (/防腐|山梨酸|苯甲酸|脱氢乙酸|双乙酸|纳他霉素|丙酸/.test(text)) return '防腐剂';
  if (/甜味|阿斯巴甜|安赛蜜|三氯蔗糖|甜蜜素|糖精|赤藓糖醇|木糖醇|山梨糖醇|麦芽糖醇/.test(text)) return '甜味剂';
  if (/色素|柠檬黄|日落黄|胭脂红|诱惑红|亮蓝|焦糖色/.test(text)) return '色素';
  if (/胶|果胶|卡拉胶|黄原胶|稳定剂|增稠|乳化|磷脂|脂肪酸酯|吐温|司盘/.test(text)) return '质地改良剂';
  if (/酸度|柠檬酸|乳酸|苹果酸|碳酸钠|磷酸|抗氧化|抗坏血酸|维生素C|茶多酚|BHA|BHT|TBHQ/.test(text)) return '其他添加剂';
  if (/香精|香料|香兰素|麦芽酚|柠檬醛|薄荷脑/.test(text)) return '香精香料';
  if (/膨松|碳酸氢|泡打粉|磷酸氢钙/.test(text)) return '其他添加剂';
  return '其他添加剂';
}

function fallbackEffect(category: AdditiveCategory): string {
  if (category === '防腐剂') return '帮助延长保质期。';
  if (category === '甜味剂') return '提供甜味。';
  if (category === '色素') return '用于给食品上色。';
  if (category === '质地改良剂') return '帮助改善稠度、稳定性或口感。';
  if (category === '香精香料') return '用于调味或增强风味。';
  return '用于改善食品风味、颜色、质地或保存状态。';
}

function fallbackReminder(category: AdditiveCategory): string {
  if (category === '色素') return '儿童高频食用时可以留意。';
  if (category === '甜味剂') return '介意甜味剂的人可以留意。';
  if (category === '香精香料') return '如果追求配料简单，香精香料类配料会单独进入提醒。';
  return commonReminder;
}

function promoteLevel(level: AdditiveDisplayLevel): AdditiveDisplayLevel {
  if (level === 'normal') return 'watch';
  return level;
}

function displayLevelWeight(level: AdditiveDisplayLevel): number {
  if (level === 'focus') return 3;
  if (level === 'watch') return 2;
  return 1;
}

function hasAttentionTarget(attention: AttentionSettings | undefined, key: string): boolean {
  if (!attention) return false;
  if (key === 'sugar_control') return attention.primaryGoal === 'sugar';
  if (key === 'fat_control') return attention.primaryGoal === 'fatLoss';
  if (key === 'low_sodium') return attention.primaryGoal === 'lowSodium';
  if (key === 'for_children') return attention.isChildrenMode;
  if (key === 'avoidance') return attention.allergens.length > 0;
  if (key === 'fewer_additives') return attention.primaryGoal === 'daily';
  return false;
}

function normalizeText(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getRuleTerms(rule: AdditiveRule): string[] {
  return unique([rule.name, ...rule.aliases, ...rule.keywords]);
}
