import type { AiGatewayConfig, AiProviderRegistry } from '../ai/providerFactory.js';
import type { AiCompletionRequest, AiCompletionResponse, AiProvider, AiProviderName } from '../ai/types.js';
import { buildFoodAnalysisUserPrompt, foodAnalysisPromptVersion, foodAnalysisSystemPrompt } from '../prompts/foodAnalysisPrompt.js';

export type AiExplanationResult = {
  summary: string;
  plainExplanation: string;
  mainReasons: string[];
  suitableFor: string[];
  notSuitableFor: string[];
  ingredientHighlights: Array<{
    name: string;
    level: 'green' | 'yellow' | 'red' | 'unknown';
    explanation: string;
  }>;
  nutritionExplanation: Record<string, string>;
  eatingAdvice: string;
  retakeSuggestion: string;
  provider: AiProviderName | 'rule-only';
  model: string;
  promptVersion: string;
  aiEnhanced: boolean;
  errorCode?: string;
};

export type AiFoodExplanationService = {
  explain(payload: {
    ruleResult: RuleExplanationInput;
    structuredInput: unknown;
    provider?: AiProviderName | 'auto';
    enableAi?: boolean;
    traceId?: string;
  }): Promise<AiExplanationResult>;
};

export type RuleExplanationInput = {
  summary: string;
  plainExplanation: string;
  mainReasons: string[];
  suitableFor: string[];
  notSuitableFor: string[];
  ingredientHighlights: AiExplanationResult['ingredientHighlights'];
  nutritionExplanation: Record<string, string>;
  eatingAdvice: string;
  confidence: 'high' | 'medium' | 'low';
};

export function createAiFoodExplanationService(options: {
  config: AiGatewayConfig;
  registry: AiProviderRegistry;
}): AiFoodExplanationService {
  const cache = new Map<string, { expiresAt: number; result: AiExplanationResult }>();
  return {
    async explain(payload) {
      const fallback = buildRuleOnlyExplanation(payload.ruleResult);
      const requestedProvider = payload.provider && payload.provider !== 'auto'
        ? payload.provider
        : options.config.defaultProvider;
      const shouldUseAi = options.config.enabled && payload.enableAi !== false;
      if (!shouldUseAi) return fallback;

      const cacheKey = stableHash({
        cacheVersion: 'ai-food-explanation-v1',
        structuredInput: payload.structuredInput,
        ruleResult: payload.ruleResult,
        provider: requestedProvider,
        fallbackProvider: options.config.fallbackProvider,
        promptVersion: foodAnalysisPromptVersion
      });
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.result;

      const primaryProvider = options.registry.get(requestedProvider);
      const fallbackProvider = options.registry.get(options.config.fallbackProvider);
      const provider = primaryProvider || fallbackProvider;
      if (!provider) return fallback;

      const request: AiCompletionRequest = {
        provider: provider.name,
        systemPrompt: foodAnalysisSystemPrompt,
        userPrompt: buildFoodAnalysisUserPrompt({
          ...payload.structuredInput as Record<string, unknown>,
          ruleResult: payload.ruleResult,
          promptVersion: foodAnalysisPromptVersion
        }),
        temperature: 0.2,
        maxTokens: 1200,
        responseFormat: { type: 'json_object' },
        timeoutMs: options.config.timeoutMs,
        traceId: payload.traceId
      };

      let response = await completeWithRetry(provider, request, options.config.maxRetry);
      if (!response.success && fallbackProvider && fallbackProvider.name !== provider.name) {
        response = await completeWithRetry(fallbackProvider, {
          ...request,
          provider: fallbackProvider.name
        }, options.config.maxRetry);
      }

      if (!response.success) {
        return {
          ...fallback,
          provider: 'rule-only',
          errorCode: response.errorCode || 'provider_failed'
        };
      }

      const parsed = parseAiExplanation(response.content || response.rawText);
      if (!parsed) {
        return {
          ...fallback,
          provider: 'rule-only',
          errorCode: 'invalid_ai_json'
        };
      }

      const sanitized = sanitizeAiExplanation(parsed, fallback);
      const result: AiExplanationResult = {
        ...fallback,
        ...sanitized,
        mainReasons: sanitized.mainReasons.length ? sanitized.mainReasons : fallback.mainReasons,
        suitableFor: sanitized.suitableFor.length ? sanitized.suitableFor : fallback.suitableFor,
        notSuitableFor: sanitized.notSuitableFor.length ? sanitized.notSuitableFor : fallback.notSuitableFor,
        ingredientHighlights: sanitized.ingredientHighlights.length ? sanitized.ingredientHighlights : fallback.ingredientHighlights,
        nutritionExplanation: Object.keys(sanitized.nutritionExplanation).length ? sanitized.nutritionExplanation : fallback.nutritionExplanation,
        provider: response.provider,
        model: response.model,
        promptVersion: foodAnalysisPromptVersion,
        aiEnhanced: response.provider !== 'mock'
      };
      cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24
      });
      return result;
    }
  };
}

