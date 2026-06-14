import { randomUUID } from 'node:crypto';
import { createDatabaseClient } from '../src/db/client.js';
import { createGb2760SourceDocumentInput, recordImportRun, upsertSourceDocument, type Gb2760SourceMetadata } from '../src/services/gb2760Service.js';
import { promoteApprovedGb2760Rows, type PromoteGb2760Result } from '../src/services/gb2760PromoteService.js';

const gb2760StagingModule = await import(new URL('../../src/data/gb2760OfficialStaging.js', import.meta.url).href);
const gb2760OfficialSource = resolveGb2760SourceMetadata(gb2760StagingModule as { gb2760OfficialStagingSource?: unknown });
const client = createDatabaseClient();
const startedAt = new Date();
const runId = createPromoteRunId(startedAt);

try {
  await main();
} finally {
  await client.pool.end();
}

async function main() {
  const sourceDocumentInput = createGb2760SourceDocumentInput(gb2760OfficialSource);
  const sourceDocument = await upsertSourceDocument(client.db, sourceDocumentInput);
  let result: PromoteGb2760Result;
  try {
    result = await promoteApprovedGb2760Rows(client.db);
  } catch (error) {
    const message = getErrorMessage(error);
    await recordImportRun(client.db, {
      id: runId,
      sourceDocumentId: sourceDocument.id,
      runType: 'promote',
      startedAt,
      endedAt: new Date(),
      totalRows: 1,
      succeededRows: 0,
      failedRows: 1,
      status: 'failed',
      note: 'Promote manually approved GB 2760 staging rows into additive_usage_rules; threw before row-level result'
    }, [{
      id: `${runId}-error-001`,
      importRunId: runId,
      rowRef: 'promote',
      reason: message,
      rawSourceText: ''
    }]);

    console.error([
      'GB 2760 promote completed',
      'status=failed',
      'scanned=unknown',
      'approved=unknown',
      'promoted=0',
      'failed=1',
      `reason=${message}`
    ].join(' '));
    process.exitCode = 1;
    return;
  }

  const status = result.failedRows > 0 ? 'failed' : 'succeeded';
  await recordImportRun(client.db, {
    id: runId,
    sourceDocumentId: sourceDocument.id,
    runType: 'promote',
    startedAt,
    endedAt: new Date(),
    totalRows: result.approvedRows,
    succeededRows: result.promotedRows,
    failedRows: result.failedRows,
    status,
    note: [
      'Promote manually approved GB 2760 staging rows into additive_usage_rules',
      `scanned=${result.scannedRows}`,
      `pending_review=${result.pendingReviewRows}`,
      `already_verified=${result.alreadyVerifiedRows}`
    ].join('; ')
  }, result.errors.map((error, index) => ({
    id: `${runId}-error-${String(index + 1).padStart(3, '0')}`,
    importRunId: runId,
    rowRef: error.row.id,
    reason: error.reasons.join('; '),
    rawSourceText: error.row.rawSourceText
  })));

  console.log([
    'GB 2760 promote completed',
    `status=${status}`,
    `scanned=${result.scannedRows}`,
    `approved=${result.approvedRows}`,
    `promoted=${result.promotedRows}`,
    `failed=${result.failedRows}`,
    `pending_review=${result.pendingReviewRows}`,
    `already_verified=${result.alreadyVerifiedRows}`
  ].join(' '));

  if (result.failedRows > 0) {
    process.exitCode = 1;
  }
}

function resolveGb2760SourceMetadata(module: { gb2760OfficialStagingSource?: unknown }): Gb2760SourceMetadata {
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

function createPromoteRunId(startedAt: Date) {
  const timestamp = startedAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `import-run-gb2760-promote-${timestamp}-${randomUUID().slice(0, 8)}`;
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
