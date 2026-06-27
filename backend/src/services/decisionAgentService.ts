import type { FoodAnalyzeResult, FoodAnalyzeService } from './foodAnalyzeService.js';

export const decisionAgentNames = [
  'product-agent',
  'ui-agent',
  'ocr-agent',
  'nutrition-agent',
  'rule-agent',
  'decision-agent',
  'compare-agent',
  'eval-agent',
  'fix-agent',
  'review-agent'
] as const;

export type DecisionAgentName = typeof decisionAgentNames[number];
export type PurchaseRecommendation = '推荐' | '谨慎' | '不建议' | '信息不足';
type ComparisonSide = 'left' | 'right' | 'tie';

export type DecisionUserProfile = {
  goals?: string[];
  allergens?: string[];
  forChild?: boolean;
  lactoseIntolerant?: boolean;
};

export type ProductDecisionInput = {
  labelText: string;
  productName?: string;
  userProfile?: DecisionUserProfile;
  options?: {
    enableAi?: boolean;
  };
};

export type ProductComparisonInput = {
  left: ProductDecisionInput;
  right: ProductDecisionInput;
  userProfile?: DecisionUserProfile;
};

export type AgentTrace = {
  agent: DecisionAgentName;
  status: 'pass' | 'needs_input' | 'planned';
  summary: string;
};

export type PurchaseDecisionResult = {
  recommendation: PurchaseRecommendation;
  score: number;
  riskReasons: string[];
  suitableFor: string[];
  unsuitableFor: string[];
  alternatives: string[];
};

export type ProductDecisionResult = {
  schemaVersion: 'decision-agent-v1';
  product: {
    name: string;
    category: string;
  };
  ingredient_analysis: {
    ingredients: string[];
    additiveSignals: string[];
  };
  nutrition_analysis: {
    riskLevels: Record<string, string>;
    highlights: string[];
  };
  decision_result: PurchaseDecisionResult;
  user_profile: Required<DecisionUserProfile>;
  behavior_log: {
    event: 'product_decision_generated';
    generatedAt: string;
  };
  agents: AgentTrace[];
  source: FoodAnalyzeResult;
};

export type ProductComparisonResult = {
  schemaVersion: 'comparison-agent-v1';
  healthier: 'left' | 'right' | 'tie';
  lowerRisk: 'left' | 'right' | 'tie';
  betterForProfile: 'left' | 'right' | 'tie';
  summary: string;
  reasons: string[];
  left: ProductDecisionResult;
  right: ProductDecisionResult;
  agents: AgentTrace[];
};

export type DecisionAgentService = {
  analyzeProduct(input: ProductDecisionInput): Promise<ProductDecisionResult>;
  compareProducts(input: ProductComparisonInput): Promise<ProductComparisonResult>;
};

export function createDecisionAgentService(foodAnalyzeService: FoodAnalyzeService): DecisionAgentService {
  return {
    async analyzeProduct(input) {
      const profile = normalizeProfile(input.userProfile);
      const labelText = buildLabelText(input);
      const source = await foodAnalyzeService.analyze({
        ocrText: labelText,
        userProfile: {
          goals: profile.goals,
          allergens: profile.allergens,
          forChild: profile.forChild
        },
        options: {
          enableAi: input.options?.enableAi ?? false
        }
      });
      return buildDecisionResult(source, profile, labelText);
    },

    async compareProducts(input) {
      const profile = normalizeProfile(input.userProfile);
      const left = await this.analyzeProduct({
        ...input.left,
        userProfile: mergeProfile(profile, input.left.userProfile)
      });
      const right = await this.analyzeProduct({
        ...input.right,
        userProfile: mergeProfile(profile, input.right.userProfile)
      });
      return compareDecisionResults(left, right);
    }
  };
}

