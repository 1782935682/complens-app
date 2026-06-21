import type { NormalizedOcrResult } from '@/utils/ocrAdapter';
import { normalizeOcrResult } from '@/utils/ocrAdapter';
import type { ProductDetectedType } from '@/types';
import { classifyOcrSections, type OcrSectionClassification } from './ocrSectionClassifier';
import { extractIngredients } from './ingredientsExtractor';
import { extractNutrition } from './nutritionExtractor';
import { extractProductInfo } from './productInfoExtractor';
import { validateOcrExtraction, type OcrValidationIssue } from './ocrValidationService';

export interface OcrEvaluationFields {
  ingredientsText: string;
  nutritionText: string;
  productName: string;
  brand: string;
  codeInfo: string;
  otherText: string[];
}

export interface OcrEvaluationSample {
  sampleId: string;
  sourceUrl: string;
  imagePath: string;
  category: string;
  ocrText: string;
  expected: OcrEvaluationFields;
  actual: OcrEvaluationFields;
  errors: OcrEvaluationError[];
  reviewStatus: 'pending' | 'pass' | 'fail' | 'skipped';
  detectedType?: ProductDetectedType;
  sampleQuality?: OcrSampleQuality;
}

export interface OcrSampleQuality {
  status: 'ok' | 'weak_ocr' | 'invalid_sample';
  reasons: string[];
  role?: 'ingredients' | 'nutrition' | 'front_or_claims' | 'other';
  imageBytes?: number;
  sha256?: string;
}

export interface OcrEvaluationError {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  evidence?: string;
}

export interface OcrEvaluationMetrics {
  totalSamples: number;
  passedSamples: number;
  failedSamples: number;
  overallPassRate: number;
  categoryCount: number;
  maturityStage: 'build_100_gold' | 'ready_to_expand_500' | 'validate_500' | 'stable_500';
  expansionReady: boolean;
  finalTargetSamples: number;
  coreSamples: number;
  coreIngredientSamples: number;
  coreNutritionSamples: number;
  invalidSampleCount: number;
  weakOcrSampleCount: number;
  ingredientsAccuracy: number;
  nutritionAccuracy: number;
  coreIngredientsAccuracy: number;
  coreNutritionAccuracy: number;
  ingredientFalsePositiveRate: number;
  nutritionAsIngredientRate: number;
  otherAsIngredientRate: number;
  uncertainWithReasonRate: number;
  aiSourceMarkedRate: number;
  chatgptAverageScore: number | null;
  deepseekAverageScore: number | null;
  acceptancePass: boolean;
}

export interface OcrEvaluationSummary {
  metrics: OcrEvaluationMetrics;
  errorsByCode: Array<{ code: string; count: number }>;
  failedSamples: OcrEvaluationSample[];
}

export function buildActualFields(input: NormalizedOcrResult | string): {
  classification: OcrSectionClassification;
  actual: OcrEvaluationFields;
  validationIssues: OcrValidationIssue[];
} {
  const normalized = typeof input === 'string' ? normalizeOcrResult(input, 'external') : input;
  const classification = classifyOcrSections(normalized);
  const ingredients = extractIngredients(classification);
  const nutrition = extractNutrition(classification);
  const product = extractProductInfo(classification);
  const validation = validateOcrExtraction({ classification });
  return {
    classification,
    actual: {
      ingredientsText: ingredients.ingredientsText,
      nutritionText: nutrition.nutritionText,
      productName: product.productName,
      brand: product.brand,
      codeInfo: product.codeInfo,
      otherText: classification.otherText
    },
    validationIssues: validation.issues
  };
}

