import { eq, inArray } from 'drizzle-orm';
import {
  additiveUsageRules,
  gb2760OfficialRecords,
  ingredients,
  type AdditiveUsageRuleRow,
  type Gb2760PromotionBaseState,
  type Gb2760OfficialRecordRow,
  type IngredientRow,
  type NewAdditiveUsageRuleRow,
  type NewIngredientRow,
  type SourceReference,
  type UsageLimit
} from '../db/schema.js';
import type { Database } from '../db/client.js';

const promotedIngredientSourceNote = 'GB 2760-2024 official usage rules promoted from manually approved staging rows.';

export type PromoteCandidateError = {
  row: Gb2760OfficialRecordRow;
  reasons: string[];
};

export type PromoteGb2760Result = {
  scannedRows: number;
  pendingReviewRows: number;
  alreadyVerifiedRows: number;
  approvedRows: number;
  promotedRows: number;
  failedRows: number;
  errors: PromoteCandidateError[];
};

export function isApprovedForPromotion(row: Pick<Gb2760OfficialRecordRow, 'reviewStatus'>) {
  return row.reviewStatus === 'approved' || row.reviewStatus === 'promoted';
}

export function isPromotedForReconciliation(row: Pick<Gb2760OfficialRecordRow, 'reviewStatus'>) {
  return row.reviewStatus === 'promoted';
}

export function isPendingReviewStatus(row: Pick<Gb2760OfficialRecordRow, 'reviewStatus'>) {
  return row.reviewStatus === 'pending_review' || row.reviewStatus === 'needs_review' || row.reviewStatus === 'mapped_candidate';
}

export function getStaleFormalRuleSourceIds(rules: Pick<AdditiveUsageRuleRow, 'sourceStagingId'>[], validSourceIds: string[]) {
  const validSourceIdSet = new Set(validSourceIds);
  return rules
    .map((rule) => rule.sourceStagingId)
    .filter((sourceId) => !validSourceIdSet.has(sourceId));
}

export function getAffectedPromotionIngredientIds(
  validStagingRows: Pick<Gb2760OfficialRecordRow, 'ingredientId'>[],
  existingRules: Pick<AdditiveUsageRuleRow, 'sourceStagingId' | 'ingredientId'>[],
  validRuleRows: Pick<NewAdditiveUsageRuleRow, 'sourceStagingId' | 'ingredientId'>[],
  staleSourceIds: string[]
) {
  const affectedIngredientIds = new Set(validStagingRows.map((row) => row.ingredientId).filter(Boolean) as string[]);
  const staleSourceIdSet = new Set(staleSourceIds);
  const validIngredientBySourceId = new Map(validRuleRows.map((rule) => [rule.sourceStagingId, rule.ingredientId]));

  for (const rule of existingRules) {
    const validIngredientId = validIngredientBySourceId.get(rule.sourceStagingId);
    if (staleSourceIdSet.has(rule.sourceStagingId) || (validIngredientId && validIngredientId !== rule.ingredientId)) {
      affectedIngredientIds.add(rule.ingredientId);
    }
  }

  return affectedIngredientIds;
}

export function hasFullPromotionCoverage(
  ingredientId: string,
  sourceRows: Gb2760OfficialRecordRow[],
  stagingRowsByIngredientId: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  stagingRowsByAdditiveIdentity: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  validSourceIds: ReadonlySet<string>
) {
  const coverageRows = getPromotionCoverageRows(
    ingredientId,
    sourceRows,
    stagingRowsByIngredientId,
    stagingRowsByAdditiveIdentity
  );
  return coverageRows.length > 0 && coverageRows.every((row) => validSourceIds.has(row.id));
}

export function getGb2760AdditiveIdentityKey(row: Pick<Gb2760OfficialRecordRow, 'additiveNameCn' | 'additiveNameEn' | 'cnsNumber' | 'insNumber'>) {
  return [
    row.additiveNameCn,
    row.additiveNameEn,
    row.cnsNumber,
    row.insNumber
  ].map(normalizeIdentityField).join('\n');
}

