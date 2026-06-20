import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/authService.js';
import { createReportService } from '../src/services/reportService.js';
import type { BatchSearchResult, IngredientService } from '../src/services/ingredientService.js';

function createAuthService(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUserForToken: vi.fn(),
    deleteAccount: vi.fn()
  };
}

function createIngredientService(overrides: Partial<IngredientService> = {}): IngredientService {
  return {
    batchSearch: vi.fn(async (params) => {
      const terms = params.terms.map((term: string) => term.toLowerCase());
      return terms.map((term: string): BatchSearchResult => {
        if (term !== '小麦粉') {
          return {
            term,
            eNumber: null,
            match: null,
            confidence: 0,
            matchType: 'none',
            alternates: []
          };
        }

        return {
          term,
          eNumber: null,
          match: {
            id: 'ingredient-wheat-flour',
            nameCn: '小麦粉',
            category: '普通配料',
            dataStatus: 'verified_regulation',
            sourceType: 'common_ingredient',
            sourceName: '营养表参考库'
          },
          confidence: 0.98,
          matchType: 'exact',
          alternates: []
        };
      });
    }),
    listIngredients: vi.fn(),
    getIngredientById: vi.fn(),
    getIngredientWithGb2760Evidence: vi.fn(),
    getCategorySummaries: vi.fn(),
    ...overrides
  };
}

function createTestApp(options: { ingredientService?: IngredientService; skipReportService?: boolean } = {}) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'manual',
    port: 3000
  }, {
    authService: createAuthService(),
    ingredientService: options.ingredientService,
    ...(options.skipReportService ? {} : {
      reportService: createReportService({ ingredientService: options.ingredientService })
    })
  });
}

