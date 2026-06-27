import { allergenOptions, decisionPersonalizationRules } from '@/constants/attention';
import type { AdditiveRecognition, AttentionSettings, ConsumerDecision, IngredientMatch, LabelReport, NutritionField, NutritionKey, NutritionSnapshotItem, PurchaseDecision, PurchaseRecommendation } from '@/types';
import { recognizeAdditives, summarizeAdditiveRecognitions } from './additiveRules';

type DecisionSignal = {
  tag: string;
  score: number;
  reason: string;
  lessSuitableFor: string[];
  suggestions: string[];
  priority?: 'configured_allergen' | 'general_allergen';
};

type NutritionBasis = 'per100g' | 'per100ml' | 'perServing' | 'unknown';

const sugarTerms = ['白砂糖', '蔗糖', '葡萄糖', '果糖', '葡萄糖浆', '麦芽糖', '麦芽糖浆', '麦芽糊精', '果葡糖浆', '玉米糖浆', '糖浆', '蜂蜜', '浓缩果汁', '碳水化合物'];
const sweetenerTerms = ['阿斯巴甜', '安赛蜜', '三氯蔗糖', '甜蜜素', '糖精钠', '赤藓糖醇', '木糖醇', '甜味剂'];
const sodiumTerms = ['食盐', '食用盐', '氯化钠', '谷氨酸钠', '味精', '碳酸氢钠', '亚硝酸钠', '呈味核苷酸', '酱油粉', '复合调味料'];
const fatTerms = ['脂肪', '饱和脂肪', '反式脂肪', '植物油', '棕榈油', '起酥油', '人造奶油', '氢化植物油', '氢化菜籽油', '氢化油', '精炼植物油', '植脂末', '代可可脂'];
const hydrogenatedOilTerms = ['氢化植物油', '氢化菜籽油', '氢化油', '起酥油', '人造奶油', '植脂末', '代可可脂'];
const preservativeTerms = ['山梨酸钾', '苯甲酸钠', '脱氢乙酸钠', '防腐剂'];
const colorTerms = ['色素', '柠檬黄', '日落黄', '胭脂红', '诱惑红', '亮蓝', '焦糖色'];
const caffeineTerms = ['咖啡因', '咖啡粉', '瓜拉纳'];
const alcoholTerms = ['酒精', '食用酒精', '白酒', '朗姆酒', '利口酒'];

const allergenGroups = [
  { label: '乳制品', terms: ['牛奶', '牛乳', '生牛乳', '羊乳', '乳粉', '奶粉', '乳清', '奶油', '乳糖', '炼乳', '乳制品'] },
  { label: '花生/坚果', terms: ['花生', '坚果', '杏仁', '核桃', '腰果', '榛子', '开心果'] },
  { label: '鸡蛋', terms: ['鸡蛋', '蛋黄', '蛋清', '全蛋', '蛋粉'] },
  { label: '大豆', terms: ['大豆', '黄豆', '豆粉', '豆乳'] },
  { label: '麸质', terms: ['小麦', '麦麸', '麸质', '面粉'] },
  { label: '海鲜', terms: ['虾', '蟹', '鱼', '贝类'] }
];

export function enrichReportDecision(report: LabelReport, attention?: AttentionSettings): LabelReport {
  const additiveRecognition = summarizeAdditiveRecognitions(buildAdditiveRecognitions(report, attention));
  const nutritionSnapshot = buildNutritionSnapshot(report.nutritionSection.fields, attention);
  const enrichedReport = {
    ...report,
    additiveRecognition,
    nutritionSnapshot
  };
  const decision = buildConsumerDecision(enrichedReport, attention);
  const hasEffectiveNutrition = countNutritionValues(report.nutritionSection.fields) > 0;
  return {
    ...enrichedReport,
    nutritionSnapshot: decision.level === 'insufficient' || !hasEffectiveNutrition
      ? []
      : nutritionSnapshot.filter((item) => item.level !== '未识别'),
    decision,
    purchaseDecision: buildPurchaseDecision({ ...enrichedReport, decision }, attention)
  };
}

export function buildPurchaseDecision(report: LabelReport, attention?: AttentionSettings): PurchaseDecision {
  const decision = report.decision || buildConsumerDecision(report, attention);
  const foodAnalysis = report.foodAnalysis;
  const qualityWarnings = getQualityWarnings(report);
  const allergyWarnings = decision.allergyWarnings || [];
  const generalAllergenWarnings = allergyWarnings.length ? [] : buildGeneralAllergyWarnings(report);
  let recommendation = recommendationForDecision(decision);
  if (qualityWarnings.length && recommendation === '推荐') recommendation = '谨慎';
  const riskReasons = filterRiskReasonsByNutrition(buildRiskReasons({
    allergyWarnings,
    generalAllergenWarnings,
    qualityWarnings,
    foodAnalysisReasons: foodAnalysis?.mainReasons || [],
    decisionReasons: decision.reasons,
    watchPoints: decision.watchPoints,
    recommendation,
    attention
  }), report.nutritionSection.fields, attention);
  const hasGeneralAllergenReminder = riskReasons.some((item) => /常见过敏原|条件提醒|过敏人群|过敏或严格忌口|致敏|相关人群提醒/.test(item));
  const suitableFor = unique([
    ...(foodAnalysis?.suitableFor || []),
    ...decision.suitableFor
  ]).slice(0, 4);
  const unsuitableFor = filterUnsuitableForByAllergenContext(unique([
    ...(foodAnalysis?.notSuitableFor || []),
    ...decision.lessSuitableFor,
    ...profileUnsuitableFor(attention)
  ]), attention).slice(0, 4);
  const alternatives = unique([
    ...buildProfileAlternatives(attention, riskReasons),
    ...decision.suggestions
  ]).slice(0, 3);
  return {
    recommendation,
    score: normalizeVisiblePurchaseScore({
      decision,
      recommendation,
      hasQualityWarnings: qualityWarnings.length > 0,
      hasGeneralAllergenReminder
    }),
    riskReasons: riskReasons.length ? riskReasons : recommendation === '推荐' ? ['未发现明显糖、钠、脂肪或过敏重点项'] : ['信息不足，需要补拍或补充标签文字'],
    suitableFor: suitableFor.length ? suitableFor : ['普通成年人按份量选择'],
    unsuitableFor: unsuitableFor.length ? unsuitableFor : ['对特定成分敏感的人仍需查看包装提示'],
    alternatives: alternatives.length ? alternatives : ['同类产品中优先选择配料更短、糖钠脂更低的一款。']
  };
}

export function buildConsumerDecision(report: LabelReport, attention?: AttentionSettings): ConsumerDecision {
  const ingredients = report.ingredientSection.items || [];
  const nutrition = report.nutritionSection.fields || [];
  const text = buildDecisionSignalText(report, ingredients);

  const insufficientReason = getInsufficientReason(report, ingredients, nutrition, attention);
  if (insufficientReason) return buildInsufficientDecision(insufficientReason);

  const additiveRecognitions = report.additiveRecognition?.items?.length
    ? report.additiveRecognition.items
    : buildAdditiveRecognitions(report, attention);
  const allergyWarnings = buildConfiguredAllergyWarnings(report, attention);
  const generalAllergenWarnings = allergyWarnings.length ? [] : buildGeneralAllergyWarnings(report);
  const hasCompleteEvidence = hasCompleteLabelEvidence(report, ingredients, nutrition);
  const signals = sortSignalsByPriority([
    ...buildIngredientSignals(text, ingredients, attention, hasCompleteEvidence),
    ...buildAdditiveSignals(additiveRecognitions, attention),
    ...buildNutritionSignals(nutrition, attention),
    ...buildAttentionSignals(report, attention)
  ], attention);
  const score = signals.reduce((sum, item) => sum + item.score, 0) + (allergyWarnings.length ? 6 : 0);
  const resolvedLevel = resolveLevel(score, signals, attention);
  const level = allergyWarnings.length
    ? 'alternative'
    : resolvedLevel;
  const label = labelForLevel(level);
  const tags = unique(signals.map((item) => item.tag)).slice(0, 8);
  const reasons = unique(signals.map((item) => item.reason)).slice(0, 6);
  const lessSuitableFor = unique(signals.flatMap((item) => item.lessSuitableFor)).slice(0, 6);
  const suggestions = buildSuggestions(level, signals, report, allergyWarnings, attention, generalAllergenWarnings);
  const watchPoints = unique([
    ...allergyWarnings,
    ...generalAllergenWarnings,
    ...reasons
  ]).slice(0, 4);

  return {
    level,
    label,
    summary: buildSummary(level, signals, allergyWarnings, attention),
    tags: tags.length ? tags : ['普通提示'],
    watchPoints: watchPoints.length ? watchPoints : ['这次未发现明显重点项，请结合包装实物确认。'],
    allergyWarnings,
    suitableFor: buildSuitableFor(level, signals, nutrition),
    lessSuitableFor: lessSuitableFor.length ? lessSuitableFor : ['对某些配料敏感的人仍需看包装提示'],
    reasons: reasons.length ? reasons : ['没有识别到需要优先提醒的配料或营养字段。'],
    suggestions,
    score
  };
}

