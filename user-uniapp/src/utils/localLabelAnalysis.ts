import { dataStatusLabel } from '@/constants/dataStatus';
import type {
  AttentionSettings,
  IngredientMatch,
  LabelReport,
  LabelType,
  LocalImageAsset,
  OcrResult,
  ProductRecognitionInfo,
  ParsedIngredient,
  ReportAnalysisSource,
  ScanDraft
} from '@/types';
import { recognizeAdditivesFromText } from './additiveRules';
import { parseIngredientList } from './ingredientParser';
import { classifyLabelText } from './labelClassifier';
import { getEditableNutritionFields, parseNutritionSummary, parseNutritionText } from './nutritionParser';
import { buildLabelReport } from './reportBuilder';

export type LocalAnalysisInputSource = 'ocr' | 'manual' | 'demo';

export type LocalLabelAnalysisInput = {
  productName?: string;
  foodTypeText?: string;
  productionDateText?: string;
  ingredientText: string;
  nutritionText?: string;
  allergenText?: string;
  frontClaimsText?: string;
  confidence?: 'high' | 'medium' | 'low';
  unconfirmedText?: string[];
  attention: AttentionSettings;
  sourceType: LocalAnalysisInputSource;
  ocr?: OcrResult;
  image?: LocalImageAsset;
  recognition?: ProductRecognitionInfo;
  brand?: string;
};

export type LocalLabelAnalysisResult = {
  report: LabelReport;
  confirmedText: string;
  labelType: LabelType;
  ingredients: ParsedIngredient[];
  nutrition: ReturnType<typeof getEditableNutritionFields>;
  matches: IngredientMatch[];
};

export function buildEffectiveLabelTextFromParts(input: {
  productNameText?: string;
  foodTypeText?: string;
  ingredientText?: string;
  nutritionText?: string;
  allergenText?: string;
  frontClaimsText?: string;
  productionDateText?: string;
}): string {
  return [
    input.productNameText?.trim() ? `商品名：${input.productNameText.trim()}` : '',
    input.foodTypeText?.trim() ? `食品类型：${input.foodTypeText.trim()}` : '',
    input.ingredientText?.trim() ? `配料表：${input.ingredientText.trim()}` : '',
    input.nutritionText?.trim() ? `营养成分表：${input.nutritionText.trim()}` : '',
    input.allergenText?.trim() ? `致敏原提示：${input.allergenText.trim()}` : '',
    input.frontClaimsText?.trim() ? `包装声明：${input.frontClaimsText.trim()}` : '',
    input.productionDateText?.trim() ? `生产日期：${input.productionDateText.trim()}` : ''
  ].filter(Boolean).join('\n');
}

export function buildLocalLabelAnalysis(input: LocalLabelAnalysisInput): LocalLabelAnalysisResult {
  const ingredientText = input.ingredientText.trim();
  const nutritionText = (input.nutritionText || '').trim();
  const allergenText = (input.allergenText || '').trim();
  const frontClaimsText = (input.frontClaimsText || '').trim();
  const foodTypeText = (input.foodTypeText || '').trim();
  const productionDateText = (input.productionDateText || '').trim();
  const confirmedText = buildEffectiveLabelTextFromParts({
    productNameText: input.productName,
    foodTypeText,
    ingredientText,
    nutritionText,
    allergenText,
    frontClaimsText,
    productionDateText
  });
  const labelType = resolveDetectedType(confirmedText, ingredientText, nutritionText, frontClaimsText);
  const ingredients = parseIngredientList(ingredientText);
  const parsedNutrition = shouldParseNutrition(nutritionText, labelType)
    ? getEditableNutritionFields(parseNutritionText(nutritionText))
    : [];
  if (nutritionText) parseNutritionSummary(nutritionText);
  const isAiSearchLabelEvidence = Boolean(input.recognition?.usedAiSearch && (ingredientText || nutritionText));
  const matches = buildLocalIngredientMatches(ingredients, ingredientText, input.attention, { isAiSearchLabelEvidence });
  const sourceMeta = buildSourceMeta({
    detectedType: labelType,
    confirmedText,
    productNameText: input.productName || '',
    ingredientText,
    nutritionText,
    allergenText,
    frontClaimsText,
    foodTypeText,
    productionDateText,
    unconfirmedText: input.unconfirmedText || [],
    confidence: input.confidence,
    hasNutrition: Boolean(parsedNutrition.some((field) => field.value)),
    sourceType: input.sourceType,
    image: input.image,
    recognition: input.recognition,
    brand: input.brand,
    attention: input.attention
  });
  const report = buildLabelReport({
    productName: input.productName || '',
    rawText: confirmedText,
    ingredients,
    matches,
    nutrition: parsedNutrition,
    attention: input.attention,
    labelType,
    frontClaimsText,
    ocr: input.ocr,
    sourceMeta
  });
  return {
    report,
    confirmedText,
    labelType,
    ingredients,
    nutrition: parsedNutrition,
    matches
  };
}