function buildDecisionResult(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): ProductDecisionResult {
  const evidenceGap = getDecisionEvidenceGap(source, profile, labelText);
  const ruleRiskReasons = buildRiskReasons(source, profile, labelText);
  const riskReasons = evidenceGap
    ? unique([evidenceGap, ...ruleRiskReasons]).slice(0, 3)
    : ruleRiskReasons;
  const recommendation = evidenceGap
    ? '信息不足'
    : toRecommendation(source, riskReasons, profile, labelText);
  const decision_result: PurchaseDecisionResult = {
    recommendation,
    score: toDecisionScore(source, riskReasons, profile, recommendation),
    riskReasons,
    suitableFor: evidenceGap ? ['补齐包装标签后再查看'] : unique(source.suitableFor).slice(0, 4),
    unsuitableFor: evidenceGap ? ['需要明确控糖、低钠、过敏等目标的人'] : buildUnsuitableFor(source, profile, labelText),
    alternatives: evidenceGap ? buildInsufficientAlternatives(evidenceGap) : buildAlternatives(source, riskReasons, profile, labelText)
  };
  return {
    schemaVersion: 'decision-agent-v1',
    product: {
      name: source.productName || '未识别商品',
      category: source.category || '食品'
    },
    ingredient_analysis: {
      ingredients: source.ingredients,
      additiveSignals: source.ingredientHighlights.map((item) => item.name).slice(0, 8)
    },
    nutrition_analysis: {
      riskLevels: Object.fromEntries(Object.entries(source.nutrition).map(([key, value]) => [key, value.level])),
      highlights: Object.values(source.nutritionJudgement).slice(0, 5)
    },
    decision_result,
    user_profile: profile,
    behavior_log: {
      event: 'product_decision_generated',
      generatedAt: new Date().toISOString()
    },
    agents: buildAgentTrace(source, decision_result),
    source
  };
}

function compareDecisionResults(left: ProductDecisionResult, right: ProductDecisionResult): ProductComparisonResult {
  const healthier = compareScore(left.decision_result.score, right.decision_result.score);
  const lowerRisk = compareRiskBurden(left.decision_result, right.decision_result);
  const betterForProfile = compareProfileScore(left.decision_result, right.decision_result);
  const bothUnsuitable = isProfileReject(left.decision_result) && isProfileReject(right.decision_result);
  const winner = bothUnsuitable ? 'tie' : betterForProfile !== 'tie' ? betterForProfile : healthier;
  const summary = bothUnsuitable
    ? '两款都不适合当前画像，优先换第三款。'
    : winner === 'tie'
    ? '两款接近，优先看你最在意的糖、钠、脂肪或过敏项。'
    : `${winner === 'left' ? 'A' : 'B'} 更适合当前画像。`;
  return {
    schemaVersion: 'comparison-agent-v1',
    healthier,
    lowerRisk,
    betterForProfile,
    summary,
    reasons: unique([
      bothUnsuitable ? '两款都不适合当前画像' : '',
      `${labelForSide(healthier)}整体得分更高`,
      `${labelForSide(lowerRisk)}风险提醒更少`,
      `${labelForSide(betterForProfile)}更贴合用户画像`
    ].filter((item) => item && (bothUnsuitable || !item.startsWith('两款')))).slice(0, 3),
    left,
    right,
    agents: [
      ...left.agents,
      ...right.agents,
      { agent: 'compare-agent', status: 'pass', summary },
      { agent: 'review-agent', status: 'pass', summary: '对比结果聚焦健康、风险和画像适配，没有退回到 OCR 工具输出。' }
    ]
  };
}

function compareRiskBurden(left: PurchaseDecisionResult, right: PurchaseDecisionResult): ComparisonSide {
  return compareScore(toRiskBurdenScore(left), toRiskBurdenScore(right));
}

function compareProfileScore(left: PurchaseDecisionResult, right: PurchaseDecisionResult): ComparisonSide {
  if (isProfileReject(left) && isProfileReject(right)) return 'tie';
  return compareScore(toProfileFitScore(left), toProfileFitScore(right));
}

function toRiskBurdenScore(decision: PurchaseDecisionResult): number {
  return decision.score
    - decision.riskReasons.length * 6
    - decision.unsuitableFor.length * 4
    - recommendationPenalty(decision.recommendation);
}

