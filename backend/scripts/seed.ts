import { createDatabaseClient } from '../src/db/client.js';
import { createGb2760SourceDocumentInput, createSeedImportRunId, recordImportRun, upsertSourceDocument, type Gb2760SourceMetadata, type ImportRunType } from '../src/services/gb2760Service.js';
import { reconcilePromotedGb2760Rows } from '../src/services/gb2760PromoteService.js';
import { upsertGb2760OfficialPages, upsertGb2760OfficialRecords, upsertGb2760OfficialReferenceRows, upsertIngredients, type FoodAdditiveInput, type Gb2760OfficialPageInput, type Gb2760OfficialRecordInput, type Gb2760OfficialReferenceRowInput } from '../src/services/ingredientService.js';

const dataModule = await import(new URL('../../src/data/foodAdditives.js', import.meta.url).href);
const gb2760StagingModule = await import(new URL('../../src/data/gb2760OfficialStaging.js', import.meta.url).href);
const gb2760FullTextModule = await import(new URL('../../src/data/gb2760OfficialFullText.js', import.meta.url).href);
const gb2760ReferenceTableModule = await import(new URL('../../src/data/gb2760OfficialReferenceTables.js', import.meta.url).href);
const foodAdditives = resolveFoodSeedItems(dataModule as unknown as FoodDataModule);
const gb2760OfficialRecords = resolveGb2760StagingRecords(gb2760StagingModule as unknown as Gb2760StagingModule);
const gb2760OfficialSource = resolveGb2760SourceMetadata(gb2760StagingModule as unknown as Gb2760StagingModule);
const gb2760OfficialPages = resolveGb2760FullTextPages(gb2760FullTextModule as unknown as Gb2760FullTextModule);
const gb2760OfficialReferenceRows = resolveGb2760ReferenceRows(gb2760ReferenceTableModule as unknown as Gb2760ReferenceTableModule);
const client = createDatabaseClient();
const options = parseSeedOptions(process.argv.slice(2));

try {
  const sourceDocumentInput = createGb2760SourceDocumentInput(gb2760OfficialSource);
  const sourceDocument = await upsertSourceDocument(client.db, sourceDocumentInput);
  await upsertIngredients(client.db, foodAdditives, options);
  await runAuditedGb2760Import({
    sourceDocumentId: sourceDocument.id,
    runType: 'a1_staging',
    totalRows: gb2760OfficialRecords.length,
    note: 'Seed GB 2760 official A.1 staging records from generated source file',
    operation: () => upsertGb2760OfficialRecords(client.db, gb2760OfficialRecords)
  });
  await runAuditedGb2760Import({
    sourceDocumentId: sourceDocument.id,
    runType: 'fulltext',
    totalRows: gb2760OfficialPages.length,
    note: 'Seed GB 2760 official full-text PDF pages from generated source file',
    operation: () => upsertGb2760OfficialPages(client.db, gb2760OfficialPages)
  });
  await runAuditedGb2760Import({
    sourceDocumentId: sourceDocument.id,
    runType: 'reference_tables',
    totalRows: gb2760OfficialReferenceRows.length,
    note: 'Seed GB 2760 official reference tables from generated source file',
    operation: () => upsertGb2760OfficialReferenceRows(client.db, gb2760OfficialReferenceRows)
  });
  const promotedReconcile = await reconcilePromotedGb2760Rows(client.db);
  if (promotedReconcile.failedRows > 0) {
    throw new Error(`Failed to reconcile promoted GB 2760 rows after seed refresh: ${formatPromotionErrors(promotedReconcile)}`);
  }
  const version = options.dataVersion || foodAdditives[0]?.dataVersion || 'unknown';
  console.log(`Seeded ${foodAdditives.length} ingredients for data version ${version}`);
  console.log(`Seeded ${gb2760OfficialRecords.length} GB 2760 official staging records`);
  console.log(`Seeded ${gb2760OfficialPages.length} GB 2760 official full-text pages`);
  console.log(`Seeded ${gb2760OfficialReferenceRows.length} GB 2760 official reference rows`);
  if (promotedReconcile.promotedRows > 0) {
    console.log(`Reconciled ${promotedReconcile.promotedRows} promoted GB 2760 formal usage rules after seed refresh`);
  }
} finally {
  await client.pool.end();
}

type FoodDataModule = {
  foodIngredients?: unknown;
  foodAdditives?: unknown;
};

type Gb2760StagingModule = {
  gb2760OfficialStagingSource?: unknown;
  gb2760OfficialStagingRecords?: unknown;
};

type Gb2760FullTextModule = {
  gb2760OfficialFullTextPages?: unknown;
};

type Gb2760ReferenceTableModule = {
  gb2760OfficialReferenceRows?: unknown;
};