function recommendationForDecision(decision: ConsumerDecision): PurchaseRecommendation {
  if (decision.level === 'insufficient') return '信息不足';
  if (decision.level === 'alternative') return '不建议';
  if (decision.level === 'caution' || decision.level === 'occasional') return '谨慎';
  return '推荐';
}

function normalizePurchaseScore(decision: ConsumerDecision, recommendation: PurchaseRecommendation): number {
  if (recommendation === '信息不足') return 0;
  if (recommendation === '推荐') return Math.max(70, 100 - decision.score * 4);
  if (recommendation === '谨慎') return Math.max(38, Math.min(69, 70 - decision.score * 2));
  return Math.max(1, Math.min(37, 45 - decision.score * 2));
}

function normalizeVisiblePurchaseScore(input: {
  decision: ConsumerDecision;
  recommendation: PurchaseRecommendation;
  hasQualityWarnings: boolean;
  hasGeneralAllergenReminder: boolean;
}): number {
  const score = normalizePurchaseScore(input.decision, input.recommendation);
  if (input.hasQualityWarnings && input.recommendation === '谨慎') return Math.min(62, score);
  if (input.hasGeneralAllergenReminder && input.recommendation === '推荐') return Math.min(88, score);
  return score;
}

function profileUnsuitableFor(attention?: AttentionSettings): string[] {
  if (!attention) return [];
  return [
    attention.targetGoals.includes('children') || attention.isChildrenMode ? '儿童高频食用' : '',
    attention.targetGoals.includes('sugar') || attention.primaryGoal === 'sugar' ? '控糖人群' : '',
    attention.targetGoals.includes('fatLoss') || attention.primaryGoal === 'fatLoss' ? '减脂期' : '',
    attention.targetGoals.includes('lowSodium') || attention.primaryGoal === 'lowSodium' ? '低钠关注人群' : ''
  ].filter(Boolean);
}

function filterUnsuitableForByAllergenContext(items: string[], attention?: AttentionSettings): string[] {
  const selectedLabels = selectedAllergenLabels(attention);
  return items.filter((item) => {
    if (/^对.+过敏或严格忌口的人$/u.test(item)) return false;
    if (/^过敏\/忌口人群$/u.test(item)) return false;
    if (/过敏\/忌口人群/u.test(item) && selectedLabels.length) {
      return selectedLabels.some((label) => item.includes(label))
        || (selectedLabels.includes('花生') && item.includes('花生'))
        || (selectedLabels.includes('坚果') && item.includes('坚果'));
    }
    return true;
  });
}

function buildProfileAlternatives(attention: AttentionSettings | undefined, reasons: string[]): string[] {
  const reasonText = reasons.join(' ');
  const selectedAllergens = selectedAllergenLabels(attention);
  const generalAllergens = matchedGeneralAllergenLabels(reasonText);
  const sugarRules = decisionPersonalizationRules.sugarControl;
  return [
    selectedAllergens.length
      ? `已设置${selectedAllergens.join('、')}忌口，替代款必须在配料表和致敏原提示里都不出现这些词；不确定时按不适合处理。`
      : '',
    !selectedAllergens.length && generalAllergens.length
      ? `如对${generalAllergens.join('、')}过敏或严格忌口，替代款要明确无对应致敏原提示，并建议先到关注项里设置。`
      : '',
    attention?.targetGoals.includes('sugar') || attention?.primaryGoal === 'sugar' || /糖|碳水/.test(reasonText)
      ? `控糖优先选糖≤${sugarRules.preferredDrinkSugarPer100ml}g/100ml或≤${sugarRules.preferredSolidSugarPer100g}g/100g、碳水≤${sugarRules.preferredDrinkCarbPer100ml}g/100ml，且白砂糖/果葡糖浆不在配料前${sugarRules.ingredientTopRank}位的同类。`
      : '',
    attention?.targetGoals.includes('fatLoss') || attention?.primaryGoal === 'fatLoss' || /脂肪|热量|油/.test(reasonText)
      ? '减脂优先选能量更低、非油炸，且脂肪≤8g/100g或≤1.5g/100ml、没有植脂末/起酥油的同类。'
      : '',
    attention?.targetGoals.includes('lowSodium') || attention?.primaryGoal === 'lowSodium' || /钠|盐/.test(reasonText)
      ? '低钠优先选钠≤300mg/100g；儿童或控盐更严格时看≤120mg/100g，并让食盐/味精/酱油粉靠后。'
      : '',
    attention?.targetGoals.includes('children') || attention?.isChildrenMode
      ? `儿童高频吃优先选配料更短、无咖啡因/酒精，少色素和甜味剂，糖尽量≤${sugarRules.preferredDrinkSugarPer100ml}g/100ml或≤${sugarRules.preferredSolidSugarPer100g}g/100g。${decisionPersonalizationRules.children.portionHint}`
      : ''
  ].filter(Boolean);
}

function selectedAllergenLabels(attention?: AttentionSettings): string[] {
  if (!attention?.allergens.length) return [];
  return allergenOptions
    .filter((option) => attention.allergens.includes(option.key))
    .map((option) => option.label)
    .slice(0, 3);
}

function matchedGeneralAllergenLabels(text: string): string[] {
  return allergenGroups
    .filter((group) => text.includes(group.label) || group.terms.some((term) => text.includes(term)))
    .map((group) => group.label)
    .slice(0, 3);
}

function getQualityWarnings(report: LabelReport): string[] {
  const hasCompleteEvidence = hasCompleteLabelEvidence(report);
  const qualityWarnings = (report.analysisSource?.qualityWarnings || []).map((warning) => (
    hasCompleteEvidence && /AI|公开标签|未完整|未获取/.test(warning) && /补拍|手动补充/.test(warning)
      ? 'AI 公开标签线索未完整返回，本次仍以已识别的包装标签文字为准。'
      : warning
  ));
  return unique([
    ...qualityWarnings,
    report.analysisSource?.aiSearchErrorCode
      ? hasCompleteEvidence
        ? 'AI 公开标签线索未完整返回，本次仍以已识别的包装标签文字为准。'
        : 'AI 公开标签线索未完整返回，需要补拍包装标签确认。'
      : '',
    report.ingredientSection.items.some((item) => item.sourceType === 'degraded_backend')
      ? '成分库接口暂不可用，本次配料匹配处于降级状态，请结合包装文字确认。'
      : ''
  ].filter(Boolean)).slice(0, 2);
}

function getInsufficientReason(report: LabelReport, ingredients: IngredientMatch[], nutrition: NutritionField[], attention?: AttentionSettings): string {
  const source = report.analysisSource;
  const sourceConfidence = source?.confidence;
  const sourceIngredientText = String(source?.ingredientText || '').trim();
  const sourceNutritionText = String(source?.nutritionText || '').trim();
  const sourceQualityText = normalizeText([
    ...(source?.qualityWarnings || []),
    ...(source?.unconfirmedText || [])
  ].join(' '));
  const sourceText = normalizeText([
    report.rawText,
    source?.ocrText,
    sourceIngredientText,
    sourceNutritionText,
    source?.frontClaimsText
  ].join(' '));
  const combinedSourceText = normalizeText(`${sourceText} ${sourceQualityText}`);
  const hasUsefulProductName = hasMeaningfulProductName(report.productName || source?.productNameText || source?.recognition?.productName || '');
  const ingredientCount = ingredients.length;
  const hasIngredientEvidence = Boolean(ingredientCount || isUsableLabelSectionText(sourceIngredientText, 'ingredient'));
  const hasNutritionEvidence = hasNutritionValues(nutrition);
  const nutritionValueCount = countNutritionValues(nutrition);
  const rawText = normalizeText(report.rawText || source?.ocrText || '');
  const hasConfiguredAllergenStop = buildConfiguredAllergyWarnings(report, attention).length > 0;
  if (isExplicitNoLabelCapture(combinedSourceText)) {
    return '这张图没有可用配料表或营养成分表，不能判断是否值得购买。';
  }
  if (isLikelyUnreadableCapture(combinedSourceText) && (!hasUsefulProductName || ingredientCount < 3 || nutritionValueCount < 3)) {
    return '图片可能存在模糊、倾斜、反光或遮挡，当前文字不足以形成购买建议。';
  }
  if (!rawText && !hasIngredientEvidence && !hasNutritionEvidence) return '没有识别到可用于查看的包装文字。';
  if (sourceConfidence === 'low' && !hasIngredientEvidence && !hasNutritionEvidence) return '识别结果可能不完整，当前文字不足以形成清晰建议。';
  if (sourceConfidence === 'low' && (!hasIngredientEvidence || ingredientCount < 3) && nutritionValueCount < 3) return '只识别到很少的配料或营养数字，当前文字不足以形成清晰建议。';
  if (!hasUsefulProductName && sourceConfidence !== 'high' && ingredientCount < 3 && nutritionValueCount < 3) return '商品身份和关键标签字段都不完整，请补拍清晰配料表或营养成分表。';
  if (!hasIngredientEvidence && !hasNutritionEvidence) return '没有识别到清晰的配料表或营养成分表。';
  if (isMostlyAdCopy(rawText) && !hasIngredientEvidence && !hasNutritionEvidence) return '当前文字更像广告语或包装卖点，缺少有效配料表。';
  const profileMissingReason = getProfileCriticalNutritionMissingReason(nutrition, attention);
  if (profileMissingReason) return profileMissingReason;
  if (!hasIngredientEvidence && !hasConfiguredAllergenStop) return '缺少配料表，不能核对添加剂、过敏原和配料顺序，先补拍后再判断是否值得购买。';
  if (!hasNutritionEvidence && !hasConfiguredAllergenStop) return '缺少营养成分表，不能核对糖、钠、脂肪和能量数字，先补拍后再判断是否值得购买。';
  if (nutritionValueCount > 0 && nutritionValueCount < 3 && !hasConfiguredAllergenStop) return '营养成分表关键数字不完整，不能形成完整购买建议。';
  return '';
}

