import type { AiProviderRegistry, AiGatewayConfig } from '../ai/providerFactory.js';

export const AI_PRODUCT_LOOKUP_NOTICE = '部分商品信息来自 AI 联网搜索，可能存在过期、缺失或不准确；仅作公开标签线索，不作为包装实拍 OCR、成分事实、法规或医疗结论，请以商品包装实物标注为准。';

export type ProductLookupInput = {
  normalizedCode?: string;
  qrContent?: string;
  rawContent?: string;
  productName?: string;
};

export type ProductLookupResult = {
  usedAiSearch: boolean;
  provider: 'deepseek' | 'none';
  model: string;
  productName: string;
  brand: string;
  specification: string;
  ingredientsText: string;
  nutritionText: string;
  sourceSummary: string;
  aiNotice: string;
  confidence: 'high' | 'medium' | 'low';
  errorCode?: string;
};

export type ProductLookupService = {
  lookup(input: ProductLookupInput): Promise<ProductLookupResult>;
};

export function createProductLookupService(options: {
  config: AiGatewayConfig;
  registry: AiProviderRegistry;
}): ProductLookupService {
  return {
    async lookup(input) {
      const normalized = normalizeLookupInput(input);
      if (!normalized.normalizedCode && !normalized.qrContent && !normalized.rawContent && !normalized.productName) {
        return unavailable('missing_query');
      }
      if (!options.config.enabled) {
        return unavailable('ai_disabled');
      }
      const provider = options.registry.get('deepseek');
      if (!provider) return unavailable('deepseek_unavailable');

      const urlContext = await fetchUrlContext(normalized.qrContent);
      const response = await provider.complete({
        provider: 'deepseek',
        systemPrompt: [
          '你是食品包装商品信息补全助手，只能基于公开商品信息做结构化摘要。',
          '不要编造商品名、品牌、规格、配料表、营养成分表、法规、医疗或安全结论。',
          '不确定字段必须返回空字符串。',
          '如果只知道商品名，只能搜索公开商品页、数字标签或企业公开标签信息；找不到明确标签时不要按同类商品猜配料表或营养成分表。',
          '输出 JSON，不要输出 Markdown。'
        ].join('\n'),
        userPrompt: JSON.stringify({
          task: '根据商品条码、二维码、包装印刷编码或商品名补全公开商品标签信息。只返回能从公开标签信息确认的内容。',
          normalizedCode: normalized.normalizedCode,
          qrContent: normalized.qrContent,
          rawContent: normalized.rawContent,
          productName: normalized.productName,
          urlContext,
          outputSchema: {
            productName: 'string',
            brand: 'string',
            specification: 'string',
            ingredientsText: 'string',
            nutritionText: 'string',
            sourceSummary: 'string',
            confidence: 'high|medium|low'
          }
        }),
        temperature: 0,
        maxTokens: 1000,
        timeoutMs: options.config.timeoutMs,
        responseFormat: { type: 'json_object' }
      });
      if (!response.success) return unavailable(response.errorCode || 'deepseek_failed');
      const parsed = parseLookupJson(response.content);
      return {
        usedAiSearch: true,
        provider: 'deepseek',
        model: response.model,
        productName: parsed.productName,
        brand: parsed.brand,
        specification: parsed.specification,
        ingredientsText: parsed.ingredientsText,
        nutritionText: parsed.nutritionText,
        sourceSummary: parsed.sourceSummary,
        aiNotice: AI_PRODUCT_LOOKUP_NOTICE,
        confidence: parsed.confidence
      };
    }
  };
}

function normalizeLookupInput(input: ProductLookupInput): Required<ProductLookupInput> {
  return {
    normalizedCode: String(input.normalizedCode || '').trim(),
    qrContent: String(input.qrContent || '').trim(),
    rawContent: String(input.rawContent || '').trim(),
    productName: String(input.productName || '').trim()
  };
}

function parseLookupJson(value: string): Omit<ProductLookupResult, 'usedAiSearch' | 'provider' | 'model' | 'aiNotice'> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      productName: sanitizeText(parsed.productName, 80),
      brand: sanitizeText(parsed.brand, 40),
      specification: sanitizeText(parsed.specification, 60),
      ingredientsText: sanitizeLongText(parsed.ingredientsText, 1800),
      nutritionText: sanitizeLongText(parsed.nutritionText, 1200),
      sourceSummary: sanitizeText(parsed.sourceSummary, 160),
      confidence: normalizeConfidence(parsed.confidence)
    };
  } catch {
    return {
      productName: '',
      brand: '',
      specification: '',
      ingredientsText: '',
      nutritionText: '',
      sourceSummary: '',
      confidence: 'low'
    };
  }
}

function sanitizeText(value: unknown, maxLength: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeLongText(value: unknown, maxLength: number): string {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function normalizeConfidence(value: unknown): ProductLookupResult['confidence'] {
  const normalized = String(value || '').trim();
  return normalized === 'high' || normalized === 'medium' || normalized === 'low' ? normalized : 'low';
}

function unavailable(errorCode: string): ProductLookupResult {
  return {
    usedAiSearch: false,
    provider: 'none',
    model: '',
    productName: '',
    brand: '',
    specification: '',
    ingredientsText: '',
    nutritionText: '',
    sourceSummary: '',
    aiNotice: '',
    confidence: 'low',
    errorCode
  };
}

async function fetchUrlContext(qrContent = ''): Promise<string> {
  void qrContent;
  return '';
}