export function buildScanDraftFromAnalysis(result: LocalLabelAnalysisResult): Partial<ScanDraft> {
  return {
    confirmedText: result.confirmedText,
    productName: result.report.productName,
    foodTypeText: result.report.analysisSource?.foodTypeText || '',
    productionDateText: result.report.analysisSource?.productionDateText || '',
    labelType: result.labelType,
    ingredients: result.ingredients,
    nutrition: result.nutrition,
    matches: result.matches,
    frontClaimsText: result.report.frontClaimsSection?.text || '',
    sourceMeta: result.report.analysisSource
  };
}

const localCommonIngredientTerms = [
  '水',
  '白砂糖',
  '食用盐',
  '食盐',
  '植物油',
  '精炼植物油',
  '棕榈油',
  '氢化菜籽油',
  '食用油脂制品',
  '黄豆',
  '大豆',
  '生牛乳',
  '青柠果味酱',
  '聚葡萄糖',
  '木糖醇',
  '浓缩牛奶蛋白',
  '明胶',
  '羟丙基二淀粉磷酸酯',
  '双乙酰酒石酸单双甘油酯',
  '果胶',
  '黄原胶',
  '三氯蔗糖',
  '嗜热链球菌',
  '德氏乳杆菌保加利亚亚种',
  '小麦',
  '小麦粉',
  '红茶',
  '红茶粉',
  '浓缩柠檬汁',
  '草菇',
  '姜黄粉',
  '咖喱粉',
  '香辛料',
  '番茄粉',
  '蜂蜜',
  '乳粉',
  '奶粉',
  '脱脂乳粉',
  '椰子粉',
  '麦芽糊精',
  '葡萄糖',
  '食用葡萄糖',
  '焦糖色',
  '味精',
  '谷氨酸钠',
  "5'-肌苷酸二钠",
  '5-肌苷酸二钠',
  "5'-呈味核苷酸二钠",
  '柠檬酸',
  '磷脂',
  '单硬脂酸甘油酯',
  '浓缩苹果浆'
];

function buildLocalIngredientMatches(
  ingredients: ParsedIngredient[],
  rawText: string,
  attention: AttentionSettings,
  options: { isAiSearchLabelEvidence?: boolean } = {}
): IngredientMatch[] {
  const rawAdditives = recognizeAdditivesFromText(rawText, attention);
  return ingredients.map((ingredient, index) => {
    const additiveHit = recognizeAdditivesFromText(ingredient.normalizedText || ingredient.rawText, attention)[0]
      || rawAdditives.find((item) => item.matchedTerms.some((term) => ingredient.normalizedText.includes(term)));
    const isAdditive = Boolean(additiveHit);
    const isCommonIngredient = !isAdditive && isLocalCommonIngredient(ingredient.normalizedText);
    return {
      id: `local-${index}-${ingredient.id}`,
      term: ingredient.normalizedText,
      normalizedText: ingredient.normalizedText,
      dataStatus: isAdditive || isCommonIngredient ? 'common_ingredient' : 'unknown_from_ocr',
      dataStatusLabel: isAdditive || isCommonIngredient ? dataStatusLabel('common_ingredient') : dataStatusLabel('unknown_from_ocr'),
      confidence: isAdditive ? 0.78 : isCommonIngredient ? 0.7 : 0,
      matchType: isAdditive || isCommonIngredient ? 'local_attention' : 'none',
      sourceName: options.isAiSearchLabelEvidence
        ? 'DeepSeek 联网商品标签线索'
        : isAdditive ? '本地添加剂规则' : isCommonIngredient ? '本地常见配料规则' : '识别文字',
      sourceType: options.isAiSearchLabelEvidence ? 'ai_search' : isAdditive || isCommonIngredient ? 'local_rule' : 'ocr_input',
      sourceNote: isAdditive
        ? options.isAiSearchLabelEvidence
          ? '由 AI 联网搜索到的公开标签线索触发本地添加剂规则，仅作参考解读，不作为包装实拍 OCR 或法规结论。'
          : '由本地添加剂关键词规则识别，仅作标签阅读提示。'
        : isCommonIngredient
          ? options.isAiSearchLabelEvidence
            ? '由 AI 联网搜索到的公开标签线索触发本地常见配料规则，仅作参考解读。'
            : '由本地常见食品配料词表识别，仅作标签阅读提示。'
          : options.isAiSearchLabelEvidence
            ? '来自 AI 联网搜索到的公开标签线索，已按未确认线索处理。'
            : '来自用户确认后的标签文字，已按未确认线索处理。',
      ingredientName: additiveHit?.name || ingredient.normalizedText,
      isAdditive,
      decision: 'confirmed'
    };
  });
}