function getProfileCriticalNutritionMissingReason(nutrition: NutritionField[], attention?: AttentionSettings): string {
  if (!attention) return '';
  if (hasGoal(attention, 'sugar_control') && !hasNutritionValue(nutrition, 'sugar') && !hasNutritionValue(nutrition, 'carbohydrate')) {
    return '控糖判断需要糖或碳水化合物数字；当前缺少营养成分表关键数字，不能判断是否适合控糖。';
  }
  if (hasGoal(attention, 'low_sodium') && !hasNutritionValue(nutrition, 'sodium') && !hasNutritionValue(nutrition, 'salt')) {
    return '低钠判断需要钠或盐数字；当前缺少营养成分表关键数字，不能判断是否适合低钠。';
  }
  if (hasGoal(attention, 'fat_control') && !hasNutritionValue(nutrition, 'fat') && !hasNutritionValue(nutrition, 'energy')) {
    return '减脂判断需要脂肪或能量数字；当前缺少营养成分表关键数字，不能判断是否适合减脂。';
  }
  return '';
}

function isExplicitNoLabelCapture(text: string): boolean {
  return /(?:没有|无)(?:食品)?标签文字/.test(text)
    || /(?:没有|无)配料表/.test(text)
    || /(?:没有|无)营养成分表/.test(text)
    || /未(?:展示|提供|拍到|看到|获取|识别到)(?:完整)?(?:的)?配料表/.test(text)
    || /未(?:展示|提供|拍到|看到|获取|识别到)(?:完整)?(?:的)?营养成分表/.test(text)
    || /缺(?:少|失)(?:完整)?(?:的)?配料表/.test(text)
    || /缺(?:少|失)(?:完整)?(?:的)?营养成分表/.test(text)
    || /纯色包装正面/.test(text)
    || /只有包装正面/.test(text);
}

function isUsableLabelSectionText(value: string, section: 'ingredient' | 'nutrition'): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  const label = section === 'ingredient' ? '配料表' : '营养成分表';
  const negativePattern = new RegExp(`(?:没有|无|未展示|未提供|未拍到|未看到|未获取|未识别到|缺少|缺失)(?:完整)?(?:的)?${label}`, 'u');
  if (negativePattern.test(text)) return false;
  if (/纯色包装正面|只有包装正面|未展示配料表或营养成分表/.test(text)) return false;
  return true;
}

function isLikelyUnreadableCapture(text: string): boolean {
  return /模糊|拍糊|倾斜|反光|眩光|遮挡|看不清|文字偏少|低置信|失败恢复|OCR\s*(?:未成功|失败)|识别失败/i.test(text);
}

function hasMeaningfulProductName(value: string): boolean {
  const name = normalizeText(value).replace(/\s+/g, '');
  if (!name) return false;
  return !/^(未命名食品|未识别商品|未知食品|这款食品|食品标签|包装正面|购买建议)$/u.test(name);
}

function buildInsufficientDecision(reason: string): ConsumerDecision {
  const needsNutrition = /营养|数字/.test(reason);
  const needsIngredient = /配料/.test(reason) || !needsNutrition;
  const missingParts = [
    needsIngredient ? '配料表' : '',
    needsNutrition ? '营养成分表数字' : '',
    '过敏原提示'
  ].filter(Boolean).join('、');
  const summary = `信息不足，请补拍${missingParts}，或手动补充对应文字。`;
  return {
    level: 'insufficient',
    label: '信息不足',
    summary,
    tags: ['信息不足'],
    watchPoints: [reason, summary],
    allergyWarnings: [],
    suitableFor: ['补充包装文字后再查看'],
    lessSuitableFor: ['需要明确控糖、低钠、过敏等目标的人'],
    reasons: [reason],
    suggestions: [
      needsIngredient ? '配料表尽量占满画面。' : '',
      needsNutrition ? '营养成分表数字需要拍清。' : '',
      '过敏提示可以单独补拍或手动补充。'
    ].filter(Boolean),
    score: 0
  };
}

export function compareConsumerDecision(left: LabelReport, right: LabelReport): {
  winner: 'left' | 'right' | 'tie';
  title: string;
  reasons: string[];
} {
  const leftDecision = left.decision || buildConsumerDecision(left);
  const rightDecision = right.decision || buildConsumerDecision(right);
  const diff = leftDecision.score - rightDecision.score;
  if (Math.abs(diff) <= 1) {
    return {
      winner: 'tie',
      title: '两款提醒接近',
      reasons: [
        '两款在本地规则里的提醒数量接近。',
        '糖、钠、添加剂和关注成分是主要差异点。'
      ]
    };
  }
  const leftWins = diff < 0;
  const winner = leftWins ? left : right;
  const decision = leftWins ? leftDecision : rightDecision;
  return {
    winner: leftWins ? 'left' : 'right',
    title: `结果：${winner.productName || '其中一款'}`,
    reasons: [
      `${winner.productName || '这款'}在本地规则里的提醒项更少，整体更接近「${decision.label}」。`,
      ...decision.reasons.slice(0, 2)
    ]
  };
}

export function buildAdditiveRecognitions(report: LabelReport, attention?: AttentionSettings): AdditiveRecognition[] {
  const additiveIngredients = report.ingredientSection.items.filter(isNormalAdditiveMatch);
  return recognizeAdditives({
    text: [
      ...additiveIngredients.map((item) => `${item.normalizedText} ${item.ingredientName || ''}`)
    ].join(' '),
    ingredients: additiveIngredients,
    attention
  });
}

export function buildNutritionSnapshot(fields: NutritionField[], attention?: AttentionSettings): NutritionSnapshotItem[] {
  const wanted: Array<{ key: NutritionKey; label: string }> = [
    { key: 'energy', label: '热量' },
    { key: 'fat', label: '脂肪' },
    { key: 'transFat', label: '反式脂肪' },
    { key: 'carbohydrate', label: '碳水' },
    { key: 'sodium', label: '钠' },
    { key: 'sugar', label: '糖' },
    { key: 'protein', label: '蛋白质' }
  ];
  return wanted.map((item) => buildNutritionSnapshotItem(item.key, item.label, fields, attention));
}

function buildSweetenerSignal(attention?: AttentionSettings): DecisionSignal {
  const rules = decisionPersonalizationRules.sweetener;
  if (hasGoal(attention, 'for_children')) {
    return {
      tag: '甜味剂',
      score: 2,
      reason: `配料中出现甜味剂。${rules.childrenAttitude}`,
      lessSuitableFor: ['儿童高频食用', '介意甜味剂的人'],
      suggestions: [`${rules.childrenAttitude}${decisionPersonalizationRules.children.frequencyHint}`]
    };
  }
  if (hasGoal(attention, 'sugar_control')) {
    return {
      tag: '甜味剂',
      score: 2,
      reason: `配料中出现甜味剂。${rules.sugarControlAttitude}`,
      lessSuitableFor: ['严格控糖且介意代糖的人'],
      suggestions: ['控糖时不要只看甜味剂，还要一起看糖、碳水和一份吃多少。']
    };
  }
  return {
    tag: '甜味剂',
    score: 1,
    reason: `配料中出现甜味剂。${rules.defaultAttitude}`,
    lessSuitableFor: ['介意甜味剂的人'],
    suggestions: ['介意甜味剂时可在同类商品里比较甜味剂种类和位置。']
  };
}

