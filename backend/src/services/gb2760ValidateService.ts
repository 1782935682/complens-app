import {
  additiveUsageRules,
  gb2760OfficialRecords,
  importErrors,
  importRuns,
  ingredients,
  type AdditiveUsageRuleRow,
  type Gb2760OfficialRecordRow,
  type ImportErrorRow,
  type ImportRunRow,
  type IngredientRow
} from '../db/schema.js';
import type { Database } from '../db/client.js';
import { getGb2760AdditiveIdentityKey, validatePromotionCandidate } from './gb2760PromoteService.js';

export type Gb2760ValidationIssue = {
  code: string;
  ref: string;
  message: string;
};

export type Gb2760ValidationReport = {
  stagingRows: number;
  pendingReviewRows: number;
  approvedRows: number;
  promotedRows: number;
  legacyVerifiedRows: number;
  mappedCandidateRows: number;
  additiveUsageRules: number;
  verifiedRegulationIngredients: number;
  latestImportRuns: Array<{
    runType: string;
    status: string;
    totalRows: number;
    succeededRows: number;
    failedRows: number;
  }>;
  importErrorRows: number;
  issues: Gb2760ValidationIssue[];
};

export type Gb2760ValidationInput = {
  stagingRows: Gb2760OfficialRecordRow[];
  usageRules: AdditiveUsageRuleRow[];
  ingredientRows: IngredientRow[];
  importRunRows?: ImportRunRow[];
  importErrorRows?: ImportErrorRow[];
};

const allowedDbReviewStatuses = new Set(['pending_review', 'mapped_candidate', 'approved', 'promoted', 'verified']);
const requiredSeedImportRunTypes = ['a1_staging', 'fulltext', 'reference_tables'] as const;
const requiredIngredientSourceFields = [
  'sourceName',
  'sourceVersion',
  'sourceUrl',
  'effectiveDate',
  'reviewNote',
  'regulatoryBasis',
  'rawSourceText'
] as const;

export async function validateGb2760Database(db: Database): Promise<Gb2760ValidationReport> {
  const [stagingRows, usageRules, ingredientRows, importRunRows, importErrorRows] = await Promise.all([
    db.select().from(gb2760OfficialRecords),
    db.select().from(additiveUsageRules),
    db.select().from(ingredients),
    db.select().from(importRuns),
    db.select().from(importErrors)
  ]);

  return validateGb2760State({
    stagingRows,
    usageRules,
    ingredientRows,
    importRunRows,
    importErrorRows
  });
}