function isLocalCommonIngredient(value: string): boolean {
  const text = String(value || '').replace(/[。.\s]/g, '').trim();
  if (!text || text === '食用') return false;
  return localCommonIngredientTerms.some((term) => text === term || text.includes(term));
}

function buildSourceMeta(options: {
  detectedType: LabelType;
  confirmedText: string;
  productNameText: string;
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  frontClaimsText: string;
  foodTypeText: string;
  productionDateText: string;
  unconfirmedText: string[];
  confidence?: 'high' | 'medium' | 'low';
  hasNutrition: boolean;
  sourceType: LocalAnalysisInputSource;
  image?: LocalImageAsset;
  recognition?: ProductRecognitionInfo;
  brand?: string;
  attention: AttentionSettings;
}): ReportAnalysisSource {
  const reportSourceType = resolveReportSourceType(options);
  const hasIdentitySource = Boolean(
    options.productNameText.trim()
    || options.brand?.trim()
    || options.recognition?.productName?.trim()
    || options.recognition?.brand?.trim()
    || options.recognition?.normalizedCode?.trim()
    || options.recognition?.qrContent?.trim()
  );
  return {
    sourceType: reportSourceType,
    sourceLabel: sourceLabelForType(reportSourceType, hasIdentitySource),
    description: sourceDescriptionForType(reportSourceType, hasIdentitySource),
    fromUserCapture: options.sourceType === 'ocr' && reportSourceType !== 'ai_search_product_label',
    fromManualInput: options.sourceType === 'manual',
    imageSummary: options.sourceType === 'ocr' && options.image
      ? `${options.image.name || '食品标签图片'}，${Math.round((options.image.size || 0) / 1024)}KB`
      : undefined,
    ocrText: options.confirmedText,
    productNameText: options.productNameText,
    ingredientText: options.ingredientText,
    nutritionText: options.nutritionText,
    allergenText: options.allergenText,
    frontClaimsText: options.frontClaimsText,
    foodTypeText: options.foodTypeText,
    productionDateText: options.productionDateText,
    unconfirmedText: uniqueStrings(options.unconfirmedText).slice(0, 8),
    recognition: options.recognition,
    normalizedCode: options.recognition?.normalizedCode,
    qrContent: options.recognition?.qrContent,
    brand: options.brand || options.recognition?.brand,
    recognitionSources: options.recognition?.sources,
    usedAiSearch: options.recognition?.usedAiSearch,
    aiNotice: options.recognition?.aiNotice,
    aiSearchSummary: options.recognition?.aiSearchSummary,
    aiSearchErrorCode: options.recognition?.aiSearchErrorCode,
    confidence: options.confidence,
    inputSourceType: options.sourceType,
    targetSnapshot: {
      primaryGoal: options.attention.primaryGoal,
      targetGoals: [...options.attention.targetGoals],
      isChildrenMode: options.attention.isChildrenMode,
      allergens: [...options.attention.allergens]
    }
  };
}

