import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { escapeLikePattern, type IngredientService } from '../src/services/ingredientService.js';

function createTestApp(service: IngredientService) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    port: 3000
  }, {
    ingredientService: service
  });
}

function createIngredientService(overrides: Partial<IngredientService> = {}): IngredientService {
  return {
    listIngredients: vi.fn(async (params) => ({
      items: [{
        id: 'sodium-benzoate',
        kind: 'food-additive',
        dataCategory: 'food',
        nameCn: '苯甲酸钠',
        nameEn: 'Sodium benzoate',
        aliases: ['E211', 'INS 211'],
        category: '防腐剂',
        functions: ['防腐剂'],
        description: '苯甲酸盐类防腐剂。',
        riskLevel: 'medium',
        riskSummary: '属于限量使用防腐剂。',
        suitableFor: ['饮料'],
        cautionFor: ['儿童和敏感人群建议关注摄入频率'],
        sourceNote: '种子数据。',
        sourceReferences: [],
        reviewStatus: 'draft',
        dataVersion: 'test',
        updatedAt: '2026-06-10',
        gbCode: 'INS 211',
        gbStatus: 'restricted',
        eNumber: 'E211',
        adi: '0-5 mg/kg bw',
        usageLimits: [],
        foodCategories: ['饮料'],
        allergenTypes: [],
        cautionGroups: ['child'],
        createdAt: new Date('2026-06-11T00:00:00.000Z'),
        syncedAt: new Date('2026-06-11T00:00:00.000Z')
      }],
      page: params.page,
      limit: params.limit,
      total: 1,
      totalPages: 1
    })),
    getIngredientById: vi.fn(async (id) => (id === 'sodium-benzoate'
      ? {
          id: 'sodium-benzoate',
          kind: 'food-additive',
          dataCategory: 'food',
          nameCn: '苯甲酸钠',
          nameEn: 'Sodium benzoate',
          aliases: ['E211', 'INS 211'],
          category: '防腐剂',
          functions: ['防腐剂'],
          description: '苯甲酸盐类防腐剂。',
          riskLevel: 'medium',
          riskSummary: '属于限量使用防腐剂。',
          suitableFor: ['饮料'],
          cautionFor: ['儿童和敏感人群建议关注摄入频率'],
          sourceNote: '种子数据。',
          sourceReferences: [],
          reviewStatus: 'draft',
          dataVersion: 'test',
          updatedAt: '2026-06-10',
          gbCode: 'INS 211',
          gbStatus: 'restricted',
          eNumber: 'E211',
          adi: '0-5 mg/kg bw',
          usageLimits: [],
          foodCategories: ['饮料'],
          allergenTypes: [],
          cautionGroups: ['child'],
          createdAt: new Date('2026-06-11T00:00:00.000Z'),
          syncedAt: new Date('2026-06-11T00:00:00.000Z')
        }
      : null)),
    getCategorySummaries: vi.fn(async () => [{ name: '防腐剂', count: 12 }]),
    ...overrides
  };
}

describe('GET /api/ingredients', () => {
  it('passes parsed filters to the ingredient service', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const response = await app.request('/api/ingredients?q=苯甲酸&category=防腐剂&riskLevel=medium&page=2&limit=10');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].id).toBe('sodium-benzoate');
    expect(service.listIngredients).toHaveBeenCalledWith({
      q: '苯甲酸',
      category: '防腐剂',
      riskLevel: 'medium',
      page: 2,
      limit: 10
    });
  });

  it('rejects invalid pagination and risk filters', async () => {
    const app = createTestApp(createIngredientService());

    const invalidPage = await app.request('/api/ingredients?page=0');
    const invalidRisk = await app.request('/api/ingredients?riskLevel=critical');

    expect(invalidPage.status).toBe(400);
    expect(await invalidPage.json()).toEqual({
      error: 'invalid_parameter',
      field: 'page',
      message: 'page must be a positive integer'
    });
    expect(invalidRisk.status).toBe(400);
  });
});

describe('GET /api/ingredients/categories', () => {
  it('returns category summaries', async () => {
    const app = createTestApp(createIngredientService());

    const response = await app.request('/api/ingredients/categories');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([{ name: '防腐剂', count: 12 }]);
  });
});

describe('GET /api/ingredients/:id', () => {
  it('returns a single ingredient or JSON 404', async () => {
    const app = createTestApp(createIngredientService());

    const found = await app.request('/api/ingredients/sodium-benzoate');
    const missing = await app.request('/api/ingredients/not-exist');

    expect(found.status).toBe(200);
    expect((await found.json()).nameCn).toBe('苯甲酸钠');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'not_found' });
  });
});

describe('ingredient search helpers', () => {
  it('escapes SQL LIKE wildcards in user search terms', () => {
    expect(escapeLikePattern('%_\\E211')).toBe('\\%\\_\\\\E211');
  });
});
