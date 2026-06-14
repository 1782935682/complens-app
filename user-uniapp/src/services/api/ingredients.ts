import { dataStatusLabel, normalizeDataStatus } from '@/constants/dataStatus';
import type { IngredientMatch, ParsedIngredient } from '@/types';
import { requestJson } from './client';

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
    } | null;
  }>;
}

export async function matchIngredientsByApi(items: ParsedIngredient[]): Promise<IngredientMatch[]> {
  const terms = items.map((item) => item.normalizedText).filter(Boolean);
  if (!terms.length) return [];

  const response = await requestJson<BatchSearchResponse>('/ingredients/batch-search', {
    method: 'POST',
    data: { terms, includeENumbers: true },
    timeoutMs: 5000
  });

  return terms.map((term, index) => {
    const source = response.results?.[index];
    const match = source?.match || null;
    const dataStatus = match ? normalizeDataStatus(match.dataStatus, 'unverified') : 'unknown_from_ocr';
    const confidence = Number(source?.confidence) || 0;
    const isAdditive = Boolean(match?.category && String(match.category).includes('添加剂'));
    return {
      id: `${index}-${term}`,
      term,
      normalizedText: term,
      dataStatus,
      dataStatusLabel: dataStatusLabel(dataStatus),
      confidence,
      matchType: source?.matchType || (match ? 'fuzzy' : 'none'),
      sourceName: match?.sourceName,
      sourceNote: match ? '来自后端成分匹配 API。' : '后端未返回匹配项，保留为暂未收录。',
      ingredientId: match?.id,
      ingredientName: match?.nameCn || match?.name || term,
      isAdditive,
      decision: confidence >= 0.55 && confidence < 0.9 ? 'pending' : match ? 'confirmed' : 'pending'
    };
  });
}

export async function searchIngredients(query: string) {
  const q = encodeURIComponent(query.trim());
  if (!q) return { items: [] };
  return requestJson<{ items?: unknown[] }>(`/ingredients/search?q=${q}&limit=10`, { timeoutMs: 5000 });
}
