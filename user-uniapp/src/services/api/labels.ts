import { labelTypeLabels } from '@/constants/labelTypes';
import { buildLabelReport as buildLabelReportLocally } from '@/utils/reportBuilder';
import type { AttentionSettings, FoodAnalyzeResult, IngredientMatch, LabelClassification, LabelReport, LabelType, NutritionField, OcrResult, ParsedIngredient, ReportAnalysisSource, ReportSource } from '@/types';
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
      reasons: ['识别到的文字不像完整配料表，将按已识别文字生成信息不足提示。']
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
  const foodAnalysis = await analyzeFoodWithAdapter(input);
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
      analysisSource: report.analysisSource || input.sourceMeta,
      sources: mergeRecognitionSources(report.sources, input.sourceMeta),
      foodAnalysis
    }, input.attention);
  } catch {
    return enrichReportDecision({
      ...buildLabelReportLocally({
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
      }),
      foodAnalysis
    }, input.attention);
  }
}

function mergeRecognitionSources(sources: ReportSource[] = [], sourceMeta?: ReportAnalysisSource): ReportSource[] {
  const shouldReplaceDefaultOcrSource = Boolean(
    sourceMeta
    && sourceMeta.sourceType !== 'manual_input'
    && sourceMeta.sourceType !== 'demo_sample'
  );
  const next = shouldReplaceDefaultOcrSource
    ? sources.filter((item) => !isDefaultOcrConfirmedSource(item))
    : [...sources];
  if (sourceMeta?.sourceType === 'ai_search_product_label') {
    next.push({
      label: 'AI 联网公开标签线索',
      detail: sourceMeta.aiNotice || 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
      sourceType: 'ai_search'
    });
  }
  if (sourceMeta?.sourceType === 'product_identity') {
    const hasIdentitySource = hasProductIdentitySource(sourceMeta);
    next.push({
      label: hasIdentitySource ? '商品身份线索' : '识别信息不足',
      detail: hasIdentitySource
        ? '本次只识别到商品名、品牌、商品码或二维码等身份线索，未获得可用配料表或营养成分表。'
        : '本次未识别到可用标签文字或商品身份线索，已按信息不足处理。',
      sourceType: hasIdentitySource
        ? sourceMeta.qrContent ? 'qr_recognition' : 'barcode_recognition'
        : 'recognition_insufficient'
    });
  }
  if (sourceMeta && ['captured_ingredient', 'captured_nutrition', 'captured_product'].includes(sourceMeta.sourceType)) {
    next.push({
      label: '包装 OCR 识别文本',
      detail: '结果基于本次拍照识别出的食品标签文字生成，OCR 识别文字不是权威来源，请结合包装文字确认。',
      sourceType: 'ocr_input'
    });
  }
  if (sourceMeta?.recognition?.normalizedCode) {
    next.push({
      label: '商品条码 / 编码',
      detail: `已记录商品身份编码 ${sourceMeta.recognition.normalizedCode}，用于历史复用，不替代包装配料表。`,
      sourceType: 'barcode_recognition'
    });
  }
  if (sourceMeta?.recognition?.qrContent) {
    next.push({
      label: '包装二维码',
      detail: '已保存二维码原始内容，二维码页面信息只作为商品线索，不替代包装实拍文字。',
      sourceType: 'qr_recognition'
    });
  }
  if (sourceMeta?.recognitionSources?.includes('历史缓存')) {
    next.push({
      label: '历史缓存',
      detail: '本机已确认信息用于补全同一商品标签线索。',
      sourceType: 'product_cache'
    });
  }
  if (sourceMeta?.usedAiSearch) {
    next.push({
      label: 'DeepSeek 联网搜索',
      detail: sourceMeta.aiNotice || 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
      sourceType: 'ai_search'
    });
  }
  if (sourceMeta?.aiSearchErrorCode) {
    next.push({
      label: 'DeepSeek 联网搜索',
      detail: `AI 搜索未获取到完整标签信息（${sourceMeta.aiSearchErrorCode}），请补拍配料表 / 营养表或手动补充。`,
      sourceType: 'ai_search'
    });
  }
  const seen = new Set<string>();
  return next.filter((item) => {
    const key = `${item.sourceType}:${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDefaultOcrConfirmedSource(item: ReportSource): boolean {
  const label = String(item.label || '');
  const detail = String(item.detail || '');
  return item.sourceType === 'ocr_input'
    || label.includes('OCR')
    || label.includes('手动确认文本')
    || detail.includes('用户确认后的食品标签文本');
}

function hasProductIdentitySource(sourceMeta: ReportAnalysisSource): boolean {
  return Boolean(
    sourceMeta.productNameText?.trim()
    || sourceMeta.brand?.trim()
    || sourceMeta.normalizedCode?.trim()
    || sourceMeta.qrContent?.trim()
    || sourceMeta.recognition?.productName?.trim()
    || sourceMeta.recognition?.brand?.trim()
    || sourceMeta.recognition?.normalizedCode?.trim()
    || sourceMeta.recognition?.qrContent?.trim()
  );
}

async function analyzeFoodWithAdapter(input: ReportInput): Promise<FoodAnalyzeResult | undefined> {
  const enableFoodAi = input.sourceMeta?.sourceType !== 'ai_search_product_label'
    && input.sourceMeta?.sourceType !== 'product_identity';
  const ocrText = [
    input.rawText,
    input.sourceMeta?.productNameText,
    input.sourceMeta?.foodTypeText,
    input.sourceMeta?.ingredientText,
    input.sourceMeta?.nutritionText,
    input.sourceMeta?.allergenText,
    input.frontClaimsText,
    input.sourceMeta?.productionDateText
  ].filter(Boolean).join('\n');
  if (!ocrText.trim()) return undefined;
  try {
    return await requestJson<FoodAnalyzeResult>('/food/analyze', {
      method: 'POST',
      authMode: 'none',
      data: {
        ocrText,
        userProfile: {
          goals: input.attention.targetGoals.length ? input.attention.targetGoals : [input.attention.primaryGoal],
          allergens: input.attention.allergens,
          forChild: input.attention.isChildrenMode,
          highBloodPressure: input.attention.targetGoals.includes('lowSodium') || input.attention.primaryGoal === 'lowSodium'
        },
        options: {
          enableAi: enableFoodAi,
          provider: 'auto'
        }
      },
      timeoutMs: 12000
    });
  } catch {
    return undefined;
  }
}
