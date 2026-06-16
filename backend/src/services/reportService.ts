import { randomUUID } from 'node:crypto';
import type { BatchSearchMatch, BatchSearchResult, IngredientService } from './ingredientService.js';

export type ReportLabelType = 'ingredient_list' | 'nutrition_facts' | 'front_claims' | 'barcode_or_product' | 'unknown_label';

export type NutritionKey =
  | 'energy'
  | 'protein'
  | 'fat'
  | 'saturatedFat'
  | 'transFat'
  | 'carbohydrate'
  | 'sugar'
  | 'sodium'
  | 'dietaryFiber'
  | 'servingSize'
  | 'perUnit'
  | 'nrvPercent';

export type ReportDataStatus =
  | 'verified_regulation'
  | 'verified_jecfa'
  | 'pending_review'
  | 'mapped_candidate'
  | 'common_ingredient'
  | 'unverified'
  | 'unknown_from_ocr';

export type MatchDecision = 'pending' | 'confirmed' | 'rejected';
export type MatchType = 'exact' | 'alias' | 'eNumber' | 'fuzzy' | 'none' | 'local_attention';

export type ParsedIngredientInput = {
  id?: string;
  rawText?: string;
  normalizedText?: string;
  isSubIngredient?: boolean;
  parentLabel?: string;
  isUnknown?: boolean;
};

export type IngredientMatchInput = {
  id?: string;
  term?: string;
  normalizedText?: string;
  dataStatus?: string;
  dataStatusLabel?: string;
  confidence?: number;
  matchType?: string;
  sourceName?: string;
  sourceType?: string;
  sourceNote?: string;
  ingredientId?: string;
  ingredientName?: string;
  isAdditive?: boolean;
  decision?: string;
  matchedDataStatus?: string;
  matchedSourceType?: string;
  matchedSourceNote?: string;
  matchedIsAdditive?: boolean;
};

export type NutritionFieldInput = {
  key?: string;
  label?: string;
  value?: string;
  unit?: string;
  nrvPercent?: string;
  sourceText?: string;
  confidence?: number;
};

export type OcrResultInput = {
  mode?: string;
  provider?: string;
};

export type AttentionSettingsInput = {
  goals?: unknown[];
  detailTerms?: unknown[];
  customTerms?: unknown[];
};

export type ReportBuildInput = {
  productName?: string;
  rawText?: string;
  ingredients?: ParsedIngredientInput[];
  matches?: IngredientMatchInput[];
  nutrition?: NutritionFieldInput[];
  attention?: AttentionSettingsInput;
  labelType?: string;
  frontClaimsText?: string;
  ocr?: OcrResultInput;
};

export type LabelReport = {
  id: string;
  title: string;
  productName: string;
  createdAt: string;
  summarySentence: string;
  attentionHits: AttentionHit[];
  focusItems: string[];
  ingredientSection: {
    total: number;
    additiveCount: number;
    items: IngredientMatch[];
  };
  nutritionSection: {
    fields: NutritionField[];
    highlights: string[];
  };
  nutritionIngredientChecks?: NutritionIngredientCheck[];
  frontClaimsSection?: {
    text: string;
    highlights: string[];
  };
  additiveGroups: Array<{ label: string; items: IngredientMatch[] }>;
  allergenHints: string[];
  unknownItems: string[];
  sources: ReportSource[];
  rawText: string;
};

export type NutritionField = {
  key: NutritionKey;
  label: string;
  value: string;
  unit: string;
  nrvPercent?: string;
  sourceText?: string;
  confidence: number;
};

export type NutritionIngredientCheckState = 'possible_issue' | 'no_obvious_issue' | 'insufficient_data';

export type NutritionIngredientCheck = {
  key: 'sugar' | 'sodium';
  title: string;
  nutritionValue: string;
  nutritionUnit: string;
  ingredientSignals: string[];
  state: NutritionIngredientCheckState;
  summary: string;
};

export type IngredientMatch = {
  id: string;
  term: string;
  normalizedText: string;
  dataStatus: ReportDataStatus;
  dataStatusLabel: string;
  confidence: number;
  matchType: MatchType;
  sourceName?: string;
  sourceType?: string;
  sourceNote: string;
  ingredientId?: string;
  ingredientName?: string;
  isAdditive: boolean;
  decision: MatchDecision;
  matchedDataStatus?: ReportDataStatus;
  matchedSourceType?: string;
  matchedSourceNote?: string;
  matchedIsAdditive?: boolean;
};

export type AttentionHit = {
  key: string;
  label: string;
  reason: string;
  terms: string[];
};

export type ReportSource = {
  label: string;
  detail: string;
};

export type ReportService = {
  buildLabelReport(input: ReportBuildInput): Promise<LabelReport>;
};

type ReportServiceDeps = {
  ingredientService?: Pick<IngredientService, 'batchSearch'>;
};

const trustedAutoConfirmStatuses: ReportDataStatus[] = ['verified_regulation', 'verified_jecfa', 'common_ingredient'];