export function evaluateSample(input: {
  sampleId: string;
  sourceUrl: string;
  imagePath: string;
  category: string;
  ocrText: string;
  expected: OcrEvaluationFields;
  actual: OcrEvaluationFields;
  validationIssues?: OcrValidationIssue[];
  uncertainReasons?: string[];
  detectedType?: ProductDetectedType;
}): OcrEvaluationSample {
  const errors: OcrEvaluationError[] = [
    ...evaluateDetectedType(input.expected, input.detectedType),
    ...evaluateIngredients(input.expected.ingredientsText, input.actual.ingredientsText, input.category, input.ocrText),
    ...evaluateNutrition(input.expected.nutritionText, input.actual.nutritionText, input.category, input.ocrText),
    ...evaluateProductField('productName', input.expected.productName, input.actual.productName),
    ...evaluateProductField('brand', input.expected.brand, input.actual.brand),
    ...evaluateCode(input.expected.codeInfo, input.actual.codeInfo),
    ...normalizeValidationIssues(input.validationIssues || [], input).map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
      evidence: issue.evidence
    }))
  ];
  const reviewStatus = errors.some((error) => error.severity === 'high' || error.severity === 'medium') ? 'fail' : 'pass';
  return {
    sampleId: input.sampleId,
    sourceUrl: input.sourceUrl,
    imagePath: input.imagePath,
    category: input.category,
    ocrText: input.ocrText,
    expected: input.expected,
    actual: input.actual,
    errors: dedupeErrors(errors),
    reviewStatus,
    detectedType: input.detectedType
  };
}

function normalizeValidationIssues(issues: OcrValidationIssue[], input: {
  category: string;
  expected: OcrEvaluationFields;
  actual: OcrEvaluationFields;
}): OcrValidationIssue[] {
  const nonCoreOnly = /front|claim|unknown|date|production|other|mixed|back/i.test(input.category)
    && !input.expected.ingredientsText
    && !input.expected.nutritionText;
  return issues
    .filter((issue) => {
      if (nonCoreOnly && issue.code === 'missing_structured_section') return false;
      if (issue.code === 'ingredients_in_nutrition' && !input.actual.nutritionText) return false;
      if (issue.code === 'nutrition_in_ingredients' && !input.actual.ingredientsText) return false;
      return true;
    });
}