export function validatePromotionCandidate(row: Gb2760OfficialRecordRow, ingredientIds?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  requireField(row.ingredientId, 'ingredientId', errors);
  if (row.ingredientId && ingredientIds && !ingredientIds.has(row.ingredientId)) {
    errors.push(`ingredientId ${row.ingredientId} does not exist`);
  }
  requireField(row.additiveNameCn, 'additiveNameCn', errors);
  requireTraceableCode(row, errors);
  requireField(row.functionText, 'functionText', errors);
  requireField(row.foodCategoryCode, 'foodCategoryCode', errors);
  requireField(row.foodCategoryName, 'foodCategoryName', errors);
  requireField(row.maxUseLevel, 'maxUseLevel', errors);
  requireField(row.rawSourceText, 'rawSourceText', errors);
  requirePositiveInteger(row.pdfPage, 'sourcePage', errors);
  requireField(row.tableName, 'sourceTable', errors);
  requireField(row.pdfSha256, 'sourceHash', errors);
  if (row.tableName !== '表 A.1') {
    errors.push('sourceTable must be 表 A.1');
  }
  return errors;
}

export function toAdditiveUsageRuleRow(row: Gb2760OfficialRecordRow, ingredientIds?: ReadonlySet<string>): NewAdditiveUsageRuleRow {
  const errors = validatePromotionCandidate(row, ingredientIds);
  if (errors.length > 0) {
    throw new Error(`Cannot promote ${row.id}: ${errors.join(', ')}`);
  }

  return {
    id: `additive-usage-rule-${row.id.replace(/^gb2760-2024-a1-/, '')}`,
    ingredientId: row.ingredientId as string,
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName,
    maxUseLevel: row.maxUseLevel,
    unit: row.unit,
    functionText: row.functionText,
    note: row.note,
    sourceStagingId: row.id,
    sourcePage: row.pdfPage,
    sourceTable: row.tableName,
    sourceHash: row.pdfSha256,
    dataStatus: 'verified_regulation'
  };
}

export function toPromotedIngredientPatch(
  ingredient: IngredientRow,
  sourceRows: Gb2760OfficialRecordRow[],
  reviewedAt = new Date()
): Partial<NewIngredientRow> {
  if (sourceRows.length === 0) {
    throw new Error(`Cannot update ${ingredient.id}: no promoted GB 2760 source rows`);
  }

  const primary = sourceRows[0];
  const reviewedDate = reviewedAt.toISOString().slice(0, 10);
  const promotionBaseState = getGb2760PromotionBaseState(ingredient);

  return {
    dataStatus: 'verified_regulation',
    reviewStatus: 'verified',
    isVerified: true,
    sourceName: primary.sourceName,
    sourceType: primary.sourceType,
    sourceScope: 'gb_2760_regulation',
    sourceVersion: primary.standardCode,
    sourceUrl: primary.sourceUrl,
    effectiveDate: getGb2760EffectiveDate(primary),
    confidenceLevel: 'high',
    matchConfidence: 'high',
    lastReviewedAt: reviewedDate,
    reviewNote: `已从 ${primary.standardCode} 官方 PDF ${primary.tableName} 导入条款级使用范围和最大使用量；仅代表该食品添加剂的 GB 2760 使用规定已核对。`,
    reviewedBy: 'gb2760-promote',
    reviewedAt,
    changeNote: `GB 2760 promote verified ${sourceRows.length} usage rule(s)`,
    updatedAt: reviewedDate,
    sourceNote: getPromotedIngredientSourceNote(ingredient, promotionBaseState),
    sourceReferences: mergeSourceReferences(ingredient.sourceReferences, [toSourceReference(primary)]),
    regulatoryBasis: `${primary.standardCode} ${primary.tableName}`,
    rawSourceText: getPromotedRawSourceText(sourceRows),
    gbCode: getPromotedGbCode(ingredient, sourceRows),
    gbStatus: getPromotedGbStatus(sourceRows),
    usageLimits: sourceRows.map(toUsageLimit),
    foodCategories: mergeTextList([], sourceRows.map(formatFoodCategory)),
    gb2760PromotionBaseState: promotionBaseState,
    syncedAt: reviewedAt
  };
}