function toProfileFitScore(decision: PurchaseDecisionResult): number {
  const base = Math.min(decision.score, recommendationCeiling(decision.recommendation));
  return base - decision.riskReasons.length * 4 - decision.unsuitableFor.length * 10;
}

function recommendationPenalty(recommendation: PurchaseRecommendation): number {
  if (recommendation === '推荐') return 0;
  if (recommendation === '谨慎') return 20;
  if (recommendation === '不建议') return 60;
  return 55;
}

function recommendationCeiling(recommendation: PurchaseRecommendation): number {
  if (recommendation === '推荐') return 100;
  if (recommendation === '谨慎') return 60;
  if (recommendation === '不建议') return 8;
  return 0;
}

function isProfileReject(decision: PurchaseDecisionResult): boolean {
  return decision.recommendation === '不建议' && decision.unsuitableFor.length > 0;
}

function buildLabelText(input: ProductDecisionInput): string {
  return [input.productName ? `产品名称：${input.productName}` : '', input.labelText].filter(Boolean).join('\n');
}

function normalizeProfile(value: DecisionUserProfile | undefined): Required<DecisionUserProfile> {
  const goals = Array.isArray(value?.goals) ? value.goals.map((item) => String(item || '').trim()).filter(Boolean) : [];
  return {
    goals: unique([
      ...goals,
      value?.forChild ? 'children' : '',
      value?.lactoseIntolerant ? 'lactoseIntolerant' : ''
    ].filter(Boolean)),
    allergens: Array.isArray(value?.allergens) ? value.allergens.map((item) => String(item || '').trim()).filter(Boolean) : [],
    forChild: Boolean(value?.forChild || goals.includes('children')),
    lactoseIntolerant: Boolean(value?.lactoseIntolerant || goals.includes('lactoseIntolerant'))
  };
}

function mergeProfile(base: Required<DecisionUserProfile>, override: DecisionUserProfile | undefined): DecisionUserProfile {
  return {
    goals: unique([...base.goals, ...(override?.goals || [])]),
    allergens: unique([...base.allergens, ...(override?.allergens || [])]),
    forChild: Boolean(base.forChild || override?.forChild),
    lactoseIntolerant: Boolean(base.lactoseIntolerant || override?.lactoseIntolerant)
  };
}

function toRecommendation(source: FoodAnalyzeResult, riskReasons: string[], profile: Required<DecisionUserProfile>, labelText: string): PurchaseRecommendation {
  if (source.decision === 'unknown' && source.confidence === 'low') return '信息不足';
  if (hasHardProfileConflict(source, profile, labelText)) return '不建议';
  if (hasStrongSugarProfileConflict(source, profile)) return '不建议';
  if (source.decision === 'unknown') return riskReasons.length ? '谨慎' : '信息不足';
  if (source.decision === 'avoid' || source.decision === 'limit') return '不建议';
  if (source.decision === 'caution') return '谨慎';
  if (hasDefaultSugarLoadRisk(source)) return '谨慎';
  if (hasSoftProfileConflict(source, profile, labelText)) return '谨慎';
  return '推荐';
}

function getDecisionEvidenceGap(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): string {
  if (hasHardProfileConflict(source, profile, labelText)) return '';
  const ingredientCount = source.ingredients.length;
  const nutritionKeys = Object.keys(source.nutrition);
  const nutritionCount = nutritionKeys.length;
  if (!ingredientCount && nutritionCount < 2) return '缺少配料表和营养成分表，不能判断是否值得购买。';
  if (!ingredientCount) return '缺少配料表，不能核对添加剂、过敏原和配料顺序。';
  if (nutritionCount < 3) return '缺少营养成分表关键数字，不能核对糖、钠、脂肪和能量。';
  if (hasGoal(profile, ['sugar', 'sugar_control']) && source.nutrition.sugar === undefined && source.nutrition.carbohydrate === undefined) {
    return '控糖判断需要糖或碳水化合物数字，当前不能判断是否适合控糖。';
  }
  if (hasGoal(profile, ['lowSodium', 'low_sodium']) && source.nutrition.sodium === undefined) {
    return '低钠判断需要钠数字，当前不能判断是否适合低钠。';
  }
  if (hasGoal(profile, ['fatLoss', 'fat_control']) && source.nutrition.fat === undefined && source.nutrition.energy === undefined) {
    return '减脂判断需要脂肪或能量数字，当前不能判断是否适合减脂。';
  }
  return '';
}