const attentionGoals = [
  { key: 'sugar_control', label: '控糖', keywords: ['糖', '糖浆', '甜味剂', '碳水化合物'] },
  { key: 'low_sodium', label: '低钠', keywords: ['钠', '食用盐', '谷氨酸钠', '碳酸氢钠'] },
  { key: 'fat_control', label: '减脂', keywords: ['能量', '脂肪', '饱和脂肪', '反式脂肪'] },
  { key: 'high_protein', label: '高蛋白', keywords: ['蛋白质'] },
  { key: 'fewer_additives', label: '少添加', keywords: ['防腐剂', '色素', '食用香精', '食品添加剂'] },
  { key: 'for_children', label: '给孩子看', keywords: ['甜味剂', '色素', '防腐剂', '咖啡因'] },
  { key: 'avoidance', label: '过敏/忌口', keywords: ['乳', '大豆', '坚果', '麸质', '蛋', '海鲜'] }
];

const dataStatusLabels: Record<ReportDataStatus, string> = {
  verified_regulation: '官方标准已验证',
  verified_jecfa: 'JECFA 评价已匹配（非中国法规范围）',
  pending_review: '待复核来源数据',
  mapped_candidate: '疑似匹配，待确认',
  common_ingredient: '普通配料',
  unverified: '未验证',
  unknown_from_ocr: '暂未收录'
};

const nutritionDefinitions: Record<NutritionKey, { label: string }> = {
  energy: { label: '能量' },
  protein: { label: '蛋白质' },
  fat: { label: '脂肪' },
  saturatedFat: { label: '饱和脂肪' },
  transFat: { label: '反式脂肪' },
  carbohydrate: { label: '碳水化合物' },
  sugar: { label: '糖' },
  sodium: { label: '钠' },
  dietaryFiber: { label: '膳食纤维' },
  servingSize: { label: '每份' },
  perUnit: { label: '标示单位' },
  nrvPercent: { label: 'NRV%' }
};

export function createReportService(deps: ReportServiceDeps = {}): ReportService {
  return {
    async buildLabelReport(input) {
      const productName = String(input.productName || '').trim() || '未命名食品';
      const rawText = String(input.rawText || '').trim();
      const normalizedAttention = normalizeAttention(input.attention);
      const ingredients = sanitizeIngredients(input.ingredients || []);
      const nutrition = normalizeNutrition(input.nutrition || []);
      const frontClaimsText = normalizeOptionalString(input.frontClaimsText);
      const labelType = isLabelType(input.labelType) ? input.labelType : 'unknown_label';
      const providedMatches = sanitizeMatches(input.matches || []);
      const matches = await resolveMatches({
        providedMatches,
        ingredients,
        ingredientService: deps.ingredientService
      });

      const acceptedMatches = matches.filter((match) => shouldCountMatchAsAdditive(match));
      const attentionHits = buildAttentionHits({
        rawText,
        frontClaimsText,
        matches,
        nutrition,
        attention: normalizedAttention
      });
      const focusItems = buildFocusItems(matches, nutrition, attentionHits, frontClaimsText);
      const nutritionIngredientChecks = buildNutritionIngredientChecks(ingredients, nutrition);
      const additiveItems = acceptedMatches.filter((match) => match.isAdditive);
      const unknownItems = matches
        .filter((match) => match.dataStatus === 'unknown_from_ocr' || match.decision === 'rejected')
        .map((match) => match.normalizedText);
      const report: LabelReport = {
        id: createReportId(),
        title: '食品标签解读',
        productName,
        createdAt: new Date().toISOString(),
        summarySentence: buildSummarySentence({
          ingredients,
          nutrition,
          additiveCount: additiveItems.length,
          hits: attentionHits,
          frontClaimsText
        }),
        attentionHits,
        focusItems,
        ingredientSection: {
          total: ingredients.length,
          additiveCount: additiveItems.length,
          items: matches
        },
        nutritionSection: {
          fields: nutrition,
          highlights: buildNutritionHighlights(nutrition, normalizedAttention)
        },
        nutritionIngredientChecks,
        additiveGroups: groupAdditives(additiveItems),
        allergenHints: buildAllergenHints(matches),
        unknownItems,
        sources: buildSources(matches, input.ocr, providedMatches),
        frontClaimsSection: frontClaimsText
          ? {
              text: frontClaimsText,
              highlights: buildFrontClaimHighlights(frontClaimsText)
            }
          : undefined,
        rawText
      };

      return report;
    }
  };
}