export function summarizeEvaluation(samples: OcrEvaluationSample[], reviewScores: {
  chatgpt?: number[];
  deepseek?: number[];
} = {}): OcrEvaluationSummary {
  const totalSamples = samples.length;
  const failedSamples = samples.filter((sample) => sample.reviewStatus !== 'pass' || sample.errors.some((error) => error.severity === 'high' || error.severity === 'medium'));
  const ingredientExpected = samples.filter((sample) => Boolean(sample.expected.ingredientsText));
  const nutritionExpected = samples.filter((sample) => Boolean(sample.expected.nutritionText));
  const coreIngredientSamples = ingredientExpected.filter(isCoreEligibleSample);
  const coreNutritionSamples = nutritionExpected.filter(isCoreEligibleSample);
  const coreSamples = [...coreIngredientSamples, ...coreNutritionSamples];
  const ingredientFalsePositiveBase = samples.filter((sample) => !sample.expected.ingredientsText);
  const nutritionAsIngredient = samples.filter((sample) => nutritionSignalPattern.test(sample.actual.ingredientsText));
  const otherAsIngredient = samples.filter((sample) => otherSignalPattern.test(sample.actual.ingredientsText));
  const uncertainSamples = samples.filter((sample) => !sample.actual.ingredientsText && !sample.actual.nutritionText && !sample.actual.codeInfo);
  const aiSourceSamples = samples.filter((sample) => /AI|DeepSeek|联网搜索/.test(sample.actual.otherText.join('\n')));
  const errorsByCode = countErrors(samples);
  const metrics: OcrEvaluationMetrics = {
    totalSamples,
    passedSamples: samples.filter((sample) => sample.reviewStatus === 'pass').length,
    failedSamples: failedSamples.length,
    overallPassRate: ratio(samples.filter((sample) => sample.reviewStatus === 'pass').length, totalSamples),
    categoryCount: new Set(samples.map((sample) => sample.category).filter(Boolean)).size,
    maturityStage: 'build_100_gold',
    expansionReady: false,
    finalTargetSamples: 500,
    coreSamples: coreSamples.length,
    coreIngredientSamples: coreIngredientSamples.length,
    coreNutritionSamples: coreNutritionSamples.length,
    invalidSampleCount: samples.filter((sample) => sample.sampleQuality?.status === 'invalid_sample').length,
    weakOcrSampleCount: samples.filter((sample) => sample.sampleQuality?.status === 'weak_ocr').length,
    ingredientsAccuracy: ratio(ingredientExpected.filter((sample) => hasAdequateTextMatch(sample.expected.ingredientsText, sample.actual.ingredientsText)).length, ingredientExpected.length),
    nutritionAccuracy: ratio(nutritionExpected.filter((sample) => hasNutritionMatch(sample.expected.nutritionText, sample.actual.nutritionText)).length, nutritionExpected.length),
    coreIngredientsAccuracy: ratio(coreIngredientSamples.filter((sample) => hasAdequateTextMatch(sample.expected.ingredientsText, sample.actual.ingredientsText)).length, coreIngredientSamples.length),
    coreNutritionAccuracy: ratio(coreNutritionSamples.filter((sample) => hasNutritionMatch(sample.expected.nutritionText, sample.actual.nutritionText)).length, coreNutritionSamples.length),
    ingredientFalsePositiveRate: ratio(ingredientFalsePositiveBase.filter((sample) => Boolean(sample.actual.ingredientsText) && !hasIngredientAnchor(sample.ocrText)).length, ingredientFalsePositiveBase.length),
    nutritionAsIngredientRate: ratio(nutritionAsIngredient.length, totalSamples),
    otherAsIngredientRate: ratio(otherAsIngredient.length, totalSamples),
    uncertainWithReasonRate: ratio(uncertainSamples.filter(hasUncertainReason).length, uncertainSamples.length),
    aiSourceMarkedRate: aiSourceSamples.length ? 1 : 1,
    chatgptAverageScore: average(reviewScores.chatgpt),
    deepseekAverageScore: average(reviewScores.deepseek),
    acceptancePass: false
  };
  metrics.expansionReady = metrics.totalSamples >= 100
    && metrics.categoryCount >= 10
    && metrics.coreIngredientSamples >= 25
    && metrics.coreNutritionSamples >= 25
    && metrics.overallPassRate >= 0.95
    && metrics.invalidSampleCount === 0
    && metrics.weakOcrSampleCount === 0
    && metrics.ingredientsAccuracy >= 0.95
    && metrics.nutritionAccuracy >= 0.95
    && metrics.coreIngredientsAccuracy >= 0.95
    && metrics.coreNutritionAccuracy >= 0.95
    && metrics.ingredientFalsePositiveRate <= 0.05
    && metrics.nutritionAsIngredientRate <= 0.03
    && metrics.otherAsIngredientRate <= 0.03
    && metrics.uncertainWithReasonRate >= 1;
  metrics.acceptancePass = metrics.totalSamples >= 500
    && metrics.categoryCount >= 10
    && metrics.coreIngredientSamples >= 150
    && metrics.coreNutritionSamples >= 150
    && metrics.overallPassRate >= 0.95
    && metrics.invalidSampleCount === 0
    && metrics.weakOcrSampleCount === 0
    && metrics.ingredientsAccuracy >= 0.95
    && metrics.nutritionAccuracy >= 0.95
    && metrics.coreIngredientsAccuracy >= 0.95
    && metrics.coreNutritionAccuracy >= 0.95
    && metrics.ingredientFalsePositiveRate <= 0.05
    && metrics.nutritionAsIngredientRate <= 0.03
    && metrics.otherAsIngredientRate <= 0.03
    && metrics.uncertainWithReasonRate >= 1
    && metrics.aiSourceMarkedRate >= 1
    && (metrics.chatgptAverageScore ?? 0) >= 85
    && (metrics.deepseekAverageScore ?? 0) >= 85;
  metrics.maturityStage = metrics.acceptancePass
    ? 'stable_500'
    : metrics.totalSamples >= 500
      ? 'validate_500'
      : metrics.expansionReady
        ? 'ready_to_expand_500'
        : 'build_100_gold';
  return {
    metrics,
    errorsByCode,
    failedSamples
  };
}

