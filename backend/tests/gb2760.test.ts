import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AdditiveUsageRuleRow, Gb2760OfficialRecordRow, ImportRunRow, IngredientRow } from '../src/db/schema.js';
import { getAffectedPromotionIngredientIds, getGb2760AdditiveIdentityKey, getStaleFormalRuleSourceIds, hasFullPromotionCoverage, isApprovedForPromotion, isPromotedForReconciliation, toAdditiveUsageRuleRow, toDemotedIngredientPatch, toPartiallyPromotedIngredientPatch, toPromotedIngredientPatch, validatePromotionCandidate } from '../src/services/gb2760PromoteService.js';
import type { AuthService } from '../src/services/authService.js';
import { createGb2760SourceDocumentInput, createSeedImportRunId, isGb2760StagingRowReviewReady, normalizeReferenceTableName, toImportErrorRow, toImportRunRow, toSourceDocumentRow, type Gb2760Service, type ImportRunListItem } from '../src/services/gb2760Service.js';
import { validateGb2760State } from '../src/services/gb2760ValidateService.js';
import { preserveGb2760ManualReviewState, preserveGb2760ManualReviewStatus, toGb2760OfficialRecordRow, type Gb2760OfficialRecordInput } from '../src/services/ingredientService.js';

const authHeaders = { Authorization: 'Bearer valid-token' };

function createTestApp(service: Gb2760Service, authService = createAuthService(), internalReviewers = ['reviewer@example.test']) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    gb2760InternalReviewers: internalReviewers,
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'aliyun',
    port: 3000
  }, {
    authService,
    gb2760Service: service
  });
}

function createAuthService(user = { id: 'user-1', email: 'reviewer@example.test' }): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUserForToken: vi.fn(async (token: string) => (token === 'valid-token'
      ? { id: user.id, email: user.email, createdAt: new Date('2026-06-14T08:00:00.000Z') }
      : null)),
    deleteAccount: vi.fn()
  };
}

function createImportRun(overrides: Partial<ImportRunListItem> = {}): ImportRunListItem {
  return {
    id: 'import-run-gb2760-fulltext-20260614083000-a1b2c3d4',
    sourceDocumentId: 'source-document-gb-2760-2024-2a2c4a867cf5',
    runType: 'fulltext',
    startedAt: new Date('2026-06-14T08:30:00.000Z'),
    endedAt: new Date('2026-06-14T08:30:02.000Z'),
    totalRows: 264,
    succeededRows: 264,
    failedRows: 0,
    status: 'succeeded',
    note: 'Seed GB 2760 official full-text PDF pages from generated source file',
    sourceDocument: {
      id: 'source-document-gb-2760-2024-2a2c4a867cf5',
      docCode: 'GB 2760-2024',
      title: '食品安全国家标准 食品添加剂使用标准',
      pdfFileName: '1747898473246.pdf',
      pdfSha256: '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de'
    },
    ...overrides
  };
}

function createGb2760Service(overrides: Partial<Gb2760Service> = {}): Gb2760Service {
  return {
    listImportRuns: vi.fn(async (params) => ({
      items: [createImportRun()],
      page: params.page,
      limit: params.limit,
      total: 1,
      totalPages: 1
    })),
    getImportRunErrors: vi.fn(async (id) => (id === 'import-run-gb2760-failed'
      ? {
          importRun: createImportRun({
            id,
            runType: 'a1_staging',
            totalRows: 2404,
            succeededRows: 0,
            failedRows: 2404,
            status: 'failed'
          }),
          items: [{
            id: `${id}-error-001`,
            importRunId: id,
            rowRef: 'a1_staging',
            reason: 'database unavailable',
            rawSourceText: '',
            createdAt: new Date('2026-06-14T08:30:03.000Z')
          }]
        }
      : null)),
    listReferenceRows: vi.fn(async (params) => ({
      items: [{
        id: 'gb2760-2024-b2-natural-flavor-001',
        standardCode: 'GB 2760-2024',
        standardTitle: '食品安全国家标准 食品添加剂使用标准',
        tableName: params.tableName || '表 B.2',
        tableTitle: '允许使用的天然食品用香料名单',
        rowNumber: 1,
        rowCode: 'N001',
        rowName: '八角茴香油',
        rowData: { flavorType: 'natural' },
        pdfPage: 173,
        standardPage: 170,
        rawSourceText: 'GB 2760-2024 表 B.2：N001 八角茴香油。',
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
        reviewStatus: 'pending_review',
        createdAt: new Date('2026-06-14T00:00:00.000Z'),
        syncedAt: new Date('2026-06-14T00:00:00.000Z')
      }],
      page: params.page,
      limit: params.limit,
      total: 1,
      totalPages: 1
    })),
    listStagingRows: vi.fn(async (params) => ({
      items: [{
        ...createStagingRecord({ reviewStatus: params.reviewStatus || 'pending_review' }),
        promotionIssues: []
      }],
      page: params.page,
      limit: params.limit,
      total: 1,
      totalPages: 1,
      statusCounts: [
        { reviewStatus: 'pending_review', count: 2391 },
        { reviewStatus: 'approved', count: 0 },
        { reviewStatus: 'promoted', count: 0 }
      ]
    })),
    updateStagingRowReviewStatus: vi.fn(async (id, reviewStatus) => ({
      ...createStagingRecord({ id, reviewStatus }),
      promotionIssues: []
    })),
    updateStagingRowsReviewStatus: vi.fn(async (ids, reviewStatus) => ({
      requestedCount: ids.length,
      updatedCount: ids.length,
      skippedCount: 0,
      items: ids.map((id: string) => ({
        ...createStagingRecord({ id, reviewStatus }),
        promotionIssues: []
      })),
      errors: []
    })),
    updateStagingRowMapping: vi.fn(async (id, ingredientId, reviewStatus) => ({
      ...createStagingRecord({ id, ingredientId, reviewStatus }),
      promotionIssues: []
    })),
    ...overrides
  };
}