export function toPartiallyPromotedIngredientPatch(
  ingredient: IngredientRow,
  sourceRows: Gb2760OfficialRecordRow[],
  reviewedAt = new Date()
): Partial<NewIngredientRow> {
  if (sourceRows.length === 0) {
    throw new Error(`Cannot update ${ingredient.id}: no partially promoted GB 2760 source rows`);
  }

  const reviewedDate = reviewedAt.toISOString().slice(0, 10);
  const auditPatch = {
    reviewedBy: 'gb2760-promote',
    reviewedAt,
    changeNote: `GB 2760 promote stored ${sourceRows.length} partial formal usage rule(s); ingredient summary awaits complete staging review`,
    updatedAt: reviewedDate,
    syncedAt: reviewedAt
  };

  if (ingredient.gb2760PromotionBaseState) {
    return {
      ...auditPatch,
      ...ingredient.gb2760PromotionBaseState,
      gb2760PromotionBaseState: null
    };
  }

  if (!isPromotionGeneratedIngredient(ingredient)) {
    return auditPatch;
  }

  return {
    ...auditPatch,
    dataStatus: 'unverified',
    reviewStatus: 'reviewed',
    isVerified: false,
    sourceName: '待人工复核',
    sourceType: 'unknown',
    sourceScope: 'unknown',
    sourceVersion: '',
    sourceUrl: '',
    effectiveDate: '待人工核验',
    confidenceLevel: 'unverified',
    matchConfidence: 'low',
    lastReviewedAt: reviewedDate,
    reviewNote: '已有部分 GB 2760 正式使用规则存入 additive_usage_rules；由于同一成分仍有待复核 staging 行，ingredient 摘要不展示为已验证法规结论。',
    sourceNote: 'GB 2760 partial formal usage rules are stored separately; ingredient summary awaits complete staging review.',
    sourceReferences: removePromotedGb2760SourceReferences(ingredient.sourceReferences),
    regulatoryBasis: 'GB 2760 staging evidence is partially promoted and requires remaining manual review before ingredient-level exposure.',
    rawSourceText: 'GB 2760 partial formal usage rules are withheld from ingredient summary until all staging rows for this ingredient are reviewed.',
    gbCode: '',
    gbStatus: 'unknown',
    usageLimits: [],
    foodCategories: [],
    gb2760PromotionBaseState: null
  };
}

export function toDemotedIngredientPatch(
  ingredient: IngredientRow,
  reviewedAt = new Date()
): Partial<NewIngredientRow> {
  const reviewedDate = reviewedAt.toISOString().slice(0, 10);
  const auditPatch = {
    reviewedBy: 'gb2760-promote',
    reviewedAt,
    changeNote: 'GB 2760 promote removed stale formal usage rules',
    updatedAt: reviewedDate,
    syncedAt: reviewedAt
  };

  if (ingredient.gb2760PromotionBaseState) {
    return {
      ...auditPatch,
      ...ingredient.gb2760PromotionBaseState,
      gb2760PromotionBaseState: null
    };
  }

  if (!isPromotionGeneratedIngredient(ingredient)) {
    return auditPatch;
  }

  return {
    ...auditPatch,
    dataStatus: 'unverified',
    reviewStatus: 'reviewed',
    isVerified: false,
    sourceName: '待人工复核',
    sourceType: 'unknown',
    sourceScope: 'unknown',
    sourceVersion: '',
    sourceUrl: '',
    effectiveDate: '待人工核验',
    confidenceLevel: 'unverified',
    matchConfidence: 'low',
    lastReviewedAt: reviewedDate,
    reviewNote: '已移除 GB 2760 promoted 使用规则；当前成分没有可保留的基础来源状态，需要重新人工复核后才能展示法规结论。',
    sourceNote: 'GB 2760 formal usage rules were removed after staging review demotion or source invalidation.',
    sourceReferences: removePromotedGb2760SourceReferences(ingredient.sourceReferences),
    regulatoryBasis: 'GB 2760 staging evidence requires manual review before formal usage limits are exposed.',
    rawSourceText: 'GB 2760 formal usage rules removed because staging evidence is no longer promoted.',
    gbCode: '',
    gbStatus: 'unknown',
    usageLimits: [],
    foodCategories: [],
    gb2760PromotionBaseState: null
  };
}

export async function promoteApprovedGb2760Rows(db: Database): Promise<PromoteGb2760Result> {
  return applyGb2760Promotions(db, isApprovedForPromotion);
}