export function validateGb2760State(input: Gb2760ValidationInput): Gb2760ValidationReport {
  const issues: Gb2760ValidationIssue[] = [];
  const stagingById = new Map(input.stagingRows.map((row) => [row.id, row]));
  const stagingRowsByIngredientId = groupStagingRowsByIngredientId(input.stagingRows);
  const stagingRowsByAdditiveIdentity = groupStagingRowsByAdditiveIdentity(input.stagingRows);
  const ingredientById = new Map(input.ingredientRows.map((row) => [row.id, row]));
  const ingredientIds = new Set(ingredientById.keys());
  const rulesBySourceId = new Map<string, AdditiveUsageRuleRow[]>();
  const seenRuleSourceIds = new Set<string>();
  const latestImportRuns = getLatestImportRuns(input.importRunRows || []);
  const latestImportRunByType = new Map(latestImportRuns.map((run) => [run.runType, run]));

  if (input.stagingRows.length === 0) {
    addIssue(issues, 'missing_gb2760_staging_rows', 'gb2760_official_records', 'GB 2760 validation requires seeded staging rows');
  }

  for (const row of input.stagingRows) {
    if (!allowedDbReviewStatuses.has(row.reviewStatus)) {
      addIssue(issues, 'invalid_staging_review_status', row.id, `DB staging reviewStatus must be one of ${Array.from(allowedDbReviewStatuses).join(', ')}, got ${row.reviewStatus}`);
    }

    if (row.reviewStatus === 'needs_review') {
      addIssue(issues, 'unmapped_needs_review_status', row.id, 'DB staging rows must be normalized to pending_review before validation');
    }

    if (row.reviewStatus === 'approved' || row.reviewStatus === 'promoted') {
      for (const reason of validatePromotionCandidate(row, ingredientIds)) {
        addIssue(issues, 'invalid_promote_candidate', row.id, `Approved/promoted staging row cannot enter the formal rule table: ${reason}`);
      }
    }

    if (requiresStagingReviewAudit(row) && !hasStagingReviewAudit(row)) {
      addIssue(issues, 'missing_staging_review_audit', row.id, 'Reviewed GB 2760 staging rows must preserve reviewedBy, reviewedAt, and reviewNote');
    }
  }

  for (const rule of input.usageRules) {
    const sourceRules = rulesBySourceId.get(rule.sourceStagingId) || [];
    sourceRules.push(rule);
    rulesBySourceId.set(rule.sourceStagingId, sourceRules);

    if (seenRuleSourceIds.has(rule.sourceStagingId)) {
      addIssue(issues, 'duplicate_usage_rule_source', rule.id, `Multiple additive_usage_rules rows reference staging row ${rule.sourceStagingId}`);
    }
    seenRuleSourceIds.add(rule.sourceStagingId);
  }

  for (const rule of input.usageRules) {
    validateUsageRule(
      rule,
      stagingById,
      stagingRowsByIngredientId,
      stagingRowsByAdditiveIdentity,
      rulesBySourceId,
      ingredientById,
      ingredientIds,
      issues
    );
  }

  for (const row of input.stagingRows) {
    if (row.reviewStatus === 'promoted' && !rulesBySourceId.has(row.id)) {
      addIssue(issues, 'promoted_staging_without_rule', row.id, 'Promoted staging rows must have a matching additive_usage_rules row');
    }
  }

  for (const ingredient of input.ingredientRows) {
    validateIngredientRegulatoryBoundary(ingredient, issues);
  }

  for (const runType of requiredSeedImportRunTypes) {
    const run = latestImportRunByType.get(runType);
    if (!run) {
      addIssue(issues, 'missing_seed_import_run', runType, `Missing latest ${runType} GB 2760 seed import run`);
      continue;
    }
    if (run.totalRows <= 0 || run.succeededRows <= 0) {
      addIssue(issues, 'empty_seed_import_run', runType, `Latest ${runType} import run must have non-zero totalRows and succeededRows`);
    }
  }

  for (const run of latestImportRuns) {
    if (run.status !== 'succeeded') {
      addIssue(issues, 'latest_import_run_failed', run.runType, `Latest ${run.runType} import run status is ${run.status}`);
    }
    if (run.failedRows > 0) {
      addIssue(issues, 'latest_import_run_has_failed_rows', run.runType, `Latest ${run.runType} import run has ${run.failedRows} failed rows`);
    }
  }

  return {
    stagingRows: input.stagingRows.length,
    pendingReviewRows: countRows(input.stagingRows, (row) => row.reviewStatus === 'pending_review'),
    approvedRows: countRows(input.stagingRows, (row) => row.reviewStatus === 'approved'),
    promotedRows: countRows(input.stagingRows, (row) => row.reviewStatus === 'promoted'),
    legacyVerifiedRows: countRows(input.stagingRows, (row) => row.reviewStatus === 'verified'),
    mappedCandidateRows: countRows(input.stagingRows, (row) => row.reviewStatus === 'mapped_candidate'),
    additiveUsageRules: input.usageRules.length,
    verifiedRegulationIngredients: countRows(input.ingredientRows, (row) => row.dataStatus === 'verified_regulation'),
    latestImportRuns: latestImportRuns.map((run) => ({
      runType: run.runType,
      status: run.status,
      totalRows: run.totalRows,
      succeededRows: run.succeededRows,
      failedRows: run.failedRows
    })),
    importErrorRows: (input.importErrorRows || []).length,
    issues
  };
}

function requiresStagingReviewAudit(row: Gb2760OfficialRecordRow) {
  return row.reviewStatus === 'mapped_candidate'
    || row.reviewStatus === 'approved'
    || row.reviewStatus === 'promoted'
    || row.reviewStatus === 'verified';
}

function hasStagingReviewAudit(row: Gb2760OfficialRecordRow) {
  return Boolean(String(row.reviewedBy || '').trim())
    && Boolean(row.reviewedAt)
    && Boolean(String(row.reviewNote || '').trim());
}