function resolveMatches(input: {
  providedMatches: IngredientMatch[];
  ingredients: ParsedIngredientInput[];
  ingredientService?: Pick<IngredientService, 'batchSearch'>;
}): Promise<IngredientMatch[]> {
  if (input.providedMatches.length > 0) {
    return Promise.resolve(input.providedMatches);
  }

  if (!input.ingredients.length) {
    return Promise.resolve([]);
  }

  if (!input.ingredientService) {
    console.warn('[reports] ingredientService is not configured; falling back to unknown matches.');
    return Promise.resolve(input.ingredients.map((ingredient, index) => unknownMatch(index, ingredient, {
      sourceNote: '后端成分匹配服务暂不可用，已退回为暂未验证匹配。'
    })));
  }

  return input.ingredientService
    .batchSearch({ terms: input.ingredients.map((ingredient) => ingredient.normalizedText || ingredient.rawText || '').filter(Boolean) })
    .then((results) => {
      const matchesByTerm = new Map(results.map((result) => [normalizeLookup(result.term), result]));

      return input.ingredients.map((ingredient, index) => {
        const term = String(ingredient.normalizedText || ingredient.rawText || '').trim();
        const result = matchesByTerm.get(normalizeLookup(term));
        const match = result ? sanitizeBatchMatch(result.match) : null;
        if (!result || !match) {
          return unknownMatch(index, { ...ingredient, normalizedText: term, rawText: term });
        }
        return fromBatchSearchResult(index, term, {
          ...result,
          match
        });
      });
    })
    .catch((error) => {
      console.warn('[reports] failed to resolve ingredient matches from backend', {
        message: error?.message || 'unknown error'
      });
      return input.ingredients.map((ingredient, index) => unknownMatch(index, ingredient, {
        sourceNote: '后端成分匹配失败，已回退为暂未收录。'
      }));
    });
}

function fromBatchSearchResult(index: number, term: string, result: Omit<BatchSearchResult, 'match'> & { match: BatchSearchMatch }) {
  const match = result.match;
  const matchedDataStatus = normalizeDataStatus(match?.dataStatus);
  const canAutoConfirm = result.confidence >= 0.9 && trustedAutoConfirmStatuses.includes(matchedDataStatus);
  const requiresConfirmation = !canAutoConfirm;
  const dataStatus: ReportDataStatus = requiresConfirmation ? 'mapped_candidate' : matchedDataStatus;
  const isAdditive = isAdditiveCategory(match?.category);
  const sourceType = requiresConfirmation ? normalizeMatchSourceType(undefined, dataStatus) : normalizeMatchSourceType(match.sourceType, dataStatus);
  const sourceNote = requiresConfirmation
    ? '后端返回疑似匹配，需确认后才作为数据来源。'
    : '来自后端成分匹配 API。';

  return {
    id: match?.id ? `${match.id}-${index}` : `${index}-${normalizeLookup(term)}`,
    term,
    normalizedText: term,
    dataStatus,
    dataStatusLabel: dataStatusLabel(dataStatus),
    confidence: Number(result.confidence) || 0,
    matchType: isMatchType(result.matchType),
    sourceName: match?.nameCn ? String(match.nameCn) : undefined,
    sourceType,
    sourceNote,
    ingredientId: match?.id,
    ingredientName: match?.nameCn ?? term,
    isAdditive,
    decision: canAutoConfirm ? 'confirmed' : 'pending',
    matchedDataStatus: requiresConfirmation ? matchedDataStatus : undefined,
    matchedSourceType: requiresConfirmation ? normalizeMatchSourceType(match?.sourceType, matchedDataStatus) : undefined,
    matchedSourceNote: requiresConfirmation ? '来自后端成分匹配 API。' : undefined,
    matchedIsAdditive: requiresConfirmation ? isAdditive : undefined
  } as IngredientMatch;
}

function sanitizeMatches(values: IngredientMatchInput[]): IngredientMatch[] {
  return values.map((value, index) => {
    const sanitized = sanitizeProvidedMatch(value, index);
    if (sanitized.decision === 'rejected') {
      return sanitizeRejectedMatch(sanitized);
    }
    return sanitized;
  });
}

function sanitizeProvidedMatch(value: IngredientMatchInput, index: number): IngredientMatch {
  const term = normalizeOptionalString(value.term) || normalizeOptionalString(value.normalizedText) || `配料项 ${index + 1}`;
  const decision = normalizeDecision(value.decision);
  const dataStatus = normalizeDataStatus(value.dataStatus);
  const isAdditive = value.isAdditive !== undefined ? Boolean(value.isAdditive) : false;

  return {
    id: normalizeOptionalString(value.id) || `${index}-${normalizeLookup(term)}`,
    term,
    normalizedText: term,
    dataStatus,
    dataStatusLabel: normalizeOptionalString(value.dataStatusLabel) || dataStatusLabel(dataStatus),
    confidence: Number(value.confidence || 0),
    matchType: isMatchType(value.matchType),
    sourceName: normalizeOptionalString(value.sourceName),
    sourceType: normalizeOptionalString(value.sourceType),
    sourceNote: normalizeOptionalString(value.sourceNote) || '来自后端成分匹配 API。',
    ingredientId: normalizeOptionalString(value.ingredientId),
    ingredientName: normalizeOptionalString(value.ingredientName) || term,
    isAdditive,
    decision,
    matchedDataStatus: value.matchedDataStatus ? normalizeDataStatus(value.matchedDataStatus) : undefined,
    matchedSourceType: normalizeOptionalString(value.matchedSourceType),
    matchedSourceNote: normalizeOptionalString(value.matchedSourceNote),
    matchedIsAdditive: value.matchedIsAdditive === undefined ? undefined : Boolean(value.matchedIsAdditive)
  };
}