export async function reconcilePromotedGb2760Rows(db: Database): Promise<PromoteGb2760Result> {
  return applyGb2760Promotions(db, isPromotedForReconciliation);
}

async function applyGb2760Promotions(
  db: Database,
  isPromotionCandidate: (row: Gb2760OfficialRecordRow) => boolean
): Promise<PromoteGb2760Result> {
  const [rows, ingredientRows] = await Promise.all([
    db.select().from(gb2760OfficialRecords),
    db.select().from(ingredients)
  ]);
  const ingredientById = new Map(ingredientRows.map((row) => [row.id, row]));
  const ingredientIds = new Set(ingredientById.keys());
  const approvedRows = rows.filter(isPromotionCandidate);
  const pendingReviewRows = rows.filter(isPendingReviewStatus).length;
  const alreadyVerifiedRows = rows.filter((row) => row.reviewStatus === 'verified').length;
  const errors: PromoteCandidateError[] = [];
  const validRuleRows: NewAdditiveUsageRuleRow[] = [];
  const validStagingRows: Gb2760OfficialRecordRow[] = [];
  const validSourceIds: string[] = [];

  for (const row of approvedRows) {
    const reasons = validatePromotionCandidate(row, ingredientIds);
    if (reasons.length > 0) {
      errors.push({ row, reasons });
      continue;
    }
    validRuleRows.push(toAdditiveUsageRuleRow(row, ingredientIds));
    validStagingRows.push(row);
    validSourceIds.push(row.id);
  }

  const promotedRowsByIngredientId = groupRowsByIngredientId(validStagingRows);
  const stagingRowsByIngredientId = groupRowsByIngredientId(rows);
  const stagingRowsByAdditiveIdentity = groupRowsByAdditiveIdentity(rows);
  const existingFormalRules = await db.select().from(additiveUsageRules);
  const staleFormalRuleSourceIds = getStaleFormalRuleSourceIds(existingFormalRules, validSourceIds);
  const validSourceIdSet = new Set(validSourceIds);
  const affectedIngredientIds = getAffectedPromotionIngredientIds(
    validStagingRows,
    existingFormalRules,
    validRuleRows,
    staleFormalRuleSourceIds
  );
  const reviewedAt = new Date();

  await db.transaction(async (tx) => {
    if (staleFormalRuleSourceIds.length > 0) {
      await tx
        .delete(additiveUsageRules)
        .where(inArray(additiveUsageRules.sourceStagingId, staleFormalRuleSourceIds));
    }

    for (const rule of validRuleRows) {
      await tx
        .insert(additiveUsageRules)
        .values(rule)
        .onConflictDoUpdate({
          target: additiveUsageRules.sourceStagingId,
          set: rule
        });
    }

    for (const sourceId of validSourceIds) {
      await tx
        .update(gb2760OfficialRecords)
        .set({ reviewStatus: 'promoted' })
        .where(eq(gb2760OfficialRecords.id, sourceId));
    }

    for (const ingredientId of affectedIngredientIds) {
      const ingredient = ingredientById.get(ingredientId);
      if (!ingredient) continue;
      const promotedRows = promotedRowsByIngredientId.get(ingredientId) || [];
      const hasCompleteCoverage = hasFullPromotionCoverage(
        ingredientId,
        promotedRows,
        stagingRowsByIngredientId,
        stagingRowsByAdditiveIdentity,
        validSourceIdSet
      );
      await tx
        .update(ingredients)
        .set(getIngredientPromotionPatch(ingredient, promotedRows, hasCompleteCoverage, reviewedAt))
        .where(eq(ingredients.id, ingredientId));
    }
  });

  return {
    scannedRows: rows.length,
    pendingReviewRows,
    alreadyVerifiedRows,
    approvedRows: approvedRows.length,
    promotedRows: validRuleRows.length,
    failedRows: errors.length,
    errors
  };
}

function getIngredientPromotionPatch(
  ingredient: IngredientRow,
  promotedRows: Gb2760OfficialRecordRow[],
  hasCompleteCoverage: boolean,
  reviewedAt: Date
) {
  if (promotedRows.length === 0) return toDemotedIngredientPatch(ingredient, reviewedAt);
  return hasCompleteCoverage
    ? toPromotedIngredientPatch(ingredient, promotedRows, reviewedAt)
    : toPartiallyPromotedIngredientPatch(ingredient, promotedRows, reviewedAt);
}