describe('GET /api/gb2760/import-runs', () => {
  it('returns import run audit records with source document evidence', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/import-runs?page=2&limit=5', { headers: authHeaders });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].runType).toBe('fulltext');
    expect(body.items[0].sourceDocument.docCode).toBe('GB 2760-2024');
    expect(body.items[0].sourceDocument.pdfSha256).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
    expect(service.listImportRuns).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  it('rejects invalid pagination', async () => {
    const app = createTestApp(createGb2760Service());

    const response = await app.request('/api/gb2760/import-runs?limit=500', { headers: authHeaders });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'invalid_parameter',
      field: 'limit',
      message: 'limit must be between 1 and 100'
    });
  });

  it('requires auth before exposing import audit records', async () => {
    const app = createTestApp(createGb2760Service());

    const missing = await app.request('/api/gb2760/import-runs');
    const invalid = await app.request('/api/gb2760/import-runs', {
      headers: { Authorization: 'Bearer invalid-token' }
    });

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });
});

describe('GET /api/gb2760/import-runs/:id/errors', () => {
  it('returns import errors for a failed run', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/import-runs/import-run-gb2760-failed/errors', { headers: authHeaders });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.importRun.status).toBe('failed');
    expect(body.items).toEqual([{
      id: 'import-run-gb2760-failed-error-001',
      importRunId: 'import-run-gb2760-failed',
      rowRef: 'a1_staging',
      reason: 'database unavailable',
      rawSourceText: '',
      createdAt: '2026-06-14T08:30:03.000Z'
    }]);
    expect(service.getImportRunErrors).toHaveBeenCalledWith('import-run-gb2760-failed');
  });

  it('returns JSON 404 for unknown import runs', async () => {
    const app = createTestApp(createGb2760Service());

    const response = await app.request('/api/gb2760/import-runs/not-found/errors', { headers: authHeaders });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});

describe('GET /api/gb2760/reference-rows', () => {
  it('returns paginated official reference rows for authenticated reviewers', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/reference-rows?table=B.2&q=%E5%85%AB%E8%A7%92&page=2&limit=10', { headers: authHeaders });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0]).toMatchObject({
      tableName: 'B.2',
      rowName: '八角茴香油',
      reviewStatus: 'pending_review'
    });
    expect(service.listReferenceRows).toHaveBeenCalledWith({
      tableName: 'B.2',
      q: '八角',
      page: 2,
      limit: 10
    });
  });

  it('requires auth and rejects invalid pagination before exposing reference rows', async () => {
    const app = createTestApp(createGb2760Service());

    const missing = await app.request('/api/gb2760/reference-rows');
    const invalidLimit = await app.request('/api/gb2760/reference-rows?limit=500', { headers: authHeaders });

    expect(missing.status).toBe(401);
    expect(invalidLimit.status).toBe(400);
    expect(await invalidLimit.json()).toEqual({
      error: 'invalid_parameter',
      field: 'limit',
      message: 'limit must be between 1 and 100'
    });
  });
});

describe('GET /api/gb2760/staging-rows', () => {
  it('returns paginated official staging rows for authenticated reviewers', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/staging-rows?status=pending_review&q=%E6%9F%A0%E6%AA%AC%E9%85%B8&page=2&limit=10', { headers: authHeaders });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0]).toMatchObject({
      additiveNameCn: '柠檬酸',
      reviewStatus: 'pending_review',
      promotionIssues: []
    });
    expect(body.statusCounts[0]).toEqual({ reviewStatus: 'pending_review', count: 2391 });
    expect(service.listStagingRows).toHaveBeenCalledWith({
      reviewStatus: 'pending_review',
      q: '柠檬酸',
      readyOnly: false,
      page: 2,
      limit: 10
    });
  });

  it('passes ready-only staging review filters to the service', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/staging-rows?ready=1', { headers: authHeaders });

    expect(response.status).toBe(200);
    expect(service.listStagingRows).toHaveBeenCalledWith({
      reviewStatus: undefined,
      q: undefined,
      readyOnly: true,
      page: 1,
      limit: 20
    });
  });

  it('does not treat locked staging rows as ready for review', () => {
    expect(isGb2760StagingRowReviewReady({
      reviewStatus: 'pending_review',
      promotionIssues: []
    })).toBe(true);
    expect(isGb2760StagingRowReviewReady({
      reviewStatus: 'promoted',
      promotionIssues: []
    })).toBe(false);
    expect(isGb2760StagingRowReviewReady({
      reviewStatus: 'verified',
      promotionIssues: []
    })).toBe(false);
  });

  it('requires auth and rejects invalid staging status filters', async () => {
    const app = createTestApp(createGb2760Service());

    const missing = await app.request('/api/gb2760/staging-rows');
    const invalidStatus = await app.request('/api/gb2760/staging-rows?status=done', { headers: authHeaders });

    expect(missing.status).toBe(401);
    expect(invalidStatus.status).toBe(400);
    expect(await invalidStatus.json()).toEqual({
      error: 'invalid_parameter',
      field: 'status',
      message: 'status must be one of pending_review, mapped_candidate, approved, promoted, verified'
    });
  });
});

describe('PUT /api/gb2760/staging-rows/:id/review', () => {
  it('updates staging review status for authenticated reviewers', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/staging-rows/gb2760-2024-a1-citric-acid-general/review', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewStatus: 'approved', reviewNote: 'checked against official PDF row' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe('approved');
    expect(service.updateStagingRowReviewStatus).toHaveBeenCalledWith(
      'gb2760-2024-a1-citric-acid-general',
      'approved',
      expect.objectContaining({
        reviewedBy: 'reviewer@example.test',
        reviewedByUserId: 'user-1',
        reviewNote: 'checked against official PDF row'
      })
    );
  });

  it('forbids normal signed-in users from updating staging review status', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service, createAuthService({
      id: 'user-2',
      email: 'normal@example.test'
    }));

    const response = await app.request('/api/gb2760/staging-rows/gb2760-2024-a1-citric-acid-general/review', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewStatus: 'approved' })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'forbidden',
      message: 'GB 2760 review writes require an internal reviewer account'
    });
    expect(service.updateStagingRowReviewStatus).not.toHaveBeenCalled();
  });

  it('rejects unsupported review status updates', async () => {
    const app = createTestApp(createGb2760Service());

    const response = await app.request('/api/gb2760/staging-rows/gb2760-2024-a1-citric-acid-general/review', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewStatus: 'promoted' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'reviewStatus',
      message: 'reviewStatus must be one of pending_review, mapped_candidate, approved'
    });
  });
});