function sanitizeBatchMatch(match: BatchSearchResult['match'] | null | undefined): BatchSearchMatch | null {
  if (!match) {
    return null;
  }

  const id = normalizeOptionalString(match.id);
  if (!id) {
    return null;
  }

  const nameCn = normalizeOptionalString(match.nameCn);
  const category = normalizeOptionalString(match.category);

  if (!category) {
    return null;
  }

  return {
    id,
    nameCn: nameCn || id,
    category,
    dataStatus: match.dataStatus || 'unverified',
    sourceName: normalizeOptionalString(match.sourceName),
    sourceType: normalizeOptionalString(match.sourceType)
  };
}

function sanitizeRejectedMatch(match: IngredientMatch): IngredientMatch {
  return {
    ...match,
    decision: 'rejected',
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: dataStatusLabel('unknown_from_ocr'),
    matchType: 'none',
    sourceName: undefined,
    sourceType: undefined,
    sourceNote: '用户已标记该项不匹配成分库，不作为权威匹配来源。',
    ingredientId: undefined,
    matchedDataStatus: undefined,
    matchedSourceType: undefined,
    matchedSourceNote: undefined,
    matchedIsAdditive: false,
    isAdditive: false
  };
}

function sanitizeIngredients(values: ParsedIngredientInput[]): ParsedIngredientInput[] {
  const normalized = values.map((item, index) => ({
    id: item?.id || `${index}-${normalizeLookup(item?.normalizedText || item?.rawText || '')}`,
    rawText: normalizeOptionalString(item?.rawText) || normalizeOptionalString(item?.normalizedText) || `配料项 ${index + 1}`,
    normalizedText: normalizeOptionalString(item?.normalizedText) || normalizeOptionalString(item?.rawText) || `配料项 ${index + 1}`,
    isSubIngredient: Boolean(item?.isSubIngredient),
    parentLabel: normalizeOptionalString(item?.parentLabel),
    isUnknown: Boolean(item?.isUnknown)
  }));
  return normalized.slice(0, 200);
}

function normalizeNutrition(values: NutritionFieldInput[]): NutritionField[] {
  const normalizedValues: NutritionField[] = [];
  const seen = new Set<NutritionKey>();

  for (const item of values) {
    const key = normalizeNutritionKey(item.key);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    const definitionLabel = nutritionDefinitions[key].label;
    normalizedValues.push({
      key,
      label: normalizeOptionalString(item.label) || definitionLabel,
      value: normalizeOptionalString(item.value),
      unit: normalizeOptionalString(item.unit),
      nrvPercent: normalizeOptionalString(item.nrvPercent),
      sourceText: normalizeOptionalString(item.sourceText),
      confidence: Number(item.confidence || 0)
    });
  }

  return normalizedValues.slice(0, 50);
}

function buildSources(matches: IngredientMatch[], ocr?: OcrResultInput, originalMatches?: IngredientMatchInput[]): ReportSource[] {
  const base: ReportSource[] = [
    {
      label: 'OCR / 手动确认文本',
      detail: '报告基于用户确认后的食品标签文本生成，OCR 原文不是权威来源。'
    },
    {
      label: '我的关注项',
      detail: '关注项保存在本机，用于排序和提示，不作为医疗或营养建议。'
    }
  ];

  if (ocr?.mode === 'mock' || ocr?.provider === 'mock') {
    base.push({
      label: 'mock only OCR',
      detail: '本次 OCR 文本来自 mock provider，仅用于开发或降级演示，报告需结合包装原文确认。'
    });
  }

  if (matches.some(isOfficialStandardMatch)) {
    base.push({
      label: '官方标准数据',
      detail: '已验证法规项来自后端成分 API 中的官方标准来源；仅 verified_regulation 可作为官方标准依据展示。'
    });
  }

  if (matches.some((match) => match.dataStatus === 'verified_jecfa')) {
    base.push({
      label: 'JECFA 评价数据库',
      detail: 'JECFA 评价项仅用于解释对应评价来源，不代表中国法规使用范围。'
    });
  }

  if (matches.some((match) => match.dataStatus === 'common_ingredient')) {
    base.push({
      label: '普通配料词库',
      detail: '普通配料词库仅用于标签可读性和匹配辅助，不作为法规结论。'
    });
  }

  if (matches.some(isPendingBackendMatch)) {
    base.push({
      label: '待复核成分数据库',
      detail: '待复核、疑似匹配或未验证项仅作匹配线索，不作为官方或权威结论。'
    });
  }

  const hadLocalFallback = originalMatches?.some((match) => isFallbackMatch(match))
    || matches.some((match) => isFallbackMatch(match));
  if (hadLocalFallback) {
    base.push({
      label: '后端暂不可用（降级）',
      detail: '当前匹配服务不可用时仅保留为暂未收录状态，不伪造成分来源。'
    });
  }

  return base;
}

function buildSummarySentence(
  input: {
    ingredients: ParsedIngredientInput[];
    nutrition: NutritionField[];
    additiveCount: number;
    hits: AttentionHit[];
    frontClaimsText: string;
  }
) {
  const parts: string[] = [];

  if (input.ingredients.length) parts.push(`识别到 ${input.ingredients.length} 项配料`);
  if (!input.ingredients.length && !input.frontClaimsText) parts.push('未提供配料表');
  if (input.frontClaimsText) parts.push('包装正面文字已整理');
  if (input.additiveCount) parts.push(`其中 ${input.additiveCount} 项可能属于食品添加剂分组`);
  if (input.nutrition.some((field) => field.value)) parts.push('营养成分表已整理');
  if (input.hits.length) parts.push(`建议重点查看：${input.hits.slice(0, 3).map((hit) => hit.label).join('、')}`);

  return `${parts.join('，')}。信息不足时，建议结合包装原文确认。`;
}

