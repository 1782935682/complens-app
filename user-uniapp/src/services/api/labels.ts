import { labelTypeLabels } from '@/constants/labelTypes';
import { buildLabelReport as buildLabelReportLocally } from '@/utils/reportBuilder';
import type { AttentionSettings, IngredientMatch, LabelClassification, LabelReport, LabelType, NutritionField, OcrResult, ParsedIngredient } from '@/types';
import { classifyLabelText } from '@/utils/labelClassifier';
import { getEditableNutritionFields, parseNutritionText } from '@/utils/nutritionParser';
import { requestJson } from './client';

type LabelClassifyResponse = Partial<LabelClassification>;

export async function classifyLabelWithAdapter(text: string): Promise<LabelClassification> {
  try {
    const response = await requestJson<LabelClassifyResponse>('/labels/classify', {
      method: 'POST',
      authMode: 'none',
      data: { text },
      timeoutMs: 5000
    });
    return normalizeClassificationResponse(response);
  } catch {
    const localResult = classifyLabelText(text);
    return {
      ...localResult,
      fallbackOnly: true,
      reasons: [
        ...localResult.reasons,
        '后端标签分类暂不可用，当前使用本地规则辅助判断。'
      ]
    };
  }
}

function normalizeClassificationResponse(response: LabelClassifyResponse): LabelClassification {
  const fallback = classifyLabelText('');
  return {
    labelType: normalizeLabelType(response.labelType, fallback.labelType),
    confidence: clampConfidence(response.confidence),
    requiresUserSelection: Boolean(response.requiresUserSelection),
    reasons: Array.isArray(response.reasons) && response.reasons.length
      ? response.reasons.map((reason) => String(reason || '').trim()).filter(Boolean)
      : fallback.reasons
  };
}

function normalizeLabelType(value: unknown, fallback: LabelClassification['labelType']): LabelClassification['labelType'] {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(labelTypeLabels, value)
    ? value as LabelClassification['labelType']
    : fallback;
}

function clampConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

export type NutritionParseResponse = {
  nutrition: NutritionField[];
  warnings?: string[];
};

type NutritionParseBody = {
  text: string;
  perUnit?: string;
  servingSize?: string;
};

export async function parseNutritionWithAdapter(text: string, options: { perUnit?: string; servingSize?: string } = {}): Promise<NutritionField[]> {
  const payload: NutritionParseBody = { text };
  if (options.perUnit) payload.perUnit = options.perUnit;
  if (options.servingSize) payload.servingSize = options.servingSize;

  try {
    const response = await requestJson<NutritionParseResponse>('/nutrition/parse', {
      method: 'POST',
      authMode: 'none',
      data: payload,
      timeoutMs: 5000
    });
    const normalizedNutrition = getEditableNutritionFields(Array.isArray(response.nutrition) ? response.nutrition : []);
    return normalizedNutrition;
  } catch {
    return getEditableNutritionFields(parseNutritionText(text));
  }
}

type ReportInput = {
  productName: string;
  rawText: string;
  ingredients: ParsedIngredient[];
  matches: IngredientMatch[];
  nutrition: NutritionField[];
  attention: AttentionSettings;
  labelType?: LabelType;
  frontClaimsText?: string;
  ocr?: OcrResult;
};

export async function buildLabelReportWithAdapter(input: ReportInput): Promise<LabelReport> {
  try {
    return await requestJson<LabelReport>('/reports/label', {
      method: 'POST',
      authMode: 'none',
      data: {
        productName: input.productName,
        rawText: input.rawText,
        ingredients: input.ingredients,
        matches: input.matches,
        nutrition: input.nutrition,
        attention: input.attention,
        labelType: input.labelType,
        frontClaimsText: input.frontClaimsText,
        ocr: input.ocr
      },
      timeoutMs: 8000
    });
  } catch {
    return buildLabelReportLocally({
      productName: input.productName,
      rawText: input.rawText,
      ingredients: input.ingredients,
      matches: input.matches,
      nutrition: input.nutrition,
      attention: input.attention,
      labelType: input.labelType,
      frontClaimsText: input.frontClaimsText,
      ocr: input.ocr
    });
  }
}