function buildIngredientSignals(text: string, ingredients: IngredientMatch[], attention?: AttentionSettings, hasCompleteEvidence = false): DecisionSignal[] {
  const signals: DecisionSignal[] = [];
  const additiveCount = ingredients.filter(isNormalAdditiveMatch).length;
  const unknownCount = ingredients.filter(isReviewOnlyIngredient).length;
  if (additiveCount >= 3) {
    signals.push({
      tag: '添加剂较多',
      score: 2,
      reason: `配料表识别到 ${additiveCount} 个添加剂标注；本地规则把 3 个及以上列为“少添加”关注项，用于同类横向比较。`,
      lessSuitableFor: ['儿童高频食用', '偏好少添加的人'],
      suggestions: ['已整理同类商品可比较的配料长短和添加剂数量。']
    });
  } else if (additiveCount > 0) {
    signals.push({
      tag: '含添加剂',
      score: 1,
      reason: '识别到常见食品添加剂，已按常见添加剂整理说明。',
      lessSuitableFor: ['偏好少添加的人'],
      suggestions: ['介意添加剂时，本次会突出种类和数量。']
    });
  }
  addTermSignal(signals, text, sugarTerms, {
    tag: '糖相关',
    score: hasGoal(attention, 'sugar_control') || hasGoal(attention, 'fat_control') || hasGoal(attention, 'for_children') ? 3 : 2,
    reason: '配料中出现糖或糖浆类成分，控糖或减脂人群可以留意。',
    lessSuitableFor: ['控糖人群', '减脂期'],
    suggestions: ['糖、糖浆位置和营养表糖数字已纳入结果。']
  });
  addTermSignal(signals, text, sweetenerTerms, buildSweetenerSignal(attention));
  addTermSignal(signals, text, sodiumTerms, {
    tag: '钠相关',
    score: hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 2 : 1,
    reason: '配料中出现盐或钠相关成分，低钠关注人群会收到提醒。',
    lessSuitableFor: ['低钠关注人群'],
    suggestions: ['钠数值和份量已纳入结果。']
  });
  addTermSignal(signals, text, fatTerms, {
    tag: '油脂相关',
    score: hasGoal(attention, 'fat_control') ? 2 : 1,
    reason: '配料中出现油脂相关成分，已和能量、脂肪字段一起整理。',
    lessSuitableFor: ['减脂期'],
    suggestions: ['脂肪、能量数字和份量已纳入结果。']
  });
  addTermSignal(signals, text, hydrogenatedOilTerms, {
    tag: '氢化油脂',
    score: hasGoal(attention, 'fat_control') ? 3 : 2,
    reason: '配料中出现氢化油脂相关词，建议和反式脂肪、脂肪、热量一起看份量。',
    lessSuitableFor: ['减脂期', '反式脂肪关注人群'],
    suggestions: ['氢化油脂已放入重点提醒，不单独吓人，和营养表数字一起判断份量。']
  });
  addTermSignal(signals, text, preservativeTerms, {
    tag: '防腐剂',
    score: 1,
    reason: '配料中出现防腐剂类别，属于常见添加剂信息，介意时可以留意。',
    lessSuitableFor: ['偏好少添加的人'],
    suggestions: ['防腐剂和配料复杂度已纳入提醒。']
  });
  addTermSignal(signals, text, colorTerms, {
    tag: '色素',
    score: hasGoal(attention, 'for_children') ? 2 : 1,
    reason: '配料中出现色素类别，给儿童高频食用时可以多留意。',
    lessSuitableFor: ['儿童高频食用'],
    suggestions: ['儿童模式下，色素类配料会进入重点提醒。']
  });
  addTermSignal(signals, text, caffeineTerms, {
    tag: '咖啡因',
    score: hasGoal(attention, 'for_children') ? 4 : 2,
    reason: '识别到咖啡因或相关来源，儿童、孕期或对咖啡因敏感的人会收到重点提醒。',
    lessSuitableFor: ['儿童', '对咖啡因敏感的人'],
    suggestions: ['咖啡因、茶粉或咖啡相关提示已纳入提醒。']
  });
  addTermSignal(signals, text, alcoholTerms, {
    tag: '酒精相关',
    score: hasGoal(attention, 'for_children') ? 4 : 2,
    reason: '识别到酒精相关词，儿童目标下需要重点留意。',
    lessSuitableFor: ['儿童'],
    suggestions: ['儿童模式下，酒精相关配料和提示会进入重点提醒。']
  });
  const selectedAllergenKeywords = getSelectedAllergenKeywords(attention);
  const allergens = allergenGroups.filter((group) => group.terms.some((term) => containsPositiveTerm(text, term)));
  allergens.forEach((group) => {
    const isConfigured = group.terms.some((term) => containsPositiveTerm(text, term)
      && selectedAllergenKeywords.some((keyword) => term.includes(keyword) || keyword.includes(term)));
    signals.push({
      tag: `${group.label}关注`,
      score: isConfigured ? 5 : 3,
      reason: isConfigured
        ? `来源：配料表/致敏提示文字；出现你关注的${group.label}相关词，按过敏/忌口设置列为保守提醒。`
        : `来源：配料表/致敏提示文字；出现${group.label}相关词，默认按常见过敏原谨慎提醒；仅对${group.label}过敏或严格忌口者构成重点。`,
      lessSuitableFor: [isConfigured ? `${group.label}过敏/忌口人群` : `对${group.label}过敏或严格忌口的人`],
      suggestions: [isConfigured ? '已命中配置的过敏/忌口项，先避开这款，再核对包装致敏原提示。' : `如你或家人对${group.label}过敏，请先到关注项设置，并核对包装致敏原提示。`],
      priority: isConfigured ? 'configured_allergen' : 'general_allergen'
    });
  });
  if (unknownCount) {
    signals.push({
      tag: '未确认',
      score: 1,
      reason: `有 ${unknownCount} 个识别项暂未确认来源，已放入未确认线索。`,
      lessSuitableFor: ['需要严格避开特定配料的人'],
      suggestions: [hasCompleteEvidence ? '未确认词已单独列出；请以包装原文核对这些词。' : '未确认词已单独列出；补拍更清晰配料表可完善结果。']
    });
  }
  return signals;
}

function buildAdditiveSignals(items: AdditiveRecognition[], attention?: AttentionSettings): DecisionSignal[] {
  const signals: DecisionSignal[] = [];
  if (!items.length) return signals;
  const categories = new Set(items.map((item) => item.category));
  const watchItems = items.filter((item) => item.displayLevel !== 'normal');
  if (items.length >= 8 || categories.size >= 5) {
    signals.push({
      tag: '添加剂较多',
      score: hasGoal(attention, 'fewer_additives') || hasGoal(attention, 'for_children') ? 3 : 2,
      reason: `添加剂词库识别到 ${categories.size} 类 ${items.length} 种添加剂；本地规则把 5 类或 8 种及以上列为重点提醒，方便同类产品比较。`,
      lessSuitableFor: ['偏好少添加的人', '儿童高频食用'],
      suggestions: ['添加剂种类、配料表长短和份量已纳入结果。']
    });
  } else {
    signals.push({
      tag: '添加剂识别',
      score: 1,
      reason: `添加剂词库识别到 ${categories.size} 类 ${items.length} 种添加剂；仅作为“少添加”偏好和同类比较依据。`,
      lessSuitableFor: ['偏好少添加的人'],
      suggestions: ['不用只看添加剂数量，也要一起看糖、钠、脂肪和过敏原。']
    });
  }
  if (watchItems.length) {
    signals.push({
      tag: '添加剂需留意',
      score: hasGoal(attention, 'for_children') ? 2 : 1,
      reason: `有 ${watchItems.length} 种添加剂列为重点提醒。`,
      lessSuitableFor: ['儿童高频食用', '对特定添加剂敏感的人'],
      suggestions: ['这些添加剂的作用和提醒已展开。']
    });
  }
  return signals;
}

