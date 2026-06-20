export const foodAnalysisPromptVersion = 'food-analysis-v1';

export const foodAnalysisSystemPrompt = [
  '你是食品标签解读助手，只能基于输入的结构化结果和本地规则判断解释。',
  '最终 decision、riskLevel、nutritionJudgement 必须来自本地规则，不能覆盖。',
  '不得编造没有识别到的配料、营养数字、法规来源或医疗结论。',
  '语言面向普通消费者，简洁直接，别吓人，也别洗白。',
  '输出必须是 JSON，字段固定。'
].join('\n');

export function buildFoodAnalysisUserPrompt(payload: unknown): string {
  return [
    '请把下面的本地规则结果改写成普通用户能理解的食品标签解释。',
    '只输出 JSON，不要输出 Markdown。',
    JSON.stringify(payload)
  ].join('\n');
}

export const foodExplanationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    plainExplanation: { type: 'string' },
    mainReasons: { type: 'array', items: { type: 'string' } },
    suitableFor: { type: 'array', items: { type: 'string' } },
    notSuitableFor: { type: 'array', items: { type: 'string' } },
    ingredientHighlights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'string' },
          explanation: { type: 'string' }
        }
      }
    },
    nutritionExplanation: { type: 'object' },
    eatingAdvice: { type: 'string' },
    retakeSuggestion: { type: 'string' }
  }
};
