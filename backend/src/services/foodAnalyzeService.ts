import type { AiProviderName } from '../ai/types.js';
import type { AiFoodExplanationService, RuleExplanationInput } from './aiFoodExplanationService.js';

export type FoodAnalyzeRequest = {
  ocrText: string;
  userProfile?: {
    goals?: string[];
    allergens?: string[];
    forChild?: boolean;
    pregnant?: boolean;
    highBloodPressure?: boolean;
  };
  options?: {
    enableAi?: boolean;
    provider?: AiProviderName | 'auto';
  };
};

export type FoodAnalyzeResult = {
  productName: string;
  category: string;
  productionDate: string;
  ingredients: string[];
  nutrition: Record<string, { value: number; unit: string; level: string; text: string }>;
  decision: 'buy' | 'caution' | 'limit' | 'avoid' | 'unknown';
  decisionText: string;
  riskLevel: 'green' | 'yellow' | 'red' | 'unknown';
  summary: string;
  plainExplanation: string;
  mainReasons: string[];
  suitableFor: string[];
  notSuitableFor: string[];
  ingredientHighlights: RuleExplanationInput['ingredientHighlights'];
  nutritionJudgement: Record<string, string>;
  eatingAdvice: string;
  confidence: 'high' | 'medium' | 'low';
  source: {
    ruleBased: true;
    aiEnhanced: boolean;
    provider: AiProviderName | 'rule-only';
    model: string;
  };
  retakeSuggestion: string;
};

export type FoodAnalyzeService = {
  analyze(request: FoodAnalyzeRequest): Promise<FoodAnalyzeResult>;
};

export function createFoodAnalyzeService(aiFoodExplanationService: AiFoodExplanationService): FoodAnalyzeService {
  return {
    async analyze(request) {
      const structured = extractStructuredFoodText(request.ocrText);
      const ruleResult = analyzeByRules(structured, request.userProfile);
      const ai = await aiFoodExplanationService.explain({
        ruleResult,
        structuredInput: {
          productName: structured.productName,
          category: structured.category,
          ingredients: structured.ingredients,
          nutrition: structured.nutrition,
          userProfile: request.userProfile
        },
        enableAi: request.options?.enableAi,
        provider: request.options?.provider
      });
      return {
        productName: structured.productName,
        category: structured.category,
        productionDate: structured.productionDate,
        ingredients: structured.ingredients,
        nutrition: structured.nutrition,
        decision: ruleResult.decision,
        decisionText: ruleResult.decisionText,
        riskLevel: ruleResult.riskLevel,
        summary: ai.summary || ruleResult.summary,
        plainExplanation: ai.plainExplanation || ruleResult.plainExplanation,
        mainReasons: ai.mainReasons.length ? ai.mainReasons : ruleResult.mainReasons,
        suitableFor: ai.suitableFor.length ? ai.suitableFor : ruleResult.suitableFor,
        notSuitableFor: ai.notSuitableFor.length ? ai.notSuitableFor : ruleResult.notSuitableFor,
        ingredientHighlights: ai.ingredientHighlights.length ? ai.ingredientHighlights : ruleResult.ingredientHighlights,
        nutritionJudgement: ruleResult.nutritionExplanation,
        eatingAdvice: ai.eatingAdvice || ruleResult.eatingAdvice,
        confidence: ruleResult.confidence,
        source: {
          ruleBased: true,
          aiEnhanced: ai.aiEnhanced,
          provider: ai.provider,
          model: ai.model
        },
        retakeSuggestion: ai.retakeSuggestion
      };
    }
  };
}

type StructuredFoodText = {
  productName: string;
  category: string;
  productionDate: string;
  ingredients: string[];
  nutrition: FoodAnalyzeResult['nutrition'];
};

type RuleResult = RuleExplanationInput & {
  decision: FoodAnalyzeResult['decision'];
  decisionText: string;
  riskLevel: FoodAnalyzeResult['riskLevel'];
  nutritionExplanation: Record<string, string>;
};