function validateUsageRule(
  rule: AdditiveUsageRuleRow,
  stagingById: Map<string, Gb2760OfficialRecordRow>,
  stagingRowsByIngredientId: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  stagingRowsByAdditiveIdentity: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  rulesBySourceId: ReadonlyMap<string, AdditiveUsageRuleRow[]>,
  ingredientById: Map<string, IngredientRow>,
  ingredientIds: ReadonlySet<string>,
  issues: Gb2760ValidationIssue[]
) {
  if (rule.dataStatus !== 'verified_regulation') {
    addIssue(issues, 'invalid_usage_rule_data_status', rule.id, 'additive_usage_rules.dataStatus must be verified_regulation');
  }

  const source = stagingById.get(rule.sourceStagingId);
  if (!source) {
    addIssue(issues, 'missing_usage_rule_source', rule.id, `sourceStagingId ${rule.sourceStagingId} does not exist in gb2760_official_records`);
    return;
  }

  if (source.reviewStatus !== 'promoted') {
    addIssue(issues, 'usage_rule_source_not_promoted', rule.id, `source staging row must be promoted, got ${source.reviewStatus}`);
  }

  for (const reason of validatePromotionCandidate(source, ingredientIds)) {
    addIssue(issues, 'invalid_usage_rule_source', rule.id, `source staging row fails formal admission rule: ${reason}`);
  }

  const ingredient = ingredientById.get(rule.ingredientId);
  if (!ingredient) {
    addIssue(issues, 'missing_usage_rule_ingredient', rule.id, `ingredientId ${rule.ingredientId} does not exist`);
  } else {
    validateUsageRuleIngredient(
      rule,
      source,
      ingredient,
      hasCompleteIngredientPromotionCoverage(
        rule.ingredientId,
        source,
        stagingRowsByIngredientId,
        stagingRowsByAdditiveIdentity,
        rulesBySourceId
      ),
      issues
    );
  }

  compareField(rule, source, 'ingredientId', issues);
  compareField(rule, source, 'foodCategoryCode', issues);
  compareField(rule, source, 'foodCategoryName', issues);
  compareField(rule, source, 'maxUseLevel', issues);
  compareField(rule, source, 'unit', issues);
  compareField(rule, source, 'functionText', issues);
  compareField(rule, source, 'note', issues);

  if (rule.sourcePage !== source.pdfPage) {
    addIssue(issues, 'usage_rule_source_page_mismatch', rule.id, `sourcePage must preserve source pdfPage ${source.pdfPage}`);
  }

  if (rule.sourceTable !== source.tableName) {
    addIssue(issues, 'usage_rule_source_table_mismatch', rule.id, `sourceTable must preserve source tableName ${source.tableName}`);
  }

  if (rule.sourceHash !== source.pdfSha256) {
    addIssue(issues, 'usage_rule_source_hash_mismatch', rule.id, 'sourceHash must preserve source pdfSha256');
  }

  if (source.maxUseLevel === '按生产需要适量使用' && rule.maxUseLevel !== '按生产需要适量使用') {
    addIssue(issues, 'quantum_satis_rewritten', rule.id, '按生产需要适量使用 must not be rewritten as a numeric value');
  }
}

function validateUsageRuleIngredient(
  rule: AdditiveUsageRuleRow,
  source: Gb2760OfficialRecordRow,
  ingredient: IngredientRow,
  hasCompleteIngredientCoverage: boolean,
  issues: Gb2760ValidationIssue[]
) {
  if (!hasCompleteIngredientCoverage) {
    return;
  }

  if (ingredient.dataStatus !== 'verified_regulation') {
    addIssue(issues, 'usage_rule_ingredient_not_verified_regulation', rule.id, `ingredient ${ingredient.id} must expose dataStatus verified_regulation`);
  }

  if (ingredient.sourceScope !== 'gb_2760_regulation') {
    addIssue(issues, 'usage_rule_ingredient_wrong_scope', rule.id, `ingredient ${ingredient.id} must expose sourceScope gb_2760_regulation`);
  }

  if (!ingredient.isVerified) {
    addIssue(issues, 'usage_rule_ingredient_not_verified', rule.id, `ingredient ${ingredient.id} must set isVerified true`);
  }

  const usageLimit = toIngredientUsageLimit(source);
  const hasUsageLimit = Array.isArray(ingredient.usageLimits)
    && ingredient.usageLimits.some((item) => (
      item?.foodCategory === usageLimit.foodCategory
        && item?.limit === usageLimit.limit
        && (item?.note || '') === usageLimit.note
    ));
  if (!hasUsageLimit) {
    addIssue(issues, 'usage_rule_missing_ingredient_usage_limit', rule.id, `ingredient ${ingredient.id} must expose usage limit ${usageLimit.foodCategory} / ${usageLimit.limit} / ${usageLimit.note}`);
  }

  for (const field of requiredIngredientSourceFields) {
    if (!hasText(ingredient[field])) {
      addIssue(issues, 'usage_rule_ingredient_missing_source_field', rule.id, `ingredient ${ingredient.id} must keep ${field}`);
    }
  }
}

function groupStagingRowsByIngredientId(rows: Gb2760OfficialRecordRow[]) {
  const groups = new Map<string, Gb2760OfficialRecordRow[]>();
  for (const row of rows) {
    if (!row.ingredientId) continue;
    const group = groups.get(row.ingredientId) || [];
    group.push(row);
    groups.set(row.ingredientId, group);
  }
  return groups;
}