function buildNutritionSignals(fields: NutritionField[], attention?: AttentionSettings): DecisionSignal[] {
  const signals: DecisionSignal[] = [];
  const sugar = getNutritionValue(fields, 'sugar');
  const sodium = getNutritionValue(fields, 'sodium');
  const salt = getNutritionValue(fields, 'salt');
  const fat = getNutritionValue(fields, 'fat');
  const transFat = getNutritionValue(fields, 'transFat');
  const energy = getNutritionValue(fields, 'energy');
  const carbohydrate = getNutritionValue(fields, 'carbohydrate');
  const basis = detectNutritionBasis(fields);
  const sugarThresholds = getSugarThresholds(attention, basis);
  const basisLabel = nutritionBasisLabel(basis);
  if (sugar !== null && sugar >= sugarThresholds.high) {
    signals.push({
      tag: '糖偏高',
      score: hasGoal(attention, 'sugar_control') || hasGoal(attention, 'fat_control') || hasGoal(attention, 'for_children') ? 5 : 3,
      reason: `来源：营养成分表；糖含量识别为 ${formatNumber(sugar)}g（${basisLabel}，${sugarThresholds.highLabel} ${formatNumber(sugarThresholds.high)}g），控糖或减脂时，份量会影响实际摄入。${sugarThresholds.sourceLabel}`,
      lessSuitableFor: ['控糖人群', '减脂期', '儿童高频食用'],
      suggestions: [`糖阈值已按${basisLabel}和当前关注项处理；${decisionPersonalizationRules.portionFrequency.smallPortionHint}`]
    });
  } else if (sugar !== null && sugar >= sugarThresholds.watch) {
    signals.push({
      tag: '含糖',
      score: hasGoal(attention, 'sugar_control') ? 2 : 1,
      reason: `糖含量识别为 ${formatNumber(sugar)}g（${basisLabel}），介意糖的人可以留意。`,
      lessSuitableFor: ['严格控糖人群'],
      suggestions: [decisionPersonalizationRules.portionFrequency.smallPortionHint]
    });
  }
  if (sodium !== null && sodium >= 600) {
    signals.push({
      tag: '钠偏高',
      score: hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 5 : 4,
      reason: `钠含量识别为 ${formatNumber(sodium)}mg，低钠关注时，份量会影响实际摄入。`,
      lessSuitableFor: ['低钠关注人群'],
      suggestions: ['每 100g 钠和实际一份的量已纳入结果。']
    });
  } else if (sodium !== null && sodium >= 300) {
    signals.push({
      tag: '钠需留意',
      score: hasGoal(attention, 'low_sodium') ? 2 : 1,
      reason: `钠含量识别为 ${formatNumber(sodium)}mg，低钠关注人群可以留意。`,
      lessSuitableFor: ['低钠关注人群'],
      suggestions: ['搭配其他食物时注意当天总钠摄入。']
    });
  }
  if (salt !== null && salt >= 1.5) {
    signals.push({
      tag: '盐需留意',
      score: hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 3 : 2,
      reason: `盐含量识别为 ${formatNumber(salt)}g，低钠关注人群可以留意。`,
      lessSuitableFor: ['低钠关注人群'],
      suggestions: ['盐或钠含量是这一项的主要差异点。']
    });
  }
  if (fat !== null && fat >= 20) {
    signals.push({
      tag: '脂肪偏高',
      score: hasGoal(attention, 'fat_control') ? 4 : 3,
      reason: `脂肪含量识别为 ${formatNumber(fat)}g，减脂期，份量会影响实际摄入。`,
      lessSuitableFor: ['减脂期'],
      suggestions: ['脂肪数字和实际一份的量已纳入结果。']
    });
  }
  if (transFat !== null && transFat > 0) {
    signals.push({
      tag: '反式脂肪需留意',
      score: transFat >= 0.3 ? 2 : 1,
      reason: `反式脂肪识别为 ${formatNumber(transFat)}g，建议和脂肪、热量一起看份量。`,
      lessSuitableFor: ['减脂期', '心血管饮食关注人群'],
      suggestions: ['反式脂肪数字已纳入结果，建议选择更小份量。']
    });
  }
  if (energy !== null && energy >= 1700) {
    signals.push({
      tag: '能量偏高',
      score: hasGoal(attention, 'fat_control') ? 4 : 2,
      reason: `能量识别为 ${formatNumber(energy)}kJ，减脂期，份量会影响实际摄入。`,
      lessSuitableFor: ['减脂期'],
      suggestions: ['能量数字和实际一份的量已纳入结果。']
    });
  }
  if (carbohydrate !== null && carbohydrate >= sugarThresholds.carbohydrateHigh && (hasGoal(attention, 'sugar_control') || hasGoal(attention, 'fat_control') || hasGoal(attention, 'for_children'))) {
    signals.push({
      tag: '碳水较高',
      score: 2,
      reason: `来源：营养成分表；碳水化合物识别为 ${formatNumber(carbohydrate)}g（${basisLabel}，${sugarThresholds.carbohydrateHighLabel} ${formatNumber(sugarThresholds.carbohydrateHigh)}g），控糖或减脂时要看一份吃多少。${sugarThresholds.sourceLabel}`,
      lessSuitableFor: ['控糖人群', '减脂期'],
      suggestions: ['碳水、糖和蛋白质数字已一起整理。']
    });
  }
  if (carbohydrate !== null && carbohydrate >= sugarThresholds.carbohydrateHigh && !signals.some((item) => item.tag === '碳水较高')) {
    signals.push({
      tag: '碳水较高',
      score: 1,
      reason: `碳水化合物识别为 ${formatNumber(carbohydrate)}g（${basisLabel}），零食场景下需要看份量。`,
      lessSuitableFor: ['控糖人群', '减脂期'],
      suggestions: [decisionPersonalizationRules.portionFrequency.smallPortionHint]
    });
  }
  return signals;
}

function buildAttentionSignals(report: LabelReport, attention?: AttentionSettings): DecisionSignal[] {
  if (!attention && !report.attentionHits.length) return [];
  return report.attentionHits.filter((hit) => hit.key !== 'daily').map((hit) => ({
    tag: hit.label,
    score: hit.key === 'allergen' ? 5 : hit.key === 'children' ? 2 : 1,
    reason: hit.key === 'allergen'
      ? `已命中你设置的过敏/忌口关注词：${hit.terms.slice(0, 4).join('、')}。按保守规则处理。`
      : `${hit.label}相关词已出现：${hit.terms.slice(0, 4).join('、')}。`,
    lessSuitableFor: [mapGoalToAudience(hit.key, hit.label)],
    suggestions: [hit.key === 'allergen' ? '配置过敏/忌口项一旦命中，先按不适合处理，再核对包装原文。' : '这类成分已放入重点提醒。'],
    priority: hit.key === 'allergen' ? 'configured_allergen' : undefined
  }));
}

function sortSignalsByPriority(signals: DecisionSignal[], attention?: AttentionSettings): DecisionSignal[] {
  return [...signals].sort((left, right) => {
    const priorityDiff = signalPriority(right, attention) - signalPriority(left, attention);
    if (priorityDiff) return priorityDiff;
    return right.score - left.score;
  });
}

function signalPriority(signal: DecisionSignal, attention?: AttentionSettings): number {
  const text = `${signal.tag}${signal.reason}`;
  if (signal.priority === 'configured_allergen' || /你设置的过敏|含有你关注的过敏原|你关注的.*相关词|不建议食用/.test(text)) return 50;
  if (hasGoal(attention, 'for_children') && /儿童|色素|咖啡因|甜味剂|糖偏高|钠偏高|高糖|高钠/.test(text)) return 40;
  if (hasGoal(attention, 'low_sodium') && /钠|盐|味精|酱油粉/.test(text)) return 35;
  if (hasGoal(attention, 'sugar_control') && /糖|糖浆|甜味剂|碳水|代糖/.test(text)) return 30;
  if (hasGoal(attention, 'fat_control') && /能量|热量|脂肪|反式|氢化|糖|碳水/.test(text)) return 30;
  if (/反式|氢化|起酥油|植脂末|代可可脂/.test(text)) return 28;
  if (signal.priority === 'general_allergen' || /过敏人群|致敏/.test(text)) return 24;
  if (/添加剂|防腐剂|色素|香精/.test(text)) return 20;
  return 10;
}

function addTermSignal(target: DecisionSignal[], text: string, terms: string[], signal: DecisionSignal) {
  if (terms.some((term) => text.includes(term))) {
    target.push(signal);
  }
}

function resolveLevel(score: number, signals: DecisionSignal[], attention?: AttentionSettings): ConsumerDecision['level'] {
  if (signals.length === 0) return 'daily_ok';
  if (signals.some((item) => item.priority === 'configured_allergen')) return 'alternative';
  if (hasGoal(attention, 'sugar_control') && signals.some((item) => item.tag === '糖偏高')) return 'alternative';
  if (isDailyOnly(attention)) {
    if (signals.some((item) => item.tag === '糖偏高')) return 'caution';
    if (score >= 16) return 'alternative';
    if (score >= 7) return 'caution';
    if (score >= 3) return 'occasional';
    return 'daily_ok';
  }
  if (score >= 9) return 'alternative';
  if (score >= 6) return 'caution';
  if (score >= 3) return 'occasional';
  return 'daily_ok';
}

function labelForLevel(level: ConsumerDecision['level']): string {
  if (level === 'alternative') return '重点关注';
  if (level === 'caution') return '需要留意';
  if (level === 'occasional') return '少量关注';
  if (level === 'insufficient') return '信息不足';
  return '暂无明显重点项';
}

