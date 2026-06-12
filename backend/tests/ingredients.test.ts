import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { escapeLikePattern, type BatchSearchParams, type BatchSearchResult, type IngredientService } from '../src/services/ingredientService.js';

function createTestApp(service: IngredientService) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'aliyun',
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
        sourceName: '测试来源',
        sourceType: 'official_standard',
        sourceVersion: 'test',
        sourceUrl: 'https://example.com/source',
        effectiveDate: '待人工核验',
        confidenceLevel: 'unverified',
        lastReviewedAt: '2026-06-10',
        regulatoryBasis: '测试法规依据',
        rawSourceText: '测试原始来源片段',
        isVerified: false,
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
      totalPages: 1,
      riskFacets: [{ level: 'medium', count: 1 }],
      categoryFacets: [{ name: '防腐剂', count: 1 }]
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
          sourceName: '测试来源',
          sourceType: 'official_standard',
          sourceVersion: 'test',
          sourceUrl: 'https://example.com/source',
          effectiveDate: '待人工核验',
          confidenceLevel: 'unverified',
          lastReviewedAt: '2026-06-10',
          regulatoryBasis: '测试法规依据',
          rawSourceText: '测试原始来源片段',
          isVerified: false,
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
    batchSearch: vi.fn(async (params: BatchSearchParams): Promise<BatchSearchResult[]> => params.terms.map((term: string) => {
      const matched = term.toUpperCase() === 'E211';
      return {
        term,
        eNumber: matched ? 'E211' : null,
        match: matched ? { id: 'sodium-benzoate' } as never : null,
        confidence: matched ? 0.99 : 0,
        matchType: matched ? 'eNumber' : 'none',
        alternates: []
      };
    })),
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
      sort: undefined,
      page: 2,
      limit: 10
    });
  });

  it('rejects invalid pagination and risk filters', async () => {
    const app = createTestApp(createIngredientService());

    const invalidPage = await app.request('/api/ingredients?page=0');
    const invalidRisk = await app.request('/api/ingredients?riskLevel=critical');
    const invalidSort = await app.request('/api/ingredients?sort=createdAt');

    expect(invalidPage.status).toBe(400);
    expect(await invalidPage.json()).toEqual({
      error: 'invalid_parameter',
      field: 'page',
      message: 'page must be a positive integer'
    });
    expect(invalidRisk.status).toBe(400);
    expect(invalidSort.status).toBe(400);
  });
});

describe('GET /api/ingredients/search', () => {
  it('reuses list query parsing for explicit search route', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const response = await app.request('/api/ingredients/search?q=E211&page=1&limit=5&sort=risk');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].sourceName).toBe('测试来源');
    expect(body.riskFacets).toEqual([{ level: 'medium', count: 1 }]);
    expect(body.categoryFacets).toEqual([{ name: '防腐剂', count: 1 }]);
    expect(service.listIngredients).toHaveBeenCalledWith({
      q: 'E211',
      category: undefined,
      riskLevel: undefined,
      sort: 'risk',
      page: 1,
      limit: 5
    });
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

describe('POST /api/ingredients/batch-search', () => {
  it('returns batch match results', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const response = await app.request('/api/ingredients/batch-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terms: ['E211', 'XYZ-UNKNOWN'], includeENumbers: true })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].match.id).toBe('sodium-benzoate');
    expect(body.results[0].matchType).toBe('eNumber');
    expect(body.results[1].match).toBe(null);
    expect(service.batchSearch).toHaveBeenCalledWith({
      terms: ['E211', 'XYZ-UNKNOWN'],
      includeENumbers: true
    });
  });

  it('rejects invalid batch request bodies', async () => {
    const app = createTestApp(createIngredientService());

    const response = await app.request('/api/ingredients/batch-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terms: 'E211' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'terms',
      message: 'terms must be an array'
    });
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
