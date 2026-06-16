import { hasAdditiveFunctionLabel } from '@/constants/additiveFunctions';
import { dataStatusLabel, normalizeDataStatus } from '@/constants/dataStatus';
import type { DataStatus, IngredientMatch, ParsedIngredient } from '@/types';
import { requestJson } from './client';

const trustedAutoConfirmStatuses: DataStatus[] = ['verified_regulation', 'verified_jecfa', 'common_ingredient'];

interface BatchSearchResponse {
  results?: Array<{
    term?: string;
    confidence?: number;
    matchType?: IngredientMatch['matchType'];
    match?: {
      id?: string;
      nameCn?: string;
      name?: string;
      dataStatus?: string;
      category?: string;
      sourceName?: string;
      sourceType?: string;
    } | null;
  }>;
}

export interface IngredientEvidence {
  stagingRows?: Array<{
    id?: string;
    tableName?: string;
    additiveNameCn?: string;
    additiveNameEn?: string;
    functionText?: string;
    foodCategoryName?: string;
    cnsNumber?: string | null;
    insNumber?: string | null;
    maxUseLevel?: string;
    unit?: string;
    note?: string;
    sourceName?: string;
    sourceType?: string;
    sourceUrl?: string;
    standardPage?: number;
    pdfPage?: number;
    reviewStatus?: string;
    rawSourceText?: string;
    reviewedAt?: string;
  }>;
  referenceRows?: Array<{
    id?: string;
    tableName?: string;
    tableTitle?: string;
    rowNumber?: number;
    rowName?: string;
    rowCode?: string;
    rowData?: Record<string, unknown>;
    sourceName?: string;
    sourceUrl?: string;
    rawSourceText?: string;
    standardPage?: number;
    pdfPage?: number;
    reviewStatus?: string;
  }>;
}

export interface IngredientDetail extends Record<string, unknown> {
  id?: string;
  nameCn?: string;
  nameEn?: string;
  aliases?: string[];
  category?: string;
  functions?: string[];
  description?: string;
  riskLevel?: string;
  dataStatus?: DataStatus;
  sourceName?: string;
  sourceType?: string;
  sourceScope?: string;
  sourceVersion?: string;
  sourceUrl?: string;
  effectiveDate?: string;
  confidenceLevel?: string;
  matchConfidence?: string;
  reviewNote?: string;
  rawSourceText?: string;
  isVerified?: boolean;
  regulatoryBasis?: string;
  gbCode?: string;
  gbStatus?: string;
  eNumber?: string | null;
  usageLimits?: Array<{ foodCategory: string; limit: string; note?: string }>;
  foodCategories?: string[];
  sourceReferences?: Array<{
    title?: string;
    standard?: string;
    region?: string;
    url?: string;
    publishedAt?: string;
    retrievedAt?: string;
  }>;
}

export interface IngredientDetailResponse extends IngredientDetail, IngredientEvidence {}

export async function matchIngredientsByApi(items: ParsedIngredient[]): Promise<IngredientMatch[]> {
  const terms = items.map((item) => item.normalizedText.trim()).filter(Boolean);
  if (!terms.length) return [];
  const requestTerms = [...new Set(terms)];

  const response = await requestJson<BatchSearchResponse>('/ingredients/batch-search', {
    method: 'POST',
    data: { terms: requestTerms, includeENumbers: true },
    timeoutMs: 5000
  });
  const resultsByTerm = new Map((response.results || []).map((result) => [normalizeLookupTerm(result.term), result]));

  return terms.map((term, index) => {
    const source = resultsByTerm.get(normalizeLookupTerm(term));
    const match = source?.match || null;
    const confidence = Number(source?.confidence) || 0;
    const matchType = source?.matchType || (match ? 'fuzzy' : 'none');
    const matchedDataStatus = match ? normalizeDataStatus(match.dataStatus, 'unverified') : 'unknown_from_ocr';
    const canAutoConfirm = Boolean(match) && confidence >= 0.9 && isTrustedAutoConfirmStatus(matchedDataStatus);
    const decision: IngredientMatch['decision'] = canAutoConfirm ? 'confirmed' : 'pending';
    const isAdditive = isAdditiveCategory(match?.category);
    const matchedSourceType = normalizeMatchSourceType(match?.sourceType, matchedDataStatus);
    const requiresConfirmation = Boolean(match) && !canAutoConfirm;
    const dataStatus = requiresConfirmation ? 'mapped_candidate' : matchedDataStatus;
    const sourceType = requiresConfirmation ? normalizeMatchSourceType(undefined, dataStatus) : matchedSourceType;
    const sourceNote = requiresConfirmation
      ? '后端返回疑似匹配，需确认后才作为数据来源。'
      : match
        ? '来自后端成分匹配 API。'
        : '后端未返回匹配项，保留为暂未收录。';
    return {
      id: `${index}-${term}`,
      term,
      normalizedText: term,
      dataStatus,
      dataStatusLabel: dataStatusLabel(dataStatus),
      confidence,
      matchType,
      sourceName: match?.sourceName,
      sourceType,
      sourceNote,
      ingredientId: match?.id,
      ingredientName: match?.nameCn || match?.name || term,
      isAdditive,
      decision,
      ...(requiresConfirmation
        ? {
            matchedDataStatus,
            matchedSourceType,
            matchedSourceNote: '来自后端成分匹配 API。',
            matchedIsAdditive: isAdditive
          }
        : {})
    };
  });
}

export async function searchIngredients(query: string) {
  const q = encodeURIComponent(query.trim());
  if (!q) return { items: [] };
  return requestJson<{ items?: unknown[] }>(`/ingredients/search?q=${q}&limit=10`, { timeoutMs: 5000 });
}

export async function getIngredientWithEvidence(id: string) {
  const encodedId = encodeURIComponent(id);
  return requestJson<IngredientDetailResponse>(`/ingredients/${encodedId}?includeEvidence=1`, { timeoutMs: 8000 });
}

function normalizeLookupTerm(value: unknown): string {
  return String(value || '').trim();
}

function isAdditiveCategory(value: unknown): boolean {
  return hasAdditiveFunctionLabel(value);
}

function isTrustedAutoConfirmStatus(status: DataStatus): boolean {
  return trustedAutoConfirmStatuses.includes(status);
}

function normalizeMatchSourceType(value: unknown, dataStatus: IngredientMatch['dataStatus']): string | undefined {
  const explicit = String(value || '').trim();
  if (explicit) return explicit;
  if (dataStatus === 'verified_regulation') return 'official_standard';
  if (dataStatus === 'verified_jecfa') return 'safety_evaluation';
  if (dataStatus === 'common_ingredient') return 'common_ingredient';
  if (['pending_review', 'mapped_candidate', 'unverified'].includes(dataStatus)) return 'manual_review';
  return undefined;
}
