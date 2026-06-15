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
          } as never,
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

function createTestApp(options: { ingredientService?: IngredientService } = {}) {
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
    reportService: createReportService({ ingredientService: options.ingredientService })
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