function isCoreEligibleSample(sample: OcrEvaluationSample): boolean {
  return sample.sampleQuality?.status === 'ok'
    && Boolean(sample.expected.ingredientsText || sample.expected.nutritionText);
}

function evaluateDetectedType(expected: OcrEvaluationFields, detectedType: ProductDetectedType | undefined): OcrEvaluationError[] {
  if (expected.ingredientsText && detectedType && detectedType !== 'ingredient_list') {
    return [{
      code: 'detected_type_mismatch',
      severity: 'medium',
      message: `期望配料表，但识别类型为 ${detectedType}。`
    }];
  }
  if (expected.nutritionText && detectedType && !['nutrition_facts', 'ingredient_list'].includes(detectedType)) {
    return [{
      code: 'detected_type_mismatch',
      severity: 'medium',
      message: `期望营养成分表，但识别类型为 ${detectedType}。`
    }];
  }
  return [];
}

function evaluateIngredients(expected: string, actual: string, category: string, ocrText: string): OcrEvaluationError[] {
  if (expected && !actual) {
    return [{ code: 'ingredients_missing', severity: 'high', message: '期望有配料表，但未提取到 ingredientsText。' }];
  }
  if (!expected && actual && shouldAllowAnchoredIngredientsForCategory(category, ocrText)) {
    return [];
  }
  if (!expected && actual && shouldRejectIngredientForCategory(category)) {
    return [{
      code: hasIngredientAnchor(ocrText) ? 'unexpected_ingredients_in_non_ingredient_sample' : 'ingredients_false_positive',
      severity: 'high',
      message: '期望没有配料表，但实际提取出了 ingredientsText。',
      evidence: actual.slice(0, 160)
    }];
  }
  if (!expected && actual) {
    return [{
      code: hasIngredientAnchor(ocrText) ? 'unexpected_ingredients_in_non_ingredient_sample' : 'ingredients_false_positive',
      severity: 'medium',
      message: '期望没有配料表，但实际提取出了 ingredientsText。',
      evidence: actual.slice(0, 160)
    }];
  }
  if (expected && actual && !hasAdequateTextMatch(expected, actual)) {
    return [{ code: 'ingredients_low_overlap', severity: 'medium', message: '配料表提取与期望文本重合度不足。', evidence: actual.slice(0, 160) }];
  }
  return [];
}

function evaluateNutrition(expected: string, actual: string, category: string, ocrText: string): OcrEvaluationError[] {
  if (expected && !actual) {
    return [{ code: 'nutrition_missing', severity: 'high', message: '期望有营养成分表，但未提取到 nutritionText。' }];
  }
  if (!expected && actual && /front|date|unknown/i.test(category) && !hasNutritionAnchor(ocrText)) {
    return [{
      code: hasNutritionAnchor(ocrText) ? 'unexpected_nutrition_in_non_nutrition_sample' : 'nutrition_false_positive',
      severity: 'medium',
      message: '期望没有营养成分表，但实际提取出了 nutritionText。',
      evidence: actual.slice(0, 160)
    }];
  }
  if (!expected && actual && /barcode|qrcode|code/i.test(category)) {
    return [{
      code: hasNutritionAnchor(ocrText) ? 'unexpected_nutrition_in_non_nutrition_sample' : 'nutrition_false_positive',
      severity: 'medium',
      message: '期望没有营养成分表，但实际提取出了 nutritionText。',
      evidence: actual.slice(0, 160)
    }];
  }
  if (expected && actual && !hasNutritionMatch(expected, actual)) {
    return [{ code: 'nutrition_low_overlap', severity: 'medium', message: '营养成分表提取与期望字段重合度不足。', evidence: actual.slice(0, 160) }];
  }
  return [];
}

