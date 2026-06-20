import { dataStatusLabel } from '@/constants/dataStatus';
import type {
  AttentionSettings,
  IngredientMatch,
  LabelReport,
  LabelType,
  LocalImageAsset,
  OcrResult,
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
  ingredientText: string;
  nutritionText?: string;
  allergenText?: string;
  frontClaimsText?: string;
  confidence?: 'high' | 'medium' | 'low';
  attention: AttentionSettings;
  sourceType: LocalAnalysisInputSource;
  ocr?: OcrResult;
  image?: LocalImageAsset;
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
  ingredientText?: string;
  nutritionText?: string;
  allergenText?: string;
  frontClaimsText?: string;
}): string {
  return [
    input.ingredientText?.trim() ? `配料表：${input.ingredientText.trim()}` : '',
    input.nutritionText?.trim() ? `营养成分表：${input.nutritionText.trim()}` : '',
    input.allergenText?.trim() ? `致敏原提示：${input.allergenText.trim()}` : '',
    input.frontClaimsText?.trim() ? `包装文字：${input.frontClaimsText.trim()}` : ''
  ].filter(Boolean).join('\n');
}

export function buildLocalLabelAnalysis(input: LocalLabelAnalysisInput): LocalLabelAnalysisResult {
  const ingredientText = input.ingredientText.trim();
  const nutritionText = (input.nutritionText || '').trim();
  const allergenText = (input.allergenText || '').trim();
  const frontClaimsText = (input.frontClaimsText || '').trim();
  const confirmedText = buildEffectiveLabelTextFromParts({ ingredientText, nutritionText, allergenText, frontClaimsText });
  const labelType = resolveDetectedType(confirmedText, ingredientText, nutritionText, frontClaimsText);
  const ingredients = parseIngredientList(ingredientText);
  const parsedNutrition = shouldParseNutrition(nutritionText, labelType)
    ? getEditableNutritionFields(parseNutritionText(nutritionText))
    : [];
  if (nutritionText) parseNutritionSummary(nutritionText);
  const matches = buildLocalIngredientMatches(ingredients, ingredientText, input.attention);
  const sourceMeta = buildSourceMeta({
    detectedType: labelType,
    confirmedText,
    ingredientText,
    nutritionText,
    allergenText,
    frontClaimsText,
    confidence: input.confidence,
    hasNutrition: Boolean(parsedNutrition.some((field) => field.value)),
    sourceType: input.sourceType,
    image: input.image,
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
    labelType: result.labelType,
    ingredients: result.ingredients,
    nutrition: result.nutrition,
    matches: result.matches,
    frontClaimsText: result.report.frontClaimsSection?.text || '',
    sourceMeta: result.report.analysisSource
  };
}

function buildLocalIngredientMatches(ingredients: ParsedIngredient[], rawText: string, attention: AttentionSettings): IngredientMatch[] {
  const rawAdditives = recognizeAdditivesFromText(rawText, attention);
  return ingredients.map((ingredient, index) => {
    const additiveHit = recognizeAdditivesFromText(ingredient.normalizedText || ingredient.rawText, attention)[0]
      || rawAdditives.find((item) => item.matchedTerms.some((term) => ingredient.normalizedText.includes(term)));
    const isAdditive = Boolean(additiveHit);
    return {
      id: `local-${index}-${ingredient.id}`,
      term: ingredient.normalizedText,
      normalizedText: ingredient.normalizedText,
      dataStatus: isAdditive ? 'common_ingredient' : 'unknown_from_ocr',
      dataStatusLabel: isAdditive ? dataStatusLabel('common_ingredient') : dataStatusLabel('unknown_from_ocr'),
      confidence: isAdditive ? 0.78 : 0,
      matchType: isAdditive ? 'local_attention' : 'none',
      sourceName: isAdditive ? '本地添加剂规则' : '识别文字',
      sourceType: isAdditive ? 'local_rule' : 'ocr_input',
      sourceNote: isAdditive
        ? '由本地添加剂关键词规则识别，仅作标签阅读提示。'
        : '来自用户确认后的标签文字，已按未确认线索处理。',
      ingredientName: additiveHit?.name || ingredient.normalizedText,
      isAdditive,
      decision: 'confirmed'
    };
  });
}

function buildSourceMeta(options: {
  detectedType: LabelType;
  confirmedText: string;
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  frontClaimsText: string;
  confidence?: 'high' | 'medium' | 'low';
  hasNutrition: boolean;
  sourceType: LocalAnalysisInputSource;
  image?: LocalImageAsset;
  attention: AttentionSettings;
}): ReportAnalysisSource {
  const reportSourceType = resolveReportSourceType(options);
  return {
    sourceType: reportSourceType,
    sourceLabel: sourceLabelForType(reportSourceType),
    description: sourceDescriptionForType(reportSourceType),
    fromUserCapture: options.sourceType === 'ocr',
    fromManualInput: options.sourceType === 'manual',
    imageSummary: options.sourceType === 'ocr' && options.image
      ? `${options.image.name || '食品标签图片'}，${Math.round((options.image.size || 0) / 1024)}KB`
      : undefined,
    ocrText: options.confirmedText,
    ingredientText: options.ingredientText,
    nutritionText: options.nutritionText,
    allergenText: options.allergenText,
    frontClaimsText: options.frontClaimsText,
    confidence: options.confidence,
    inputSourceType: options.sourceType,
    targetSnapshot: {
      primaryGoal: options.attention.primaryGoal,
      isChildrenMode: options.attention.isChildrenMode,
      allergens: [...options.attention.allergens]
    }
  };
}

function resolveReportSourceType(options: {
  detectedType: LabelType;
  hasNutrition: boolean;
  frontClaimsText: string;
  sourceType: LocalAnalysisInputSource;
}): ReportAnalysisSource['sourceType'] {
  if (options.sourceType === 'demo') return 'demo_sample';
  if (options.sourceType === 'manual') return 'manual_input';
  if (options.frontClaimsText && options.detectedType !== 'ingredient_list' && options.detectedType !== 'nutrition_facts') return 'captured_product';
  return options.detectedType === 'nutrition_facts' && options.hasNutrition ? 'captured_nutrition' : 'captured_ingredient';
}

function sourceLabelForType(type: ReportAnalysisSource['sourceType']): string {
  if (type === 'demo_sample') return '示例标签文本';
  if (type === 'manual_input') return '手动输入内容';
  if (type === 'captured_nutrition') return '用户拍摄的营养成分表';
  if (type === 'captured_product') return '用户拍摄的包装正面文字';
  return '用户拍摄的配料表';
}

function sourceDescriptionForType(type: ReportAnalysisSource['sourceType']): string {
  if (type === 'demo_sample') return '本次分析依据：内置示例食品标签文本。这是示例解读，不代表真实商品。';
  if (type === 'manual_input') return '本次分析依据：手动输入或粘贴的食品标签文字。';
  if (type === 'captured_nutrition') return '本次分析依据：你拍摄并确认的营养成分表。';
  if (type === 'captured_product') return '本次分析依据：你拍摄并确认的包装正面或其他食品标签文字。';
  return '本次分析依据：你拍摄并确认的配料表。';
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