function resolveFoodSeedItems(module: FoodDataModule): FoodAdditiveInput[] {
  if (Array.isArray(module.foodIngredients)) return module.foodIngredients as FoodAdditiveInput[];
  if (Array.isArray(module.foodAdditives)) return module.foodAdditives as FoodAdditiveInput[];

  throw new Error('Expected src/data/foodAdditives.js to export foodIngredients or foodAdditives array');
}

function resolveGb2760StagingRecords(module: Gb2760StagingModule): Gb2760OfficialRecordInput[] {
  if (Array.isArray(module.gb2760OfficialStagingRecords)) {
    return module.gb2760OfficialStagingRecords as Gb2760OfficialRecordInput[];
  }

  throw new Error('Expected src/data/gb2760OfficialStaging.js to export gb2760OfficialStagingRecords array');
}

function resolveGb2760SourceMetadata(module: Gb2760StagingModule): Gb2760SourceMetadata {
  const source = module.gb2760OfficialStagingSource;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Expected src/data/gb2760OfficialStaging.js to export gb2760OfficialStagingSource object');
  }

  return {
    standardCode: readRequiredSourceField(source, 'standardCode'),
    standardTitle: readRequiredSourceField(source, 'standardTitle'),
    factName: readRequiredSourceField(source, 'factName'),
    pdfSha256: readRequiredSourceField(source, 'pdfSha256'),
    platformRecordId: readRequiredSourceField(source, 'platformRecordId'),
    fileGuid: readRequiredSourceField(source, 'fileGuid'),
    publishedAt: readRequiredSourceField(source, 'publishedAt'),
    effectiveDate: readRequiredSourceField(source, 'effectiveDate'),
    downloadEndpoint: readRequiredSourceField(source, 'downloadEndpoint')
  };
}

function resolveGb2760FullTextPages(module: Gb2760FullTextModule): Gb2760OfficialPageInput[] {
  if (Array.isArray(module.gb2760OfficialFullTextPages)) {
    return module.gb2760OfficialFullTextPages as Gb2760OfficialPageInput[];
  }

  throw new Error('Expected src/data/gb2760OfficialFullText.js to export gb2760OfficialFullTextPages array');
}

function resolveGb2760ReferenceRows(module: Gb2760ReferenceTableModule): Gb2760OfficialReferenceRowInput[] {
  if (Array.isArray(module.gb2760OfficialReferenceRows)) {
    return module.gb2760OfficialReferenceRows as Gb2760OfficialReferenceRowInput[];
  }

  throw new Error('Expected src/data/gb2760OfficialReferenceTables.js to export gb2760OfficialReferenceRows array');
}

function parseSeedOptions(args: string[]) {
  const dataVersion = readOption(args, '--version');
  const hasReviewedBy = hasOption(args, '--reviewed-by');
  const hasChangeNote = hasOption(args, '--change-note');
  const reviewedBy = readOption(args, '--reviewed-by') || 'system';
  const changeNote = readOption(args, '--change-note') || (dataVersion ? `Seed import for ${dataVersion}` : undefined);
  return {
    ...(dataVersion ? { dataVersion } : {}),
    reviewedBy,
    reviewedAt: new Date(),
    ...(changeNote ? { changeNote } : {}),
    updateAuditFields: hasReviewedBy || hasChangeNote
  };
}

function hasOption(args: string[], name: string) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function readOption(args: string[], name: string) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
}

async function runAuditedGb2760Import(params: {
  sourceDocumentId: string;
  runType: ImportRunType;
  totalRows: number;
  note: string;
  operation: () => Promise<void>;
}) {
  const startedAt = new Date();
  const runId = createSeedImportRunId(params.sourceDocumentId, params.runType);
  try {
    await params.operation();
    await recordImportRun(client.db, {
      id: runId,
      sourceDocumentId: params.sourceDocumentId,
      runType: params.runType,
      startedAt,
      endedAt: new Date(),
      totalRows: params.totalRows,
      succeededRows: params.totalRows,
      failedRows: 0,
      status: 'succeeded',
      note: params.note
    });
  } catch (error) {
    const message = getErrorMessage(error);
    await recordImportRun(client.db, {
      id: runId,
      sourceDocumentId: params.sourceDocumentId,
      runType: params.runType,
      startedAt,
      endedAt: new Date(),
      totalRows: params.totalRows,
      succeededRows: 0,
      failedRows: params.totalRows,
      status: 'failed',
      note: params.note
    }, [{
      id: `${runId}-error-001`,
      importRunId: runId,
      rowRef: params.runType,
      reason: message,
      rawSourceText: ''
    }]);
    throw error;
  }
}

function formatPromotionErrors(result: Awaited<ReturnType<typeof reconcilePromotedGb2760Rows>>) {
  return result.errors
    .slice(0, 5)
    .map((error) => `${error.row.id}: ${error.reasons.join(', ')}`)
    .join('; ');
}

function readRequiredSourceField(source: object, field: keyof Gb2760SourceMetadata) {
  const value = (source as Record<string, unknown>)[field];
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Missing GB 2760 source metadata field: ${field}`);
  }
  return normalized;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
