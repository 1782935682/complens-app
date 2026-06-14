import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { importErrors, importRuns, sourceDocuments, type ImportErrorRow, type ImportRunRow, type NewImportErrorRow, type NewImportRunRow, type NewSourceDocumentRow, type SourceDocumentRow } from '../db/schema.js';

export const validImportRunTypes = ['fulltext', 'a1_staging', 'reference_tables', 'promote'] as const;
export const validImportRunStatuses = ['running', 'succeeded', 'failed'] as const;

export type ImportRunType = typeof validImportRunTypes[number];
export type ImportRunStatus = typeof validImportRunStatuses[number];

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

export type Gb2760Service = {
  listImportRuns(params: ImportRunListParams): Promise<ImportRunListResult>;
  getImportRunErrors(importRunId: string): Promise<ImportRunErrorsResult | null>;
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
