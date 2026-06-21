import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from '../types.js';

export class MockProvider implements AiProvider {
  readonly name = 'mock' as const;
  private readonly model: string;

  constructor(model = 'mock-food-explainer-v1') {
    this.model = model;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startedAt = Date.now();
    const content = JSON.stringify(buildMockFoodExplanation(request.userPrompt));
    return {
      provider: this.name,
      model: request.model || this.model,
      content,
      rawText: content,
      usage: {
        inputTokens: Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4),
        outputTokens: Math.ceil(content.length / 4)
      },
      latencyMs: Date.now() - startedAt,
      success: true
    };
  }
}

function buildMockFoodExplanation(userPrompt: string) {
  const input = parsePromptPayload(userPrompt);
  const rule = input.ruleResult || {};
  const productName = input.productName || '这款食品';
  const reasons = Array.isArray(rule.mainReasons) ? rule.mainReasons : [];
  return {
    summary: rule.summary || `${productName}偶尔吃更合适，按小份量处理。`,
    plainExplanation: reasons.length
      ? `主要原因是${reasons.slice(0, 3).join('、')}。结果来自本地规则，AI 只负责换成更容易懂的说法。`
      : '结果来自本地规则，AI 只负责换成更容易懂的说法。',
    mainReasons: reasons,
    suitableFor: Array.isArray(rule.suitableFor) ? rule.suitableFor : [],
    notSuitableFor: Array.isArray(rule.notSuitableFor) ? rule.notSuitableFor : [],
    ingredientHighlights: Array.isArray(rule.ingredientHighlights) ? rule.ingredientHighlights : [],
    nutritionExplanation: rule.nutritionExplanation || {},
    eatingAdvice: rule.eatingAdvice || '建议控制单次份量，并和正餐、饮水、蔬菜或蛋白质食物搭配。',
    retakeSuggestion: rule.confidence === 'low' ? '建议补拍配料表和营养成分表。' : ''
  };
}

function parsePromptPayload(prompt: string): Record<string, any> {
  const match = prompt.match(/\{[\s\S]*\}$/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}
