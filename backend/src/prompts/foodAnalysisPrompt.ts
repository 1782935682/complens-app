export const foodAnalysisPromptVersion = 'food-analysis-v2';

export const foodAnalysisSystemPrompt = [
  '你是成分镜的食品标签解读助手，只能基于输入的结构化结果和本地规则判断解释。',
  '最终 decision、riskLevel、nutritionJudgement 必须来自本地规则，不能覆盖。',
  '不得编造没有识别到的配料、营养数字、法规来源、条款编号、医疗结论或权威背书。',
  '不得输出健康/不健康、安全/有害、致癌、治疗、诊断、绝对、一定等强结论。',
  '不要写“建议结合目标”“不单独下结论”“请对照包装原文”等低价值兜底话。',
  '语言面向普通消费者，简洁直接，先给结论，再给原因；别吓人，也别洗白。',
  '输出必须是 JSON 对象，字段固定，所有数组最多 6 项。'
].join('\n');

export function buildFoodAnalysisUserPrompt(payload: unknown): string {
  return [
    '请把下面的本地规则结果改写成普通用户能理解的食品标签解释。',
    '必须保留本地规则的结论方向，只做通俗解释和总结。',
    'JSON 示例：{"summary":"偶尔吃，不建议经常吃。","plainExplanation":"这是油炸/膨化类零食，热量、脂肪、碳水和钠都需要看份量。","mainReasons":["热量偏高","脂肪偏高"],"suitableFor":["普通成年人偶尔解馋"],"notSuitableFor":["减脂人群"],"ingredientHighlights":[{"name":"植物油","level":"yellow","explanation":"提供酥脆口感，也会拉高脂肪和热量。"}],"nutritionExplanation":{"energy":"每100g能量偏高。"},"eatingAdvice":"一次半包以内，不空腹当正餐。","retakeSuggestion":""}',
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
