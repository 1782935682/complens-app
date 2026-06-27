import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { profileComparisonEvaluationCases, profileDecisionEvaluationCases } from '../src/data/evaluationCases.js';

function createTestApp() {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'manual',
    port: 3000,
    ai: {
      enabled: false,
      defaultProvider: 'mock',
      fallbackProvider: 'mock',
      timeoutMs: 20000,
      maxRetry: 1,
      deepseek: {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash'
      },
      openaiCompatible: {
        apiKey: '',
        baseUrl: '',
        model: '',
        requestPath: '/v1/chat/completions'
      },
      claude: {
        apiKey: '',
        model: ''
      },
      gemini: {
        apiKey: '',
        model: ''
      }
    }
  });
}

const highRiskSnack = [
  '产品名称：海苔味小麻花',
  '配料表：小麦粉、植物油、白砂糖、麦芽糖浆、味精、食用盐、碳酸氢钠。',
  '营养成分表 每100g 能量1950kJ 脂肪16.5g 碳水化合物69g 钠568mg'
].join('\n');

const betterYogurt = [
  '产品名称：无乳糖高蛋白酸奶',
  '配料表：生牛乳、乳清蛋白、乳酸菌。',
  '营养成分表 每100g 能量320kJ 蛋白质8.5g 脂肪1.2g 碳水化合物6g 钠60mg'
].join('\n');

describe('decision agent routes', () => {
  it('returns a purchase decision instead of raw recognition output', async () => {
    const response = await createTestApp().request('/api/decision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        labelText: highRiskSnack,
        userProfile: {
          goals: ['sugar', 'fatLoss', 'lowSodium'],
          allergens: ['小麦'],
          forChild: true
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schemaVersion).toBe('decision-agent-v1');
    expect(body.decision_result.recommendation).toBe('不建议');
    expect(body.decision_result.riskReasons.length).toBeLessThanOrEqual(3);
    expect(body.decision_result.unsuitableFor).toEqual(expect.arrayContaining(['儿童高频食用']));
    expect(body.decision_result.alternatives.length).toBeGreaterThan(0);
    expect(body.agents.map((item: { agent: string }) => item.agent)).toEqual(expect.arrayContaining([
      'product-agent',
      'ocr-agent',
      'nutrition-agent',
      'rule-agent',
      'decision-agent',
      'review-agent'
    ]));
  });

  it('compares two products for health, risk, and profile fit', async () => {
    const response = await createTestApp().request('/api/decision/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        left: {
          labelText: highRiskSnack
        },
        right: {
          labelText: betterYogurt
        },
        userProfile: {
          goals: ['fatLoss', 'lowSodium']
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schemaVersion).toBe('comparison-agent-v1');
    expect(body.healthier).toBe('right');
    expect(body.lowerRisk).toBe('right');
    expect(body.betterForProfile).toBe('right');
    expect(body.summary).toContain('B');
    expect(body.agents.map((item: { agent: string }) => item.agent)).toContain('review-agent');
  });

  it.each(profileComparisonEvaluationCases)('matches comparison evaluation case: $id', async (evaluationCase) => {
    const response = await createTestApp().request('/api/decision/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        left: evaluationCase.left,
        right: evaluationCase.right,
        userProfile: evaluationCase.userProfile,
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthier).toBe(evaluationCase.expected.healthier);
    expect(body.lowerRisk).toBe(evaluationCase.expected.lowerRisk);
    expect(body.betterForProfile).toBe(evaluationCase.expected.betterForProfile);
    expect(body.summary).toContain(evaluationCase.expected.summaryIncludes);
    expect(body.reasons.length).toBeGreaterThan(0);
    expect(body.reasons.length).toBeLessThanOrEqual(3);
  });

  it('does not force a profile winner when both products are unsuitable for the current profile', async () => {
    const evaluationCase = profileComparisonEvaluationCases.find((item) => item.id === 'comparison_case_allergy_two_milk_products_no_forced_winner');
    if (!evaluationCase) throw new Error('comparison_case_allergy_two_milk_products_no_forced_winner fixture missing');

    const response = await createTestApp().request('/api/decision/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        left: evaluationCase.left,
        right: evaluationCase.right,
        userProfile: evaluationCase.userProfile
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.left.decision_result.recommendation).toBe('不建议');
    expect(body.right.decision_result.recommendation).toBe('不建议');
    expect(body.betterForProfile).toBe('tie');
    expect(body.summary).toContain('两款都不适合');
  });

  it('keeps insufficient packaging data as information needed', async () => {
    const response = await createTestApp().request('/api/decision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        labelText: '包装正面：美味酥脆 分享装'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision_result.recommendation).toBe('信息不足');
    expect(body.agents.find((item: { agent: string }) => item.agent === 'decision-agent').status).toBe('needs_input');
  });

  it('keeps configured sugar profile away from recommendation and avoids retake advice for complete labels', async () => {
    const response = await createTestApp().request('/api/decision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '葡萄风味汽水',
        labelText: [
          '产品名称：葡萄风味汽水',
          '配料表：水、白砂糖、果葡糖浆、浓缩葡萄汁、柠檬酸、食用香精。',
          '营养成分表 每100mL 能量285kJ 蛋白质0g 脂肪0g 碳水化合物18g 糖16g 钠0mg'
        ].join('\n'),
        userProfile: {
          goals: ['sugar']
        },
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision_result.recommendation).not.toBe('推荐');
    expectIncludes(body.decision_result.riskReasons, ['控糖']);
    expect(body.source.confidence).toBe('high');
    expect(body.source.retakeSuggestion).toBe('');
    expect(body.source.source).toMatchObject({
      ruleBased: true,
      aiEnhanced: false,
      provider: 'rule-only'
    });
    expect(body.source.nutrition.carbohydrate).toMatchObject({
      value: 18,
      unit: 'g',
      level: '中等',
      text: '18g'
    });
  });

  it.each(profileDecisionEvaluationCases)('matches profile evaluation case: $id', async (evaluationCase) => {
    const response = await createTestApp().request('/api/decision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: evaluationCase.productName,
        labelText: evaluationCase.labelText,
        userProfile: evaluationCase.userProfile,
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision_result.recommendation).toBe(evaluationCase.expected.recommendation);
    expect(body.decision_result.riskReasons.length).toBeLessThanOrEqual(3);
    expectIncludes(body.decision_result.riskReasons, evaluationCase.expected.riskReasonIncludes);
    expectIncludes(body.decision_result.unsuitableFor, evaluationCase.expected.unsuitableForIncludes);
    expectIncludes(body.decision_result.alternatives, evaluationCase.expected.alternativeIncludes);
  });
});

function expectIncludes(actual: string[], expectedIncludes: string[]) {
  for (const expected of expectedIncludes) {
    expect(actual.some((item) => item.includes(expected))).toBe(true);
  }
}