describe('POST /api/reports/label', () => {
  it('builds a report from explicit ingredient matches', async () => {
    const app = createTestApp();
    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '花生酱',
        rawText: '配料：小麦粉、乳糖',
        ingredients: [{
          id: 'wheat',
          rawText: '小麦粉',
          normalizedText: '小麦粉',
          isSubIngredient: false,
          isUnknown: false
        }, {
          id: 'lactose',
          rawText: '乳糖',
          normalizedText: '乳糖',
          isSubIngredient: false,
          isUnknown: false
        }],
        matches: [{
          id: 'wheat',
          term: '小麦粉',
          normalizedText: '小麦粉',
          dataStatus: 'common_ingredient',
          dataStatusLabel: '普通配料',
          confidence: 0.97,
          matchType: 'exact',
          sourceName: '官方资料',
          sourceType: 'official_standard',
          sourceNote: '官方配料来源',
          isAdditive: false,
          decision: 'confirmed'
        }, {
          id: 'lactose',
          term: '乳糖',
          normalizedText: '乳糖',
          dataStatus: 'unknown_from_ocr',
          dataStatusLabel: '暂未收录',
          confidence: 0,
          matchType: 'none',
          sourceNote: '暂未收录',
          isAdditive: false,
          decision: 'pending'
        }],
        nutrition: [{
          key: 'energy',
          label: '能量',
          value: '2100',
          unit: 'kJ',
          nrvPercent: '0',
          confidence: 0.95
        }],
        attention: {
          goals: ['fewer_additives'],
          detailTerms: ['防腐剂'],
          customTerms: []
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.productName).toBe('花生酱');
    expect(body.ingredientSection).toMatchObject({
      total: 2,
      additiveCount: 0
    });
    expect(body.summarySentence).toContain('识别到 2 项配料');
    expect(body.summarySentence).toContain('营养数字已整理');
    expect(body.summarySentence).not.toContain('营养成分表已整理');
    expect(body.nutritionIngredientChecks.map((item: { title: string }) => item.title)).toEqual(['糖线索', '钠线索']);
  });

  it('uses plain report wording for nutrition clues', async () => {
    const app = createTestApp();
    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '酸奶',
        rawText: '配料：生牛乳、白砂糖。营养成分表 糖 12g',
        ingredients: [{
          id: 'sugar',
          rawText: '白砂糖',
          normalizedText: '白砂糖',
          isSubIngredient: false,
          isUnknown: false
        }],
        matches: [],
        nutrition: [{
          key: 'sugar',
          label: '糖',
          value: '12',
          unit: 'g',
          confidence: 0.95
        }],
        attention: {
          goals: ['sugar_control'],
          detailTerms: [],
          customTerms: []
        }
      })
    });
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.summarySentence).toContain('营养数字已整理');
    expect(body.nutritionIngredientChecks[0]).toEqual(expect.objectContaining({
      title: '糖线索',
      summary: expect.stringContaining('包装上写了糖 12g')
    }));
    expect(serialized).not.toContain('核验');
    expect(serialized).not.toContain('阈值');
    expect(serialized).not.toContain('标识偏差');
  });

  it('uses ingredientService batch-search when matches are not provided', async () => {
    const ingredientService = createIngredientService();
    const app = createTestApp({ ingredientService });

    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '面包',
        rawText: '小麦粉',
        ingredients: [{
          id: 'wheat',
          rawText: '小麦粉',
          normalizedText: '小麦粉',
          isSubIngredient: false,
          isUnknown: false
        }],
        nutrition: [],
        attention: {
          goals: ['low_sodium'],
          detailTerms: [],
          customTerms: []
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingredientSection.total).toBe(1);
    expect(body.ingredientSection.items[0]).toEqual(expect.objectContaining({
      ingredientName: '小麦粉',
      dataStatus: 'verified_regulation'
    }));
  });

  it('uses default report wiring from app services when reportService is omitted', async () => {
    const ingredientService = createIngredientService();
    const app = createTestApp({ ingredientService, skipReportService: true });

    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '面包',
        rawText: '小麦粉',
        ingredients: [{
          id: 'wheat',
          rawText: '小麦粉',
          normalizedText: '小麦粉',
          isSubIngredient: false,
          isUnknown: false
        }],
        nutrition: [],
        attention: {
          goals: ['low_sodium'],
          detailTerms: [],
          customTerms: []
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingredientSection.items[0]).toEqual(expect.objectContaining({
      ingredientName: '小麦粉',
      dataStatus: 'verified_regulation'
    }));
  });

  it('demotes rejected matches before exposing report data', async () => {
    const app = createTestApp();

    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '花生酱',
        rawText: '香精',
        ingredients: [{
          id: 'flavor',
          rawText: '香精',
          normalizedText: '香精',
          isSubIngredient: false,
          isUnknown: false
        }],
        matches: [{
          id: 'flavor',
          term: '香精',
          normalizedText: '香精',
          dataStatus: 'verified_regulation',
          dataStatusLabel: '官方标准已验证',
          confidence: 0.98,
          matchType: 'exact',
          sourceName: '官方标准库',
          sourceType: 'official_standard',
          sourceNote: '官方配料来源',
          isAdditive: true,
          decision: 'rejected'
        }],
        nutrition: [],
        attention: {
          goals: ['fewer_additives'],
          detailTerms: ['香精'],
          customTerms: []
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingredientSection).toMatchObject({
      total: 1,
      additiveCount: 0
    });
    expect(body.ingredientSection.items[0]).toMatchObject({
      decision: 'rejected',
      dataStatus: 'unknown_from_ocr',
      isAdditive: false
    });
    expect(body.ingredientSection.items[0].sourceName).toBeUndefined();
    expect(body.ingredientSection.items[0].sourceType).toBeUndefined();
  });

  it('counts trusted pending matches as additives', async () => {
    const app = createTestApp();

    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '测试',
        rawText: '甜味剂',
        ingredients: [{
          id: 'sweetener',
          rawText: '甜味剂',
          normalizedText: '甜味剂',
          isSubIngredient: false,
          isUnknown: false
        }],
        matches: [{
          id: 'sweetener',
          term: '甜味剂',
          normalizedText: '甜味剂',
          dataStatus: 'verified_regulation',
          dataStatusLabel: '官方标准已验证',
          confidence: 0.72,
          matchType: 'fuzzy',
          sourceName: '官方标准库',
          sourceType: 'official_standard',
          sourceNote: '来自后端成分匹配 API。',
          isAdditive: true,
          decision: 'pending'
        }],
        nutrition: [],
        attention: {
          goals: ['fewer_additives'],
          detailTerms: ['甜味剂'],
          customTerms: []
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingredientSection.additiveCount).toBe(1);
    expect(body.ingredientSection.total).toBe(1);
    expect(body.additiveGroups?.[0]?.items?.[0]?.dataStatus).toBe('verified_regulation');
  });

  it('rejects invalid report payload', async () => {
    const app = createTestApp();
    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: 100,
        ingredients: [{ rawText: '小麦粉', normalizedText: '小麦粉' }]
      })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'rawText',
      message: 'rawText must be a string'
    });
  });

  it('requires sufficient data to generate a report', async () => {
    const app = createTestApp();
    const response = await app.request('/api/reports/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: '仅名称'
      })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'insufficient_label_data',
      message: 'Need at least raw text, ingredients, nutrition, or front-claims text to generate a report.'
    });
  });
});