const sugarTerms = ['白砂糖', '蔗糖', '葡萄糖', '果糖', '葡萄糖浆', '麦芽糖', '麦芽糖浆', '麦芽糊精', '果葡糖浆', '玉米糖浆', '糖浆'];
const sodiumTerms = ['食用盐', '食盐', '味精', '谷氨酸钠', '碳酸氢钠', '酱油粉', '复合调味料'];
const oilTerms = ['植物油', '棕榈油', '起酥油', '氢化植物油', '人造奶油', '植脂末'];
const additiveTerms = [
  { name: '味精', level: 'yellow' as const, explanation: '常见增鲜剂，不等于有问题，但会让咸鲜味更明显。' },
  { name: '碳酸钙', level: 'green' as const, explanation: '常见食品添加剂或营养强化相关成分，按标签常规使用时风险不高。' },
  { name: '碳酸氢钠', level: 'yellow' as const, explanation: '常见膨松剂，也属于钠来源之一。' },
  { name: '香精', level: 'yellow' as const, explanation: '用于补充风味，介意香精的人可以留意。' },
  { name: '色素', level: 'yellow' as const, explanation: '用于调整颜色，儿童高频食用时可以多留意。' }
];

function extractStructuredFoodText(ocrText: string): StructuredFoodText {
  const text = normalizeText(ocrText);
  const ingredientText = extractSection(text, /配\s*料(?:表)?\s*[:：]?\s*/i, /(营养成分表|营养成份表|致敏|过敏|产品类型|执行标准|生产日期|保质期|贮存|地址|厂家|条形码)/i);
  return {
    productName: extractProductName(text),
    category: extractCategory(text),
    productionDate: extractProductionDate(text),
    ingredients: parseIngredients(ingredientText),
    nutrition: parseNutrition(text)
  };
}

function analyzeByRules(input: StructuredFoodText, profile?: FoodAnalyzeRequest['userProfile']): RuleResult {
  const reasons: string[] = [];
  const ingredientHighlights: RuleExplanationInput['ingredientHighlights'] = [];
  const nutritionExplanation: Record<string, string> = {};
  let score = 0;

  const energy = input.nutrition.energy?.value;
  const fat = input.nutrition.fat?.value;
  const carbohydrate = input.nutrition.carbohydrate?.value;
  const sodium = input.nutrition.sodium?.value;
  const transFat = input.nutrition.transFat?.value;
  const ingredientText = input.ingredients.join('、');
  const hasSugar = sugarTerms.some((term) => ingredientText.includes(term));
  const hasOil = oilTerms.some((term) => ingredientText.includes(term));
  const hasSodium = sodiumTerms.some((term) => ingredientText.includes(term));
  const additiveHits = additiveTerms.filter((item) => ingredientText.includes(item.name));

  if (energy !== undefined && energy >= 1700) {
    score += 2;
    reasons.push('热量偏高');
    nutritionExplanation.energy = `每 100g 能量 ${energy}kJ，属于零食里需要留意的水平。`;
  }
  if (fat !== undefined && fat >= 15) {
    score += 2;
    reasons.push('脂肪偏高');
    nutritionExplanation.fat = `每 100g 脂肪 ${fat}g，油炸或膨化零食常见这个特点。`;
  }
  if (carbohydrate !== undefined && carbohydrate >= 50) {
    score += 2;
    reasons.push('碳水较高');
    nutritionExplanation.carbohydrate = `每 100g 碳水 ${carbohydrate}g，主要来自面粉、米粉或糖类。`;
  }
  if (sodium !== undefined && sodium >= 300) {
    score += sodium >= 600 ? 2 : 1;
    reasons.push('钠偏高');
    nutritionExplanation.sodium = `每 100g 钠 ${sodium}mg，重口味食物叠加时更需要控制份量。`;
  }
  if (transFat === 0) {
    nutritionExplanation.transFat = '反式脂肪标示为 0g，这是相对更好的信息。';
  }
  if (hasSugar) {
    score += 1;
    reasons.push('含添加糖来源');
    ingredientHighlights.push({ name: '白砂糖/麦芽糖', level: 'yellow', explanation: '属于添加糖来源，控糖或减脂时要留意。' });
  }
  if (hasOil) {
    score += 1;
    reasons.push('配料里有油脂来源');
    ingredientHighlights.push({ name: '植物油', level: 'yellow', explanation: '常见零食用油；如果未标明具体油种，无法进一步判断油脂细节。' });
  }
  if (hasSodium) {
    ingredientHighlights.push({ name: '食用盐/味精', level: 'yellow', explanation: '提供咸鲜味，也会和钠摄入相关。' });
  }
  ingredientHighlights.push(...additiveHits);

  const allergenNotSuitable = buildAllergenNotSuitable(input.ingredients, profile);
  const notSuitableFor = unique([
    ...(score >= 4 ? ['减脂人群', '控糖人群', '高血压/控盐人群'] : []),
    ...(input.ingredients.some((item) => item.includes('小麦')) ? ['小麦过敏或麸质敏感人群'] : []),
    ...(profile?.forChild || score >= 4 ? ['儿童高频食用'] : []),
    ...allergenNotSuitable
  ]).slice(0, 8);
  const suitableFor = score >= 4
    ? ['普通成年人偶尔解馋', '不在控糖、减脂、控盐期间的人']
    : ['普通成年人日常看标签', '偶尔吃零食的人'];

  const decision = resolveDecision(score, notSuitableFor.length);
  const decisionText = decisionTextFor(decision);
  const summary = decision === 'caution' || decision === 'limit'
    ? '可以偶尔吃，但不建议经常吃。'
    : decision === 'avoid'
      ? '不建议作为常规零食。'
      : '可以吃，提醒项不多。';
  const plainExplanation = buildPlainExplanation(input, reasons);
  return {
    decision,
    decisionText,
    riskLevel: riskLevelFor(decision),
    summary,
    plainExplanation,
    mainReasons: unique(reasons).slice(0, 6),
    suitableFor,
    notSuitableFor,
    ingredientHighlights: uniqueHighlights(ingredientHighlights).slice(0, 8),
    nutritionExplanation,
    eatingAdvice: score >= 4
      ? '建议一次吃半包以内，别空腹当正餐吃；当天其他饮食少叠加油炸、甜食和重口味食物。'
      : '按一小份吃即可，搭配正餐、饮水或水果时更容易控制总量。',
    confidence: input.ingredients.length && Object.keys(input.nutrition).length ? 'high' : input.ingredients.length || Object.keys(input.nutrition).length ? 'medium' : 'low'
  };
}