function groupRowsByIngredientId(rows: Gb2760OfficialRecordRow[]) {
  const groups = new Map<string, Gb2760OfficialRecordRow[]>();
  for (const row of rows) {
    if (!row.ingredientId) continue;
    const group = groups.get(row.ingredientId) || [];
    group.push(row);
    groups.set(row.ingredientId, group);
  }
  return groups;
}

function groupRowsByAdditiveIdentity(rows: Gb2760OfficialRecordRow[]) {
  const groups = new Map<string, Gb2760OfficialRecordRow[]>();
  for (const row of rows) {
    const key = getGb2760AdditiveIdentityKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function getPromotionCoverageRows(
  ingredientId: string,
  sourceRows: Gb2760OfficialRecordRow[],
  stagingRowsByIngredientId: ReadonlyMap<string, Gb2760OfficialRecordRow[]>,
  stagingRowsByAdditiveIdentity: ReadonlyMap<string, Gb2760OfficialRecordRow[]>
) {
  const rowsById = new Map<string, Gb2760OfficialRecordRow>();
  for (const row of stagingRowsByIngredientId.get(ingredientId) || []) {
    rowsById.set(row.id, row);
  }
  for (const sourceRow of sourceRows) {
    for (const row of stagingRowsByAdditiveIdentity.get(getGb2760AdditiveIdentityKey(sourceRow)) || []) {
      rowsById.set(row.id, row);
    }
  }
  return [...rowsById.values()];
}

function toUsageLimit(row: Gb2760OfficialRecordRow): UsageLimit {
  return {
    foodCategory: formatFoodCategory(row),
    limit: row.unit ? `${row.maxUseLevel} ${row.unit}` : row.maxUseLevel,
    note: [
      `${row.standardCode} ${row.tableName}`,
      `PDF page ${row.pdfPage}`,
      `标准页 ${row.standardPage}`,
      row.note
    ].filter(Boolean).join('；')
  };
}

function toSourceReference(row: Gb2760OfficialRecordRow): SourceReference {
  return {
    title: row.standardTitle,
    standard: row.standardCode,
    region: 'CN',
    url: row.sourceUrl,
    retrievedAt: row.retrievedAt
  };
}

function isPromotionGeneratedIngredient(ingredient: IngredientRow) {
  return ingredient.sourceNote === promotedIngredientSourceNote;
}

function getPromotedIngredientSourceNote(ingredient: IngredientRow, promotionBaseState: Gb2760PromotionBaseState | null) {
  return promotionBaseState
    ? ingredient.sourceNote
    : promotedIngredientSourceNote;
}

function getGb2760PromotionBaseState(ingredient: IngredientRow): Gb2760PromotionBaseState | null {
  if (ingredient.gb2760PromotionBaseState) return ingredient.gb2760PromotionBaseState;
  if (!hasPreservableBaseProvenance(ingredient)) return null;

  return {
    dataStatus: ingredient.dataStatus,
    reviewStatus: ingredient.reviewStatus,
    isVerified: ingredient.isVerified,
    sourceName: ingredient.sourceName,
    sourceType: ingredient.sourceType,
    sourceScope: ingredient.sourceScope,
    sourceVersion: ingredient.sourceVersion,
    sourceUrl: ingredient.sourceUrl,
    effectiveDate: ingredient.effectiveDate,
    confidenceLevel: ingredient.confidenceLevel,
    matchConfidence: ingredient.matchConfidence,
    lastReviewedAt: ingredient.lastReviewedAt,
    reviewNote: ingredient.reviewNote,
    sourceNote: ingredient.sourceNote,
    sourceReferences: ingredient.sourceReferences,
    regulatoryBasis: ingredient.regulatoryBasis,
    rawSourceText: ingredient.rawSourceText,
    gbCode: ingredient.gbCode,
    gbStatus: ingredient.gbStatus,
    usageLimits: ingredient.usageLimits,
    foodCategories: ingredient.foodCategories
  };
}

function hasPreservableBaseProvenance(ingredient: IngredientRow) {
  if (isPromotionGeneratedIngredient(ingredient)) return false;
  return ingredient.dataStatus === 'verified_regulation'
    || ingredient.dataStatus === 'verified_jecfa'
    || ingredient.dataStatus === 'common_ingredient'
    || ingredient.sourceScope === 'jecfa_safety_evaluation'
    || ingredient.sourceScope === 'common_ingredient_lexicon'
    || ingredient.sourceScope === 'seed_reference';
}

function removePromotedGb2760SourceReferences(sourceReferences: SourceReference[]) {
  return sourceReferences.filter((source) => source.standard !== 'GB 2760-2024');
}

function getGb2760EffectiveDate(row: Pick<Gb2760OfficialRecordRow, 'standardCode'>) {
  return row.standardCode === 'GB 2760-2024' ? '2025-02-08' : row.standardCode;
}

function getPromotedGbCode(ingredient: IngredientRow, rows: Gb2760OfficialRecordRow[]) {
  const existing = String(ingredient.gbCode || '').trim();
  if (existing) return existing;

  const insNumbers = rows.flatMap((row) => splitCodeList(row.insNumber));
  if (insNumbers.length > 0) return `INS ${uniqueStrings(insNumbers).join(', ')}`;

  const cnsNumbers = rows.flatMap((row) => splitCodeList(row.cnsNumber));
  if (cnsNumbers.length > 0) return `CNS ${uniqueStrings(cnsNumbers).join(', ')}`;

  return ingredient.gbCode;
}

function getPromotedGbStatus(rows: Gb2760OfficialRecordRow[]) {
  return rows.every(isUnrestrictedGb2760UsageRow) ? 'permitted' : 'restricted';
}

function isUnrestrictedGb2760UsageRow(row: Gb2760OfficialRecordRow) {
  return String(row.foodCategoryCode || '').trim() === '—'
    && String(row.foodCategoryName || '').trim() === '各类食品'
    && String(row.maxUseLevel || '').trim() === '按生产需要适量使用'
    && !String(row.unit || '').trim()
    && !String(row.note || '').trim();
}

function splitCodeList(value: string | null) {
  return String(value || '')
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter((item) => item && item !== '—');
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function normalizeIdentityField(value: string | null) {
  return String(value || '').trim().replace(/\s+/gu, ' ').toLowerCase();
}

function formatFoodCategory(row: Pick<Gb2760OfficialRecordRow, 'foodCategoryCode' | 'foodCategoryName'>) {
  return row.foodCategoryCode === '—'
    ? row.foodCategoryName
    : `${row.foodCategoryCode} ${row.foodCategoryName}`;
}

function mergeUsageLimits(existing: UsageLimit[], additions: UsageLimit[]) {
  const items = [...existing, ...additions];
  return uniqueBy(items, (item) => `${item.foodCategory}\n${item.limit}\n${item.note || ''}`);
}

function mergeSourceReferences(existing: SourceReference[], additions: SourceReference[]) {
  const items = [...existing, ...additions];
  return uniqueBy(items, (item) => `${item.standard}\n${item.title}\n${item.url || ''}`);
}

function mergeTextList(existing: string[], additions: string[]) {
  return [...new Set([...existing, ...additions].map((item) => item.trim()).filter(Boolean))];
}

function mergeRawSourceText(existing: string, additions: string[]) {
  return [...new Set([existing, ...additions].map((item) => item.trim()).filter(Boolean))].join('\n');
}

function getPromotedRawSourceText(sourceRows: Gb2760OfficialRecordRow[]) {
  return mergeRawSourceText('', sourceRows.map((row) => row.rawSourceText));
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function requireField(value: string | null | undefined, field: string, errors: string[]) {
  if (!String(value || '').trim()) {
    errors.push(`missing ${field}`);
  }
}

function requireTraceableCode(row: Gb2760OfficialRecordRow, errors: string[]) {
  if (String(row.cnsNumber || '').trim() || String(row.insNumber || '').trim() || String(row.rawSourceText || '').trim()) {
    return;
  }
  errors.push('missing traceable CNS/INS/rawSourceText');
}

function requirePositiveInteger(value: number | null | undefined, field: string, errors: string[]) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    errors.push(`missing ${field}`);
  }
}