function toDecisionScore(source: FoodAnalyzeResult, riskReasons: string[], profile: Required<DecisionUserProfile>, recommendation: PurchaseRecommendation): number {
  const base = recommendation === '推荐' ? 82 : recommendation === '谨慎' ? 58 : recommendation === '不建议' ? 24 : 0;
  const profilePenalty = profile.goals.length && source.notSuitableFor.length ? 8 : 0;
  return clamp(base - riskReasons.length * 4 - profilePenalty, 0, 100);
}

function buildRiskReasons(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): string[] {
  return unique([
    hasAllergenRisk(source, profile, labelText) ? '命中过敏/忌口项' : '',
    hasLactoseRisk(source, profile) ? '含乳或乳糖线索' : '',
    hasGeneralAllergenRisk(source, profile, labelText) ? '常见过敏原需核对' : '',
    hasDefaultSugarLoadRisk(source) ? '高糖饮品默认需谨慎' : '',
    hasChildRisk(source, profile) ? '儿童高频食用需留意' : '',
    hasSugarRisk(source, profile) ? '控糖目标下糖/碳水需留意' : '',
    hasFatLossRisk(source, profile) ? '减脂目标下热量/脂肪需留意' : '',
    ...source.mainReasons,
  ].filter(Boolean)).slice(0, 3);
}

function buildUnsuitableFor(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): string[] {
  const evidenceText = combinedEvidenceText(source, labelText);
  const profileLabels = [
    ...profile.allergens
      .filter((item) => item && containsAnyAllergen(evidenceText, allergenAliases(item)))
      .map((item) => `${item}过敏或忌口人群`),
    hasLactoseRisk(source, profile) ? '乳糖不耐人群' : '',
    hasGeneralAllergenRisk(source, profile, labelText) ? '常见过敏原敏感人群' : '',
    profile.forChild && (hasChildRisk(source, profile) || source.notSuitableFor.includes('儿童高频食用')) ? '儿童高频食用' : '',
    hasSugarRisk(source, profile) || hasDefaultSugarLoadRisk(source) ? '控糖人群' : '',
    hasFatLossRisk(source, profile) ? '减脂期' : '',
    hasLowSodiumRisk(source, profile) ? '低钠关注人群' : ''
  ].filter(Boolean);
  return unique([...profileLabels, ...source.notSuitableFor]).slice(0, 4);
}

function buildAlternatives(source: FoodAnalyzeResult, riskReasons: string[], profile: Required<DecisionUserProfile>, labelText: string): string[] {
  const alternatives = [
    hasAllergenRisk(source, profile, labelText) || hasGeneralAllergenRisk(source, profile, labelText) ? '过敏或忌口命中时，换明确不含该成分的同类产品。' : '',
    riskReasons.some((item) => /糖|碳水/.test(item)) || profile.goals.includes('sugar') ? '选糖/糖浆更靠后、营养表糖更低的同类产品。' : '',
    riskReasons.some((item) => /钠|盐/.test(item)) || profile.goals.includes('lowSodium') ? '选钠更低、盐和味精更靠后的同类产品。' : '',
    riskReasons.some((item) => /脂肪|热量|油/.test(item)) || profile.goals.includes('fatLoss') ? '选脂肪和能量更低、非油炸的同类产品。' : '',
    profile.forChild ? '给儿童高频吃时，优先选配料更短、少甜味剂/色素的产品。' : '',
    profile.lactoseIntolerant ? '乳糖不耐时，优先选明确无乳糖或植物基替代品。' : ''
  ].filter(Boolean);
  if (!alternatives.length && source.decision !== 'buy') alternatives.push('换一款配料更短、营养表糖/钠/脂肪更低的同类产品。');
  if (!alternatives.length) alternatives.push('同类产品中优先选择配料更短、糖钠脂更低的一款。');
  return unique(alternatives).slice(0, 3);
}