function resolveDecision(score: number, hasNotSuitable: number): FoodAnalyzeResult['decision'] {
  if (score >= 12 && hasNotSuitable >= 6) return 'limit';
  if (score >= 4) return 'caution';
  if (score >= 1) return 'buy';
  return 'unknown';
}

function decisionTextFor(decision: FoodAnalyzeResult['decision']): string {
  if (decision === 'limit') return '少买少吃｜偶尔解馋';
  if (decision === 'caution') return '谨慎购买｜偶尔吃可以';
  if (decision === 'avoid') return '不建议购买｜不适合这次目标';
  if (decision === 'buy') return '可以买｜注意份量';
  return '信息不足';
}

function riskLevelFor(decision: FoodAnalyzeResult['decision']): FoodAnalyzeResult['riskLevel'] {
  if (decision === 'avoid' || decision === 'limit') return 'red';
  if (decision === 'caution') return 'yellow';
  if (decision === 'buy') return 'green';
  return 'unknown';
}

function buildPlainExplanation(input: StructuredFoodText, reasons: string[]): string {
  if (!reasons.length) return '这次没有识别到特别突出的糖、钠、脂肪或添加剂提醒。';
  const category = input.category ? `这是${input.category}，` : '';
  return `${category}主要提醒是${unique(reasons).slice(0, 4).join('、')}。这类食品通常不太顶饱，但热量和口味负担容易上来。`;
}

function parseNutrition(text: string): StructuredFoodText['nutrition'] {
  const fields: Array<[keyof StructuredFoodText['nutrition'], RegExp, string]> = [
    ['energy', /能量[^\d]*(\d+(?:\.\d+)?)\s*(kJ|千焦|kcal|千卡|大卡)?/i, 'kJ'],
    ['protein', /蛋白质[^\d]*(\d+(?:\.\d+)?)\s*(g|克)?/i, 'g'],
    ['fat', /脂肪[^\d]*(\d+(?:\.\d+)?)\s*(g|克)?/i, 'g'],
    ['carbohydrate', /碳水化合物[^\d]*(\d+(?:\.\d+)?)\s*(g|克)?/i, 'g'],
    ['sodium', /钠[^\d]*(\d+(?:\.\d+)?)\s*(mg|毫克|g|克)?/i, 'mg'],
    ['transFat', /反式脂肪(?:酸)?[^\d]*(\d+(?:\.\d+)?)\s*(g|克)?/i, 'g']
  ];
  const result: StructuredFoodText['nutrition'] = {};
  for (const [key, pattern, defaultUnit] of fields) {
    const match = text.match(pattern);
    if (!match) continue;
    let value = Number.parseFloat(match[1]);
    let unit = normalizeUnit(match[2] || defaultUnit);
    if (key === 'energy' && unit === 'kcal') {
      value = Number((value * 4.184).toFixed(1));
      unit = 'kJ';
    }
    if (key === 'sodium' && unit === 'g') {
      value = Number((value * 1000).toFixed(1));
      unit = 'mg';
    }
    result[key] = {
      value,
      unit,
      level: nutritionLevel(key, value),
      text: `${value}${unit}`
    };
  }
  return result;
}