async function completeWithRetry(
  provider: AiProvider,
  request: AiCompletionRequest,
  maxRetry: number
): Promise<AiCompletionResponse> {
  const maxAttempts = Math.max(1, maxRetry + 1);
  let response = await provider.complete(request);
  for (let attempt = 1; attempt < maxAttempts && !response.success; attempt += 1) {
    response = await provider.complete(request);
  }
  return response;
}

function buildRuleOnlyExplanation(input: RuleExplanationInput): AiExplanationResult {
  return {
    summary: input.summary,
    plainExplanation: input.plainExplanation,
    mainReasons: input.mainReasons,
    suitableFor: input.suitableFor,
    notSuitableFor: input.notSuitableFor,
    ingredientHighlights: input.ingredientHighlights,
    nutritionExplanation: input.nutritionExplanation,
    eatingAdvice: input.eatingAdvice,
    retakeSuggestion: input.confidence === 'low' ? '建议补拍配料表和营养成分表。' : '',
    provider: 'rule-only',
    model: '',
    promptVersion: foodAnalysisPromptVersion,
    aiEnhanced: false
  };
}

function parseAiExplanation(value: string): Omit<AiExplanationResult, 'provider' | 'model' | 'promptVersion' | 'aiEnhanced'> | null {
  const parsed = parseJsonObject(value);
  if (!parsed) return null;
  return {
    summary: stringField(parsed.summary),
    plainExplanation: stringField(parsed.plainExplanation),
    mainReasons: stringArray(parsed.mainReasons),
    suitableFor: stringArray(parsed.suitableFor),
    notSuitableFor: stringArray(parsed.notSuitableFor),
    ingredientHighlights: Array.isArray(parsed.ingredientHighlights)
      ? parsed.ingredientHighlights.map((item) => normalizeIngredientHighlight(item)).filter(Boolean) as AiExplanationResult['ingredientHighlights']
      : [],
    nutritionExplanation: normalizeStringRecord(parsed.nutritionExplanation),
    eatingAdvice: stringField(parsed.eatingAdvice),
    retakeSuggestion: stringField(parsed.retakeSuggestion),
    errorCode: undefined
  };
}

function sanitizeAiExplanation(
  parsed: Omit<AiExplanationResult, 'provider' | 'model' | 'promptVersion' | 'aiEnhanced'>,
  fallback: AiExplanationResult
): Omit<AiExplanationResult, 'provider' | 'model' | 'promptVersion' | 'aiEnhanced'> {
  const summary = safeText(parsed.summary) || fallback.summary;
  const plainExplanation = safeText(parsed.plainExplanation) || fallback.plainExplanation;
  return {
    summary,
    plainExplanation,
    mainReasons: safeArray(parsed.mainReasons),
    suitableFor: safeArray(parsed.suitableFor),
    notSuitableFor: safeArray(parsed.notSuitableFor),
    ingredientHighlights: parsed.ingredientHighlights
      .map((item) => ({
        ...item,
        explanation: safeText(item.explanation)
      }))
      .filter((item) => item.name && item.explanation)
      .slice(0, 8),
    nutritionExplanation: Object.fromEntries(
      Object.entries(parsed.nutritionExplanation)
        .map(([key, value]) => [key, safeText(value)] as const)
        .filter(([, value]) => value)
    ),
    eatingAdvice: safeText(parsed.eatingAdvice) || fallback.eatingAdvice,
    retakeSuggestion: safeText(parsed.retakeSuggestion),
    errorCode: undefined
  };
}

function safeArray(values: string[]): string[] {
  return values.map(safeText).filter(Boolean).slice(0, 6);
}

function safeText(value: string): string {
  const text = stringField(value)
    .replace(/可以偶尔吃/g, '偶尔吃')
    .replace(/可以吃/g, '偶尔吃')
    .replace(/偶尔解馋可以/g, '偶尔解馋')
    .replace(/不建议购买/g, '不适合这次目标')
    .replace(/建议结合(?:个人)?目标/g, '')
    .replace(/不单独下结论/g, '')
    .replace(/请?对照包装原文/g, '')
    .replace(/以包装原文为准/g, '')
    .replace(/结合包装原文/g, '')
    .trim();
  if (!text) return '';
  if (unsafeAiPattern.test(text)) return '';
  return text.slice(0, 180);
}

const unsafeAiPattern = /法规|条款|GB\s*\d+|国标|官方标准|医疗|诊断|治疗|致癌|有害|安全|健康|绝对|一定/iu;

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function normalizeIngredientHighlight(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name = stringField(input.name);
  if (!name) return null;
  const level = input.level === 'green' || input.level === 'red' || input.level === 'unknown' ? input.level : 'yellow';
  return {
    name,
    level,
    explanation: stringField(input.explanation)
  };
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, stringField(entry)] as const)
      .filter(([, entry]) => entry)
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringField).filter(Boolean).slice(0, 8) : [];
}

function stringField(value: unknown): string {
  return String(value || '').trim();
}

function stableHash(value: unknown): string {
  const json = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = ((hash << 5) - hash + json.charCodeAt(index)) | 0;
  }
  return String(hash);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
