import { describe, expect, it } from 'vitest';
import { AiProviderRegistry, createAiProviderRegistry, type AiGatewayConfig } from '../src/ai/providerFactory.js';
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from '../src/ai/types.js';
import { createAiFoodExplanationService, type RuleExplanationInput } from '../src/services/aiFoodExplanationService.js';

const baseRule: RuleExplanationInput = {
  summary: 'Rule summary',
  plainExplanation: 'Rule explanation',
  mainReasons: ['high energy'],
  suitableFor: ['occasional snack'],
  notSuitableFor: ['low sodium users'],
  ingredientHighlights: [
    { name: 'sugar', level: 'yellow', explanation: 'added sugar source' }
  ],
  nutritionExplanation: {
    energy: 'Energy is high'
  },
  eatingAdvice: 'Eat a small portion.',
  confidence: 'high'
};

const baseConfig: AiGatewayConfig = {
  enabled: true,
  defaultProvider: 'mock',
  fallbackProvider: 'mock',
  timeoutMs: 20000,
  maxRetry: 0,
  providers: {
    mock: {
      provider: 'mock',
      model: 'mock-food-explainer-v1',
      timeoutMs: 20000
    }
  }
};

describe('AiFoodExplanationService', () => {
  it('caches identical explanation requests in memory', async () => {
    const provider = new CountingProvider(JSON.stringify({
      summary: 'AI summary',
      plainExplanation: 'AI explanation',
      mainReasons: ['high energy'],
      suitableFor: ['occasional snack'],
      notSuitableFor: ['low sodium users'],
      ingredientHighlights: [],
      nutritionExplanation: {},
      eatingAdvice: 'Eat half a pack or less.',
      retakeSuggestion: ''
    }));
    const registry = new AiProviderRegistry();
    registry.register(provider);
    const service = createAiFoodExplanationService({
      config: baseConfig,
      registry
    });

    const payload = {
      ruleResult: baseRule,
      structuredInput: {
        productName: 'sample snack',
        ingredients: ['wheat flour', 'sugar'],
        nutrition: { energy: { value: 1800, unit: 'kJ' } }
      },
      enableAi: true
    };

    const first = await service.explain(payload);
    const second = await service.explain(payload);

    expect(first.summary).toBe('AI summary');
    expect(second.summary).toBe('AI summary');
    expect(provider.calls).toBe(1);
  });

  it('falls back to mock provider when the default provider has no key', async () => {
    const config: AiGatewayConfig = {
      ...baseConfig,
      defaultProvider: 'deepseek',
      fallbackProvider: 'mock',
      providers: {
        ...baseConfig.providers,
        deepseek: {
          provider: 'deepseek',
          apiKey: '',
          baseUrl: 'https://api.deepseek.com',
          model: 'deepseek-chat',
          requestPath: '/v1/chat/completions',
          timeoutMs: 20000
        }
      }
    };
    const service = createAiFoodExplanationService({
      config,
      registry: createAiProviderRegistry(config)
    });

    const result = await service.explain({
      ruleResult: baseRule,
      structuredInput: { productName: 'sample snack' },
      enableAi: true
    });

    expect(result.provider).toBe('mock');
    expect(result.summary).toBeTruthy();
  });

  it('returns rule-only output when provider JSON cannot be parsed', async () => {
    const registry = new AiProviderRegistry();
    registry.register(new CountingProvider('not-json'));
    const service = createAiFoodExplanationService({
      config: baseConfig,
      registry
    });

    const result = await service.explain({
      ruleResult: baseRule,
      structuredInput: { productName: 'sample snack' },
      enableAi: true
    });

    expect(result.provider).toBe('rule-only');
    expect(result.summary).toBe(baseRule.summary);
    expect(result.errorCode).toBe('invalid_ai_json');
  });
});

class CountingProvider implements AiProvider {
  readonly name = 'mock' as const;
  calls = 0;

  constructor(private readonly content: string) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    this.calls += 1;
    return {
      provider: this.name,
      model: request.model || 'counting-provider',
      content: this.content,
      rawText: this.content,
      latencyMs: 1,
      success: true
    };
  }
}