function buildAttentionHits(input: {
  rawText: string;
  frontClaimsText?: string;
  matches: IngredientMatch[];
  nutrition: NutritionField[];
  attention: { goals: string[]; detailTerms: string[]; customTerms: string[] };
}): AttentionHit[] {
  const text = [
    input.rawText,
    normalizeOptionalString(input.frontClaimsText),
    ...input.matches.map((match) => match.normalizedText),
    ...input.nutrition
      .filter((field) => Boolean(hasNutritionEvidence(field)))
      .map((field) => `${field.label}${field.value}${field.unit}${normalizeOptionalString(field.sourceText)}`)
  ].join(' ');
  const normalizedText = normalizeForTermMatch(text);

  const customTerms = (input.attention.customTerms || []).filter((term) => hasTermInText(normalizedText, term));
  const goalHits = attentionGoals
    .filter((goal) => input.attention.goals.includes(goal.key))
    .map((goal) => {
      const terms = [...goal.keywords, ...getSelectedDetailTermsForGoal(goal.keywords, input.attention.detailTerms)]
        .filter((term) => hasTermInText(normalizedText, term));
      if (!terms.length) return null;
      return {
        key: goal.key,
        label: goal.label,
        reason: `${goal.label}相关词已在标签文本中出现。`,
        terms: [...new Set(terms)]
      };
    })
    .filter(Boolean) as AttentionHit[];

  if (customTerms.length) {
    goalHits.push({
      key: 'custom',
      label: '自定义忌口',
      reason: '识别到你设置的自定义关注词。',
      terms: customTerms
    });
  }

  return goalHits;
}

function buildFocusItems(matches: IngredientMatch[], nutrition: NutritionField[], hits: AttentionHit[], frontClaimsText: string): string[] {
  const items = hits.map((hit) => `${hit.label}：${hit.terms.slice(0, 4).join('、')}`);

  const frontClaimHighlights = buildFrontClaimHighlights(frontClaimsText);
  if (frontClaimHighlights.length) {
    items.push(...frontClaimHighlights.slice(0, 2));
  }

  const sodium = nutrition.find((field) => field.key === 'sodium' && field.value);
  const sugar = nutrition.find((field) => field.key === 'sugar' && field.value);
  if (sodium) {
    items.push(`钠：${sodium.value}${sodium.unit}${sodium.nrvPercent ? `，NRV ${sodium.nrvPercent}` : ''}`);
  }
  if (sugar) {
    items.push(`糖：${sugar.value}${sugar.unit}`);
  }

  const pending = matches.filter((match) => ['mapped_candidate', 'pending_review', 'unknown_from_ocr', 'unverified'].includes(match.dataStatus));
  if (pending.length) {
    items.push(`有 ${pending.length} 项需要结合包装原文或数据来源继续确认`);
  }

  return [...new Set(items)].slice(0, 8);
}

function buildNutritionIngredientChecks(ingredients: ParsedIngredientInput[], nutrition: NutritionField[]): NutritionIngredientCheck[] {
  const ingredientText = normalizeForTermMatch(ingredients.map((item) => item.normalizedText).join(' '));
  const sugarMatchedSignals = findMatches(ingredientText, sugarNutritionSignals);
  const sodiumMatchedSignals = findMatches(ingredientText, sodiumNutritionSignals);
  const sugarField = nutrition.find((field) => field.key === 'sugar');
  const sodiumField = nutrition.find((field) => field.key === 'sodium');
  return [
    buildNutritionIngredientCheck({
      key: 'sugar',
      title: '糖核验',
      nutritionField: sugarField,
      ingredientSignals: sugarMatchedSignals
    }),
    buildNutritionIngredientCheck({
      key: 'sodium',
      title: '钠核验',
      nutritionField: sodiumField,
      ingredientSignals: sodiumMatchedSignals
    })
  ];
}