function resolveReportSourceType(options: {
  detectedType: LabelType;
  ingredientText: string;
  nutritionText: string;
  hasNutrition: boolean;
  frontClaimsText: string;
  sourceType: LocalAnalysisInputSource;
  recognition?: ProductRecognitionInfo;
}): ReportAnalysisSource['sourceType'] {
  if (options.sourceType === 'demo') return 'demo_sample';
  if (options.sourceType === 'manual') return 'manual_input';
  if (options.recognition?.usedAiSearch && (options.ingredientText.trim() || options.nutritionText.trim())) return 'ai_search_product_label';
  if (options.recognition && !options.ingredientText.trim() && !options.nutritionText.trim() && !options.frontClaimsText.trim()) return 'product_identity';
  if (options.frontClaimsText && options.detectedType !== 'ingredient_list' && options.detectedType !== 'nutrition_facts') return 'captured_product';
  return options.detectedType === 'nutrition_facts' && options.hasNutrition ? 'captured_nutrition' : 'captured_ingredient';
}

function sourceLabelForType(type: ReportAnalysisSource['sourceType'], hasIdentitySource = true): string {
  if (type === 'demo_sample') return '示例标签文本';
  if (type === 'manual_input') return '手动输入内容';
  if (type === 'product_identity') return hasIdentitySource ? '商品身份线索' : '识别信息不足';
  if (type === 'ai_search_product_label') return 'AI 联网公开标签线索';
  if (type === 'captured_nutrition') return '用户拍摄的营养成分表';
  if (type === 'captured_product') return '用户拍摄的包装正面文字';
  return '用户拍摄的配料表';
}

function sourceDescriptionForType(type: ReportAnalysisSource['sourceType'], hasIdentitySource = true): string {
  if (type === 'demo_sample') return '本次分析依据：内置示例食品标签文本。这是示例解读，不代表真实商品。';
  if (type === 'manual_input') return '本次分析依据：手动输入或粘贴的食品标签文字。';
  if (type === 'product_identity') return hasIdentitySource
    ? '本次分析依据：本次识别到的商品名、品牌、商品码或二维码线索。当前未获得可用配料表或营养成分表。'
    : '本次分析依据：本次拍照识别未获得可用食品标签文字或商品身份线索，已按信息不足处理。';
  if (type === 'ai_search_product_label') return '本次分析依据：AI 联网搜索到的公开商品标签线索。该线索不是包装实拍 OCR，不作为成分事实、法规或医疗结论。';
  if (type === 'captured_nutrition') return '本次分析依据：你拍摄的营养成分表 OCR 识别文字；请结合包装文字确认。';
  if (type === 'captured_product') return '本次分析依据：你拍摄的包装正面或其他食品标签 OCR 识别文字；请结合包装文字确认。';
  return '本次分析依据：你拍摄的配料表 OCR 识别文字；请结合包装文字确认。';
}

function resolveDetectedType(value: string, ingredientText: string, nutritionText: string, frontClaimsText: string): LabelType {
  const localResult = classifyLabelText(value);
  if (!ingredientText.trim() && nutritionText.trim()) return 'nutrition_facts';
  if (!localResult.requiresUserSelection && localResult.labelType === 'nutrition_facts') return 'nutrition_facts';
  const parsed = parseIngredientList(ingredientText);
  if (parsed.length >= 2) return 'ingredient_list';
  if (shouldParseNutrition(nutritionText, localResult.labelType)) return 'nutrition_facts';
  if (frontClaimsText.trim() && !localResult.requiresUserSelection) return localResult.labelType;
  if (frontClaimsText.trim()) return 'front_claims';
  return 'unknown_label';
}

function shouldParseNutrition(value: string, detectedType: LabelType): boolean {
  if (detectedType === 'nutrition_facts') return true;
  const compact = value.replace(/\s+/g, '');
  return /营养成分表|营养素参考值|NRV|每100(?:g|克|ml|毫升).*(?:能量|蛋白质|脂肪|碳水化合物|钠)|nutrition(?:facts|information)|per100(?:g|ml)|energy|calories|protein|fat|carbohydrate|sugars?|sodium/i.test(compact);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