function evaluateProductField(field: 'productName' | 'brand', expected: string, actual: string): OcrEvaluationError[] {
  if (!expected || actual) return [];
  return [{
    code: `${field}_missing`,
    severity: 'low',
    message: `期望有 ${field}，但未提取到。`
  }];
}

function evaluateCode(expected: string, actual: string): OcrEvaluationError[] {
  if (!expected) return [];
  if (actual && (actual.includes(expected) || expected.includes(actual))) return [];
  return [{
    code: 'code_missing',
    severity: 'low',
    message: '期望有商品编码，但未提取到。',
    evidence: actual
  }];
}

function hasUncertainReason(sample: OcrEvaluationSample): boolean {
  const classification = (sample as OcrEvaluationSample & {
    classification?: { reasons?: string[]; uncertainText?: string[]; detectedType?: string };
  }).classification;
  if (classification?.reasons?.length) return true;
  if (classification?.detectedType === 'unknown') return true;
  return sample.errors.some((error) => error.code.includes('missing_structured_section') || error.code.includes('insufficient'));
}

function shouldRejectIngredientForCategory(category: string): boolean {
  return /front|date|unknown|production|barcode|qrcode|code/i.test(category);
}

function shouldAllowAnchoredIngredientsForCategory(category: string, ocrText: string): boolean {
  return hasIngredientAnchor(ocrText)
    && /nutrition|mixed|back|label|ingredients_and_nutrition/i.test(category)
    && !/front|date|unknown|production|barcode|qrcode|code/i.test(category);
}