function buildInsufficientAlternatives(reason: string): string[] {
  const needsIngredient = /配料/.test(reason);
  const needsNutrition = /营养|糖|钠|脂肪|能量|碳水/.test(reason);
  return unique([
    needsIngredient ? '补拍配料表，确认添加剂、过敏原和配料顺序。' : '',
    needsNutrition ? '补拍营养成分表，确认糖、钠、脂肪、能量等数字。' : '',
    '信息补齐前不要把商品正面卖点或公开资料当作购买结论。'
  ].filter(Boolean)).slice(0, 3);
}

function buildAgentTrace(source: FoodAnalyzeResult, decision: PurchaseDecisionResult): AgentTrace[] {
  return [
    { agent: 'product-agent', status: 'pass', summary: '产品路径固定为拍照到购买建议。' },
    { agent: 'ui-agent', status: 'pass', summary: '输出契约为结论、风险、替代三卡。' },
    { agent: 'ocr-agent', status: source.confidence === 'low' ? 'needs_input' : 'pass', summary: source.confidence === 'low' ? '识别信息不足，需要补拍或手动补充。' : '已有可分析标签文字。' },
    { agent: 'nutrition-agent', status: Object.keys(source.nutrition).length ? 'pass' : 'needs_input', summary: Object.keys(source.nutrition).length ? '营养字段已进入判断。' : '缺少营养字段。' },
    { agent: 'rule-agent', status: 'pass', summary: '使用本地规则与可信边界生成风险原因。' },
    { agent: 'decision-agent', status: decision.recommendation === '信息不足' ? 'needs_input' : 'pass', summary: `购买建议：${decision.recommendation}` },
    { agent: 'compare-agent', status: 'planned', summary: '单品结果可进入 A/B 对比。' },
    { agent: 'eval-agent', status: 'planned', summary: '由 npm run eval:all 执行一致性评测。' },
    { agent: 'fix-agent', status: 'planned', summary: '评测失败后按 checkpoint 下一步修复。' },
    { agent: 'review-agent', status: decision.riskReasons.length <= 3 ? 'pass' : 'needs_input', summary: '独立检查输出是否保持决策优先、风险最多三条且不暴露 OCR 原文。' }
  ];
}

function compareScore(left: number, right: number): 'left' | 'right' | 'tie' {
  if (Math.abs(left - right) <= 3) return 'tie';
  return left > right ? 'left' : 'right';
}

function labelForSide(side: 'left' | 'right' | 'tie'): string {
  if (side === 'left') return 'A ';
  if (side === 'right') return 'B ';
  return '两款';
}

function hasHardProfileConflict(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): boolean {
  return hasAllergenRisk(source, profile, labelText) || hasLactoseRisk(source, profile);
}

function hasSoftProfileConflict(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): boolean {
  return hasGeneralAllergenRisk(source, profile, labelText)
    || hasSugarRisk(source, profile)
    || hasFatLossRisk(source, profile)
    || hasLowSodiumRisk(source, profile)
    || hasChildRisk(source, profile);
}

function hasStrongSugarProfileConflict(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return hasGoal(profile, ['sugar', 'sugar_control']) && hasDefaultSugarLoadRisk(source);
}

function hasAllergenRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): boolean {
  const text = combinedEvidenceText(source, labelText);
  return profile.allergens.some((item) => item && containsAnyAllergen(text, allergenAliases(item)));
}

function hasLactoseRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return profile.lactoseIntolerant && /乳|奶|乳糖/.test(source.ingredients.join('、'));
}

function hasChildRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return profile.forChild && /甜味剂|咖啡因|色素|防腐剂/.test(source.ingredients.join('、'));
}

function hasGeneralAllergenRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>, labelText: string): boolean {
  return hasGoal(profile, ['allergy', 'allergen', 'allergen_avoid', 'avoidAllergens'])
    && detectCommonAllergens(source, labelText).length > 0;
}

function hasDefaultSugarLoadRisk(source: FoodAnalyzeResult): boolean {
  const sugar = source.nutrition.sugar?.value;
  const carbohydrate = source.nutrition.carbohydrate?.value;
  const isDrink = /饮|茶|乳酸菌|奶茶|果汁/.test(`${source.productName}${source.category}`);
  if (sugar !== undefined && sugar >= 10) return true;
  return Boolean(isDrink && carbohydrate !== undefined && carbohydrate >= 10 && source.mainReasons.some((item) => /糖/.test(item)));
}

function hasSugarRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return hasGoal(profile, ['sugar', 'sugar_control']) && hasReasonOrNutritionRisk(source, /糖|碳水/, ['sugar', 'carbohydrate']);
}

function hasFatLossRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return hasGoal(profile, ['fatLoss', 'fat_control']) && hasReasonOrNutritionRisk(source, /脂肪|热量|油/, ['energy', 'fat']);
}

function hasLowSodiumRisk(source: FoodAnalyzeResult, profile: Required<DecisionUserProfile>): boolean {
  return hasGoal(profile, ['lowSodium', 'low_sodium']) && hasReasonOrNutritionRisk(source, /钠|盐/, ['sodium']);
}

function hasGoal(profile: Required<DecisionUserProfile>, names: string[]): boolean {
  return names.some((name) => profile.goals.includes(name));
}

function hasReasonOrNutritionRisk(source: FoodAnalyzeResult, reasonPattern: RegExp, nutritionKeys: string[]): boolean {
  if (source.mainReasons.some((item) => reasonPattern.test(item))) return true;
  return nutritionKeys.some((key) => ['偏高', '高'].includes(source.nutrition[key]?.level || ''));
}

function detectCommonAllergens(source: FoodAnalyzeResult, labelText: string): string[] {
  const text = combinedEvidenceText(source, labelText);
  return commonAllergenGroups
    .filter((group) => containsAnyAllergen(text, group.aliases))
    .map((group) => group.label);
}

function combinedEvidenceText(source: FoodAnalyzeResult, labelText: string): string {
  return `${source.ingredients.join('、')}\n${labelText}`;
}

function containsAnyAllergen(text: string, terms: string[]): boolean {
  return terms.some((term) => {
    if (!term || !text.includes(term)) return false;
    const withoutNegatedClaims = text.replace(new RegExp(`(?:无|不含|未添加|不添加)${escapeRegExp(term)}`, 'g'), '');
    return withoutNegatedClaims.includes(term);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function allergenAliases(value: string): string[] {
  const normalized = value.trim();
  const group = commonAllergenGroups.find((item) => item.label === normalized || item.aliases.includes(normalized));
  return unique([normalized, ...(group?.aliases || [])]);
}

const commonAllergenGroups = [
  { label: '牛奶', aliases: ['牛奶', '牛乳', '生牛乳', '奶粉', '乳粉', '乳清', '乳糖', '乳制品', '含有牛奶'] },
  { label: '大豆', aliases: ['大豆', '黄豆', '豆乳', '豆粉', '大豆蛋白', '含有大豆'] },
  { label: '花生', aliases: ['花生', '花生酱', '花生仁', '含有花生'] },
  { label: '坚果', aliases: ['坚果', '杏仁', '腰果', '核桃', '榛子', '开心果'] },
  { label: '麸质', aliases: ['小麦', '麸质', '麦麸', '面粉', '小麦粉'] },
  { label: '鸡蛋', aliases: ['鸡蛋', '蛋黄', '蛋白', '全蛋粉'] },
  { label: '鱼类', aliases: ['鱼类', '鱼肉', '鱼粉'] },
  { label: '虾蟹类', aliases: ['虾', '蟹', '甲壳类'] }
];

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