function buildNutritionIngredientCheck(options: {
  key: 'sugar' | 'sodium';
  title: string;
  nutritionField?: NutritionField;
  ingredientSignals: string[];
}): NutritionIngredientCheck {
  const valueText = (options.nutritionField?.value || '').trim();
  const hasNutrition = Boolean(valueText);
  const hasSignal = options.ingredientSignals.length > 0;
  const unit = options.nutritionField?.unit || '';
  if (!hasNutrition && !hasSignal) {
    return {
      key: options.key,
      title: options.title,
      nutritionValue: '未抓取到',
      nutritionUnit: '',
      ingredientSignals: [],
      state: 'insufficient_data',
      summary: `未抓取到该项营养值与配料线索，信息不足。建议补拍营养成分表或配料表并结合包装原文核对。`
    };
  }
  if (!hasNutrition || !hasSignal) {
    return {
      key: options.key,
      title: options.title,
      nutritionValue: hasNutrition ? valueText : '未抓取到',
      nutritionUnit: hasNutrition ? unit : '',
      ingredientSignals: options.ingredientSignals,
      state: 'insufficient_data',
      summary: hasNutrition
        ? `${options.title}营养值有记录，但未识别到与其高价值对应的配料线索，建议继续核对原文。`
        : `已命中${options.title}相关配料线索，但未抓取到该项营养值，请补充营养表信息。`
    };
  }

  const numericValue = parseNutritionValue(valueText, unit, options.key);
  const threshold = options.key === 'sugar' ? 10 : 300;
  if (numericValue > threshold) {
    return {
      key: options.key,
      title: options.title,
      nutritionValue: valueText,
      nutritionUnit: unit,
      ingredientSignals: [...new Set(options.ingredientSignals)],
      state: 'possible_issue',
      summary: `${options.title}营养值 ${valueText}${unit} 与配料线索 ${options.ingredientSignals.join('、')} 同时出现，建议结合包装原文核对是否存在标识偏差。`
    };
  }

  return {
    key: options.key,
    title: options.title,
    nutritionValue: valueText,
    nutritionUnit: unit,
    ingredientSignals: [...new Set(options.ingredientSignals)],
    state: 'no_obvious_issue',
    summary: `${options.title}营养值 ${valueText}${unit} 与配料线索 ${options.ingredientSignals.join('、')} 暂未形成明显冲突。建议结合包装原文确认。`
  };
}

function buildFrontClaimHighlights(text: string): string[] {
  if (!text) return [];
  const highlights: string[] = [];
  const matchedLabels = [
    { label: '糖相关声明', pattern: /0糖|零糖|无糖|低糖|少糖/ },
    { label: '脂肪相关声明', pattern: /0脂|零脂|低脂|脱脂|少油|非油炸/ },
    { label: '蛋白质相关声明', pattern: /高蛋白|蛋白质/ },
    { label: '钠/盐相关声明', pattern: /低钠|减盐|少盐/ },
    { label: '包装卖点声明', pattern: /无添加|不添加|粗粮|膳食纤维/ }
  ].filter((item) => item.pattern.test(text)).map((item) => item.label);

  if (matchedLabels.length) {
    highlights.push(`包装正面出现 ${[...new Set(matchedLabels)].join('、')}，建议结合配料表和营养成分表确认。`);
  } else {
    highlights.push('包装正面文字已保留，建议结合配料表和营养成分表确认。');
  }
  return highlights;
}

function buildNutritionHighlights(fields: NutritionField[], attention: { goals: string[] }) {
  const highlights: string[] = [];
  const hasGoal = (key: string) => attention.goals.includes(key);
  const byKey = new Map(fields.map((field) => [field.key, field]));

  if (hasGoal('sugar_control')) addFieldHighlight(highlights, byKey.get('sugar'), '控糖');
  if (hasGoal('low_sodium')) addFieldHighlight(highlights, byKey.get('sodium'), '低钠');
  if (hasGoal('fat_control')) {
    addFieldHighlight(highlights, byKey.get('fat'), '减脂');
    addFieldHighlight(highlights, byKey.get('transFat'), '减脂');
  }
  if (hasGoal('high_protein')) addFieldHighlight(highlights, byKey.get('protein'), '高蛋白');
  if (!highlights.length && fields.some((field) => field.value)) {
    highlights.push('营养字段已整理，请以包装标示为准。');
  }

  return highlights;
}

function addFieldHighlight(target: string[], field: NutritionField | undefined, goalLabel: string) {
  if (!field || !field.value) return;
  const value = `${field.value}${field.unit}`;
  const nrv = field.nrvPercent ? `，NRV ${field.nrvPercent}` : '';
  target.push(`${goalLabel}关注项可查看 ${field.label}：${value}${nrv}`);
}

function buildAllergenHints(matches: IngredientMatch[]): string[] {
  const text = matches
    .filter((match) => match.decision !== 'rejected')
    .map((match) => match.normalizedText)
    .join(' ');
  const normalizedText = normalizeForTermMatch(text);
  return allergenTerms
    .filter((item) => item.patterns.some((pattern) => hasTermInText(normalizedText, pattern)))
    .map((item) => `可能需要查看 ${item.label} 相关标示，请以包装过敏原提示和配料表为准。`);
}

function groupAdditives(items: IngredientMatch[]): Array<{ label: string; items: IngredientMatch[] }> {
  const specificGroups = [
    { label: '防腐剂', test: (value: string) => matchesStandardizedText(value, ['山梨酸', '苯甲酸', '防腐']) },
    { label: '甜味剂', test: (value: string) => matchesStandardizedText(value, ['甜味', '阿斯巴甜', '三氯蔗糖', '安赛蜜']) },
    { label: '色素', test: (value: string) => matchesStandardizedText(value, ['色', '胭脂红', '柠檬黄', '焦糖']) },
    { label: '食用香精', test: (value: string) => matchesStandardizedText(value, ['香精', '香料']) }
  ];

  const assignedIds = new Set<string>();
  const groups = specificGroups
    .map((group) => {
      const groupItems = items.filter((item) => !assignedIds.has(item.id) && group.test(item.normalizedText));
      groupItems.forEach((item) => assignedIds.add(item.id));
      return { label: group.label, items: groupItems };
    })
    .filter((group) => group.items.length);

  const otherItems = items.filter((item) => !assignedIds.has(item.id));
  return otherItems.length ? [...groups, { label: '其他食品添加剂', items: otherItems }] : groups;
}

