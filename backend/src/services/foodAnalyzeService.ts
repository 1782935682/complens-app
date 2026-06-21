import type { AiProviderName } from '../ai/types.js';
import type { AiFoodExplanationService, RuleExplanationInput } from './aiFoodExplanationService.js';
import { parseNutritionText, type NutritionKey } from './nutritionService.js';

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
  frontClaims: string[];
  uncertainClues: string[];
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
          productionDate: structured.productionDate,
          ingredients: structured.ingredients,
          nutrition: structured.nutrition,
          frontClaims: structured.frontClaims,
          uncertainClues: structured.uncertainClues,
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
        frontClaims: structured.frontClaims,
        uncertainClues: structured.uncertainClues,
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
  frontClaims: string[];
  uncertainClues: string[];
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
    nutrition: parseNutrition(text),
    frontClaims: extractFrontClaims(text),
    uncertainClues: extractUncertainClues(text)
  };
}

function analyzeByRules(input: StructuredFoodText, profile?: FoodAnalyzeRequest['userProfile']): RuleResult {
  const reasons: string[] = [];
  const ingredientHighlights: RuleExplanationInput['ingredientHighlights'] = [];
  const nutritionExplanation: Record<string, string> = {};
  let score = 0;
  const effectiveNutritionCount = Object.keys(input.nutrition).length;

  if (!input.ingredients.length && effectiveNutritionCount < 2) {
    return {
      decision: 'unknown',
      decisionText: '信息不足',
      riskLevel: 'unknown',
      summary: '识别信息还不够，先补拍配料表或营养成分表。',
      plainExplanation: '这次只识别到很少的标签信息，不能可靠判断热量、糖、钠、脂肪和添加剂。',
      mainReasons: ['识别信息不足'],
      suitableFor: [],
      notSuitableFor: ['需要控制糖、盐、脂肪的人不建议按当前结果决策'],
      ingredientHighlights: [],
      nutritionExplanation: {},
      eatingAdvice: '先补拍配料表和营养成分表；如果包装反光或字太小，可以改用手动补充。',
      confidence: 'low'
    };
  }

  const energy = input.nutrition.energy?.value;
  const fat = input.nutrition.fat?.value;
  const carbohydrate = input.nutrition.carbohydrate?.value;
  const sodium = input.nutrition.sodium?.value;
  const transFat = input.nutrition.transFat?.value;
  const ingredientText = input.ingredients.join('、');
  const sugarHits = sugarTerms.filter((term) => ingredientText.includes(term));
  const oilHits = oilTerms.filter((term) => ingredientText.includes(term));
  const sodiumHits = sodiumTerms.filter((term) => ingredientText.includes(term));
  const hasSugar = sugarHits.length > 0;
  const hasOil = oilHits.length > 0;
  const hasSodium = sodiumHits.length > 0;
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
    sugarHits.slice(0, 4).forEach((name) => {
      ingredientHighlights.push({ name, level: 'yellow', explanation: '属于添加糖来源，主要影响甜味和碳水；控糖、减脂或儿童高频食用时要看份量。' });
    });
  }
  if (hasOil) {
    score += 1;
    reasons.push('配料里有油脂来源');
    oilHits.slice(0, 3).forEach((name) => {
      ingredientHighlights.push({ name, level: 'yellow', explanation: '提供酥脆口感，也会拉高脂肪和热量；油炸或膨化零食里很常见。' });
    });
  }
  if (hasSodium) {
    sodiumHits.slice(0, 4).forEach((name) => {
      ingredientHighlights.push({ name, level: 'yellow', explanation: name.includes('味精') || name.includes('谷氨酸钠') ? '常见增鲜成分，主要让咸鲜味更明显，也会和钠摄入相关。' : '提供咸味或调味作用，钠含量偏高时需要一起看份量。' });
    });
  }
  ingredientHighlights.push(...additiveHits);
  if (input.frontClaims.some((claim) => /0糖|零糖|无糖|低糖|无蔗糖|不添加蔗糖/.test(claim)) && hasSugar) {
    reasons.push('包装糖声明需和配料一起看');
  }

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
    ? '偶尔吃更合适，按小份量处理。'
    : decision === 'avoid'
      ? '这次目标下更适合换个选择。'
      : '提醒项不多，按正常份量吃。';
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
  if (decision === 'limit') return '少量尝鲜｜偶尔解馋';
  if (decision === 'caution') return '偶尔吃更合适｜注意份量';
  if (decision === 'avoid') return '不适合这次目标｜换个选择';
  if (decision === 'buy') return '提醒较少｜注意份量';
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
  const parsed = parseNutritionText({ text });
  const result: StructuredFoodText['nutrition'] = {};
  const supportedKeys = new Set<NutritionKey>(['energy', 'protein', 'fat', 'carbohydrate', 'sugar', 'sodium', 'transFat']);

  for (const field of parsed.nutrition) {
    if (!supportedKeys.has(field.key) || !field.value) continue;
    let value = Number.parseFloat(field.value);
    let unit = normalizeUnit(field.unit);
    if (!Number.isFinite(value) || !unit) continue;
    if (field.key === 'energy' && unit === 'kcal') {
      value = Number((value * 4.184).toFixed(1));
      unit = 'kJ';
    }
    if (field.key === 'sodium' && unit === 'g') {
      value = Number((value * 1000).toFixed(1));
      unit = 'mg';
    }
    result[field.key] = {
      value,
      unit,
      level: nutritionLevel(field.key, value),
      text: `${value}${unit}`
    };
  }
  return result;
}

function nutritionLevel(key: string, value: number): string {
  if (key === 'energy') return value >= 1700 ? '偏高' : value >= 500 ? '中等' : '较低';
  if (key === 'fat') return value >= 15 ? '偏高' : value >= 3 ? '中等' : '较低';
  if (key === 'carbohydrate') return value >= 50 ? '高' : value >= 15 ? '中等' : '较低';
  if (key === 'sugar') return value >= 15 ? '偏高' : value >= 5 ? '中等' : '较低';
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
  const match = text.match(/(?:产品类型|食品类别|食品类型|类别)\s*[:：]?\s*([^\n\r，。,；;]{2,30})/);
  if (match) return cleanupLabelValue(match[1]);
  if (/油炸|麻花|薯片|膨化/.test(text)) return /油炸/.test(text) ? '油炸 / 膨化类零食' : '膨化食品 / 零食';
  if (/饼干|糕点/.test(text)) return '糕点 / 零食';
  if (/饮料|果汁|茶饮/.test(text)) return '饮料';
  return '';
}

function extractProductionDate(text: string): string {
  const match = text.match(/(?:生产日期|制造日期|产日期)\s*[:：]?\s*((?:[0-9]{4}|[0-9]{2})[-./年][0-9]{1,2}[-./月][0-9]{1,2}日?)/);
  return match ? cleanupLabelValue(match[1]) : '';
}

function extractFrontClaims(text: string): string[] {
  const matches = text.match(/0糖|零糖|无糖|低糖|少糖|0蔗糖|零蔗糖|无蔗糖|不添加蔗糖|0脂|零脂|低脂|脱脂|少油|非油炸|高蛋白|低钠|减盐|少盐|无添加|不添加|膳食纤维|粗粮|全麦/g);
  return [...new Set(matches || [])].slice(0, 8);
}

function extractUncertainClues(text: string): string[] {
  return text
    .split(/\n+/)
    .map(cleanupLabelValue)
    .filter((line) => /可能|疑似|看不清|模糊|未识别/.test(line))
    .slice(0, 8);
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