function buildSummary(level: ConsumerDecision['level'], signals: DecisionSignal[], allergyWarnings: string[], attention?: AttentionSettings): string {
  if (allergyWarnings.length) return allergyWarnings[0];
  const hasFocus = Boolean(attention && (!isDailyOnly(attention) || attention.allergens.length));
  const tags = compactSignalTags(signals).slice(0, 4);
  const focusText = tags.length ? `${tags.join('、')}是这次重点。` : hasFocus ? '重点看你设置的关注项。' : '重点看营养数字和一份吃多少。';
  const onlyConditionalAllergen = signals.length > 0 && signals.every((item) => item.priority === 'general_allergen');
  const configuredHighSugar = hasGoal(attention, 'sugar_control') && signals.some((item) => item.tag === '糖偏高');
  if (level === 'alternative' && configuredHighSugar) return `建议换更低糖同类；${focusText}`;
  if (level === 'alternative') return `偶尔吃更合适；${focusText}`;
  if (level === 'caution') return `偶尔吃更合适；${focusText}`;
  if (level === 'occasional') {
    const occasionalTags = tags.slice(0, 3);
    return occasionalTags.length
      ? `偶尔吃；${occasionalTags.join('、')}是这次重点，按小份量更稳妥。`
      : '偶尔吃，按小份量更稳妥。';
  }
  if (onlyConditionalAllergen) return '普通人群未发现明显重点项；常见过敏原仅对相关过敏/忌口者需要核对。';
  if (!signals.length) return '这次未发现明显重点项，请结合包装实物确认。';
  return '已按当前识别到的标签区域整理重点项。';
}

function compactSignalTags(signals: DecisionSignal[]): string[] {
  const tags = signals
    .map((item) => {
      const text = `${item.tag}${item.reason}`;
      if (/过敏|忌口|致敏/.test(text)) return '过敏原';
      if (/氢化|反式/.test(text)) return '氢化油脂';
      if (/糖|甜味剂|碳水/.test(text)) return '糖/碳水';
      if (/钠|盐|味精|呈味|肌苷酸/.test(text)) return '钠/咸味';
      if (/脂肪|油脂|热量|能量/.test(text)) return '油脂/热量';
      if (/添加剂|防腐剂|色素|香精/.test(text)) return '添加剂';
      if (/咖啡因/.test(text)) return '咖啡因';
      if (/酒精/.test(text)) return '酒精';
      if (/未确认/.test(text)) return '';
      return item.tag;
    })
    .filter(Boolean);
  return unique(tags);
}

function buildSuitableFor(level: ConsumerDecision['level'], signals: DecisionSignal[], nutrition: NutritionField[]): string[] {
  const items = level === 'daily_ok'
    ? ['普通成年人按正常份量']
    : ['普通成年人偶尔解馋'];
  if (!signals.some((signal) => signal.tag.includes('糖')) && hasNutritionValue(nutrition, 'sugar')) items.push('控糖关注者可查看糖数字');
  if (!signals.some((signal) => signal.tag.includes('钠')) && hasNutritionValue(nutrition, 'sodium')) items.push('低钠关注者可查看钠数字');
  return unique(items).slice(0, 4);
}

function buildSuggestions(
  level: ConsumerDecision['level'],
  signals: DecisionSignal[],
  report: LabelReport,
  allergyWarnings: string[],
  attention?: AttentionSettings,
  generalAllergenWarnings: string[] = []
): string[] {
  const signalText = signals.map((item) => `${item.tag}${item.reason}`).join(' ');
  const sugarRules = decisionPersonalizationRules.sugarControl;
  const suggestions = unique([
    allergyWarnings.length ? '已命中你关注的过敏/忌口词，先避开这款，再看其他营养数字。' : '',
    ...buildPersonalizationInputSuggestions(attention, signalText, generalAllergenWarnings, report.nutritionSection.fields),
    /糖|糖浆|甜味剂|碳水/.test(signalText) ? `货架比较时看每100ml/100g糖和碳水；优先糖≤${sugarRules.preferredDrinkSugarPer100ml}g/100ml或≤${sugarRules.preferredSolidSugarPer100g}g/100g，糖浆不在前${sugarRules.ingredientTopRank}位。` : '',
    /钠|盐|味精|酱油粉/.test(signalText) ? '同类商品优先选钠≤300mg/100g，控盐或儿童场景优先≤120mg/100g。' : '',
    /儿童|色素|咖啡因|甜味剂/.test(signalText) ? `给儿童高频吃时，直接排除咖啡因/酒精，少选色素和多种甜味剂并列的同类。${decisionPersonalizationRules.children.portionHint}` : '',
    ...signals.flatMap((item) => item.suggestions)
  ].filter(Boolean));
  if (level === 'alternative') suggestions.unshift('先按首屏风险找可核对的替代：无命中过敏原、糖/碳水/钠数字更低，配料表问题项更靠后。');
  if (level === 'caution') suggestions.unshift('先看糖、钠、过敏原和配料表位置，再决定是否小份量购买。');
  if (report.ingredientSection.items.length && report.nutritionSection.fields.every((field) => !field.value)) {
    suggestions.push('补充营养成分表后，结果会更完整。');
  }
  return (suggestions.length ? suggestions : ['已按识别到的重点项整理。']).slice(0, 5);
}

function buildPersonalizationInputSuggestions(
  attention: AttentionSettings | undefined,
  signalText: string,
  generalAllergenWarnings: string[],
  nutrition: NutritionField[]
): string[] {
  const goals = attention ? selectedGoals(attention) : [];
  const suggestions: string[] = [];
  if (generalAllergenWarnings.length && !attention?.allergens.length) {
    suggestions.push('未设置具体过敏/忌口项，常见过敏原只做条件提醒；有明确忌口请先设置，命中后会按不建议处理。');
  }
  if (/糖|糖浆|甜味剂|碳水/.test(signalText) && !goals.includes('sugar')) {
    suggestions.push('未设置控糖目标，当前按普通成年人阈值提示；需要控糖时开启控糖目标，会使用更严格的糖/碳水阈值。');
  }
  if (/儿童|色素|咖啡因|甜味剂|酒精/.test(signalText) && !goals.includes('children')) {
    suggestions.push(`未开启儿童目标，儿童/频率建议仅作普通提示；给儿童高频吃时建议开启儿童零食目标。${decisionPersonalizationRules.children.frequencyHint}`);
  }
  if (/糖|钠|盐|脂肪|热量|能量|碳水/.test(signalText) && detectNutritionBasis(nutrition) === 'unknown') {
    suggestions.push(decisionPersonalizationRules.portionFrequency.unknownServingHint);
  }
  return suggestions;
}

function buildRiskReasons(input: {
  allergyWarnings: string[];
  generalAllergenWarnings: string[];
  qualityWarnings: string[];
  foodAnalysisReasons: string[];
  decisionReasons: string[];
  watchPoints: string[];
  recommendation: PurchaseRecommendation;
  attention?: AttentionSettings;
}): string[] {
  const candidates = unique([
    ...input.allergyWarnings,
    ...input.generalAllergenWarnings,
    ...input.qualityWarnings,
    ...input.decisionReasons,
    ...input.watchPoints,
    ...input.foodAnalysisReasons
  ]).filter((item) => !/对照|原文|技术|OCR/i.test(item));
  const meaningful = candidates
    .filter((item) => input.recommendation === '推荐' || !isPositiveLowBurdenReason(item))
    .sort((left, right) => riskReasonPriority(right, input.attention) - riskReasonPriority(left, input.attention));
  return (meaningful.length ? meaningful : candidates).slice(0, 3);
}

function filterRiskReasonsByNutrition(reasons: string[], fields: NutritionField[], attention?: AttentionSettings): string[] {
  const sugarThresholds = getSugarThresholds(attention, detectNutritionBasis(fields));
  return reasons.filter((reason) => {
    const sugar = getNutritionValue(fields, 'sugar');
    if (sugar !== null && sugar < sugarThresholds.watch && /糖(?:含量)?(?:偏高|较高)|高糖/.test(reason)) return false;

    const sodium = getNutritionValue(fields, 'sodium');
    const sodiumHighThreshold = hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 300 : 600;
    const sodiumWatchThreshold = hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 120 : 300;
    if (sodium !== null && sodium < sodiumWatchThreshold && /钠(?:含量)?(?:偏高|较高|需留意)|高钠/.test(reason)) return false;
    if (sodium !== null && sodium < sodiumHighThreshold && /钠(?:含量)?偏高|高钠/.test(reason)) return false;

    const carbohydrate = getNutritionValue(fields, 'carbohydrate');
    if (carbohydrate !== null && carbohydrate < sugarThresholds.carbohydrateHigh && /碳水(?:化合物)?(?:偏高|较高)|高碳水/.test(reason)) return false;

    return true;
  });
}