function shouldCountMatchAsAdditive(match: IngredientMatch): boolean {
  if (!match.isAdditive) return false;
  if (match.decision === 'confirmed') return true;
  if (match.decision === 'pending' && trustedAutoConfirmStatuses.includes(match.dataStatus)) return true;
  return false;
}

function isAdditiveCategory(value: unknown): boolean {
  const category = normalizeOptionalString(value);
  if (!category) return false;
  const normalized = category
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim();
  const labels = [
    '食品添加剂',
    '添加剂',
    '防腐剂',
    '甜味剂',
    '色素',
    '香精',
    '香料'
  ];
  return labels.some((label) => normalized === label || normalized.includes(label));
}

function isFallbackMatch(match: IngredientMatchInput | IngredientMatch | undefined): boolean {
  if (!match) return false;
  const sourceNote = normalizeOptionalString((match as IngredientMatchInput).sourceNote || (match as IngredientMatch).sourceNote);
  const sourceType = normalizeOptionalString((match as IngredientMatchInput).sourceType || (match as IngredientMatch).sourceType);
  const decision = normalizeDecision((match as IngredientMatch).decision);

  if (decision === 'rejected') return true;
  if (!sourceNote && match.decision !== 'confirmed') return true;
  return /mock|本地|未返回|暂未收录|待后端|回退|fallback|不可用|失败/.test(sourceNote)
    || /local|fallback|mock/.test(sourceType);
}

function isPendingBackendMatch(match: IngredientMatch) {
  return match.decision !== 'rejected' && ['pending_review', 'mapped_candidate', 'unverified'].includes(match.dataStatus);
}

function isOfficialStandardMatch(match: IngredientMatch) {
  return match.dataStatus === 'verified_regulation' && normalizeOptionalString(match.sourceType) === 'official_standard';
}

function hasNutritionEvidence(field: NutritionField) {
  return Boolean(normalizeOptionalString(field.value) || normalizeOptionalString(field.sourceText));
}

function parseNutritionValue(value: string, unit: string, key: 'sugar' | 'sodium'): number {
  const valueText = value.replace(/,/g, '').trim();
  const matched = valueText.match(/(\d+(?:\.\d+)?)/);
  const numeric = matched ? Number.parseFloat(matched[1]) : 0;
  if (!Number.isFinite(numeric)) return 0;

  const normalizedUnit = normalizeNutritionUnit(String(unit || '').toLowerCase());
  if (key === 'sodium') {
    if (normalizedUnit === 'g') {
      return numeric * 1000;
    }
    if (normalizedUnit === 'ug') {
      return numeric / 1000;
    }
    return numeric;
  }

  if (key === 'sugar') {
    if (normalizedUnit === 'mg') {
      return numeric / 1000;
    }
    if (normalizedUnit === 'ug') {
      return numeric / 1000000;
    }
    return numeric;
  }

  if (normalizedUnit === 'kcal' || valueText.includes('kcal')) {
    return numeric * 4.184;
  }
  return numeric;
}

function normalizeNutritionUnit(unit: string): string {
  const compactUnit = String(unit || '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (!compactUnit) return '';
  if (compactUnit.includes('kcal') || compactUnit.includes('cal') || compactUnit.includes('千卡') || compactUnit.includes('大卡')) return 'kcal';
  if (compactUnit.includes('kj')) return 'kj';
  if (compactUnit.includes('ug') || compactUnit.includes('μg') || compactUnit.includes('微克')) return 'ug';
  if (compactUnit.includes('mg') || compactUnit.includes('毫克')) return 'mg';
  if (compactUnit.includes('g') || compactUnit.includes('克')) return 'g';
  return compactUnit;
}

const sugarNutritionSignals = ['麦芽糖浆', '果葡糖浆', '浓缩果汁', '高果糖', '葡萄糖', '果糖浆', '果葡糖'];
const sodiumNutritionSignals = ['谷氨酸钠', '味精', '盐替代', '低钠盐', '氯化钠', '碳酸氢钠', '亚硝酸钠'];

function findMatches(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(normalizeTerm(term)));
}

function normalizeTerm(value: string): string {
  return normalizeOptionalString(value).toLowerCase();
}

function getSelectedDetailTermsForGoal(goalKeywords: string[], detailTerms: string[]): string[] {
  return detailTerms.filter((term) => goalKeywords.some((keyword) => keyword === term || term.includes(keyword) || keyword.includes(term)));
}