describe('PUT /api/gb2760/staging-rows/:id/mapping', () => {
  it('maps a staging row to an ingredient and signs it for authenticated reviewers', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/staging-rows/gb2760-2024-a1-citric-acid-general/mapping', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ingredientId: 'citric-acid', reviewStatus: 'approved' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ingredientId).toBe('citric-acid');
    expect(body.reviewStatus).toBe('approved');
    expect(service.updateStagingRowMapping).toHaveBeenCalledWith(
      'gb2760-2024-a1-citric-acid-general',
      'citric-acid',
      'approved',
      expect.objectContaining({
        reviewedBy: 'reviewer@example.test',
        reviewedByUserId: 'user-1'
      })
    );
  });

  it('rejects mapping without an ingredient id', async () => {
    const app = createTestApp(createGb2760Service());

    const response = await app.request('/api/gb2760/staging-rows/gb2760-2024-a1-citric-acid-general/mapping', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewStatus: 'mapped_candidate' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'ingredientId',
      message: 'ingredientId is required'
    });
  });
});

describe('PUT /api/gb2760/staging-rows/review', () => {
  it('updates multiple staging review statuses for authenticated reviewers', async () => {
    const service = createGb2760Service();
    const app = createTestApp(service);

    const response = await app.request('/api/gb2760/staging-rows/review', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: [
          'gb2760-2024-a1-citric-acid-general',
          'gb2760-2024-a1-sodium-benzoate-jam'
        ],
        reviewStatus: 'approved'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updatedCount).toBe(2);
    expect(body.skippedCount).toBe(0);
    expect(service.updateStagingRowsReviewStatus).toHaveBeenCalledWith([
      'gb2760-2024-a1-citric-acid-general',
      'gb2760-2024-a1-sodium-benzoate-jam'
    ], 'approved', expect.objectContaining({
      reviewedBy: 'reviewer@example.test',
      reviewedByUserId: 'user-1'
    }));
  });

  it('rejects empty batch review ids', async () => {
    const app = createTestApp(createGb2760Service());

    const response = await app.request('/api/gb2760/staging-rows/review', {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: [], reviewStatus: 'approved' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'ids',
      message: 'ids must include at least one staging row id'
    });
  });
});

