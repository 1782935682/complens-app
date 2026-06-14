import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { gb2760OfficialRecords, gb2760OfficialReferenceRows, ingredients as ingredientsTable, type IngredientRow } from '../src/db/schema.js';
import { createIngredientService as createRealIngredientService, escapeLikePattern, toGb2760OfficialPageRow, toGb2760OfficialRecordRow, toGb2760OfficialReferenceRow, toIngredientRow, upsertIngredients, type BatchSearchParams, type BatchSearchResult, type IngredientService } from '../src/services/ingredientService.js';

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
        gb2760PromotionBaseState: null,
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
          gb2760PromotionBaseState: null,
          allergenTypes: [],
          cautionGroups: ['child'],
          createdAt: new Date('2026-06-11T00:00:00.000Z'),
          syncedAt: new Date('2026-06-11T00:00:00.000Z')
        }
      : null)),
    getIngredientWithGb2760Evidence: vi.fn(async (id) => (id === 'sodium-benzoate'
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
          gb2760PromotionBaseState: null,
          allergenTypes: [],
          cautionGroups: ['child'],
          createdAt: new Date('2026-06-11T00:00:00.000Z'),
          syncedAt: new Date('2026-06-11T00:00:00.000Z'),
          stagingRows: [{
            id: 'gb2760-2024-a1-sodium-benzoate-drink',
            reviewStatus: 'pending_review',
            foodCategoryCode: '14.0',
            foodCategoryName: '饮料类',
            maxUseLevel: '1.0',
            unit: 'g/kg',
            pdfPage: 90,
            rawSourceText: 'GB 2760-2024 表 A.1：苯甲酸钠；14.0 饮料类；最大使用量 1.0 g/kg。'
          } as never],
          referenceRows: [{
            id: 'gb2760-2024-f-211',
            tableName: '附录 F',
            rowNumber: 1,
            rowCode: '211',
            rowName: '苯甲酸钠',
            rawSourceText: 'GB 2760-2024 附录 F：食品添加剂中文名称 苯甲酸钠；INS 号 211。'
          } as never]
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

function createEvidenceIngredient(overrides: Partial<IngredientRow> = {}): IngredientRow {
  return {
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
    cautionFor: [],
    sourceNote: '测试来源。',
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
    gb2760PromotionBaseState: null,
    allergenTypes: [],
    cautionGroups: [],
    createdAt: new Date('2026-06-11T00:00:00.000Z'),
    syncedAt: new Date('2026-06-11T00:00:00.000Z'),
    ...overrides
  };
}

function createEvidenceDb({
  ingredient,
  stagingRows = [],
  referenceRows = []
}: {
  ingredient: IngredientRow | null;
  stagingRows?: unknown[];
  referenceRows?: unknown[];
}) {
  let referenceQueryCount = 0;

  return {
    getReferenceQueryCount: () => referenceQueryCount,
    select: () => ({
      from: (table: unknown) => {
        if (table === ingredientsTable) {
          return {
            where: () => ({
              limit: async () => ingredient ? [ingredient] : []
            })
          };
        }
        if (table === gb2760OfficialRecords) {
          return {
            where: () => ({
              orderBy: async () => stagingRows
            })
          };
        }
        if (table === gb2760OfficialReferenceRows) {
          referenceQueryCount += 1;
          return {
            where: () => ({
              orderBy: () => ({
                limit: async () => referenceRows
              })
            })
          };
        }
        throw new Error('Unexpected evidence table');
      }
    })
  };
}

describe('GET /api/ingredients', () => {
  it('passes parsed filters to the ingredient service', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const response = await app.request('/api/ingredients?q=苯甲酸&category=防腐剂&riskLevel=medium&confidenceLevel=unverified&dataStatus=pending_review&page=2&limit=10');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].id).toBe('sodium-benzoate');
    expect(service.listIngredients).toHaveBeenCalledWith({
      q: '苯甲酸',
      category: '防腐剂',
        riskLevel: 'medium',
        confidenceLevel: 'unverified',
        dataStatus: 'pending_review',
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
    expect(await invalidDataStatus.json()).toEqual({
      error: 'invalid_parameter',
      field: 'dataStatus',
      message: 'dataStatus must be one of verified_regulation, verified_jecfa, pending_review, mapped_candidate, common_ingredient, unverified, unknown_from_ocr'
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

  it('adds GB 2760 staging and reference evidence only when requested', async () => {
    const service = createIngredientService();
    const app = createTestApp(service);

    const plain = await app.request('/api/ingredients/sodium-benzoate');
    const withEvidence = await app.request('/api/ingredients/sodium-benzoate?includeEvidence=1');
    const plainBody = await plain.json();
    const evidenceBody = await withEvidence.json();

    expect(plain.status).toBe(200);
    expect(withEvidence.status).toBe(200);
    expect(plainBody.stagingRows).toBeUndefined();
    expect(plainBody.referenceRows).toBeUndefined();
    expect(evidenceBody.stagingRows).toHaveLength(1);
    expect(evidenceBody.stagingRows[0]).toMatchObject({
      reviewStatus: 'pending_review',
      foodCategoryCode: '14.0',
      maxUseLevel: '1.0'
    });
    expect(evidenceBody.referenceRows[0]).toMatchObject({
      tableName: '附录 F',
      rowName: '苯甲酸钠'
    });
    expect(service.getIngredientById).toHaveBeenCalledWith('sodium-benzoate');
    expect(service.getIngredientWithGb2760Evidence).toHaveBeenCalledWith('sodium-benzoate');
  });
});

describe('GB 2760 ingredient evidence lookup', () => {
  it('does not attach free-text reference rows to common ingredients without staging evidence', async () => {
    const db = createEvidenceDb({
      ingredient: createEvidenceIngredient({
        id: 'common-white-sugar',
        kind: 'common-food-ingredient',
        nameCn: '白砂糖',
        nameEn: 'White sugar',
        aliases: ['蔗糖', '砂糖'],
        category: '普通食品配料',
        functions: ['普通食品原料'],
        dataStatus: 'common_ingredient',
        sourceType: 'unknown',
        sourceScope: 'common_ingredient_lexicon',
        gbCode: 'N/A',
        eNumber: ''
      }),
      referenceRows: [{
        id: 'gb2760-2024-c2-sucrose-ester',
        tableName: '表 C.2',
        rowName: '蔗糖脂肪酸酯'
      }]
    });
    const service = createRealIngredientService(db as never);

    const result = await service.getIngredientWithGb2760Evidence('common-white-sugar');

    expect(result?.stagingRows).toEqual([]);
    expect(result?.referenceRows).toEqual([]);
    expect(db.getReferenceQueryCount()).toBe(0);
  });

  it('keeps reference evidence for additives with direct GB 2760 staging rows', async () => {
    const referenceRow = {
      id: 'gb2760-2024-f-211',
      tableName: '附录 F',
      rowName: '苯甲酸钠'
    };
    const db = createEvidenceDb({
      ingredient: createEvidenceIngredient(),
      stagingRows: [{
        id: 'gb2760-2024-a1-sodium-benzoate-drink',
        ingredientId: 'sodium-benzoate'
      }],
      referenceRows: [referenceRow]
    });
    const service = createRealIngredientService(db as never);

    const result = await service.getIngredientWithGb2760Evidence('sodium-benzoate');

    expect(result?.stagingRows).toHaveLength(1);
    expect(result?.referenceRows).toEqual([referenceRow]);
    expect(db.getReferenceQueryCount()).toBe(1);
  });

  it('returns all linked GB 2760 staging evidence rows for an ingredient detail', async () => {
    const stagingRows = Array.from({ length: 60 }, (_, index) => ({
      id: `gb2760-2024-a1-caramel-colours-${index + 1}`,
      ingredientId: 'caramel-colours'
    }));
    const db = createEvidenceDb({
      ingredient: createEvidenceIngredient({
        id: 'caramel-colours',
        nameCn: '焦糖色',
        nameEn: 'Caramel colours',
        gbCode: 'CNS 08.108'
      }),
      stagingRows
    });
    const service = createRealIngredientService(db as never);

    const result = await service.getIngredientWithGb2760Evidence('caramel-colours');

    expect(result?.stagingRows).toHaveLength(60);
    expect(result?.stagingRows).toEqual(stagingRows);
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

  it('preserves saved GB 2760 promotion base state during seed upsert conflicts', async () => {
    const conflictSets: Array<Record<string, unknown>> = [];
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(async ({ set }: { set: Record<string, unknown> }) => {
            conflictSets.push(set);
          })
        }))
      })),
      delete: vi.fn(() => ({
        where: vi.fn(async () => undefined)
      }))
    };
    const db = {
      transaction: vi.fn(async (callback: (transaction: unknown) => Promise<void>) => callback(tx))
    };

    await upsertIngredients(db as unknown as Parameters<typeof upsertIngredients>[0], [{
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
    }]);

    expect(conflictSets).toHaveLength(1);
    expect(conflictSets[0].gb2760PromotionBaseState).toBeTruthy();
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
    expect(row.reviewStatus).toBe('pending_review');
    expect(row.syncedAt).toBeInstanceOf(Date);
  });

  it('maps GB 2760 official full-text pages with source evidence intact', () => {
    const row = toGb2760OfficialPageRow({
      id: 'gb2760-2024-pdf-page-001',
      standardCode: 'GB 2760-2024',
      standardTitle: '食品安全国家标准 食品添加剂使用标准',
      pdfPage: 1,
      standardPageLabel: '',
      text: '食品安全国家标准 食品添加剂使用标准',
      textSha256: 'sample-page-hash',
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
      extractionTool: 'pdftotext -layout (poppler-utils)',
      extractionScope: 'full_pdf_text_by_page',
      generatedAt: '2026-06-13'
    });

    expect(row.id).toBe('gb2760-2024-pdf-page-001');
    expect(row.pdfPage).toBe(1);
    expect(row.text).toContain('食品添加剂使用标准');
    expect(row.pdfSha256).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
    expect(row.extractionScope).toBe('full_pdf_text_by_page');
    expect(row.syncedAt).toBeInstanceOf(Date);
  });

  it('maps GB 2760 official reference rows with structured row data intact', () => {
    const row = toGb2760OfficialReferenceRow({
      id: 'gb2760-2024-a2-exception-067',
      standardCode: 'GB 2760-2024',
      standardTitle: '食品安全国家标准 食品添加剂使用标准',
      tableName: '表 A.2',
      tableTitle: '表 A.1 中例外食品编号对应的食品类别',
      rowNumber: 67,
      rowCode: '67',
      rowName: '特种葡萄酒(按特殊工艺加工制作的葡萄酒,如在葡萄原酒中加入白兰地、浓缩葡萄汁等)',
      rowData: {
        exceptionNumber: 67,
        foodCategoryCode: '15.03.01.04',
        foodCategoryName: '特种葡萄酒(按特殊工艺加工制作的葡萄酒,如在葡萄原酒中加入白兰地、浓缩葡萄汁等)'
      },
      pdfPage: 150,
      standardPage: 147,
      rawSourceText: 'GB 2760-2024 表 A.2：例外食品类别编号 67；食品分类号 15.03.01.04；食品名称 特种葡萄酒(按特殊工艺加工制作的葡萄酒,如在葡萄原酒中加入白兰地、浓缩葡萄汁等)。',
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
      extractionTool: 'pdftotext -bbox-layout (poppler-utils)',
      extractionScope: 'official_reference_tables_structured',
      generatedAt: '2026-06-13',
      extractionStatus: 'extracted',
      reviewStatus: 'needs_review'
    });

    expect(row.id).toBe('gb2760-2024-a2-exception-067');
    expect(row.tableName).toBe('表 A.2');
    expect(row.rowCode).toBe('67');
    expect(row.rowData).toMatchObject({ foodCategoryCode: '15.03.01.04' });
    expect(row.pdfSha256).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
    expect(row.reviewStatus).toBe('pending_review');
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
