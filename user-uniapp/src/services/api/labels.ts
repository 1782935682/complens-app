import { labelTypeLabels } from '@/constants/labelTypes';
import { buildLabelReport as buildLabelReportLocally } from '@/utils/reportBuilder';
import type { AttentionSettings, IngredientMatch, LabelClassification, LabelReport, LabelType, NutritionField, OcrResult, ParsedIngredient, ReportAnalysisSource } from '@/types';
import { classifyLabelText } from '@/utils/labelClassifier';
import { getEditableNutritionFields, parseNutritionText } from '@/utils/nutritionParser';
import { enrichReportDecision } from '@/utils/decisionRules';
import { requestJson } from './client';

type LabelClassifyResponse = Partial<LabelClassification>;

export type ScanImageInput = {
  assetId: string;
  labelType?: LabelType;
  mimeType?: string;
  ocrResultId?: string;
  status?: 'ocr_input' | 'ocr_success' | 'ocr_failed' | 'manual_entry';
};

export type ScanSessionPayload = {
  sessionId?: string;
  labelTypeHint?: LabelType;
  images: ScanImageInput[];
};

export type ScanSessionResponse = {
  sessionId: string;
  images: Array<{
    assetId: string;
    labelType: LabelType;
    ocrResultId?: string;
    status: 'ocr_input' | 'ocr_success' | 'ocr_failed' | 'manual_entry';
  }>;
  nextSuggestedCapture: LabelType[];
};

export async function classifyLabelWithAdapter(text: string): Promise<LabelClassification> {
  try {
    const response = await requestJson<LabelClassifyResponse>('/labels/classify', {
      method: 'POST',
      authMode: 'none',
      data: { text },
      timeoutMs: 5000
    });
    return normalizeClassificationResponse(response, text);
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

export async function upsertLabelScanSessionWithAdapter(payload: ScanSessionPayload): Promise<ScanSessionResponse | null> {
  if (!payload.images.length) return null;

  try {
    return await requestJson<ScanSessionResponse>('/labels/scan', {
      method: 'POST',
      authMode: 'none',
      data: payload,
      timeoutMs: 8000
    });
  } catch {
    return null;
  }
}

function normalizeClassificationResponse(response: LabelClassifyResponse, text: string): LabelClassification {
  const fallback = classifyLabelText(text);
  const labelType = normalizeLabelType(response.labelType, fallback.labelType);
  const confidence = clampConfidence(response.confidence);
  if (labelType === 'ingredient_list' && fallback.labelType !== 'ingredient_list' && confidence < 0.85) {
    return {
      ...fallback,
      labelType: 'unknown_label',
      requiresUserSelection: true,
      reasons: ['识别到的文字不像完整配料表，将按包装原文整理并提示核对。']
    };
  }
  return {
    labelType,
    confidence,
    requiresUserSelection: Boolean(response.requiresUserSelection) || fallback.requiresUserSelection,
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
  sourceMeta?: ReportAnalysisSource;
};

export async function buildLabelReportWithAdapter(input: ReportInput): Promise<LabelReport> {
  try {
    const report = await requestJson<LabelReport>('/reports/label', {
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
        ocr: input.ocr,
        sourceMeta: input.sourceMeta
      },
      timeoutMs: 8000
    });
    return enrichReportDecision({
      ...report,
      analysisSource: report.analysisSource || input.sourceMeta
    }, input.attention);
  } catch {
    return enrichReportDecision(buildLabelReportLocally({
      productName: input.productName,
      rawText: input.rawText,
      ingredients: input.ingredients,
      matches: input.matches,
      nutrition: input.nutrition,
      attention: input.attention,
      labelType: input.labelType,
      frontClaimsText: input.frontClaimsText,
      ocr: input.ocr,
      sourceMeta: input.sourceMeta
    }), input.attention);
  }
}
