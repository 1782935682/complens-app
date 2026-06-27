import type { LabelType, LocalImageAsset, OcrResult } from '@/types';
import { recognizeImageByBackend } from '@/services/api/ocr';
import { classifyLabelText } from '@/utils/labelClassifier';
import { extractLabelText, filterIngredientTextForReport, type LabelTextConfidence, type LabelTextExtraction, type LabelTextSourceType } from '@/utils/labelTextExtractor';
import { normalizeOcrResult } from '@/utils/ocrAdapter';
import { classifyOcrSections } from '@/services/ocr/ocrSectionClassifier';
import { extractIngredients } from '@/services/ocr/ingredientsExtractor';
import { extractNutrition } from '@/services/ocr/nutritionExtractor';
import { extractProductInfo } from '@/services/ocr/productInfoExtractor';

export interface OcrRecognitionResult {
  ocr: OcrResult;
  rawText: string;
  extraction: LabelTextExtraction;
  detectedLabelType: LabelType;
}

export async function recognizeFoodLabelText(asset: LocalImageAsset): Promise<OcrRecognitionResult> {
  const ocr = await recognizeImageByBackend(asset);
  return buildOcrRecognitionResult(ocr);
}

export function buildOcrRecognitionResult(ocr: OcrResult): OcrRecognitionResult {
  const normalized = normalizeOcrResult(ocr);
  const extraction = buildStructuredExtraction(normalized);
  const rawText = normalized.rawText || ocr.text || '';
  return {
    ocr,
    rawText,
    extraction,
    detectedLabelType: detectLabelTypeFromExtraction(extraction)
  };
}

function buildStructuredExtraction(normalized: ReturnType<typeof normalizeOcrResult>): LabelTextExtraction {
  const baseline = extractLabelText(normalized);
  const classification = classifyOcrSections(normalized);
  const ingredients = extractIngredients(classification);
  const nutrition = extractNutrition(classification);
  const productInfo = extractProductInfo(classification);
  const confidence = resolveStructuredConfidence(classification.confidence, ingredients.confidence, nutrition.confidence);
  const ingredientFilter = filterIngredientTextForReport(ingredients.ingredientsText);
  return {
    ...baseline,
    productNameText: baseline.productNameText || productInfo.productName,
    ingredientText: ingredientFilter.text,
    nutritionText: nutrition.nutritionText,
    ignoredText: uniqueStrings([
      ...classification.otherText,
      ...classification.uncertainText,
      ...ingredientFilter.ignored,
      ...baseline.ignoredText
    ]).slice(0, 16),
    qualityWarnings: uniqueStrings([
      ...baseline.qualityWarnings,
      ...ingredientFilter.qualityWarnings
    ]),
    confidence
  };
}

export function detectLabelTypeFromExtraction(extraction: Pick<LabelTextExtraction, 'ingredientText' | 'nutritionText' | 'frontClaimsText'>): LabelType {
  if (extraction.ingredientText.trim()) return 'ingredient_list';
  if (extraction.nutritionText.trim()) return 'nutrition_facts';
  if (extraction.frontClaimsText.trim()) return 'front_claims';
  const text = [extraction.ingredientText, extraction.nutritionText, extraction.frontClaimsText].join('\n');
  return classifyLabelText(text).labelType;
}

export function emptyOcrExtraction(sourceType: LabelTextSourceType = 'ocr'): LabelTextExtraction {
  return {
    productNameText: '',
    foodTypeText: '',
    ingredientText: '',
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    productionDateText: '',
    ignoredText: [],
    qualityWarnings: [],
    confidence: 'low' as LabelTextConfidence,
    sourceType
  };
}

function resolveStructuredConfidence(...values: Array<'high' | 'medium' | 'low'>): LabelTextConfidence {
  if (values.includes('high')) return 'high';
  if (values.includes('medium')) return 'medium';
  return 'low' as LabelTextConfidence;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