describe('GB 2760 import audit mappers', () => {
  it('normalizes compact GB 2760 reference table names for DB lookups', () => {
    expect(normalizeReferenceTableName('B.2')).toBe('表 B.2');
    expect(normalizeReferenceTableName('表 C.1')).toBe('表 C.1');
    expect(normalizeReferenceTableName('附录F')).toBe('附录 F');
  });

  it('maps official source metadata into source_documents rows', () => {
    const input = createGb2760SourceDocumentInput({
      standardCode: 'GB 2760-2024',
      standardTitle: '食品安全国家标准 食品添加剂使用标准',
      factName: '1747898473246.pdf',
      pdfSha256: '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de',
      platformRecordId: '6CA1489A-9570-4906-8CE8-CC86FBFB1941',
      fileGuid: '43C9B75E-3D84-4577-80FC-0F7D77D36407',
      publishedAt: '2024-02-08',
      effectiveDate: '2025-02-08',
      downloadEndpoint: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo'
    });
    const row = toSourceDocumentRow(input);

    expect(row.id).toBe('source-document-gb-2760-2024-2a2c4a867cf5');
    expect(row.docCode).toBe('GB 2760-2024');
    expect(row.attachmentId).toBe('43C9B75E-3D84-4577-80FC-0F7D77D36407');
    expect(row.pdfSha256).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
  });

  it('maps import runs and errors without losing batch counts or raw source text', () => {
    const run = toImportRunRow({
      id: 'import-run-gb2760-reference-tables-20260614083000-a1b2c3d4',
      sourceDocumentId: 'source-document-gb-2760-2024-2a2c4a867cf5',
      runType: 'reference_tables',
      startedAt: new Date('2026-06-14T08:30:00.000Z'),
      endedAt: new Date('2026-06-14T08:30:10.000Z'),
      totalRows: 2800,
      succeededRows: 2799,
      failedRows: 1,
      status: 'failed',
      note: 'reference table seed'
    });
    const error = toImportErrorRow({
      id: 'import-run-gb2760-reference-tables-20260614083000-a1b2c3d4-error-001',
      importRunId: run.id,
      rowRef: '表 C.3:33',
      reason: 'compact latin source text',
      rawSourceText: 'Pseudomonasfluorescens'
    });

    expect(run.totalRows).toBe(2800);
    expect(run.succeededRows).toBe(2799);
    expect(run.failedRows).toBe(1);
    expect(run.status).toBe('failed');
    expect(error.rowRef).toBe('表 C.3:33');
    expect(error.rawSourceText).toBe('Pseudomonasfluorescens');
  });

  it('uses a stable seed import run id so repeated db:seed refreshes upsert audit rows', () => {
    expect(createSeedImportRunId('source-document-gb-2760-2024-2a2c4a867cf5', 'a1_staging'))
      .toBe('import-run-source-document-gb-2760-2024-2a2c4a867cf5-a1-staging');
  });

  it('preserves manual GB 2760 review statuses when seed data is refreshed', () => {
    const incoming = createStagingRecord({ reviewStatus: 'pending_review' });

    expect(preserveGb2760ManualReviewStatus(incoming, createStagingRecord({ reviewStatus: 'mapped_candidate' }))).toBe('mapped_candidate');
    expect(preserveGb2760ManualReviewStatus(incoming, createStagingRecord({ reviewStatus: 'approved' }))).toBe('approved');
    expect(preserveGb2760ManualReviewStatus(incoming, createStagingRecord({ reviewStatus: 'promoted' }))).toBe('promoted');
    expect(preserveGb2760ManualReviewStatus(createStagingRecord({ reviewStatus: 'needs_review' }), createStagingRecord({ reviewStatus: 'verified' }))).toBe('pending_review');
    expect(preserveGb2760ManualReviewStatus(createStagingRecord({ reviewStatus: 'verified' }), createStagingRecord({ reviewStatus: 'pending_review' }))).toBe('verified');
  });

  it('preserves manually reviewed GB 2760 ingredient mappings when seed data is refreshed', () => {
    const incoming = createStagingRecord({
      ingredientId: null,
      reviewStatus: 'pending_review'
    });
    const approvedExisting = createStagingRecord({
      ingredientId: 'citric-acid-reviewed',
      reviewStatus: 'approved'
    });

    const preserved = preserveGb2760ManualReviewState(incoming, approvedExisting);

    expect(preserved.reviewStatus).toBe('approved');
    expect(preserved.ingredientId).toBe('citric-acid-reviewed');
    expect(preserved.reviewedBy).toBe('reviewer@example.test');
    expect(preserved.reviewedByUserId).toBe('user-1');
    expect(preserved.reviewNote).toBe('GB 2760 official row verified');
  });

  it('adds legacy review audit fields for source-verified GB 2760 rows on fresh seeds', () => {
    const row = toGb2760OfficialRecordRow(createStagingRecordInput({
      reviewStatus: 'verified',
      reviewedBy: undefined,
      reviewedByUserId: undefined,
      reviewedAt: undefined,
      reviewNote: ''
    }));

    expect(row.reviewStatus).toBe('verified');
    expect(row.reviewedBy).toBe('legacy-gb2760-seed');
    expect(row.reviewedByUserId).toBe('legacy-gb2760-seed');
    expect(row.reviewedAt?.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    expect(row.reviewNote).toContain('Legacy verified GB 2760 seed row');
  });

  it('requires re-review when preserved manual GB 2760 rows get changed source content', () => {
    const incoming = createStagingRecord({
      reviewStatus: 'pending_review',
      maxUseLevel: '1.0',
      rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸 citric acid；限量 1.0 g/kg。'
    });
    const approvedExisting = createStagingRecord({ reviewStatus: 'approved' });

    expect(preserveGb2760ManualReviewStatus(incoming, approvedExisting)).toBe('pending_review');
  });

  it('preserves manual GB 2760 review statuses across metadata-only retrieval refreshes', () => {
    const incoming = createStagingRecord({
      reviewStatus: 'pending_review',
      retrievedAt: '2026-06-14'
    });
    const approvedExisting = createStagingRecord({
      reviewStatus: 'approved',
      retrievedAt: '2026-06-12'
    });

    expect(preserveGb2760ManualReviewStatus(incoming, approvedExisting)).toBe('approved');
  });
});

describe('GB 2760 promote helpers', () => {
  it('requires explicit manual approval before promotion', () => {
    expect(isApprovedForPromotion(createStagingRecord({ reviewStatus: 'pending_review' }))).toBe(false);
    expect(isApprovedForPromotion(createStagingRecord({ reviewStatus: 'verified' }))).toBe(false);
    expect(isApprovedForPromotion(createStagingRecord({ reviewStatus: 'approved' }))).toBe(true);
    expect(isApprovedForPromotion(createStagingRecord({ reviewStatus: 'promoted' }))).toBe(true);
    expect(isPromotedForReconciliation(createStagingRecord({ reviewStatus: 'approved' }))).toBe(false);
    expect(isPromotedForReconciliation(createStagingRecord({ reviewStatus: 'promoted' }))).toBe(true);
  });

  it('marks existing formal rules stale when staging rows are no longer approved', () => {
    const approved = createStagingRecord({
      id: 'gb2760-2024-a1-citric-acid-general',
      reviewStatus: 'approved'
    });
    const demoted = createStagingRecord({
      id: 'gb2760-2024-a1-sodium-benzoate-jam',
      ingredientId: 'sodium-benzoate',
      reviewStatus: 'pending_review'
    });

    expect(getStaleFormalRuleSourceIds([
      createUsageRule({ sourceStagingId: approved.id }),
      createUsageRule({ sourceStagingId: demoted.id })
    ], [approved.id])).toEqual([demoted.id]);
  });

  it('keeps stale formal rule owners affected so deleted sources can demote ingredients', () => {
    const affectedIds = getAffectedPromotionIngredientIds(
      [],
      [createUsageRule({
        sourceStagingId: 'gb2760-2024-a1-deleted-source',
        ingredientId: 'sodium-benzoate'
      })],
      [],
      ['gb2760-2024-a1-deleted-source']
    );

    expect(Array.from(affectedIds)).toEqual(['sodium-benzoate']);
  });

  it('keeps previous rule owners affected when promoted rows are remapped', () => {
    const remappedSource = createStagingRecord({
      id: 'gb2760-2024-a1-remapped-source',
      ingredientId: 'citric-acid'
    });
    const affectedIds = getAffectedPromotionIngredientIds(
      [remappedSource],
      [createUsageRule({
        sourceStagingId: remappedSource.id,
        ingredientId: 'sodium-benzoate'
      })],
      [toAdditiveUsageRuleRow(remappedSource)],
      []
    );

    expect(Array.from(affectedIds).sort()).toEqual(['citric-acid', 'sodium-benzoate']);
  });

  it('requires all staging rows for an ingredient before exposing promotion on the ingredient summary', () => {
    const approved = createStagingRecord({ id: 'gb2760-2024-a1-citric-acid-general', reviewStatus: 'approved' });
    const pending = createStagingRecord({
      id: 'gb2760-2024-a1-citric-acid-candy',
      ingredientId: null,
      reviewStatus: 'pending_review',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果'
    });
    const rowsByIngredient = new Map([['citric-acid', [approved]]]);
    const rowsByAdditiveIdentity = new Map([[getGb2760AdditiveIdentityKey(approved), [approved, pending]]]);

    expect(hasFullPromotionCoverage('citric-acid', [approved], rowsByIngredient, rowsByAdditiveIdentity, new Set([approved.id]))).toBe(false);
    expect(hasFullPromotionCoverage('citric-acid', [approved], rowsByIngredient, rowsByAdditiveIdentity, new Set([approved.id, pending.id]))).toBe(true);
  });

  it('maps approved staging rows to additive usage rules without rewriting source limits', () => {
    const rule = toAdditiveUsageRuleRow(createStagingRecord({
      maxUseLevel: '按生产需要适量使用',
      unit: '',
      note: '以即饮状态计'
    }));

    expect(rule.ingredientId).toBe('citric-acid');
    expect(rule.maxUseLevel).toBe('按生产需要适量使用');
    expect(rule.unit).toBe('');
    expect(rule.note).toBe('以即饮状态计');
    expect(rule.sourceStagingId).toBe('gb2760-2024-a1-citric-acid-general');
    expect(rule.sourcePage).toBe(89);
    expect(rule.sourceTable).toBe('表 A.1');
    expect(rule.sourceHash).toBe('2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de');
    expect(rule.dataStatus).toBe('verified_regulation');
  });

  it('reports missing fields instead of promoting incomplete approved rows', () => {
    const errors = validatePromotionCandidate(createStagingRecord({
      ingredientId: null,
      foodCategoryCode: '',
      rawSourceText: ''
    }));

    expect(errors).toContain('missing ingredientId');
    expect(errors).toContain('missing foodCategoryCode');
    expect(errors).toContain('missing rawSourceText');
  });

  it('reports stale ingredient IDs before inserting formal usage rules', () => {
    const errors = validatePromotionCandidate(
      createStagingRecord({ ingredientId: 'stale-ingredient-id' }),
      new Set(['citric-acid'])
    );

    expect(errors).toContain('ingredientId stale-ingredient-id does not exist');
  });

  it('promotes ingredient source fields when approved rows become formal rules', () => {
    const patch = toPromotedIngredientPatch(
      createIngredientRow({
        gbCode: 'INS 211',
        gbStatus: 'restricted',
        dataStatus: 'verified_jecfa',
        sourceScope: 'jecfa_safety_evaluation',
        sourceNote: 'JECFA safety evaluation base row',
        isVerified: false,
        usageLimits: [{ foodCategory: ' seed example category ', limit: 'seed example limit', note: 'seed example note' }],
        foodCategories: ['seed example category'],
        rawSourceText: 'seed example raw source text'
      }),
      [createStagingRecord({
        reviewStatus: 'approved',
        cnsNumber: '17.001',
        insNumber: '211',
        foodCategoryCode: '05.02',
        foodCategoryName: '糖果',
        maxUseLevel: '1.0',
        unit: 'g/kg',
        note: '以柠檬酸计'
      })],
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(patch.dataStatus).toBe('verified_regulation');
    expect(patch.reviewStatus).toBe('verified');
    expect(patch.isVerified).toBe(true);
    expect(patch.sourceScope).toBe('gb_2760_regulation');
    expect(patch.effectiveDate).toBe('2025-02-08');
    expect(patch.confidenceLevel).toBe('high');
    expect(patch.matchConfidence).toBe('high');
    expect(patch.sourceNote).toBe('JECFA safety evaluation base row');
    expect(patch.gb2760PromotionBaseState).toMatchObject({
      dataStatus: 'verified_jecfa',
      sourceScope: 'jecfa_safety_evaluation',
      sourceNote: 'JECFA safety evaluation base row',
      rawSourceText: 'seed example raw source text',
      usageLimits: [{ foodCategory: ' seed example category ', limit: 'seed example limit', note: 'seed example note' }],
      foodCategories: ['seed example category']
    });
    expect(patch.reviewNote).toContain('GB 2760-2024 官方 PDF 表 A.1');
    expect(patch.regulatoryBasis).toBe('GB 2760-2024 表 A.1');
    expect(patch.gbCode).toBe('INS 211');
    expect(patch.gbStatus).toBe('restricted');
    expect(patch.usageLimits).toEqual([{
      foodCategory: '05.02 糖果',
      limit: '1.0 g/kg',
      note: 'GB 2760-2024 表 A.1；PDF page 89；标准页 68；以柠檬酸计'
    }]);
    expect(patch.foodCategories).toEqual(['05.02 糖果']);
    expect(patch.rawSourceText).toContain('GB 2760-2024 表 A.1：柠檬酸 citric acid');
    expect(patch.rawSourceText).not.toContain('seed example raw source text');
  });

  it('marks promotion-only ingredients so later demotion can clear generated evidence', () => {
    const patch = toPromotedIngredientPatch(
      createIngredientRow({
        dataStatus: 'mapped_candidate',
        sourceScope: 'candidate_mapping',
        sourceNote: 'OCR candidate row awaiting source review',
        gbCode: '',
        gbStatus: 'unknown'
      }),
      [createStagingRecord({
        reviewStatus: 'approved',
        cnsNumber: '17.001',
        insNumber: '211',
        foodCategoryCode: '05.02',
        foodCategoryName: '糖果',
        maxUseLevel: '1.0',
        unit: 'g/kg'
      })],
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(patch.sourceNote).toBe('GB 2760-2024 official usage rules promoted from manually approved staging rows.');
    expect(patch.gb2760PromotionBaseState).toBeNull();
  });

  it('keeps partial formal rules out of the ingredient-level verified summary', () => {
    const baseIngredient = createIngredientRow({
      dataStatus: 'verified_jecfa',
      sourceScope: 'jecfa_safety_evaluation',
      sourceName: 'JECFA database',
      sourceType: 'public_database',
      sourceVersion: 'JECFA 101',
      sourceUrl: 'https://example.test/jecfa',
      sourceNote: 'JECFA safety evaluation base row',
      sourceReferences: [{ title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' }],
      regulatoryBasis: 'JECFA safety evaluation',
      rawSourceText: 'JECFA raw source text',
      usageLimits: [],
      foodCategories: [],
      gbCode: 'INS 211',
      gbStatus: 'unknown',
      isVerified: false
    });
    const sourceRow = createStagingRecord({
      reviewStatus: 'approved',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '1.0',
      unit: 'g/kg'
    });
    const promotedPatch = toPromotedIngredientPatch(
      baseIngredient,
      [sourceRow],
      new Date('2026-06-14T07:00:00.000Z')
    );
    const partialPatch = toPartiallyPromotedIngredientPatch(
      { ...baseIngredient, ...promotedPatch },
      [sourceRow],
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(partialPatch.dataStatus).toBe('verified_jecfa');
    expect(partialPatch.sourceScope).toBe('jecfa_safety_evaluation');
    expect(partialPatch.rawSourceText).toBe('JECFA raw source text');
    expect(partialPatch.usageLimits).toEqual([]);
    expect(partialPatch.foodCategories).toEqual([]);
    expect(partialPatch.gb2760PromotionBaseState).toBeNull();
    expect(partialPatch.changeNote).toContain('partial formal usage rule');
  });

  it('derives GB/INS metadata only when existing ingredient fields are empty or unknown', () => {
    const patch = toPromotedIngredientPatch(
      createIngredientRow({
        gbCode: '',
        gbStatus: 'unknown'
      }),
      [createStagingRecord({
        reviewStatus: 'approved',
        cnsNumber: '17.001',
        insNumber: '210, 211',
        foodCategoryCode: '05.02',
        foodCategoryName: '糖果',
        maxUseLevel: '1.0',
        unit: 'g/kg'
      })],
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(patch.gbCode).toBe('INS 210, 211');
    expect(patch.gbStatus).toBe('restricted');
  });

  it('recomputes GB status from promoted rows instead of preserving seed status', () => {
    const restrictedPatch = toPromotedIngredientPatch(
      createIngredientRow({
        id: 'ascorbic-acid',
        gbStatus: 'permitted'
      }),
      [createStagingRecord({
        id: 'gb2760-2024-a1-ascorbic-acid-canned-fruit',
        ingredientId: 'ascorbic-acid',
        additiveNameCn: '抗坏血酸',
        additiveNameEn: 'ascorbic acid',
        foodCategoryCode: '04.01.01.03',
        foodCategoryName: '水果罐头',
        maxUseLevel: '5.0',
        unit: 'g/kg',
        note: ''
      })],
      new Date('2026-06-14T08:00:00.000Z')
    );
    const permittedPatch = toPromotedIngredientPatch(
      createIngredientRow({
        gbStatus: 'restricted'
      }),
      [createStagingRecord({
        foodCategoryCode: '—',
        foodCategoryName: '各类食品',
        maxUseLevel: '按生产需要适量使用',
        unit: '',
        note: ''
      })],
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(restrictedPatch.gbStatus).toBe('restricted');
    expect(permittedPatch.gbStatus).toBe('permitted');
  });

  it('restores saved base provenance when removing stale formal rules', () => {
    const baseIngredient = createIngredientRow({
        dataStatus: 'verified_jecfa',
        sourceScope: 'jecfa_safety_evaluation',
        sourceName: 'JECFA database',
        sourceType: 'public_database',
        sourceVersion: 'JECFA 101',
        sourceUrl: 'https://example.test/jecfa',
        sourceNote: 'JECFA safety evaluation base row',
        sourceReferences: [{ title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' }],
        regulatoryBasis: 'JECFA safety evaluation',
        rawSourceText: 'JECFA raw source text',
        usageLimits: [],
        foodCategories: [],
        gbCode: 'INS 211',
        gbStatus: 'unknown'
    });
    const promotedPatch = toPromotedIngredientPatch(
      baseIngredient,
      [createStagingRecord({
        reviewStatus: 'approved',
        foodCategoryCode: '05.02',
        foodCategoryName: '糖果',
        maxUseLevel: '1.0',
        unit: 'g/kg'
      })],
      new Date('2026-06-14T07:00:00.000Z')
    );
    const patch = toDemotedIngredientPatch(
      { ...baseIngredient, ...promotedPatch },
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(patch.dataStatus).toBe('verified_jecfa');
    expect(patch.sourceScope).toBe('jecfa_safety_evaluation');
    expect(patch.sourceName).toBe('JECFA database');
    expect(patch.sourceReferences).toEqual([{ title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' }]);
    expect(patch.rawSourceText).toBe('JECFA raw source text');
    expect(patch.usageLimits).toEqual([]);
    expect(patch.foodCategories).toEqual([]);
    expect(patch.gbCode).toBe('INS 211');
    expect(patch.gbStatus).toBe('unknown');
    expect(patch.gb2760PromotionBaseState).toBeNull();
    expect(patch.changeNote).toBe('GB 2760 promote removed stale formal usage rules');
  });

  it('clears promotion-generated GB 2760 evidence when an ingredient no longer has formal rules', () => {
    const patch = toDemotedIngredientPatch(
      createIngredientRow({
        reviewedBy: 'gb2760-promote',
        sourceNote: 'GB 2760-2024 official usage rules promoted from manually approved staging rows.',
        sourceReferences: [
          { title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' },
          { title: '食品安全国家标准 食品添加剂使用标准', standard: 'GB 2760-2024', region: 'CN', url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch' }
        ]
      }),
      new Date('2026-06-14T08:00:00.000Z')
    );

    expect(patch.dataStatus).toBe('unverified');
    expect(patch.reviewStatus).toBe('reviewed');
    expect(patch.isVerified).toBe(false);
    expect(patch.sourceScope).toBe('unknown');
    expect(patch.gbCode).toBe('');
    expect(patch.gbStatus).toBe('unknown');
    expect(patch.usageLimits).toEqual([]);
    expect(patch.foodCategories).toEqual([]);
    expect(patch.sourceReferences).toEqual([
      { title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' }
    ]);
    expect(patch.gb2760PromotionBaseState).toBeNull();
    expect(patch.reviewNote).toContain('没有可保留的基础来源状态');
  });
});

describe('GB 2760 validation helpers', () => {
  it('passes the empty-signoff DB state without treating legacy verified rows as new formal rules', () => {
    const report = validateGb2760State({
      stagingRows: [
        createStagingRecord({ id: 'gb2760-2024-a1-citric-acid-general', reviewStatus: 'verified' }),
        createStagingRecord({ id: 'gb2760-2024-a1-sodium-benzoate-jam', reviewStatus: 'pending_review', ingredientId: 'sodium-benzoate' })
      ],
      usageRules: [],
      ingredientRows: [createIngredientRow({ id: 'citric-acid', dataStatus: 'verified_regulation' })],
      importRunRows: createSeedImportRuns()
    });

    expect(report.legacyVerifiedRows).toBe(1);
    expect(report.pendingReviewRows).toBe(1);
    expect(report.additiveUsageRules).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('rejects reviewed staging rows without reviewer audit metadata', () => {
    const report = validateGb2760State({
      stagingRows: [
        createStagingRecord({
          reviewStatus: 'approved',
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: ''
        })
      ],
      usageRules: [],
      ingredientRows: [createIngredientRow()],
      importRunRows: createSeedImportRuns()
    });

    expect(report.issues.map((issue) => issue.code)).toContain('missing_staging_review_audit');
  });

  it('rejects pending review ingredients marked as verified', () => {
    const report = validateGb2760State({
      stagingRows: [createStagingRecord({ reviewStatus: 'pending_review' })],
      usageRules: [],
      ingredientRows: [
        createIngredientRow({
          dataStatus: 'pending_review',
          sourceScope: 'seed_reference',
          isVerified: true
        })
      ],
      importRunRows: createSeedImportRuns()
    });

    expect(report.issues).toContainEqual({
      code: 'unverified_marked_verified',
      ref: 'citric-acid',
      message: 'pending_review rows must not set isVerified true'
    });
  });

  it('rejects migrated but unseeded GB 2760 databases', () => {
    const report = validateGb2760State({
      stagingRows: [],
      usageRules: [],
      ingredientRows: []
    });

    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'missing_gb2760_staging_rows',
      'missing_seed_import_run'
    ]));
  });

  it('rejects formal usage rules sourced from non-promoted staging rows', () => {
    const source = createStagingRecord({ reviewStatus: 'pending_review' });
    const approvedSource = createStagingRecord({
      id: 'gb2760-2024-a1-citric-acid-candy',
      reviewStatus: 'approved',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果'
    });
    const rule = createUsageRule({ sourceStagingId: source.id });
    const approvedRule = createUsageRule({
      id: 'additive-usage-rule-citric-acid-candy',
      sourceStagingId: approvedSource.id,
      foodCategoryCode: approvedSource.foodCategoryCode,
      foodCategoryName: approvedSource.foodCategoryName
    });
    const report = validateGb2760State({
      stagingRows: [source, approvedSource],
      usageRules: [rule, approvedRule],
      ingredientRows: [createIngredientRow()]
    });

    expect(report.issues.filter((issue) => issue.code === 'usage_rule_source_not_promoted')).toHaveLength(2);
  });

  it('rejects formal usage rules whose staging source disappeared from a refreshed snapshot', () => {
    const report = validateGb2760State({
      stagingRows: [],
      usageRules: [createUsageRule()],
      ingredientRows: [createIngredientRow()]
    });

    expect(report.issues.map((issue) => issue.code)).toContain('missing_usage_rule_source');
  });

  it('rejects formal usage rules whose ingredient row no longer exposes GB 2760 evidence', () => {
    const source = createStagingRecord({ reviewStatus: 'promoted' });
    const rule = createUsageRule({ sourceStagingId: source.id });
    const report = validateGb2760State({
      stagingRows: [source],
      usageRules: [rule],
      ingredientRows: [createIngredientRow({
        dataStatus: 'unverified',
        sourceScope: 'seed_sample',
        isVerified: false,
        usageLimits: [],
        rawSourceText: 'seed row without formal GB 2760 evidence'
      })]
    });

    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'usage_rule_ingredient_not_verified_regulation',
      'usage_rule_ingredient_wrong_scope',
      'usage_rule_ingredient_not_verified',
      'usage_rule_missing_ingredient_usage_limit'
    ]));
  });

  it('allows partial formal usage rules to stay out of the ingredient summary until remaining staging rows are reviewed', () => {
    const promotedSource = createStagingRecord({ reviewStatus: 'promoted' });
    const pendingSource = createStagingRecord({
      id: 'gb2760-2024-a1-citric-acid-candy',
      ingredientId: null,
      reviewStatus: 'pending_review',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果'
    });
    const rule = createUsageRule({ sourceStagingId: promotedSource.id });
    const report = validateGb2760State({
      stagingRows: [promotedSource, pendingSource],
      usageRules: [rule],
      ingredientRows: [createIngredientRow({
        dataStatus: 'verified_jecfa',
        sourceScope: 'jecfa_safety_evaluation',
        sourceName: 'JECFA database',
        sourceType: 'public_database',
        sourceVersion: 'JECFA 101',
        sourceUrl: 'https://example.test/jecfa',
        sourceNote: 'JECFA safety evaluation base row',
        sourceReferences: [{ title: 'JECFA', standard: 'JECFA', region: 'INT', url: 'https://example.test/jecfa' }],
        regulatoryBasis: 'JECFA safety evaluation',
        rawSourceText: 'JECFA raw source text',
        usageLimits: [],
        foodCategories: [],
        isVerified: false
      })],
      importRunRows: createSeedImportRuns()
    });

    expect(report.issues).toEqual([]);
  });

  it('rejects formal usage rule ingredients missing GB 2760 provenance date or review note', () => {
    const source = createStagingRecord({ reviewStatus: 'promoted' });
    const rule = createUsageRule({ sourceStagingId: source.id });
    const report = validateGb2760State({
      stagingRows: [source],
      usageRules: [rule],
      ingredientRows: [createIngredientRow({
        effectiveDate: '',
        reviewNote: ''
      })]
    });

    expect(report.issues.map((issue) => issue.code)).toContain('usage_rule_ingredient_missing_source_field');
  });

  it('rejects formal usage rule ingredients with missing GB 2760 usage-limit note', () => {
    const source = createStagingRecord({
      reviewStatus: 'promoted',
      foodCategoryCode: '05.02',
      foodCategoryName: '糖果',
      maxUseLevel: '1.0',
      unit: 'g/kg',
      note: '以柠檬酸计'
    });
    const rule = createUsageRule({
      sourceStagingId: source.id,
      foodCategoryCode: source.foodCategoryCode,
      foodCategoryName: source.foodCategoryName,
      maxUseLevel: source.maxUseLevel,
      unit: source.unit,
      note: source.note
    });
    const report = validateGb2760State({
      stagingRows: [source],
      usageRules: [rule],
      ingredientRows: [createIngredientRow({
        usageLimits: [{
          foodCategory: '05.02 糖果',
          limit: '1.0 g/kg'
        }],
        foodCategories: ['05.02 糖果']
      })]
    });

    expect(report.issues.map((issue) => issue.code)).toContain('usage_rule_missing_ingredient_usage_limit');
  });

  it('rejects rewritten max use levels from formal usage rules', () => {
    const source = createStagingRecord({
      reviewStatus: 'promoted',
      maxUseLevel: '按生产需要适量使用',
      unit: ''
    });
    const rule = createUsageRule({
      sourceStagingId: source.id,
      maxUseLevel: '0.0',
      unit: 'g/kg'
    });
    const report = validateGb2760State({
      stagingRows: [source],
      usageRules: [rule],
      ingredientRows: [createIngredientRow()]
    });

    expect(report.issues.map((issue) => issue.code)).toContain('usage_rule_field_rewritten');
    expect(report.issues.map((issue) => issue.code)).toContain('quantum_satis_rewritten');
  });

  it('rejects JECFA-only rows carrying GB 2760 usage limits', () => {
    const report = validateGb2760State({
      stagingRows: [],
      usageRules: [],
      ingredientRows: [createIngredientRow({
        id: 'potassium-sorbate',
        dataStatus: 'verified_jecfa',
        sourceScope: 'jecfa_safety_evaluation',
        isVerified: false,
        usageLimits: [{ foodCategory: '果酱', limit: '1.0 g/kg' }]
      })]
    });

    expect(report.issues.map((issue) => issue.code)).toContain('jecfa_usage_limits_present');
  });
});

function createStagingRecord(overrides: Partial<Gb2760OfficialRecordRow> = {}): Gb2760OfficialRecordRow {
  return {
    id: 'gb2760-2024-a1-citric-acid-general',
    ingredientId: 'citric-acid',
    standardCode: 'GB 2760-2024',
    standardTitle: '食品安全国家标准 食品添加剂使用标准',
    tableName: '表 A.1',
    additiveNameCn: '柠檬酸',
    additiveNameEn: 'citric acid',
    cnsNumber: '01.101',
    insNumber: '330',
    functionText: '酸度调节剂、抗氧化剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~15、17~53、59~62、64~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 89,
    standardPage: 68,
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸 citric acid；CNS号 01.101；INS号 330；功能 酸度调节剂、抗氧化剂；各类食品按生产需要适量使用。',
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
    extractionStatus: 'verified',
    reviewStatus: 'approved',
    reviewedBy: 'reviewer@example.test',
    reviewedByUserId: 'user-1',
    reviewedAt: new Date('2026-06-14T08:00:00.000Z'),
    reviewNote: 'GB 2760 official row verified',
    createdAt: new Date('2026-06-14T00:00:00.000Z'),
    syncedAt: new Date('2026-06-14T00:00:00.000Z'),
    ...overrides
  };
}

function createStagingRecordInput(overrides: Partial<Gb2760OfficialRecordRow> = {}): Gb2760OfficialRecordInput {
  const row = createStagingRecord(overrides);
  return {
    id: row.id,
    ingredientId: row.ingredientId ?? undefined,
    standardCode: row.standardCode,
    standardTitle: row.standardTitle,
    tableName: row.tableName,
    additiveNameCn: row.additiveNameCn,
    additiveNameEn: row.additiveNameEn ?? undefined,
    cnsNumber: row.cnsNumber ?? undefined,
    insNumber: row.insNumber ?? undefined,
    functionText: row.functionText,
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName,
    maxUseLevel: row.maxUseLevel,
    unit: row.unit,
    note: row.note,
    pdfPage: row.pdfPage,
    standardPage: row.standardPage,
    rawSourceText: row.rawSourceText,
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    downloadEndpoint: row.downloadEndpoint,
    platformRecordId: row.platformRecordId,
    announcementRecordId: row.announcementRecordId,
    fileGuid: row.fileGuid,
    factName: row.factName,
    pdfSha256: row.pdfSha256,
    retrievedAt: row.retrievedAt,
    extractionStatus: row.extractionStatus,
    reviewStatus: row.reviewStatus
  };
}

function createUsageRule(overrides: Partial<AdditiveUsageRuleRow> = {}): AdditiveUsageRuleRow {
  return {
    id: 'additive-usage-rule-citric-acid-general',
    ingredientId: 'citric-acid',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品，表 A.2 中编号为 1~15、17~53、59~62、64~68 的食品类别除外',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    functionText: '酸度调节剂、抗氧化剂',
    note: '',
    sourceStagingId: 'gb2760-2024-a1-citric-acid-general',
    sourcePage: 89,
    sourceTable: '表 A.1',
    sourceHash: '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de',
    dataStatus: 'verified_regulation',
    createdAt: new Date('2026-06-14T00:00:00.000Z'),
    ...overrides
  };
}

function createIngredientRow(overrides: Partial<IngredientRow> = {}): IngredientRow {
  return {
    id: 'citric-acid',
    kind: 'food-additive',
    dataCategory: 'food',
    nameCn: '柠檬酸',
    nameEn: 'citric acid',
    aliases: [],
    category: '酸度调节剂',
    functions: ['酸度调节剂', '抗氧化剂'],
    description: '食品添加剂。',
    riskLevel: 'low',
    riskSummary: '',
    suitableFor: [],
    cautionFor: [],
    sourceNote: 'GB 2760-2024',
    sourceReferences: [],
    reviewStatus: 'verified',
    dataStatus: 'verified_regulation',
    dataVersion: 'food-authority-foundation-v1',
    reviewedBy: 'system',
    reviewedAt: new Date('2026-06-14T00:00:00.000Z'),
    changeNote: 'seed import',
    updatedAt: '2026-06-14',
    sourceName: '国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台',
    sourceType: 'official_standard',
    sourceScope: 'gb_2760_regulation',
    sourceVersion: 'GB 2760-2024',
    sourceUrl: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    effectiveDate: '2025-02-08',
    confidenceLevel: 'high',
    matchConfidence: 'high',
    lastReviewedAt: '2026-06-14',
    reviewNote: 'GB 2760 official row verified',
    regulatoryBasis: 'GB 2760-2024 表 A.1',
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸 citric acid。',
    isVerified: true,
    gbCode: 'INS 330',
    gbStatus: 'permitted',
    eNumber: null,
    adi: null,
    usageLimits: [{ foodCategory: '各类食品', limit: '按生产需要适量使用' }],
    foodCategories: ['各类食品'],
    gb2760PromotionBaseState: null,
    allergenTypes: [],
    cautionGroups: [],
    createdAt: new Date('2026-06-14T00:00:00.000Z'),
    syncedAt: new Date('2026-06-14T00:00:00.000Z'),
    ...overrides
  };
}

function createSeedImportRuns(): ImportRunRow[] {
  const startedAt = new Date('2026-06-14T00:00:00.000Z');
  return [
    createSeedImportRun({ id: 'import-run-gb2760-a1-staging', runType: 'a1_staging', totalRows: 2404, succeededRows: 2404, startedAt }),
    createSeedImportRun({ id: 'import-run-gb2760-fulltext', runType: 'fulltext', totalRows: 264, succeededRows: 264, startedAt }),
    createSeedImportRun({ id: 'import-run-gb2760-reference-tables', runType: 'reference_tables', totalRows: 2800, succeededRows: 2800, startedAt })
  ];
}

function createSeedImportRun(overrides: Partial<ImportRunRow>): ImportRunRow {
  return {
    id: 'import-run-gb2760-seed',
    sourceDocumentId: 'source-document-gb-2760-2024-2a2c4a867cf5',
    runType: 'a1_staging',
    startedAt: new Date('2026-06-14T00:00:00.000Z'),
    endedAt: new Date('2026-06-14T00:00:01.000Z'),
    totalRows: 1,
    succeededRows: 1,
    failedRows: 0,
    status: 'succeeded',
    note: 'seed import',
    ...overrides
  };
}
