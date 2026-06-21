import type { ProductRecognitionInfo } from '@/types';
import { requestJson } from '@/services/api/client';

export interface AiProductSearchResult {
  usedAiSearch: boolean;
  provider: 'deepseek' | 'none';
  productName: string;
  brand: string;
  specification: string;
  ingredientsText: string;
  nutritionText: string;
  sourceSummary: string;
  aiNotice: string;
  confidence: 'high' | 'medium' | 'low';
  errorCode?: string;
}

export async function searchProductWithDeepSeek(input: Pick<ProductRecognitionInfo, 'normalizedCode' | 'qrContent' | 'rawContent' | 'productName'>): Promise<AiProductSearchResult> {
  try {
    return await requestJson<AiProductSearchResult>('/products/lookup', {
      method: 'POST',
      authMode: 'none',
      data: {
        normalizedCode: input.normalizedCode,
        qrContent: input.qrContent,
        rawContent: input.rawContent,
        productName: input.productName
      },
      timeoutMs: 14000
    });
  } catch (error) {
    return {
      usedAiSearch: false,
      provider: 'none',
      productName: '',
      brand: '',
      specification: '',
      ingredientsText: '',
      nutritionText: '',
      sourceSummary: '',
      aiNotice: '',
      confidence: 'low',
      errorCode: String((error as { code?: string })?.code || 'ai_search_failed')
    };
  }
}