function unknownMatch(index: number, ingredient: ParsedIngredientInput, options?: { sourceNote?: string }): IngredientMatch {
  const term = ingredient.normalizedText || ingredient.rawText || `配料项 ${index + 1}`;
  const normalizedTerm = normalizeOptionalString(term);
  const sourceNote = normalizeOptionalString(options?.sourceNote) || '后端未返回匹配项，保留为暂未收录。';
  return {
    id: `${index}-${normalizeLookup(term)}`,
    term: normalizedTerm || `配料项 ${index + 1}`,
    normalizedText: normalizedTerm || `配料项 ${index + 1}`,
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: dataStatusLabel('unknown_from_ocr'),
    confidence: 0,
    matchType: 'none',
    sourceNote,
    ingredientId: undefined,
    ingredientName: normalizedTerm || `配料项 ${index + 1}`,
    isAdditive: false,
    decision: 'pending'
  };
}

function normalizeOptionalString(value: unknown): string {
  const normalized = String(value || '').trim();
  return normalized;
}

function normalizeLookup(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '');
}

function normalizeDecision(value: unknown): MatchDecision {
  return value === 'confirmed' || value === 'rejected' ? value : 'pending';
}

function hasTermInText(text: string, term: string) {
  const normalizedText = normalizeForTermMatch(text);
  const normalizedTerm = normalizeForTermMatch(term);
  if (!normalizedTerm) return false;
  const escaped = escapeRegExp(normalizedTerm);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'ui').test(normalizedText);
}

function normalizeForTermMatch(value: string) {
  return normalizeOptionalString(value)
    .normalize('NFKC')
    .toLowerCase();
}

function matchesStandardizedText(value: string, patterns: string[]) {
  const normalized = normalizeForTermMatch(value);
  return patterns.some((pattern) => normalized.includes(normalizeForTermMatch(pattern)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMatchType(value: unknown): MatchType {
  if (value === 'exact' || value === 'alias' || value === 'eNumber' || value === 'fuzzy' || value === 'local_attention') {
    return value;
  }
  return 'none';
}

function normalizeNutritionKey(value: unknown): NutritionKey | undefined {
  const candidate = String(value || '').trim() as NutritionKey;
  return isNutritionKey(candidate) ? candidate : undefined;
}

function isNutritionKey(value: string): value is NutritionKey {
  return Object.keys(nutritionDefinitions).includes(value);
}

function normalizeDataStatus(value: unknown): ReportDataStatus {
  const candidate = String(value || 'unknown_from_ocr').trim() as ReportDataStatus;
  return isReportDataStatus(candidate) ? candidate : 'unverified';
}

function isReportDataStatus(value: string): value is ReportDataStatus {
  return ['verified_regulation', 'verified_jecfa', 'pending_review', 'mapped_candidate', 'common_ingredient', 'unverified', 'unknown_from_ocr']
    .includes(value);
}

function dataStatusLabel(value: unknown): string {
  const normalized = normalizeDataStatus(value);
  return dataStatusLabels[normalized];
}

function normalizeMatchSourceType(value: unknown, dataStatus: ReportDataStatus): string | undefined {
  const explicit = normalizeOptionalString(value);
  if (explicit) return explicit;
  if (dataStatus === 'verified_regulation') return 'official_standard';
  if (dataStatus === 'verified_jecfa') return 'safety_evaluation';
  if (dataStatus === 'common_ingredient') return 'common_ingredient';
  if (['pending_review', 'mapped_candidate', 'unverified'].includes(dataStatus)) return 'manual_review';
  return undefined;
}

function isLabelType(value: unknown): value is ReportLabelType {
  return value === 'ingredient_list' || value === 'nutrition_facts' || value === 'front_claims' || value === 'barcode_or_product' || value === 'unknown_label';
}

function normalizeAttention(value?: AttentionSettingsInput) {
  const goals = Array.isArray(value?.goals)
    ? value.goals.map((goal) => normalizeOptionalString(goal)).filter(Boolean)
    : ['sugar_control', 'low_sodium', 'fewer_additives'];
  const detailTerms = Array.isArray(value?.detailTerms)
    ? value.detailTerms.map((term) => normalizeOptionalString(term)).filter(Boolean)
    : [];
  const customTerms = Array.isArray(value?.customTerms)
    ? value.customTerms.map((term) => normalizeOptionalString(term)).filter(Boolean)
    : [];
  return {
    goals: [...new Set(goals)],
    detailTerms: [...new Set(detailTerms)],
    customTerms: [...new Set(customTerms)]
  };
}

function createReportId(): string {
  return `label-report-${new Date().toISOString().replace(/[-:.]/g, '')}-${randomUUID()}`;
}

const allergenTerms = [
  { label: '乳', patterns: ['乳制品', '牛乳', '羊乳', '牛奶', '奶粉', '乳粉', '乳清', '乳糖', '炼乳', '奶油'] },
  { label: '大豆', patterns: ['大豆', '黄豆', '豆粉', '豆乳'] },
  { label: '坚果', patterns: ['坚果', '花生', '杏仁', '核桃', '腰果', '榛子', '开心果'] },
  { label: '麸质', patterns: ['麸质', '小麦', '麦麸', '面粉', '燕麦'] },
  { label: '蛋', patterns: ['鸡蛋', '蛋黄', '蛋清', '全蛋', '蛋粉', '蛋类'] },
  { label: '海鲜', patterns: ['海鲜', '虾', '蟹', '鱼', '贝类'] }
];
