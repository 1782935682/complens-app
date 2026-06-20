import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

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

describe('POST /api/food/analyze', () => {
  it('builds a consumer decision for the small fried snack sample', async () => {
    const app = createTestApp();
    const response = await app.request('/api/food/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocrText: [
          '品名 小麻花(海苔味)',
          '产品类型 膨化食品',
          '配料 小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙。',
          '营养成分表 每100g 能量1950kJ 蛋白质9.8g 脂肪16.5g 碳水化合物69.0g 钠568mg 反式脂肪酸0g'
        ].join('\n'),
        userProfile: {
          goals: ['fatLoss', 'sugar', 'lowSodium'],
          allergens: ['小麦']
        },
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.productName).toContain('小麻花');
    expect(body.category).toContain('膨化食品');
    expect(body.decision).toBe('caution');
    expect(body.decisionText).toBe('不建议常吃｜偶尔解馋');
    expect(body.summary).toContain('偶尔吃');
    expect(body.mainReasons).toEqual(expect.arrayContaining(['热量偏高', '脂肪偏高', '碳水较高', '钠偏高', '含添加糖来源']));
    expect(body.notSuitableFor).toEqual(expect.arrayContaining(['减脂人群', '控糖人群', '高血压/控盐人群', '小麦过敏或麸质敏感人群']));
    expect(body.ingredientHighlights.map((item: { name: string }) => item.name)).toEqual(expect.arrayContaining(['白砂糖', '麦芽糖', '植物油', '味精', '碳酸钙']));
    expect(body.nutrition.energy.level).toBe('偏高');
    expect(body.nutrition.fat.level).toBe('偏高');
    expect(body.nutrition.carbohydrate.level).toBe('高');
    expect(body.nutrition.sodium.level).toBe('偏高');
    expect(body.nutrition.transFat.level).toBe('较好');
    expect(body.eatingAdvice).toContain('半包以内');
    expect(body.source).toMatchObject({
      ruleBased: true,
      aiEnhanced: false,
      provider: 'rule-only'
    });
  });

  it('falls back to mock provider when ai is enabled and DeepSeek has no key', async () => {
    const app = createApp({
      corsOrigin: 'http://localhost:5173',
      databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
      jwtSecret: 'test-only-compcheck-jwt-secret',
      ocrApiKey: '',
      ocrProvider: 'manual',
      port: 3000,
      ai: {
        enabled: true,
        defaultProvider: 'deepseek',
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
    const response = await app.request('/api/food/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocrText: '配料 小麦粉、白砂糖。营养成分表 能量1800kJ 钠400mg',
        options: {
          enableAi: true
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source.provider).toBe('mock');
  });

  it('keeps target packaging fields outside ingredient conclusions', async () => {
    const app = createTestApp();
    const response = await app.request('/api/food/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocrText: [
          '产品名称：高蛋白酸奶',
          '食品类型：发酵乳',
          '包装声明：0糖 高蛋白 减盐',
          '生产日期：2026-06-18',
          '疑似看不清：口味名称',
          '营养成分表 每100g 能量320kJ 蛋白质8.5g 脂肪1.2g 碳水化合物6g 钠60mg'
        ].join('\n'),
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.productName).toBe('高蛋白酸奶');
    expect(body.category).toBe('发酵乳');
    expect(body.productionDate).toBe('2026-06-18');
    expect(body.frontClaims).toEqual(expect.arrayContaining(['0糖', '高蛋白', '减盐']));
    expect(body.uncertainClues).toEqual(expect.arrayContaining(['疑似看不清:口味名称']));
    expect(body.ingredients).toEqual([]);
  });

  it('does not turn sparse OCR nutrition fragments into fake macro values', async () => {
    const app = createTestApp();
    const response = await app.request('/api/food/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocrText: [
          '每100毫升 营养素参考值装',
          '项目',
          '能量',
          '221kJ',
          '蛋白质',
          '脂肪',
          '碳水化合物',
          '10mg',
          '钠'
        ].join('\n'),
        options: {
          enableAi: false
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nutrition.energy.text).toBe('221kJ');
    expect(body.nutrition.protein).toBeUndefined();
    expect(body.nutrition.fat).toBeUndefined();
    expect(body.nutrition.carbohydrate).toBeUndefined();
    expect(body.nutrition.sodium).toBeUndefined();
    expect(body.decision).toBe('unknown');
    expect(body.summary).toContain('识别信息还不够');
    expect(body.source.provider).toBe('rule-only');
  });
});
