import { createDatabaseClient } from '../src/db/client.js';
import { validateGb2760Database } from '../src/services/gb2760ValidateService.js';

const client = createDatabaseClient();

try {
  const report = await validateGb2760Database(client.db);
  console.log([
    'GB 2760 validation report:',
    `staging=${report.stagingRows}`,
    `pending_review=${report.pendingReviewRows}`,
    `approved=${report.approvedRows}`,
    `promoted=${report.promotedRows}`,
    `legacy_verified=${report.legacyVerifiedRows}`,
    `mapped_candidate=${report.mappedCandidateRows}`,
    `additive_usage_rules=${report.additiveUsageRules}`,
    `verified_regulation_ingredients=${report.verifiedRegulationIngredients}`,
    `import_errors=${report.importErrorRows}`
  ].join(' '));

  if (report.latestImportRuns.length > 0) {
    console.log(`Latest GB 2760 import runs: ${report.latestImportRuns.map((run) => (
      `${run.runType}:${run.status}:${run.succeededRows}/${run.totalRows} failed=${run.failedRows}`
    )).join(', ')}`);
  }

  if (report.issues.length > 0) {
    console.error(`GB 2760 validation failed with ${report.issues.length} issue(s):`);
    for (const issue of report.issues) {
      console.error(`- [${issue.code}] ${issue.ref}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log('GB 2760 validation passed.');
  }
} finally {
  await client.pool.end();
}
