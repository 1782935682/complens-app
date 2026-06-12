import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createIngredientService as createRealIngredientService, escapeLikePattern, toGb2760OfficialRecordRow, toIngredientRow, type BatchSearchParams, type BatchSearchResult, type IngredientService } from '../src/services/ingredientService.js';

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
	        dataStatus: 'unverified',
	        dataVersion: 'test',
        reviewedBy: 'system',
        reviewedAt: new Date('2026-06-10T00:00:00.000Z'),
        changeNote: '测试导入',
        updatedAt: '2026-06-10',
	        sourceName: '测试来源',
	        sourceType: 'official_standard',
	        sourceScope: 'seed_reference',
	        sourceVersion: 'test',
        sourceUrl: 'https://example.com/source',
	        effectiveDate: '待人工核验',
	        confidenceLevel: 'unverified',
	        matchConfidence: 'low',
	        lastReviewedAt: '2026-06-10',
	        reviewNote: '测试审核备注',
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
	          dataStatus: 'unverified',
	          dataVersion: 'test',
          reviewedBy: 'system',
          reviewedAt: new Date('2026-06-10T00:00:00.000Z'),
          changeNote: '测试导入',
          updatedAt: '2026-06-10',
	          sourceName: '测试来源',
	          sourceType: 'official_standard',
	          sourceScope: 'seed_reference',
	          sourceVersion: 'test',
          sourceUrl: 'https://example.com/source',
	          effectiveDate: '待人工核验',
	          confidenceLevel: 'unverified',
	          matchConfidence: 'low',
	          lastReviewedAt: '2026-06-10',
	          reviewNote: '测试审核备注',
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

function createBatchSearchDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows
        })
      })
    })
  } as never;
}