function groupStagingRowsByAdditiveIdentity(rows: Gb2760OfficialRecordRow[]) {
  const groups = new Map<string, Gb2760OfficialRecordRow[]>();
  for (const row of rows) {
    const key = getGb2760AdditiveIdentityKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function hasCompleteIngredientPromotionCoverage(
  ingredientId: string,
  source: Gb2760OfficialRecordRow,
  stagingRowsByIngredientId: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  stagingRowsByAdditiveIdentity: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  rulesBySourceId: ReadonlyMap<string, AdditiveUsageRuleRow[]>
) {
  const coverageRows = getIngredientPromotionCoverageRows(
    ingredientId,
    source,
    stagingRowsByIngredientId,
    stagingRowsByAdditiveIdentity
  );
  return coverageRows.length > 0
    && coverageRows.every((row) => row.reviewStatus === 'promoted' && rulesBySourceId.has(row.id));
}

function getIngredientPromotionCoverageRows(
  ingredientId: string,
  source: Gb2760OfficialRecordRow,
  stagingRowsByIngredientId: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  stagingRowsByAdditiveIdentity: ReadonlyMap<string, Gb2760OfficialRecordRow[]>
) {
  const rowsById = new Map<string, Gb2760OfficialRecordRow>();
  for (const row of stagingRowsByIngredientId.get(ingredientId) || []) {
    rowsById.set(row.id, row);
  }
  for (const row of stagingRowsByAdditiveIdentity.get(getGb2760AdditiveIdentityKey(source)) || []) {
    rowsById.set(row.id, row);
  }
  return [...rowsById.values()];
}

function toIngredientUsageLimit(source: Gb2760OfficialRecordRow) {
  return {
    foodCategory: source.foodCategoryCode === '—'
      ? source.foodCategoryName
      : `${source.foodCategoryCode} ${source.foodCategoryName}`,
    limit: source.unit ? `${source.maxUseLevel} ${source.unit}` : source.maxUseLevel,
    note: [
      `${source.standardCode} ${source.tableName}`,
      `PDF page ${source.pdfPage}`,
      `标准页 ${source.standardPage}`,
      source.note
    ].filter(Boolean).join('；')
  };
}

function validateIngredientRegulatoryBoundary(ingredient: IngredientRow, issues: Gb2760ValidationIssue[]) {
  if (ingredient.dataStatus === 'verified_regulation') {
    if (ingredient.sourceScope !== 'gb_2760_regulation') {
      addIssue(issues, 'verified_regulation_wrong_scope', ingredient.id, 'verified_regulation ingredients must use sourceScope gb_2760_regulation');
    }

    if (!ingredient.isVerified) {
      addIssue(issues, 'verified_regulation_not_verified', ingredient.id, 'verified_regulation ingredients must set isVerified true');
    }

    if (!Array.isArray(ingredient.usageLimits) || ingredient.usageLimits.length === 0) {
      addIssue(issues, 'verified_regulation_missing_usage_limits', ingredient.id, 'verified_regulation ingredients must keep GB 2760 usageLimits');
    }

    for (const field of requiredIngredientSourceFields) {
      if (!hasText(ingredient[field])) {
        addIssue(issues, 'verified_regulation_missing_source_field', ingredient.id, `verified_regulation ingredients must keep ${field}`);
      }
    }
  }

  if (ingredient.dataStatus === 'verified_jecfa' && Array.isArray(ingredient.usageLimits) && ingredient.usageLimits.length > 0) {
    addIssue(issues, 'jecfa_usage_limits_present', ingredient.id, 'verified_jecfa rows must not carry GB 2760 usageLimits');
  }

  if ((ingredient.dataStatus === 'unverified' || ingredient.dataStatus === 'mapped_candidate') && ingredient.isVerified) {
    addIssue(issues, 'unverified_marked_verified', ingredient.id, `${ingredient.dataStatus} rows must not set isVerified true`);
  }
}

function compareField(
  rule: AdditiveUsageRuleRow,
  source: Gb2760OfficialRecordRow,
  field: 'ingredientId' | 'foodCategoryCode' | 'foodCategoryName' | 'maxUseLevel' | 'unit' | 'functionText' | 'note',
  issues: Gb2760ValidationIssue[]
) {
  if (rule[field] !== source[field]) {
    addIssue(issues, 'usage_rule_field_rewritten', rule.id, `${field} must preserve source staging value`);
  }
}

function getLatestImportRuns(rows: ImportRunRow[]) {
  const latestByType = new Map<string, ImportRunRow>();

  for (const row of rows) {
    const current = latestByType.get(row.runType);
    if (!current || row.startedAt.getTime() > current.startedAt.getTime()) {
      latestByType.set(row.runType, row);
    }
  }

  return Array.from(latestByType.values()).sort((a, b) => a.runType.localeCompare(b.runType));
}

function addIssue(issues: Gb2760ValidationIssue[], code: string, ref: string, message: string) {
  issues.push({ code, ref, message });
}

function countRows<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}