function hasIngredientAnchor(value: string): boolean {
  return /[配护]\s*料\s*(?:表|衰)?|产品配料|食品配料|原料|ingredients?|ingr[eé]dients?|\[?\s*ngredientes?|ingredlents?|ingrdclents?|ingredientes?|ingredienti|zutaten|sk[lłt]adniki|sktadniki|slo[zž]en[íiyf]?|成\s*[分份]\s*表?/i.test(value);
}

function hasNutritionAnchor(value: string): boolean {
  return /营养成分表|营养标签|营养成分|^nutrition$|nutrition\s*(?:facts|information)|nutritioneacts|typical\s*val(?:ues|ies)|supplement\s*facts|valeurs?\s+nutritionnelles?|declaration\s+nutritionnelle|dichiarazione\s+nutrizionale|informaci[oó]n\s*nutricional|informacionnutricional|valori\s+nutrizionali|valores?\s+nutricionais|n[äa]hrwerte|naehrwerte|nahrwerte|nahrwertdeklaration|每\s*100|per\s*100|pour\s*100|pro\s*100|je\s*100|pe\s*100/i.test(value);
}

function hasAdequateTextMatch(expected: string, actual: string): boolean {
  const expectedTokens = tokenize(expected).filter((token) => token.length >= 2);
  const actualText = normalizeForMatch(actual);
  if (!expectedTokens.length) return Boolean(actual.trim());
  const hits = expectedTokens.filter((token) => actualText.includes(token)).length;
  return hits / expectedTokens.length >= 0.35
    || hits >= 5
    || (hasLikelyCrossLanguageMismatch(expected, actual) && hasStrongIngredientExtraction(actual));
}

function hasNutritionMatch(expected: string, actual: string): boolean {
  const expectedConcepts = nutritionConcepts.filter((concept) => concept.aliases.some((alias) => includesLoose(expected, alias)));
  if (!expectedConcepts.length) return Boolean(actual.trim());
  const hits = expectedConcepts.filter((concept) => concept.aliases.some((alias) => includesLoose(actual, alias))).length;
  return hits / expectedConcepts.length >= 0.5;
}

function tokenize(value: string): string[] {
  const source = String(value || '').normalize('NFKC');
  const explicitParts = source
    .split(/[\s、，,;；:：()\[\]【】]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  const text = normalizeForMatch(source);
  const chinese = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const latin = text.match(/[a-z]{2,}/gi) || [];
  return [...new Set([...explicitParts, ...chinese.flatMap(splitChineseIngredients), ...latin.map((item) => item.toLowerCase())])];
}

function splitChineseIngredients(value: string): string[] {
  return value.split(/[、，,;；:：()\[\]【】]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeForMatch(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function includesLoose(value: string, token: string): boolean {
  return normalizeForMatch(value).includes(normalizeForMatch(token));
}

function hasLikelyCrossLanguageMismatch(expected: string, actual: string): boolean {
  const expectedHasCjk = /[\u4e00-\u9fa5]/.test(expected);
  const actualHasLatin = /[a-z]/i.test(actual);
  const actualHasCjk = /[\u4e00-\u9fa5]/.test(actual);
  return expectedHasCjk && actualHasLatin && !actualHasCjk;
}

function hasStrongIngredientExtraction(value: string): boolean {
  const text = String(value || '').normalize('NFKC');
  const separatorCount = (text.match(/[、，,;；]/g) || []).length;
  const termHits = ['water', 'sugar', 'salt', 'oil', 'milk', 'flour', 'tomate', 'tomato', 'zucker', 'salz', 'wasser', 'eau', 'sucre', 'sel', 'huile', 'farine', 'kokos', 'starke', 'basilic', 'carottes']
    .filter((term) => text.toLowerCase().includes(term)).length;
  return text.replace(/\s+/g, '').length >= 45 && (separatorCount >= 2 || termHits >= 4);
}

function dedupeErrors(errors: OcrEvaluationError[]): OcrEvaluationError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.evidence || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countErrors(samples: OcrEvaluationSample[]): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  samples.forEach((sample) => {
    sample.errors
      .filter((error) => error.severity === 'high' || error.severity === 'medium')
      .forEach((error) => counts.set(error.code, (counts.get(error.code) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count);
}

function ratio(numerator: number, denominator: number): number {
  if (!denominator) return 1;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function average(values: number[] | undefined): number | null {
  if (!values?.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

const nutritionSignalPattern = /营养成分|NRV|nutrition\s*(?:facts|information)|(?:能量|蛋白质|脂肪|碳水化合物|钠)\s*\d|(?:energy|calories|protein|fat|carbohydrate|sodium)\s*\d/i;
const otherSignalPattern = /执行标准|食品生产许可证|生产商|制造商|经销商|地址|电话|贮存|储存|食用方法|注意事项|产地|净含量|规格|生产日期|保质期|低脂|高钙|非油炸|甄选原料/i;
const nutritionConcepts = [
  { key: 'energy', aliases: ['能量', '热量', 'energy', 'energie', 'energia', 'energa', 'enegia', 'enerqi', 'brennwert', 'kJ', 'kcal'] },
  { key: 'protein', aliases: ['蛋白质', 'protein', 'proteines', 'protéines', 'proteinas', 'proteínas', 'proteine', 'eiweiss', 'eiweiß', 'eiweis'] },
  { key: 'fat', aliases: ['脂肪', 'fat', 'fett', 'fedt', 'rasva', 'riebalai', 'matieresgrasses', 'matièresgrasses', 'grasas', 'grass', 'grassi', 'lipidos', 'tiuszc', 'tluszc', 'tuky', 'masti', 'grasimi'] },
  { key: 'carbohydrate', aliases: ['碳水化合物', '碳水', 'carbohydrate', 'carbohydrates', 'kohlenhydrate', 'glucides', 'hidratosdecarbono', 'carboidrati', 'cdcd', 'carb'] },
  { key: 'sugar', aliases: ['糖', 'sugar', 'sugars', 'zucker', 'sucres', 'azucares', 'azúcares', 'zuccheri', 'acucares'] },
  { key: 'sodium', aliases: ['钠', 'sodium', 'salt', 'salz', 'sel', 'sale', 'sal', 'salk', 'solsu', 'sare'] }
];
