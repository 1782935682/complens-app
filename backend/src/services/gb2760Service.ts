import { and, asc, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { gb2760OfficialRecords, gb2760OfficialReferenceRows, importErrors, importRuns, sourceDocuments, ingredients, type Gb2760OfficialRecordRow, type Gb2760OfficialReferenceRow, type ImportErrorRow, type ImportRunRow, type NewImportErrorRow, type NewImportRunRow, type NewSourceDocumentRow, type SourceDocumentRow } from '../db/schema.js';
import { validatePromotionCandidate } from './gb2760PromoteService.js';

export const validImportRunTypes = ['fulltext', 'a1_staging', 'reference_tables', 'promote'] as const;
export const validImportRunStatuses = ['running', 'succeeded', 'failed'] as const;
export const validGb2760StagingReviewStatuses = ['pending_review', 'mapped_candidate', 'approved', 'promoted', 'verified'] as const;
export const editableGb2760StagingReviewStatuses = ['pending_review', 'mapped_candidate', 'approved'] as const;

export type ImportRunType = typeof validImportRunTypes[number];
export type ImportRunStatus = typeof validImportRunStatuses[number];
export type Gb2760StagingReviewStatus = typeof validGb2760StagingReviewStatuses[number];
export type EditableGb2760StagingReviewStatus = typeof editableGb2760StagingReviewStatuses[number];

export type SourceDocumentInput = {
  id: string;
  docCode: string;
  title: string;
  pdfFileName: string;
  pdfSha256: string;
  platformRecordId: string;
  attachmentId: string;
  publishDate: string;
  effectiveDate: string;
  downloadEndpoint: string;
};

export type Gb2760SourceMetadata = {
  standardCode: string;
  standardTitle: string;
  factName: string;
  pdfSha256: string;
  platformRecordId: string;
  fileGuid: string;
  publishedAt: string;
  effectiveDate: string;
  downloadEndpoint: string;
};

export type ImportRunInput = {
  id: string;
  sourceDocumentId: string;
  runType: ImportRunType;
  startedAt: Date;
  endedAt?: Date | null;
  totalRows: number;
  succeededRows: number;
  failedRows: number;
  status: ImportRunStatus;
  note?: string;
};

export type ImportErrorInput = {
  id: string;
  importRunId: string;
  rowRef: string;
  reason: string;
  rawSourceText?: string;
  createdAt?: Date;
};

export type ImportRunListParams = {
  page: number;
  limit: number;
};

export type ImportRunListItem = ImportRunRow & {
  sourceDocument: Pick<SourceDocumentRow, 'id' | 'docCode' | 'title' | 'pdfFileName' | 'pdfSha256'> | null;
};

export type ImportRunListResult = {
  items: ImportRunListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ImportRunErrorsResult = {
  importRun: ImportRunListItem;
  items: ImportErrorRow[];
};

export type ReferenceRowListParams = {
  tableName?: string;
  q?: string;
  page: number;
  limit: number;
};

export type ReferenceRowListResult = {
  items: Gb2760OfficialReferenceRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StagingRowListParams = {
  reviewStatus?: Gb2760StagingReviewStatus;
  q?: string;
  readyOnly?: boolean;
  page: number;
  limit: number;
};

export type StagingRowListItem = Gb2760OfficialRecordRow & {
  promotionIssues: string[];
};

export type StagingReviewStatusCount = {
  reviewStatus: string;
  count: number;
};

export type StagingRowListResult = {
  items: StagingRowListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusCounts: StagingReviewStatusCount[];
};

export type StagingBatchReviewError = {
  id: string;
  code: 'not_found' | 'locked_review_status' | 'invalid_promotion_candidate' | 'invalid_ingredient_id';
  reasons: string[];
};

export type StagingBatchReviewResult = {
  requestedCount: number;
  updatedCount: number;
  skippedCount: number;
  items: StagingRowListItem[];
  errors: StagingBatchReviewError[];
};

export type StagingReviewAudit = {
  reviewedBy: string;
  reviewedByUserId: string;
  reviewedAt?: Date;
  reviewNote?: string;
};

export class Gb2760StagingReviewError extends Error {
  constructor(
    public readonly code: 'invalid_promotion_candidate' | 'locked_review_status' | 'invalid_ingredient_id',
    message: string,
    public readonly reasons: string[] = []
  ) {
    super(message);
  }
}

export type Gb2760Service = {
  listImportRuns(params: ImportRunListParams): Promise<ImportRunListResult>;
  getImportRunErrors(importRunId: string): Promise<ImportRunErrorsResult | null>;
  listReferenceRows(params: ReferenceRowListParams): Promise<ReferenceRowListResult>;
  listStagingRows(params: StagingRowListParams): Promise<StagingRowListResult>;
  updateStagingRowReviewStatus(id: string, reviewStatus: EditableGb2760StagingReviewStatus, audit: StagingReviewAudit): Promise<StagingRowListItem | null>;
  updateStagingRowsReviewStatus(ids: string[], reviewStatus: EditableGb2760StagingReviewStatus, audit: StagingReviewAudit): Promise<StagingBatchReviewResult>;
  updateStagingRowMapping(id: string, ingredientId: string, reviewStatus: EditableGb2760StagingReviewStatus, audit: StagingReviewAudit): Promise<StagingRowListItem | null>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: Gb2760Service | null = null;

export function createGb2760Service(db: Database): Gb2760Service {
  return {
    async listImportRuns(params) {
      return listImportRuns(db, params);
    },
    async getImportRunErrors(importRunId) {
      return getImportRunErrors(db, importRunId);
    },
    async listReferenceRows(params) {
      return listReferenceRows(db, params);
    },
    async listStagingRows(params) {
      return listStagingRows(db, params);
    },
    async updateStagingRowReviewStatus(id, reviewStatus, audit) {
      return updateStagingRowReviewStatus(db, id, reviewStatus, audit);
    },
    async updateStagingRowsReviewStatus(ids, reviewStatus, audit) {
      return updateStagingRowsReviewStatus(db, ids, reviewStatus, audit);
    },
    async updateStagingRowMapping(id, ingredientId, reviewStatus, audit) {
      return updateStagingRowMapping(db, id, ingredientId, reviewStatus, audit);
    }
  };
}

export function getDefaultGb2760Service(): Gb2760Service {
  if (!defaultClient) {
    defaultClient = createDatabaseClient();
    defaultService = createGb2760Service(defaultClient.db);
  }

  return defaultService as Gb2760Service;
}

export function createLazyGb2760Service(databaseUrl?: string): Gb2760Service {
  let lazyClient: DatabaseClient | null = null;
  let lazyService: Gb2760Service | null = null;

  function getLazyService() {
    if (!lazyClient) {
      lazyClient = createDatabaseClient(databaseUrl);
      lazyService = createGb2760Service(lazyClient.db);
    }

    return lazyService as Gb2760Service;
  }

  return {
    listImportRuns(params) {
      return getLazyService().listImportRuns(params);
    },
    getImportRunErrors(importRunId) {
      return getLazyService().getImportRunErrors(importRunId);
    },
    listReferenceRows(params) {
      return getLazyService().listReferenceRows(params);
    },
    listStagingRows(params) {
      return getLazyService().listStagingRows(params);
    },
    updateStagingRowReviewStatus(id, reviewStatus, audit) {
      return getLazyService().updateStagingRowReviewStatus(id, reviewStatus, audit);
    },
    updateStagingRowsReviewStatus(ids, reviewStatus, audit) {
      return getLazyService().updateStagingRowsReviewStatus(ids, reviewStatus, audit);
    },
    updateStagingRowMapping(id, ingredientId, reviewStatus, audit) {
      return getLazyService().updateStagingRowMapping(id, ingredientId, reviewStatus, audit);
    }
  };
}

export function createGb2760SourceDocumentInput(source: Gb2760SourceMetadata): SourceDocumentInput {
  return {
    id: `source-document-${source.standardCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${source.pdfSha256.slice(0, 12)}`,
    docCode: source.standardCode,
    title: source.standardTitle,
    pdfFileName: source.factName,
    pdfSha256: source.pdfSha256,
    platformRecordId: source.platformRecordId,
    attachmentId: source.fileGuid,
    publishDate: source.publishedAt,
    effectiveDate: source.effectiveDate,
    downloadEndpoint: source.downloadEndpoint
  };
}

export function createSeedImportRunId(sourceDocumentId: string, runType: ImportRunType) {
  const sourceId = normalizeRequiredText(sourceDocumentId, 'source document id')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `import-run-${sourceId}-${runType.replace(/_/g, '-')}`;
}

export function toSourceDocumentRow(document: SourceDocumentInput): NewSourceDocumentRow {
  return {
    id: normalizeRequiredText(document.id, 'source document id'),
    docCode: normalizeRequiredText(document.docCode, 'document code'),
    title: normalizeRequiredText(document.title, 'document title'),
    pdfFileName: normalizeRequiredText(document.pdfFileName, 'PDF file name'),
    pdfSha256: normalizeRequiredText(document.pdfSha256, 'PDF SHA-256'),
    platformRecordId: normalizeRequiredText(document.platformRecordId, 'platform record id'),
    attachmentId: normalizeRequiredText(document.attachmentId, 'attachment id'),
    publishDate: normalizeRequiredText(document.publishDate, 'publish date'),
    effectiveDate: normalizeRequiredText(document.effectiveDate, 'effective date'),
    downloadEndpoint: normalizeRequiredText(document.downloadEndpoint, 'download endpoint')
  };
}

export function toImportRunRow(run: ImportRunInput): NewImportRunRow {
  if (!validImportRunTypes.includes(run.runType)) {
    throw new Error(`Unsupported import run type: ${run.runType}`);
  }
  if (!validImportRunStatuses.includes(run.status)) {
    throw new Error(`Unsupported import run status: ${run.status}`);
  }

  return {
    id: normalizeRequiredText(run.id, 'import run id'),
    sourceDocumentId: normalizeRequiredText(run.sourceDocumentId, 'source document id'),
    runType: run.runType,
    startedAt: run.startedAt,
    endedAt: run.endedAt ?? null,
    totalRows: normalizeNonNegativeInteger(run.totalRows, 'totalRows'),
    succeededRows: normalizeNonNegativeInteger(run.succeededRows, 'succeededRows'),
    failedRows: normalizeNonNegativeInteger(run.failedRows, 'failedRows'),
    status: run.status,
    note: normalizeOptionalText(run.note)
  };
}

export function toImportErrorRow(error: ImportErrorInput): NewImportErrorRow {
  return {
    id: normalizeRequiredText(error.id, 'import error id'),
    importRunId: normalizeRequiredText(error.importRunId, 'import run id'),
    rowRef: normalizeRequiredText(error.rowRef, 'row reference'),
    reason: normalizeRequiredText(error.reason, 'error reason'),
    rawSourceText: normalizeOptionalText(error.rawSourceText),
    ...(error.createdAt ? { createdAt: error.createdAt } : {})
  };
}

export async function upsertSourceDocument(db: Database, document: SourceDocumentInput): Promise<SourceDocumentRow> {
  const row = toSourceDocumentRow(document);
  const [saved] = await db
    .insert(sourceDocuments)
    .values(row)
    .onConflictDoUpdate({
      target: sourceDocuments.pdfSha256,
      set: {
        docCode: row.docCode,
        title: row.title,
        pdfFileName: row.pdfFileName,
        platformRecordId: row.platformRecordId,
        attachmentId: row.attachmentId,
        publishDate: row.publishDate,
        effectiveDate: row.effectiveDate,
        downloadEndpoint: row.downloadEndpoint,
        createdAt: sql`${sourceDocuments.createdAt}`
      }
    })
    .returning();

  return saved;
}

export async function recordImportRun(db: Database, run: ImportRunInput, errors: ImportErrorInput[] = []) {
  const runRow = toImportRunRow(run);
  const errorRows = errors.map(toImportErrorRow);

  await db.transaction(async (tx) => {
    await tx
      .insert(importRuns)
      .values(runRow)
      .onConflictDoUpdate({
        target: importRuns.id,
        set: runRow
      });

    await tx.delete(importErrors).where(eq(importErrors.importRunId, run.id));
    if (errorRows.length > 0) {
      await tx.insert(importErrors).values(errorRows);
    }
  });
}

export async function listImportRuns(db: Database, params: ImportRunListParams): Promise<ImportRunListResult> {
  const page = normalizePositiveInteger(params.page, 'page');
  const limit = Math.min(normalizePositiveInteger(params.limit, 'limit'), 100);
  const offset = (page - 1) * limit;
  const [{ total }] = await db.select({ total: count() }).from(importRuns);
  const rows = await db
    .select({
      run: importRuns,
      sourceDocument: sourceDocuments
    })
    .from(importRuns)
    .leftJoin(sourceDocuments, eq(importRuns.sourceDocumentId, sourceDocuments.id))
    .orderBy(desc(importRuns.startedAt), desc(importRuns.id))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(formatImportRunListItem),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

export async function getImportRunErrors(db: Database, importRunId: string): Promise<ImportRunErrorsResult | null> {
  const [run] = await db
    .select({
      run: importRuns,
      sourceDocument: sourceDocuments
    })
    .from(importRuns)
    .leftJoin(sourceDocuments, eq(importRuns.sourceDocumentId, sourceDocuments.id))
    .where(eq(importRuns.id, importRunId))
    .limit(1);

  if (!run) return null;

  const rows = await db
    .select()
    .from(importErrors)
    .where(eq(importErrors.importRunId, importRunId))
    .orderBy(asc(importErrors.createdAt), asc(importErrors.id));

  return {
    importRun: formatImportRunListItem(run),
    items: rows
  };
}

export async function listReferenceRows(db: Database, params: ReferenceRowListParams): Promise<ReferenceRowListResult> {
  const page = normalizePositiveInteger(params.page, 'page');
  const limit = Math.min(normalizePositiveInteger(params.limit, 'limit'), 100);
  const offset = (page - 1) * limit;
  const where = buildReferenceRowsWhere(params);
  const [{ total }] = await db
    .select({ total: count() })
    .from(gb2760OfficialReferenceRows)
    .where(where);
  const rows = await db
    .select()
    .from(gb2760OfficialReferenceRows)
    .where(where)
    .orderBy(
      asc(gb2760OfficialReferenceRows.tableName),
      asc(gb2760OfficialReferenceRows.rowNumber),
      asc(gb2760OfficialReferenceRows.id)
    )
    .limit(limit)
    .offset(offset);

  return {
    items: rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

export async function listStagingRows(db: Database, params: StagingRowListParams): Promise<StagingRowListResult> {
  const page = normalizePositiveInteger(params.page, 'page');
  const limit = Math.min(normalizePositiveInteger(params.limit, 'limit'), 100);
  const offset = (page - 1) * limit;
  const where = buildStagingRowsWhere(params);
  const [statusCounts, ingredientIds] = await Promise.all([
    getStagingReviewStatusCounts(db),
    getIngredientIds(db)
  ]);

  if (params.readyOnly) {
    const rows = await db
      .select()
      .from(gb2760OfficialRecords)
      .where(where)
      .orderBy(...buildStagingRowsOrderBy());
    const readyRows = rows
      .map((row) => formatStagingRowListItem(row, ingredientIds))
      .filter(isGb2760StagingRowReviewReady);

    return {
      items: readyRows.slice(offset, offset + limit),
      page,
      limit,
      total: readyRows.length,
      totalPages: Math.max(1, Math.ceil(readyRows.length / limit)),
      statusCounts
    };
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(gb2760OfficialRecords)
    .where(where);
  const rows = await db
    .select()
    .from(gb2760OfficialRecords)
    .where(where)
    .orderBy(...buildStagingRowsOrderBy())
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map((row) => formatStagingRowListItem(row, ingredientIds)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    statusCounts
  };
}

export async function updateStagingRowReviewStatus(
  db: Database,
  id: string,
  reviewStatus: EditableGb2760StagingReviewStatus,
  audit: StagingReviewAudit
): Promise<StagingRowListItem | null> {
  const [row] = await db
    .select()
    .from(gb2760OfficialRecords)
    .where(eq(gb2760OfficialRecords.id, normalizeRequiredText(id, 'staging row id')))
    .limit(1);
  if (!row) return null;
  if (row.reviewStatus === 'promoted' || row.reviewStatus === 'verified') {
    throw new Gb2760StagingReviewError(
      'locked_review_status',
      `Cannot edit ${row.reviewStatus} staging rows`,
      [`current status is ${row.reviewStatus}`]
    );
  }

  const ingredientIds = await getIngredientIds(db);
  if (reviewStatus === 'approved') {
    const promotionIssues = validatePromotionCandidate(row, ingredientIds);
    if (promotionIssues.length > 0) {
      throw new Gb2760StagingReviewError(
        'invalid_promotion_candidate',
        'Cannot approve a GB 2760 staging row that is not promotable',
        promotionIssues
      );
    }
  }

  const [updated] = await db
    .update(gb2760OfficialRecords)
    .set({
      reviewStatus,
      ...toStagingReviewAuditPatch(reviewStatus, audit)
    })
    .where(eq(gb2760OfficialRecords.id, row.id))
    .returning();

  return formatStagingRowListItem(updated, ingredientIds);
}

export async function updateStagingRowsReviewStatus(
  db: Database,
  ids: string[],
  reviewStatus: EditableGb2760StagingReviewStatus,
  audit: StagingReviewAudit
): Promise<StagingBatchReviewResult> {
  const normalizedIds = [...new Set(ids.map((id) => normalizeOptionalText(id)).filter(Boolean))];
  const ingredientIds = await getIngredientIds(db);
  if (normalizedIds.length === 0) {
    return {
      requestedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      items: [],
      errors: []
    };
  }

  const rows = await db
    .select()
    .from(gb2760OfficialRecords)
    .where(inArray(gb2760OfficialRecords.id, normalizedIds));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const errors: StagingBatchReviewError[] = [];
  const updateIds: string[] = [];

  for (const id of normalizedIds) {
    const row = rowById.get(id);
    if (!row) {
      errors.push({ id, code: 'not_found', reasons: ['row not found'] });
      continue;
    }

    if (row.reviewStatus === 'promoted' || row.reviewStatus === 'verified') {
      errors.push({ id, code: 'locked_review_status', reasons: [`current status is ${row.reviewStatus}`] });
      continue;
    }

    if (reviewStatus === 'approved') {
      const promotionIssues = validatePromotionCandidate(row, ingredientIds);
      if (promotionIssues.length > 0) {
        errors.push({ id, code: 'invalid_promotion_candidate', reasons: promotionIssues });
        continue;
      }
    }

    updateIds.push(id);
  }

  let updatedRows: Gb2760OfficialRecordRow[] = [];
  if (updateIds.length > 0) {
    const auditPatch = toStagingReviewAuditPatch(reviewStatus, audit);
    updatedRows = await db.transaction(async (tx) => tx
      .update(gb2760OfficialRecords)
      .set({
        reviewStatus,
        ...auditPatch
      })
      .where(inArray(gb2760OfficialRecords.id, updateIds))
      .returning());
  }

  return {
    requestedCount: normalizedIds.length,
    updatedCount: updatedRows.length,
    skippedCount: errors.length,
    items: updatedRows.map((row) => formatStagingRowListItem(row, ingredientIds)),
    errors
  };
}

export async function updateStagingRowMapping(
  db: Database,
  id: string,
  ingredientId: string,
  reviewStatus: EditableGb2760StagingReviewStatus,
  audit: StagingReviewAudit
): Promise<StagingRowListItem | null> {
  const normalizedId = normalizeRequiredText(id, 'staging row id');
  const normalizedIngredientId = normalizeRequiredText(ingredientId, 'ingredient id');
  const [row] = await db
    .select()
    .from(gb2760OfficialRecords)
    .where(eq(gb2760OfficialRecords.id, normalizedId))
    .limit(1);
  if (!row) return null;
  if (row.reviewStatus === 'promoted' || row.reviewStatus === 'verified') {
    throw new Gb2760StagingReviewError(
      'locked_review_status',
      `Cannot edit ${row.reviewStatus} staging rows`,
      [`current status is ${row.reviewStatus}`]
    );
  }

  const ingredientIds = await getIngredientIds(db);
  if (!ingredientIds.has(normalizedIngredientId)) {
    throw new Gb2760StagingReviewError(
      'invalid_ingredient_id',
      'Cannot map GB 2760 staging row to an unknown ingredient',
      [`ingredientId ${normalizedIngredientId} does not exist`]
    );
  }

  const mappedRow = {
    ...row,
    ingredientId: normalizedIngredientId,
    reviewStatus
  };
  if (reviewStatus === 'approved') {
    const promotionIssues = validatePromotionCandidate(mappedRow, ingredientIds);
    if (promotionIssues.length > 0) {
      throw new Gb2760StagingReviewError(
        'invalid_promotion_candidate',
        'Cannot approve a GB 2760 staging row that is not promotable',
        promotionIssues
      );
    }
  }

  const [updated] = await db
    .update(gb2760OfficialRecords)
    .set({
      ingredientId: normalizedIngredientId,
      reviewStatus,
      ...toStagingReviewAuditPatch(reviewStatus, {
        ...audit,
        reviewNote: audit.reviewNote || `Mapped ingredientId ${normalizedIngredientId} and set review status to ${reviewStatus}`
      })
    })
    .where(eq(gb2760OfficialRecords.id, row.id))
    .returning();

  return formatStagingRowListItem(updated, ingredientIds);
}

export function isGb2760StagingRowReviewReady(row: { reviewStatus: string; promotionIssues: string[] }) {
  return row.promotionIssues.length === 0
    && row.reviewStatus !== 'promoted'
    && row.reviewStatus !== 'verified';
}

function toStagingReviewAuditPatch(reviewStatus: EditableGb2760StagingReviewStatus, audit: StagingReviewAudit) {
  const reviewedAt = audit.reviewedAt ?? new Date();
  const reviewedBy = normalizeRequiredText(audit.reviewedBy, 'reviewed by');
  const reviewedByUserId = normalizeRequiredText(audit.reviewedByUserId, 'reviewed by user id');
  return {
    reviewedBy,
    reviewedByUserId,
    reviewedAt,
    reviewNote: normalizeOptionalText(audit.reviewNote) || `Set GB 2760 staging review status to ${reviewStatus}`,
    syncedAt: reviewedAt
  };
}

function formatImportRunListItem(row: { run: ImportRunRow; sourceDocument: SourceDocumentRow | null }): ImportRunListItem {
  return {
    ...row.run,
    sourceDocument: row.sourceDocument
      ? {
          id: row.sourceDocument.id,
          docCode: row.sourceDocument.docCode,
          title: row.sourceDocument.title,
          pdfFileName: row.sourceDocument.pdfFileName,
          pdfSha256: row.sourceDocument.pdfSha256
        }
      : null
  };
}

function formatStagingRowListItem(row: Gb2760OfficialRecordRow, ingredientIds: ReadonlySet<string>): StagingRowListItem {
  return {
    ...row,
    promotionIssues: validatePromotionCandidate(row, ingredientIds)
  };
}

async function getStagingReviewStatusCounts(db: Database): Promise<StagingReviewStatusCount[]> {
  return db
    .select({
      reviewStatus: gb2760OfficialRecords.reviewStatus,
      count: count()
    })
    .from(gb2760OfficialRecords)
    .groupBy(gb2760OfficialRecords.reviewStatus)
    .orderBy(asc(gb2760OfficialRecords.reviewStatus));
}

async function getIngredientIds(db: Database): Promise<ReadonlySet<string>> {
  const rows = await db.select({ id: ingredients.id }).from(ingredients);
  return new Set(rows.map((row) => row.id));
}

function buildStagingRowsOrderBy() {
  return [
    sql`case ${gb2760OfficialRecords.reviewStatus}
      when 'pending_review' then 0
      when 'mapped_candidate' then 1
      when 'approved' then 2
      when 'promoted' then 3
      else 4
    end`,
    asc(gb2760OfficialRecords.additiveNameCn),
    asc(gb2760OfficialRecords.foodCategoryCode),
    asc(gb2760OfficialRecords.id)
  ];
}

function buildReferenceRowsWhere(params: ReferenceRowListParams): SQL | undefined {
  const filters: SQL[] = [];
  if (params.tableName) {
    filters.push(eq(gb2760OfficialReferenceRows.tableName, normalizeReferenceTableName(params.tableName)));
  }
  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    filters.push(sql`(
      ${gb2760OfficialReferenceRows.rowName} ILIKE ${pattern} ESCAPE '\\'
      OR ${gb2760OfficialReferenceRows.rowCode} ILIKE ${pattern} ESCAPE '\\'
      OR ${gb2760OfficialReferenceRows.rawSourceText} ILIKE ${pattern} ESCAPE '\\'
      OR ${gb2760OfficialReferenceRows.rowData}::text ILIKE ${pattern} ESCAPE '\\'
    )`);
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

function buildStagingRowsWhere(params: StagingRowListParams): SQL | undefined {
  const filters: SQL[] = [];
  if (params.reviewStatus) {
    filters.push(eq(gb2760OfficialRecords.reviewStatus, params.reviewStatus));
  }
  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    filters.push(or(
      sql`${gb2760OfficialRecords.id} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.additiveNameCn} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.additiveNameEn} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.cnsNumber} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.insNumber} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.functionText} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.foodCategoryCode} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.foodCategoryName} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${gb2760OfficialRecords.rawSourceText} ILIKE ${pattern} ESCAPE '\\'`
    ) as SQL);
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

export function normalizeReferenceTableName(value: string | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return '';
  if (/^附录\s*[DF]$/iu.test(normalized)) {
    return normalized.replace(/\s+/g, ' ').replace(/^附录\s*/u, '附录 ');
  }
  const match = normalized.match(/^(?:表\s*)?([A-Z])(?:\.)?(\d)$/iu);
  if (match) return `表 ${match[1].toUpperCase()}.${match[2]}`;
  return normalized;
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function normalizeRequiredText(value: string | undefined, field: string) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) throw new Error(`Missing ${field}`);
  return normalized;
}

function normalizeOptionalText(value: string | undefined) {
  return String(value || '').trim();
}

function normalizePositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function normalizeNonNegativeInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}