describe('GET /api/ingredients', () => {
  it('passes parsed filters to the ingredient service', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const response = await app.request('/api/ingredients?q=苯甲酸&category=防腐剂&riskLevel=medium&confidenceLevel=unverified&dataStatus=unverified&page=2&limit=10');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].id).toBe('sodium-benzoate');
    expect(service.listIngredients).toHaveBeenCalledWith({
      q: '苯甲酸',
      category: '防腐剂',
	      riskLevel: 'medium',
	      confidenceLevel: 'unverified',
	      dataStatus: 'unverified',
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
    const invalidConfidence = await app.request('/api/ingredients?confidenceLevel=trusted');
    const invalidDataStatus = await app.request('/api/ingredients?dataStatus=trusted');

    expect(invalidPage.status).toBe(400);
    expect(await invalidPage.json()).toEqual({
      error: 'invalid_parameter',
      field: 'page',
      message: 'page must be a positive integer'
    });
    expect(invalidRisk.status).toBe(400);
    expect(invalidSort.status).toBe(400);
    expect(invalidConfidence.status).toBe(400);
    expect(invalidDataStatus.status).toBe(400);
    expect(await invalidConfidence.json()).toEqual({
      error: 'invalid_parameter',
      field: 'confidenceLevel',
      message: 'confidenceLevel must be one of high, medium, low, unverified'
    });
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
      confidenceLevel: undefined,
      dataStatus: undefined,
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

  it('applies seed audit overrides without changing source confidence', () => {
    const row = toIngredientRow({
      id: 'xylitol',
      kind: 'food-additive',
      dataCategory: 'food',
      nameCn: '木糖醇',
      nameEn: 'Xylitol',
      aliases: [],
      category: '甜味剂',
      functions: ['甜味剂'],
      description: '测试数据',
      riskLevel: 'low',
      sourceNote: '测试来源',
	    sourceReferences: [],
	    reviewStatus: 'draft',
	    dataStatus: 'unverified',
	    dataVersion: 'food-additives-seed-v5',
      updatedAt: '2026-06-12',
	    sourceName: '测试来源',
	    sourceType: 'official_standard',
	    sourceScope: 'seed_reference',
	    sourceVersion: '待人工核验',
      sourceUrl: 'https://example.com/source',
	    effectiveDate: '待人工核验',
	    confidenceLevel: 'unverified',
	    matchConfidence: 'low',
	    lastReviewedAt: '2026-06-12',
	    reviewNote: '测试审核备注',
	    regulatoryBasis: '待人工核验',
      rawSourceText: '待人工核验',
      isVerified: false,
      gbCode: 'INS 967',
      gbStatus: 'restricted',
      usageLimits: [],
      foodCategories: [],
      allergenTypes: [],
      cautionGroups: []
    }, {
      dataVersion: '2026-06-v1',
      reviewedBy: 'system',
      reviewedAt: new Date('2026-06-12T08:00:00.000Z'),
      changeNote: 'seed version test'
    });

    expect(row.dataVersion).toBe('2026-06-v1');
    expect(row.reviewedBy).toBe('system');
    expect(row.reviewedAt).toEqual(new Date('2026-06-12T08:00:00.000Z'));
    expect(row.changeNote).toBe('seed version test');
    expect(row.confidenceLevel).toBe('unverified');
    expect(row.dataStatus).toBe('unverified');
    expect(row.sourceScope).toBe('seed_reference');
    expect(row.isVerified).toBe(false);
  });

  it('maps GB 2760 official staging records with source evidence intact', () => {
    const row = toGb2760OfficialRecordRow({
      id: 'gb2760-2024-a1-pectin-juice',
      ingredientId: 'pectin',
      standardCode: 'GB 2760-2024',
      standardTitle: '食品安全国家标准 食品添加剂使用标准',
      tableName: '表 A.1',
      additiveNameCn: '果胶',
      additiveNameEn: 'pectins',
      cnsNumber: '20.006',
      insNumber: '440',
      functionText: '乳化剂、稳定剂、增稠剂',
      foodCategoryCode: '14.02.01',
      foodCategoryName: '果蔬汁（浆）',
      maxUseLevel: '3.0',
      unit: 'g/kg',
      note: '以即饮状态计',
      pdfPage: 45,
      standardPage: 42,
      rawSourceText: 'GB 2760-2024 表 A.1：果胶 pectins；14.02.01 果蔬汁（浆）；最大使用量 3.0 g/kg。',
      sourceName: '国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台',
      sourceType: 'official_standard',
      sourceUrl: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
      downloadEndpoint: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
      platformRecordId: '6CA1489A-9570-4906-8CE8-CC86FBFB1941',
      announcementRecordId: '3D0601E8-A77C-4EC5-B148-30E2E7020822',
      fileGuid: '43C9B75E-3D84-4577-80FC-0F7D77D36407',
      factName: '1747898473246.pdf',
      pdfSha256: '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de',
      retrievedAt: '2026-06-12',
      extractionStatus: 'extracted',
      reviewStatus: 'needs_review'
    });

    expect(row.ingredientId).toBe('pectin');
    expect(row.sourceType).toBe('official_standard');
    expect(row.sourceUrl).toContain('sppt.cfsa.net.cn');
    expect(row.pdfSha256).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
    expect(row.pdfPage).toBe(45);
    expect(row.standardPage).toBe(42);
    expect(row.reviewStatus).toBe('needs_review');
    expect(row.syncedAt).toBeInstanceOf(Date);
  });

  it('requires at least two characters before server-side fuzzy prefix matches', async () => {
    const service = createRealIngredientService(createBatchSearchDb([{
      id: 'citric-acid',
      nameCn: '柠檬酸',
      nameEn: 'Citric acid',
      aliases: [],
      gbCode: '',
      eNumber: ''
    }]));

    const [short, prefix, unrelated] = await service.batchSearch({ terms: ['柠', '柠檬', '葡萄'], includeENumbers: false });

    expect(short.match).toBe(null);
    expect(short.confidence).toBe(0);
    expect(short.matchType).toBe('none');
    expect(prefix.match?.id).toBe('citric-acid');
    expect(prefix.matchType).toBe('fuzzy');
    expect(unrelated.match).toBe(null);
    expect(unrelated.matchType).toBe('none');
  });
});