function isPositiveLowBurdenReason(value: string): boolean {
  return /较低|偏低|不高|低负担|未发现明显|暂无明显|蛋白质较高|营养亮点/.test(value)
    && !/信息不足|降级|接口|过敏|忌口|致敏|糖|钠|盐|甜味剂|色素|咖啡因|酒精|反式|氢化|添加剂|防腐剂/.test(value);
}

function riskReasonPriority(value: string, attention?: AttentionSettings): number {
  if (/你设置的过敏|含有你关注的过敏原|你关注的.*相关词|不建议食用|不建议处理/.test(value)) return 100;
  if (/信息不足|补拍|降级|接口|失败|未完整/.test(value)) return 90;
  if (hasGoal(attention, 'sugar_control') && /糖|糖浆|甜味剂|碳水/.test(value)) return 96;
  if (hasGoal(attention, 'low_sodium') && /钠|盐|味精|呈味|酱油粉/.test(value)) return 96;
  if (hasGoal(attention, 'fat_control') && /脂肪|热量|能量|反式|氢化|糖|碳水/.test(value)) return 94;
  if (hasGoal(attention, 'for_children') && /儿童|咖啡因|酒精|色素|甜味剂|糖|钠|盐|添加剂/.test(value)) return 94;
  if (/常见过敏原|包装文字出现.*过敏原|致敏/.test(value)) {
    return isDailyOnly(attention) ? 88 : 58;
  }
  if (/糖|糖浆|甜味剂|碳水/.test(value)) return 80;
  if (/钠|盐|味精|呈味|酱油粉/.test(value)) return 70;
  if (/反式|氢化|起酥油|植脂末|代可可脂/.test(value)) return 65;
  if (/咖啡因|酒精/.test(value)) return 60;
  if (/过敏人群/.test(value)) return 20;
  if (/脂肪|热量|能量|油/.test(value)) return 50;
  if (/添加剂|防腐剂|色素|香精/.test(value)) return 45;
  return 10;
}

function buildConfiguredAllergyWarnings(report: LabelReport, attention?: AttentionSettings): string[] {
  if (!attention?.allergens.length) return [];
  const text = normalizeText([
    report.analysisSource?.ingredientText,
    report.analysisSource?.allergenText,
    ...report.ingredientSection.items
      .filter((item) => item.decision === 'confirmed')
      .map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' '));
  const hits = allergenOptions
    .filter((option) => attention.allergens.includes(option.key))
    .filter((option) => option.keywords.some((keyword) => containsPositiveTerm(text, keyword)))
    .map((option) => option.label)
    .slice(0, 3);
  if (!hits.length) return [];
  const sourceLabel = report.analysisSource?.allergenText
    ? '致敏原提示'
    : report.analysisSource?.ingredientText
      ? '配料表'
      : '标签文字';
  return [`已命中你设置的过敏原/忌口项：${hits.join('、')}。来源：${sourceLabel}。按保守规则不建议食用，除非包装明确排除对应致敏风险。`];
}

function buildGeneralAllergyWarnings(report: LabelReport): string[] {
  const text = normalizeText([
    report.analysisSource?.ingredientText,
    report.analysisSource?.allergenText,
    ...report.ingredientSection.items
      .filter((item) => item.decision === 'confirmed')
      .map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' '));
  const hits = allergenGroups
    .filter((group) => group.terms.some((term) => containsPositiveTerm(text, term)))
    .map((group) => group.label)
    .slice(0, 3);
  if (!hits.length) return [];
  const sourceLabel = report.analysisSource?.allergenText
    ? '致敏原提示'
    : report.analysisSource?.ingredientText
      ? '配料表'
      : '标签文字';
  return [`包装文字出现常见过敏原：${hits.join('、')}。来源：${sourceLabel}。默认按谨慎提醒；仅对相关过敏或严格忌口者作为重点禁忌，未配置该过敏项时不直接判为不建议。`];
}

function buildDecisionSignalText(report: LabelReport, ingredients: IngredientMatch[]): string {
  return normalizeText([
    report.analysisSource?.ingredientText,
    report.analysisSource?.allergenText,
    report.frontClaimsSection?.text,
    ...ingredients
      .filter((item) => item.decision === 'confirmed' && !isBackendReviewOnlyIngredient(item))
      .map((item) => `${item.normalizedText} ${item.ingredientName || ''}`)
  ].join(' '));
}

function isNormalAdditiveMatch(item: IngredientMatch): boolean {
  return item.isAdditive && item.decision === 'confirmed' && !isReviewOnlyIngredient(item);
}

function isReviewOnlyIngredient(item: IngredientMatch): boolean {
  return ['pending_review', 'mapped_candidate', 'unverified'].includes(item.dataStatus);
}

function isBackendReviewOnlyIngredient(item: IngredientMatch): boolean {
  return ['pending_review', 'mapped_candidate', 'unverified'].includes(item.dataStatus);
}

function buildNutritionSnapshotItem(
  key: NutritionKey,
  label: string,
  fields: NutritionField[],
  attention?: AttentionSettings
): NutritionSnapshotItem {
  const field = fields.find((item) => item.key === key);
  const numeric = getNutritionValue(fields, key);
  if (!field?.value || numeric === null) {
    return {
      key,
      label,
      valueText: '未识别',
      level: '未识别',
      note: `没有识别到${label}数据，营养结果暂不包含这一项。`,
      percent: 8
    };
  }
  const unit = key === 'sodium' ? 'mg' : key === 'energy' ? 'kJ' : 'g';
  const level = resolveNutritionLevel(key, numeric, attention, fields);
  return {
    key,
    label,
    valueText: `${formatNumber(numeric)}${unit}`,
    level,
    note: nutritionNote(key, numeric, level, attention, fields),
    percent: nutritionPercent(key, numeric)
  };
}

function resolveNutritionLevel(key: NutritionKey, value: number, attention?: AttentionSettings, fields: NutritionField[] = []): NutritionSnapshotItem['level'] {
  const sugarThresholds = getSugarThresholds(attention, detectNutritionBasis(fields));
  if (key === 'sugar') {
    if (value >= sugarThresholds.high) return '较高';
    if (value >= sugarThresholds.watch) return '中等';
    return '较低';
  }
  if (key === 'sodium') {
    if (value >= (hasGoal(attention, 'low_sodium') || hasGoal(attention, 'for_children') ? 300 : 600)) return '较高';
    if (value >= 120) return '中等';
    return '较低';
  }
  if (key === 'fat') {
    if (value >= (hasGoal(attention, 'fat_control') ? 12 : 20)) return '较高';
    if (value >= 3) return '中等';
    return '较低';
  }
  if (key === 'transFat') {
    if (value >= 0.3) return '较高';
    if (value > 0) return '中等';
    return '较低';
  }
  if (key === 'carbohydrate') {
    if (value >= sugarThresholds.carbohydrateHigh) return '较高';
    if (value >= 10) return '中等';
    return '较低';
  }
  if (key === 'protein') {
    if (value >= 8) return '较高';
    if (value >= 4) return '一般';
    return '较低';
  }
  if (key === 'energy') {
    if (value >= (hasGoal(attention, 'fat_control') ? 1200 : 1700)) return '较高';
    if (value >= 500) return '中等';
    return '较低';
  }
  return '中等';
}

function nutritionNote(key: NutritionKey, value: number, level: NutritionSnapshotItem['level'], attention?: AttentionSettings, fields: NutritionField[] = []): string {
  if (key === 'sugar') {
    const threshold = getSugarThresholds(attention, detectNutritionBasis(fields));
    if (level === '较高') return hasGoal(attention, 'sugar_control') ? `糖达到${threshold.highLabel}（${formatNumber(threshold.high)}g）。${threshold.sourceLabel}；严格控糖时建议重点关注一份吃多少。` : `糖达到${threshold.highLabel}（${formatNumber(threshold.high)}g）。${threshold.sourceLabel}；份量会影响实际摄入。`;
    if (level === '中等') return '糖含量中等，控糖人群可以留意。';
    return '糖含量较低。';
  }
  if (key === 'sodium') {
    if (level === '较高') return '钠含量偏高，少盐/低钠关注人群建议重点关注一份吃多少。';
    if (level === '中等') return '钠含量中等，低钠关注人群可以留意。';
    return '钠含量较低。';
  }
  if (key === 'fat') {
    if (level === '较高') return '脂肪偏高，减脂期归为重点关注项。';
    if (level === '中等') return '脂肪中等，份量会影响实际摄入。';
    return '脂肪较低。';
  }
  if (key === 'transFat') {
    if (level === '较高') return '反式脂肪不为 0，建议和脂肪、热量一起看份量。';
    if (level === '中等') return '反式脂肪有数值，已保留为关注项。';
    return '反式脂肪较低或标示为 0。';
  }
  if (key === 'carbohydrate') {
    if (level === '较高') return '碳水较高，控糖或减脂时要看一份吃多少。';
    if (level === '中等') return '碳水中等，已和糖数字一起整理。';
    return '碳水较低。';
  }
  if (key === 'protein') {
    if (level === '较高') return '蛋白质较高，已保留为营养亮点。';
    if (level === '一般' || level === '中等') return '蛋白质一般。';
    return '蛋白质不突出。';
  }
  if (key === 'energy') {
    if (level === '较高') return '热量偏高，减脂期归为重点关注项。';
    if (level === '中等') return '热量适中，份量会影响实际摄入。';
    return '热量较低。';
  }
  return `${formatNumber(value)}，已整理为数值线索。`;
}

