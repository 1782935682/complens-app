import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiProviderRegistry, type AiGatewayConfig } from '../src/ai/providerFactory.js';
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from '../src/ai/types.js';
import { AI_PRODUCT_LOOKUP_NOTICE, createProductLookupService } from '../src/services/productLookupService.js';

const baseConfig: AiGatewayConfig = {
  enabled: true,
  defaultProvider: 'deepseek',
  fallbackProvider: 'mock',
  timeoutMs: 20000,
  maxRetry: 1,
  providers: {}
};

describe('productLookupService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses DeepSeek provider for structured public product lookup', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '测试酸奶',
      brand: '测试品牌',
      specification: '200g',
      ingredientsText: '生牛乳、乳酸菌',
      nutritionText: '每100g 能量 300kJ 蛋白质 6g 钠 60mg',
      sourceSummary: '企业官网商品页面 https://example.com/products/6901234567892',
      confidence: 'medium'
    })));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ normalizedCode: '6901234567892' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      provider: 'deepseek',
      productName: '测试酸奶',
      brand: '测试品牌',
      ingredientsText: '生牛乳、乳酸菌',
      nutritionText: '每100g 能量 300kJ 蛋白质 6g 钠 60mg',
      aiNotice: AI_PRODUCT_LOOKUP_NOTICE,
      confidence: 'medium'
    });
  });

  it('uses product name as a public label lookup query when no code is available', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '测试麦片',
      brand: '测试品牌',
      specification: '',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      sourceSummary: '企业官网公开标签页 https://brand.example/products/oatmeal',
      confidence: 'medium'
    }), '测试麦片'));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ productName: '测试麦片' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      productName: '测试麦片',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      aiNotice: AI_PRODUCT_LOOKUP_NOTICE
    });
  });

  it('does not accept AI ingredient or nutrition text without a public source summary', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '无来源测试麦片',
      brand: '测试品牌',
      specification: '',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      sourceSummary: '',
      confidence: 'medium'
    }), '无来源测试麦片'));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ productName: '无来源测试麦片' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      productName: '无来源测试麦片',
      ingredientsText: '',
      nutritionText: '',
      confidence: 'low'
    });
  });

  it('does not accept AI label text with vague source summary keywords only', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '泛泛来源测试麦片',
      brand: '测试品牌',
      specification: '',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      sourceSummary: '公开资料与包装标签信息',
      confidence: 'medium'
    }), '泛泛来源测试麦片'));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ productName: '泛泛来源测试麦片' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      productName: '泛泛来源测试麦片',
      ingredientsText: '',
      nutritionText: '',
      confidence: 'low'
    });
  });

  it('does not accept AI label text with generic page-type source summary only', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '商品页泛称测试',
      brand: '测试品牌',
      specification: '',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      sourceSummary: '商品页标签页摘要',
      confidence: 'medium'
    }), '商品页泛称测试'));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ productName: '商品页泛称测试' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      productName: '商品页泛称测试',
      ingredientsText: '',
      nutritionText: '',
      confidence: 'low'
    });
  });

  it('does not accept AI label text with generic official or brand page wording only', async () => {
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '官方页面泛称测试',
      brand: '测试品牌',
      specification: '',
      ingredientsText: '燕麦片、白砂糖、食用盐',
      nutritionText: '每100g 能量 1600kJ 蛋白质 8g 钠 220mg',
      sourceSummary: '官方商品页面摘要，品牌商品页面摘要',
      confidence: 'medium'
    }), '官方页面泛称测试'));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ productName: '官方页面泛称测试' });

    expect(result).toMatchObject({
      usedAiSearch: true,
      productName: '官方页面泛称测试',
      ingredientsText: '',
      nutritionText: '',
      confidence: 'low'
    });
  });

  it('falls back without crashing when AI is disabled', async () => {
    const service = createProductLookupService({
      config: { ...baseConfig, enabled: false },
      registry: new AiProviderRegistry()
    });

    const result = await service.lookup({ normalizedCode: '6901234567892' });

    expect(result.usedAiSearch).toBe(false);
    expect(result.errorCode).toBe('ai_disabled');
    expect(result.ingredientsText).toBe('');
  });

  it('rejects empty lookup input explicitly', async () => {
    const service = createProductLookupService({
      config: baseConfig,
      registry: new AiProviderRegistry()
    });

    const result = await service.lookup({});

    expect(result.usedAiSearch).toBe(false);
    expect(result.errorCode).toBe('missing_query');
  });

  it('does not fetch private QR URLs while building AI context', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '私网页面测试',
      brand: '',
      specification: '',
      ingredientsText: '',
      nutritionText: '',
      sourceSummary: '',
      confidence: 'low'
    })));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ normalizedCode: '6901234567892', qrContent: 'https://127.0.0.1/admin' });

    expect(result.usedAiSearch).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch private IPv6 QR URLs while building AI context', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const registry = new AiProviderRegistry();
    registry.register(createProvider(JSON.stringify({
      productName: '私网 IPv6 页面测试',
      brand: '',
      specification: '',
      ingredientsText: '',
      nutritionText: '',
      sourceSummary: '',
      confidence: 'low'
    })));
    const service = createProductLookupService({ config: baseConfig, registry });

    const result = await service.lookup({ normalizedCode: '6901234567892', qrContent: 'https://[::ffff:127.0.0.1]/admin' });

    expect(result.usedAiSearch).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function createProvider(content: string, expectedPromptText = '6901234567892'): AiProvider {
  return {
    name: 'deepseek',
    async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
      expect(request.responseFormat?.type).toBe('json_object');
      expect(request.userPrompt).toContain(expectedPromptText);
      return {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        content,
        rawText: content,
        latencyMs: 1,
        success: true
      };
    }
  };
}