function nutritionLevel(key: string, value: number): string {
  if (key === 'energy') return value >= 1700 ? '偏高' : value >= 500 ? '中等' : '较低';
  if (key === 'fat') return value >= 15 ? '偏高' : value >= 3 ? '中等' : '较低';
  if (key === 'carbohydrate') return value >= 50 ? '高' : value >= 15 ? '中等' : '较低';
  if (key === 'sodium') return value >= 300 ? '偏高' : value >= 120 ? '中等' : '较低';
  if (key === 'protein') return value >= 8 ? '较好' : value >= 4 ? '一般' : '偏低';
  if (key === 'transFat') return value === 0 ? '较好' : '留意';
  return '已识别';
}

function parseIngredients(text: string): string[] {
  return text
    .replace(/^配\s*料(?:表)?\s*[:：]?/i, '')
    .split(/[、,，;；]/)
    .map((item) => item.replace(/[。.\s]/g, '').trim())
    .filter((item) => item.length >= 1 && !/营养成分表|产品类型|执行标准|生产日期/.test(item))
    .slice(0, 80);
}

function extractProductName(text: string): string {
  const match = text.match(/(?:品\s*名|产品名称|商品名称)\s*[:：]?\s*([^\n\r，。,；;]{2,40})/);
  if (match) return cleanupLabelValue(match[1]);
  const front = text.split(/\n+/).map((line) => cleanupLabelValue(line)).find((line) => /麻花|薯片|饼干|面包|饮料|酸奶|零食|糕点/.test(line));
  return front || '未识别商品';
}

function extractCategory(text: string): string {
  const match = text.match(/(?:产品类型|食品类别|类别)\s*[:：]?\s*([^\n\r，。,；;]{2,30})/);
  if (match) return cleanupLabelValue(match[1]);
  if (/麻花|薯片|膨化/.test(text)) return '膨化食品 / 零食';
  if (/饼干|糕点/.test(text)) return '糕点 / 零食';
  if (/饮料|果汁|茶饮/.test(text)) return '饮料';
  return '';
}

function extractProductionDate(text: string): string {
  const match = text.match(/(?:生产日期|制造日期|产日期)\s*[:：]?\s*([0-9]{4}[-./年][0-9]{1,2}[-./月][0-9]{1,2}日?)/);
  return match ? cleanupLabelValue(match[1]) : '';
}

function extractSection(text: string, start: RegExp, stop: RegExp): string {
  const startMatch = text.match(start);
  if (!startMatch || startMatch.index === undefined) return '';
  const afterStart = text.slice(startMatch.index + startMatch[0].length);
  const stopMatch = afterStart.match(stop);
  return stopMatch && stopMatch.index !== undefined ? afterStart.slice(0, stopMatch.index) : afterStart;
}

function buildAllergenNotSuitable(ingredients: string[], profile?: FoodAnalyzeRequest['userProfile']): string[] {
  const allergens = profile?.allergens || [];
  if (!allergens.length) return [];
  const text = ingredients.join('');
  return allergens
    .filter((item) => text.includes(item))
    .map((item) => `${item}过敏或忌口人群`);
}

function normalizeText(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function cleanupLabelValue(value: string): string {
  return value.replace(/^[:：\s]+/, '').replace(/\s+/g, '').trim();
}

function normalizeUnit(value: string): string {
  const unit = value.toLowerCase();
  if (unit.includes('kcal') || unit.includes('千卡') || unit.includes('大卡')) return 'kcal';
  if (unit.includes('g') || unit.includes('克')) return 'g';
  if (unit.includes('mg') || unit.includes('毫克')) return 'mg';
  return 'kJ';
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function uniqueHighlights(values: RuleExplanationInput['ingredientHighlights']) {
  const seen = new Set<string>();
  return values.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}