function nutritionPercent(key: NutritionKey, value: number): number {
  const max = key === 'sodium' ? 800 : key === 'energy' ? 2200 : key === 'protein' ? 15 : key === 'fat' ? 30 : key === 'transFat' ? 1 : key === 'carbohydrate' ? 80 : 20;
  return Math.max(6, Math.min(100, Math.round((value / max) * 100)));
}

function getSugarThresholds(attention: AttentionSettings | undefined, basis: NutritionBasis): {
  high: number;
  watch: number;
  carbohydrateHigh: number;
  highLabel: string;
  carbohydrateHighLabel: string;
  sourceLabel: string;
} {
  const focused = hasGoal(attention, 'sugar_control') || hasGoal(attention, 'for_children');
  const rules = decisionPersonalizationRules.sugarControl;
  const wording = rules.thresholdWording;
  const labels = {
    highLabel: focused ? wording.focusedSugarHigh : wording.defaultSugarHigh,
    carbohydrateHighLabel: focused ? wording.focusedCarbohydrateHigh : wording.defaultCarbohydrateHigh,
    sourceLabel: `${wording.nutritionSource}，${wording.conservativeSource}`
  };
  if (basis === 'per100ml') {
    return {
      high: focused ? rules.sugarHigh.focusedPer100ml : rules.sugarHigh.per100ml,
      watch: rules.sugarWatch.per100ml,
      carbohydrateHigh: focused ? rules.carbohydrateHigh.focusedPer100ml : rules.carbohydrateHigh.per100ml,
      ...labels
    };
  }
  if (basis === 'perServing') {
    return {
      high: rules.sugarHigh.perServing,
      watch: rules.sugarWatch.perServing,
      carbohydrateHigh: rules.carbohydrateHigh.perServing,
      ...labels
    };
  }
  return {
    high: focused ? rules.sugarHigh.focusedPer100g : rules.sugarHigh.per100g,
    watch: rules.sugarWatch.per100g,
    carbohydrateHigh: focused ? rules.carbohydrateHigh.focusedPer100g : rules.carbohydrateHigh.per100g,
    ...labels
  };
}

function hasCompleteLabelEvidence(report: LabelReport, ingredients = report.ingredientSection.items, nutrition = report.nutritionSection.fields): boolean {
  const sourceIngredientText = String(report.analysisSource?.ingredientText || '').trim();
  const hasIngredientEvidence = ingredients.some((item) => item.decision === 'confirmed') || isUsableLabelSectionText(sourceIngredientText, 'ingredient');
  return hasIngredientEvidence && countNutritionValues(nutrition) >= 3;
}

function detectNutritionBasis(fields: NutritionField[]): NutritionBasis {
  const basisText = normalizeText(fields
    .filter((field) => field.key === 'perUnit' || field.key === 'servingSize')
    .map((field) => `${field.label}${field.value}${field.unit}${field.sourceText || ''}`)
    .join(' '));
  const sourceText = normalizeText(fields.map((field) => field.sourceText || '').join(' '));
  const text = `${basisText}${sourceText}`;
  if (/每份|perserving|servingsize/.test(text)) return 'perServing';
  if (/100ml|100毫升|每100ml|per100ml/.test(text)) return 'per100ml';
  if (/100g|100克|每100g|per100g/.test(text)) return 'per100g';
  return 'unknown';
}

function nutritionBasisLabel(basis: NutritionBasis): string {
  if (basis === 'per100ml') return '每100ml';
  if (basis === 'per100g') return '每100g';
  if (basis === 'perServing') return '每份';
  return '标示口径未确认';
}

function getNutritionValue(fields: NutritionField[], key: string): number | null {
  const field = fields.find((item) => item.key === key);
  if (!field?.value) return null;
  const numeric = parseNumeric(field.value);
  if (numeric === null) return null;
  const unit = normalizeUnit(field.unit || field.value);
  if (key === 'sodium') {
    if (unit === 'g') return numeric * 1000;
    if (unit === 'ug') return numeric / 1000;
    return numeric;
  }
  if (key === 'energy') {
    if (unit === 'kcal') return numeric * 4.184;
    return numeric;
  }
  if (unit === 'mg') return numeric / 1000;
  return numeric;
}

function hasNutritionValues(fields: NutritionField[]): boolean {
  return fields.some((field) => Boolean(String(field.value || '').trim()));
}

function countNutritionValues(fields: NutritionField[]): number {
  return fields.filter((field) => !['perUnit', 'servingSize', 'nrvPercent'].includes(field.key) && Boolean(String(field.value || '').trim())).length;
}

function isMostlyAdCopy(text: string): boolean {
  const adHits = ['0蔗糖', '零蔗糖', '低脂', '高蛋白', '非油炸', '无添加', '天然', `健${'康'}`, '新鲜', '美味', '儿童优选', '轻负担', '饱腹']
    .filter((term) => text.includes(normalizeText(term))).length;
  const ingredientSignals = ['配料', '食品配料', '原料', 'ingredients', '水', '白砂糖', '食用盐', '植物油', '食品添加剂']
    .filter((term) => text.includes(normalizeText(term))).length;
  return adHits >= 2 && ingredientSignals === 0;
}

function hasNutritionValue(fields: NutritionField[], key: string): boolean {
  return getNutritionValue(fields, key) !== null;
}

function parseNumeric(value: string): number | null {
  const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeUnit(value: string): string {
  const unit = String(value || '').replace(/\s+/g, '').toLowerCase();
  if (unit.includes('kcal') || unit.includes('千卡') || unit.includes('大卡')) return 'kcal';
  if (unit.includes('kj')) return 'kj';
  if (unit.includes('ug') || unit.includes('μg') || unit.includes('微克')) return 'ug';
  if (unit.includes('mg') || unit.includes('毫克')) return 'mg';
  if (unit.includes('g') || unit.includes('克')) return 'g';
  return '';
}

function normalizeText(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function containsPositiveTerm(text: string, rawTerm: string): boolean {
  const term = normalizeText(rawTerm);
  if (!text || !term) return false;
  let index = text.indexOf(term);
  while (index >= 0) {
    const before = text.slice(Math.max(0, index - 8), index);
    const after = text.slice(index + term.length, index + term.length + 6);
    const negatedBefore = /(?:不含|未含|无|不添加|未添加|零|0)$/.test(before);
    const negatedAfter = /^(?:含量)?0(?:g|克|mg|毫克)?/.test(after);
    if (!negatedBefore && !negatedAfter) return true;
    index = text.indexOf(term, index + term.length);
  }
  return false;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function mapGoalToAudience(key: string, label: string): string {
  if (key === 'sugar') return '控糖人群';
  if (key === 'fatLoss') return '减脂期';
  if (key === 'lowSodium') return '低钠关注人群';
  if (key === 'children') return '儿童高频食用';
  if (key === 'daily') return '日常饮食关注人群';
  if (key === 'allergen') return '过敏或忌口关注人群';
  return `${label}关注人群`;
}

function hasGoal(attention: AttentionSettings | undefined, key: string): boolean {
  if (!attention) return false;
  const goals = selectedGoals(attention);
  if (key === 'sugar_control') return goals.includes('sugar');
  if (key === 'fat_control') return goals.includes('fatLoss');
  if (key === 'low_sodium') return goals.includes('lowSodium');
  if (key === 'for_children') return goals.includes('children');
  if (key === 'daily_balance' || key === 'fewer_additives') return goals.length === 0;
  return false;
}

function isDailyOnly(attention: AttentionSettings | undefined): boolean {
  if (!attention) return true;
  return selectedGoals(attention).length === 0 && !attention.allergens.length;
}

function selectedGoals(attention: AttentionSettings): NonNullable<AttentionSettings['targetGoals']> {
  if (Array.isArray(attention.targetGoals) && attention.targetGoals.length) return attention.targetGoals;
  return [
    attention.primaryGoal !== 'daily' ? attention.primaryGoal : undefined,
    attention.isChildrenMode ? 'children' : undefined
  ].filter((item): item is NonNullable<AttentionSettings['targetGoals']>[number] => Boolean(item));
}

function getSelectedAllergenKeywords(attention: AttentionSettings | undefined): string[] {
  if (!attention?.allergens.length) return [];
  return allergenOptions
    .filter((option) => attention.allergens.includes(option.key))
    .flatMap((option) => option.keywords.map(normalizeText));
}
