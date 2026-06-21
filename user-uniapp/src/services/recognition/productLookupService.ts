import type { ProductRecognitionInfo, ProductRecognitionSource } from '@/types';
import { findRecognitionHistory } from '@/stores/scanStore';
import { searchProductWithDeepSeek, type AiProductSearchResult } from './aiSearchService';

export interface ProductLookupResult {
  productName: string;
  brand: string;
  ingredientsText: string;
  nutritionText: string;
  sources: ProductRecognitionSource[];
  usedAiSearch: boolean;
  aiNotice: string;
  aiSearchSummary: string;
  fromHistory: boolean;
  errorCode?: string;
}

export async function lookupProductInfo(input: ProductRecognitionInfo, options: { hasLabelText?: boolean } = {}): Promise<ProductLookupResult> {
  const cached = findRecognitionHistory({
    normalizedCode: input.normalizedCode,
    qrContent: input.qrContent,
    productName: input.productName
  });
  if (cached && (cached.productName || (!cached.usedAiSearch && (cached.ingredientsText || cached.nutritionText)))) {
    return {
      productName: cached.productName,
      brand: cached.brand,
      ingredientsText: cached.usedAiSearch ? '' : cached.ingredientsText,
      nutritionText: cached.usedAiSearch ? '' : cached.nutritionText,
      sources: ['历史缓存'],
      usedAiSearch: false,
      aiNotice: '',
      aiSearchSummary: cached.reportSummary,
      fromHistory: true
    };
  }

  if (!shouldSearchWithAi(input, options)) {
    return emptyLookup();
  }

  const aiResult = await searchProductWithDeepSeek(input);
  if (!aiResult.usedAiSearch) {
    return {
      ...emptyLookup(),
      errorCode: aiResult.errorCode || 'ai_search_failed'
    };
  }
  return fromAiResult(aiResult);
}

function shouldSearchWithAi(input: ProductRecognitionInfo, options: { hasLabelText?: boolean }): boolean {
  return Boolean((input.normalizedCode || input.qrContent || input.productName || input.rawContent) && !options.hasLabelText);
}

function fromAiResult(result: AiProductSearchResult): ProductLookupResult {
  return {
    productName: result.productName,
    brand: result.brand,
    ingredientsText: result.ingredientsText,
    nutritionText: result.nutritionText,
    sources: ['DeepSeek 联网搜索'],
    usedAiSearch: true,
    aiNotice: result.aiNotice,
    aiSearchSummary: result.sourceSummary,
    fromHistory: false
  };
}

function emptyLookup(): ProductLookupResult {
  return {
    productName: '',
    brand: '',
    ingredientsText: '',
    nutritionText: '',
    sources: [],
    usedAiSearch: false,
    aiNotice: '',
    aiSearchSummary: '',
    fromHistory: false
  };
}
