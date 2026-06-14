import { and, asc, count, desc, eq, inArray, notInArray, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { additiveUsageRules, gb2760OfficialPages, gb2760OfficialRecords, gb2760OfficialReferenceRows, ingredientSources, ingredients, type Gb2760OfficialRecordRow, type Gb2760OfficialReferenceRow, type IngredientRow, type NewGb2760OfficialPageRow, type NewGb2760OfficialRecordRow, type NewGb2760OfficialReferenceRow, type NewIngredientRow, type NewIngredientSourceRow, type SourceReference } from '../db/schema.js';
import { toDemotedIngredientPatch } from './gb2760PromoteService.js';

export const validRiskLevels = ['low', 'medium', 'high', 'unknown'] as const;
export const validConfidenceLevels = ['high', 'medium', 'low', 'unverified'] as const;
export const validDataStatuses = ['verified_regulation', 'verified_jecfa', 'pending_review', 'mapped_candidate', 'common_ingredient', 'unverified', 'unknown_from_ocr'] as const;
export const validSearchSorts = ['relevance', 'risk', 'name'] as const;
export const gb2760ManualReviewStatuses = ['mapped_candidate', 'approved', 'promoted'] as const;
const gb2760SourceReviewedStatuses = ['mapped_candidate', 'approved', 'promoted', 'verified'] as const;
const gb2760ReviewFingerprintFields = [
  'tableName',
  'additiveNameCn',
  'additiveNameEn',
  'cnsNumber',
  'insNumber',
  'functionText',
  'foodCategoryCode',
  'foodCategoryName',
  'maxUseLevel',
  'unit',
  'note',
  'pdfPage',
  'standardPage',
  'rawSourceText',
  'sourceUrl',
  'downloadEndpoint',
  'platformRecordId',
  'announcementRecordId',
  'fileGuid',
  'factName',
  'pdfSha256',
  'extractionStatus'
] as const;

export type RiskLevel = typeof validRiskLevels[number];
export type ConfidenceLevel = typeof validConfidenceLevels[number];
export type DataStatus = typeof validDataStatuses[number];
export type SearchSort = typeof validSearchSorts[number];

export type FoodAdditiveInput = {
  id: string;
  kind: string;
  dataCategory: string;
  nameCn: string;
  nameEn?: string;
  aliases?: string[];
  category: string;
  functions?: string[];
  description: string;
  riskLevel: RiskLevel;
  riskSummary?: string;
  suitableFor?: string[];
  cautionFor?: string[];
  sourceNote: string;
  sourceReferences: SourceReference[];
  reviewStatus: string;
  dataStatus: DataStatus;
  dataVersion: string;
  reviewedBy?: string;
  reviewedAt?: string;
  changeNote?: string;
  updatedAt: string;
  sourceName: string;
  sourceType: string;
  sourceScope: string;
  sourceVersion: string;
  sourceUrl: string;
  effectiveDate: string;
  confidenceLevel: ConfidenceLevel;
  matchConfidence: ConfidenceLevel;
  lastReviewedAt: string;
  reviewNote: string;
  regulatoryBasis: string;
  rawSourceText: string;
  isVerified: boolean;
  gbCode: string;
  gbStatus: string;
  eNumber?: string;
  adi?: string;
  usageLimits?: Array<{ foodCategory: string; limit: string; note?: string }>;
  foodCategories?: string[];
  allergenTypes?: string[];
  cautionGroups?: string[];
};

export type Gb2760OfficialRecordInput = {
  id: string;
  ingredientId?: string;
  standardCode: string;
  standardTitle: string;
  tableName: string;
  additiveNameCn: string;
  additiveNameEn?: string;
  cnsNumber?: string;
  insNumber?: string;
  functionText: string;
  foodCategoryCode: string;
  foodCategoryName: string;
  maxUseLevel: string;
  unit?: string;
  note?: string;
  pdfPage: number;
  standardPage: number;
  rawSourceText: string;
  sourceName: string;
  sourceType: string;
  sourceUrl: string;
  downloadEndpoint: string;
  platformRecordId: string;
  announcementRecordId: string;
  fileGuid: string;
  factName: string;
  pdfSha256: string;
  retrievedAt: string;
  extractionStatus: string;
  reviewStatus: string;
};

export type Gb2760OfficialPageInput = {
  id: string;
  standardCode: string;
  standardTitle: string;
  pdfPage: number;
  standardPageLabel?: string;
  text: string;
  textSha256: string;
  sourceName: string;
  sourceType: string;
  sourceUrl: string;
  downloadEndpoint: string;
  platformRecordId: string;
  announcementRecordId: string;
  fileGuid: string;
  factName: string;
  pdfSha256: string;
  retrievedAt: string;
  extractionTool: string;
  extractionScope: string;
  generatedAt: string;
};

export type Gb2760OfficialReferenceRowInput = {
  id: string;
  standardCode: string;
  standardTitle: string;
  tableName: string;
  tableTitle: string;
  rowNumber: number;
  rowCode: string;
  rowName: string;
  rowData?: Record<string, unknown>;
  pdfPage: number;
  standardPage: number;
  rawSourceText: string;
  sourceName: string;
  sourceType: string;
  sourceUrl: string;
  downloadEndpoint: string;
  platformRecordId: string;
  announcementRecordId: string;
  fileGuid: string;
  factName: string;
  pdfSha256: string;
  retrievedAt: string;
  extractionTool: string;
  extractionScope: string;
  generatedAt: string;
  extractionStatus: string;
  reviewStatus: string;
};

export type IngredientListParams = {
  q?: string;
  category?: string;
  riskLevel?: RiskLevel;
  confidenceLevel?: ConfidenceLevel;
  dataStatus?: DataStatus;
  sort?: SearchSort;
  page: number;
  limit: number;
};

export type IngredientRiskFacet = {
  level: string;
  count: number;
};

export type IngredientCategoryFacet = {
  name: string;
  count: number;
};

export type IngredientListResult = {
  items: IngredientRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  riskFacets: IngredientRiskFacet[];
  categoryFacets: IngredientCategoryFacet[];
};

export type Gb2760IngredientEvidence = {
  stagingRows: Gb2760OfficialRecordRow[];
  referenceRows: Gb2760OfficialReferenceRow[];
};

export type IngredientWithGb2760Evidence = IngredientRow & Gb2760IngredientEvidence;

export type IngredientCategorySummary = {
  name: string;
  count: number;
};

export type BatchSearchParams = {
  terms: string[];
  includeENumbers?: boolean;
};

export type BatchSearchResult = {
  term: string;
  eNumber: string | null;
  match: IngredientRow | null;
  confidence: number;
  matchType: 'exact' | 'alias' | 'eNumber' | 'fuzzy' | 'none';
  alternates: IngredientRow[];
};

export type IngredientService = {
  listIngredients(params: IngredientListParams): Promise<IngredientListResult>;
  getIngredientById(id: string): Promise<IngredientRow | null>;
  getIngredientWithGb2760Evidence(id: string): Promise<IngredientWithGb2760Evidence | null>;
  getCategorySummaries(): Promise<IngredientCategorySummary[]>;
  batchSearch(params: BatchSearchParams): Promise<BatchSearchResult[]>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: IngredientService | null = null;

export function isRiskLevel(value: string): value is RiskLevel {
  return validRiskLevels.includes(value as RiskLevel);
}

export function isConfidenceLevel(value: string): value is ConfidenceLevel {
  return validConfidenceLevels.includes(value as ConfidenceLevel);
}

export function isDataStatus(value: string): value is DataStatus {
  return validDataStatuses.includes(value as DataStatus);
}

export function isSearchSort(value: string): value is SearchSort {
  return validSearchSorts.includes(value as SearchSort);
}

export function createIngredientService(db: Database): IngredientService {
  return {
    async listIngredients(params) {
      const where = buildIngredientWhere(params);
      const offset = (params.page - 1) * params.limit;
      const [{ total }] = await db
        .select({ total: count() })
        .from(ingredients)
        .where(where);
      const rows = await db
        .select()
        .from(ingredients)
        .where(where)
        .orderBy(...buildIngredientOrderBy(params.sort))
        .limit(params.limit)
        .offset(offset);
      const [riskFacets, categoryFacets] = await Promise.all([
        getRiskFacets(db, params),
        getCategoryFacets(db, params)
      ]);

      return {
        items: rows,
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        riskFacets,
        categoryFacets
      };
    },

    async getIngredientById(id) {
      const [row] = await db.select().from(ingredients).where(eq(ingredients.id, id)).limit(1);
      return row ?? null;
    },

    async getIngredientWithGb2760Evidence(id) {
      const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, id)).limit(1);
      if (!ingredient) return null;
      const stagingRows = await getGb2760StagingEvidence(db, ingredient.id);
      const referenceRows = shouldAttachGb2760ReferenceEvidence(ingredient, stagingRows)
        ? await getGb2760ReferenceEvidence(db, ingredient)
        : [];

      return {
        ...ingredient,
        stagingRows,
        referenceRows
      };
    },

    async getCategorySummaries() {
      const rows = await db
        .select({
          name: ingredients.category,
          count: count()
        })
        .from(ingredients)
        .groupBy(ingredients.category)
        .orderBy(desc(count()), asc(ingredients.category));

      return rows;
    },

    async batchSearch(params) {
      const terms = normalizeBatchTerms(params.terms);
      const results: BatchSearchResult[] = [];
      for (const term of terms) {
        results.push(await searchOneIngredient(db, term, params.includeENumbers !== false));
      }
      return results;
    }
  };
}

export function getDefaultIngredientService(): IngredientService {
  if (!defaultClient) {
    defaultClient = createDatabaseClient();
    defaultService = createIngredientService(defaultClient.db);
  }

  return defaultService as IngredientService;
}

export function createLazyIngredientService(databaseUrl?: string): IngredientService {
  let lazyClient: DatabaseClient | null = null;
  let lazyService: IngredientService | null = null;

  function getLazyService() {
    if (!lazyClient) {
      lazyClient = createDatabaseClient(databaseUrl);
      lazyService = createIngredientService(lazyClient.db);
    }

    return lazyService as IngredientService;
  }

  return {
    listIngredients(params) {
      return getLazyService().listIngredients(params);
    },
    getIngredientById(id) {
      return getLazyService().getIngredientById(id);
    },
    getIngredientWithGb2760Evidence(id) {
      return getLazyService().getIngredientWithGb2760Evidence(id);
    },
    getCategorySummaries() {
      return getLazyService().getCategorySummaries();
    },
    batchSearch(params) {
      return getLazyService().batchSearch(params);
    }
  };
}

export type IngredientUpsertOptions = {
  dataVersion?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  changeNote?: string;
  updateAuditFields?: boolean;
};

export function toIngredientRow(additive: FoodAdditiveInput, options: IngredientUpsertOptions = {}): NewIngredientRow {
  const dataVersion = normalizeAuditText(options.dataVersion) || additive.dataVersion;
  const reviewedBy = normalizeAuditText(options.reviewedBy) || normalizeAuditText(additive.reviewedBy) || 'system';
  const changeNote = normalizeAuditText(options.changeNote) || normalizeAuditText(additive.changeNote) || `Seed import for ${dataVersion}`;
  const reviewedAt = options.reviewedAt ?? parseAuditDate(additive.reviewedAt || additive.lastReviewedAt || additive.updatedAt);

  return {
    id: additive.id,
    kind: additive.kind,
    dataCategory: additive.dataCategory,
    nameCn: additive.nameCn,
    nameEn: additive.nameEn ?? null,
    aliases: additive.aliases ?? [],
    category: additive.category,
    functions: additive.functions ?? [],
    description: additive.description,
    riskLevel: additive.riskLevel,
    riskSummary: additive.riskSummary ?? null,
    suitableFor: additive.suitableFor ?? [],
    cautionFor: additive.cautionFor ?? [],
    sourceNote: additive.sourceNote,
    sourceReferences: additive.sourceReferences ?? [],
    reviewStatus: additive.reviewStatus,
    dataStatus: additive.dataStatus,
    dataVersion,
    reviewedBy,
    reviewedAt,
    changeNote,
    updatedAt: additive.updatedAt,
    sourceName: additive.sourceName,
    sourceType: additive.sourceType,
    sourceScope: additive.sourceScope,
    sourceVersion: additive.sourceVersion,
    sourceUrl: additive.sourceUrl,
    effectiveDate: additive.effectiveDate,
    confidenceLevel: additive.confidenceLevel,
    matchConfidence: additive.matchConfidence,
    lastReviewedAt: additive.lastReviewedAt,
    reviewNote: additive.reviewNote,
    regulatoryBasis: additive.regulatoryBasis,
    rawSourceText: additive.rawSourceText,
    isVerified: additive.isVerified,
    gbCode: additive.gbCode,
    gbStatus: additive.gbStatus,
    eNumber: additive.eNumber ?? null,
    adi: additive.adi ?? null,
    usageLimits: additive.usageLimits ?? [],
    foodCategories: additive.foodCategories ?? [],
    gb2760PromotionBaseState: null,
    allergenTypes: additive.allergenTypes ?? [],
    cautionGroups: additive.cautionGroups ?? [],
    syncedAt: new Date()
  };
}

export function toIngredientSourceRows(additive: FoodAdditiveInput): NewIngredientSourceRow[] {
  return (additive.sourceReferences ?? []).map((source, index) => ({
    ingredientId: additive.id,
    sourceIndex: index,
    title: source.title,
    standard: source.standard,
    region: source.region ?? null,
    url: source.url ?? null,
    publishedAt: source.publishedAt ?? null,
    retrievedAt: source.retrievedAt ?? null
  }));
}

export function toGb2760OfficialRecordRow(record: Gb2760OfficialRecordInput): NewGb2760OfficialRecordRow {
  const reviewStatus = normalizeGb2760ReviewStatus(record.reviewStatus);

  return {
    id: record.id,
    ingredientId: normalizeAuditText(record.ingredientId) || null,
    standardCode: record.standardCode,
    standardTitle: record.standardTitle,
    tableName: record.tableName,
    additiveNameCn: record.additiveNameCn,
    additiveNameEn: record.additiveNameEn ?? null,
    cnsNumber: record.cnsNumber ?? null,
    insNumber: record.insNumber ?? null,
    functionText: record.functionText,
    foodCategoryCode: record.foodCategoryCode,
    foodCategoryName: record.foodCategoryName,
    maxUseLevel: record.maxUseLevel,
    unit: record.unit ?? '',
    note: record.note ?? '',
    pdfPage: record.pdfPage,
    standardPage: record.standardPage,
    rawSourceText: record.rawSourceText,
    sourceName: record.sourceName,
    sourceType: record.sourceType,
    sourceUrl: record.sourceUrl,
    downloadEndpoint: record.downloadEndpoint,
    platformRecordId: record.platformRecordId,
    announcementRecordId: record.announcementRecordId,
    fileGuid: record.fileGuid,
    factName: record.factName,
    pdfSha256: record.pdfSha256,
    retrievedAt: record.retrievedAt,
    extractionStatus: record.extractionStatus,
    reviewStatus,
    ...toGb2760SourceReviewAuditPatch(reviewStatus, record.retrievedAt),
    syncedAt: new Date()
  };
}

export function toGb2760OfficialPageRow(page: Gb2760OfficialPageInput): NewGb2760OfficialPageRow {
  return {
    id: page.id,
    standardCode: page.standardCode,
    standardTitle: page.standardTitle,
    pdfPage: page.pdfPage,
    standardPageLabel: page.standardPageLabel ?? '',
    text: page.text,
    textSha256: page.textSha256,
    sourceName: page.sourceName,
    sourceType: page.sourceType,
    sourceUrl: page.sourceUrl,
    downloadEndpoint: page.downloadEndpoint,
    platformRecordId: page.platformRecordId,
    announcementRecordId: page.announcementRecordId,
    fileGuid: page.fileGuid,
    factName: page.factName,
    pdfSha256: page.pdfSha256,
    retrievedAt: page.retrievedAt,
    extractionTool: page.extractionTool,
    extractionScope: page.extractionScope,
    generatedAt: page.generatedAt,
    syncedAt: new Date()
  };
}

export function toGb2760OfficialReferenceRow(row: Gb2760OfficialReferenceRowInput): NewGb2760OfficialReferenceRow {
  return {
    id: row.id,
    standardCode: row.standardCode,
    standardTitle: row.standardTitle,
    tableName: row.tableName,
    tableTitle: row.tableTitle,
    rowNumber: row.rowNumber,
    rowCode: row.rowCode,
    rowName: row.rowName,
    rowData: row.rowData ?? {},
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
    extractionTool: row.extractionTool,
    extractionScope: row.extractionScope,
    generatedAt: row.generatedAt,
    extractionStatus: row.extractionStatus,
    reviewStatus: normalizeGb2760ReviewStatus(row.reviewStatus),
    syncedAt: new Date()
  };
}

export async function upsertGb2760OfficialRecords(db: Database, records: Gb2760OfficialRecordInput[]) {
  if (records.length === 0) return;
  const recordIds = records.map((record) => record.id);

  await db.transaction(async (tx) => {
    const existingRows = new Map(
      (await tx
        .select()
        .from(gb2760OfficialRecords)
        .where(inArray(gb2760OfficialRecords.id, recordIds)))
        .map((row) => [row.id, row])
    );
    const staleRows = await tx
      .select({ id: gb2760OfficialRecords.id })
      .from(gb2760OfficialRecords)
      .where(notInArray(gb2760OfficialRecords.id, recordIds));
    await removeStaleGb2760FormalRules(tx, staleRows.map((row) => row.id));

    // Official PDF-derived tables are snapshots; keep database rows in lockstep with source files.
    await tx
      .delete(gb2760OfficialRecords)
      .where(notInArray(gb2760OfficialRecords.id, recordIds));

    for (const record of records) {
      const row = toGb2760OfficialRecordRow(record);
      const existingRow = existingRows.get(row.id);
      const preservedRow = preserveGb2760ManualReviewState(row, existingRow);
      await tx
        .insert(gb2760OfficialRecords)
        .values(preservedRow)
        .onConflictDoUpdate({
          target: gb2760OfficialRecords.id,
          set: {
            ...preservedRow,
            createdAt: sql`${gb2760OfficialRecords.createdAt}`
          }
        });
    }
  });
}

async function removeStaleGb2760FormalRules(tx: Database, staleSourceIds: string[]) {
  if (staleSourceIds.length === 0) return;

  const staleRules = await tx
    .select()
    .from(additiveUsageRules)
    .where(inArray(additiveUsageRules.sourceStagingId, staleSourceIds));
  if (staleRules.length === 0) return;

  const affectedIngredientIds = [...new Set(staleRules.map((rule) => rule.ingredientId))];
  await tx
    .delete(additiveUsageRules)
    .where(inArray(additiveUsageRules.sourceStagingId, staleSourceIds));

  const remainingRules = await tx
    .select()
    .from(additiveUsageRules)
    .where(inArray(additiveUsageRules.ingredientId, affectedIngredientIds));
  const ingredientsWithRemainingRules = new Set(remainingRules.map((rule) => rule.ingredientId));
  const demotedIngredientIds = affectedIngredientIds.filter((ingredientId) => !ingredientsWithRemainingRules.has(ingredientId));
  if (demotedIngredientIds.length === 0) return;

  const demotedIngredients = await tx
    .select()
    .from(ingredients)
    .where(inArray(ingredients.id, demotedIngredientIds));
  const reviewedAt = new Date();
  for (const ingredient of demotedIngredients) {
    await tx
      .update(ingredients)
      .set(toDemotedIngredientPatch(ingredient, reviewedAt))
      .where(eq(ingredients.id, ingredient.id));
  }
}

export async function upsertGb2760OfficialPages(db: Database, pages: Gb2760OfficialPageInput[]) {
  if (pages.length === 0) return;

  await db.transaction(async (tx) => {
    // Official PDF-derived tables are snapshots; keep database rows in lockstep with source files.
    await tx
      .delete(gb2760OfficialPages)
      .where(notInArray(gb2760OfficialPages.id, pages.map((page) => page.id)));

    for (const page of pages) {
      const row = toGb2760OfficialPageRow(page);
      await tx
        .insert(gb2760OfficialPages)
        .values(row)
        .onConflictDoUpdate({
          target: gb2760OfficialPages.id,
          set: {
            ...row,
            createdAt: sql`${gb2760OfficialPages.createdAt}`
          }
        });
    }
  });
}

export async function upsertGb2760OfficialReferenceRows(db: Database, rows: Gb2760OfficialReferenceRowInput[]) {
  if (rows.length === 0) return;

  await db.transaction(async (tx) => {
    // Official PDF-derived tables are snapshots; keep database rows in lockstep with source files.
    await tx
      .delete(gb2760OfficialReferenceRows)
      .where(notInArray(gb2760OfficialReferenceRows.id, rows.map((row) => row.id)));

    for (const referenceRow of rows) {
      const row = toGb2760OfficialReferenceRow(referenceRow);
      await tx
        .insert(gb2760OfficialReferenceRows)
        .values(row)
        .onConflictDoUpdate({
          target: gb2760OfficialReferenceRows.id,
          set: {
            ...row,
            createdAt: sql`${gb2760OfficialReferenceRows.createdAt}`
          }
        });
    }
  });
}

export async function upsertIngredients(db: Database, additives: FoodAdditiveInput[], options: IngredientUpsertOptions = {}) {
  const auditUpdateCondition = options.updateAuditFields
    ? sql`true`
    : sql`${ingredients.dataVersion} is distinct from excluded.data_version`;

  await db.transaction(async (tx) => {
    for (const additive of additives) {
      const row = toIngredientRow(additive, options);
      await tx
        .insert(ingredients)
        .values(row)
        .onConflictDoUpdate({
          target: ingredients.id,
          set: {
            ...row,
            reviewedBy: sql`case when ${auditUpdateCondition} then excluded.reviewed_by else ${ingredients.reviewedBy} end`,
            reviewedAt: sql`case when ${auditUpdateCondition} then excluded.reviewed_at else ${ingredients.reviewedAt} end`,
            changeNote: sql`case when ${auditUpdateCondition} then excluded.change_note else ${ingredients.changeNote} end`,
            gb2760PromotionBaseState: sql`${ingredients.gb2760PromotionBaseState}`,
            createdAt: sql`${ingredients.createdAt}`
          }
        });

      await tx.delete(ingredientSources).where(eq(ingredientSources.ingredientId, additive.id));
      const sourceRows = toIngredientSourceRows(additive);
      if (sourceRows.length > 0) {
        await tx.insert(ingredientSources).values(sourceRows);
      }
    }
  });
}

async function getRiskFacets(db: Database, params: IngredientListParams): Promise<IngredientRiskFacet[]> {
  const rows = await db
    .select({
      level: ingredients.riskLevel,
      count: count()
    })
    .from(ingredients)
    .where(buildIngredientWhere({ ...params, riskLevel: undefined }))
    .groupBy(ingredients.riskLevel);

  const counts = new Map(rows.map((row) => [row.level, row.count]));
  return validRiskLevels
    .map((level) => ({ level, count: counts.get(level) || 0 }))
    .filter((item) => item.count > 0);
}

async function getCategoryFacets(db: Database, params: IngredientListParams): Promise<IngredientCategoryFacet[]> {
  const rows = await db
    .select({
      name: ingredients.category,
      count: count()
    })
    .from(ingredients)
    .where(buildIngredientWhere({ ...params, category: undefined }))
    .groupBy(ingredients.category)
    .orderBy(desc(count()), asc(ingredients.category));

  return rows;
}

async function getGb2760StagingEvidence(db: Database, ingredientId: string) {
  return db
    .select()
    .from(gb2760OfficialRecords)
    .where(eq(gb2760OfficialRecords.ingredientId, ingredientId))
    .orderBy(
      asc(gb2760OfficialRecords.pdfPage),
      asc(gb2760OfficialRecords.standardPage),
      asc(gb2760OfficialRecords.foodCategoryCode),
      asc(gb2760OfficialRecords.id)
    );
}

async function getGb2760ReferenceEvidence(db: Database, ingredient: IngredientRow) {
  const { codeTerms, nameTerms } = getGb2760ReferenceSearchTerms(ingredient);
  if (nameTerms.length === 0 && codeTerms.length === 0) return [];

  const filters = [
    ...nameTerms.map(buildGb2760ReferenceNameFilter),
    ...codeTerms.map(buildGb2760ReferenceCodeFilter)
  ];

  return db
    .select()
    .from(gb2760OfficialReferenceRows)
    .where(or(...filters))
    .orderBy(
      asc(gb2760OfficialReferenceRows.tableName),
      asc(gb2760OfficialReferenceRows.rowNumber),
      asc(gb2760OfficialReferenceRows.id)
    )
    .limit(20);
}

function shouldAttachGb2760ReferenceEvidence(ingredient: IngredientRow, stagingRows: Gb2760OfficialRecordRow[]) {
  if (stagingRows.length > 0) return true;
  if (ingredient.kind === 'common-food-ingredient' || ingredient.dataStatus === 'common_ingredient') return false;
  if (ingredient.sourceScope === 'common_ingredient_lexicon') return false;
  return ingredient.dataStatus === 'verified_regulation' && ingredient.sourceType === 'official_standard';
}

function getGb2760ReferenceSearchTerms(ingredient: IngredientRow) {
  const nameValues = [
    ingredient.nameCn,
    ingredient.nameEn,
    ...(ingredient.aliases || [])
  ];
  const nameTerms = nameValues
    .map((value) => String(value || '').trim())
    .filter((value) => value && value !== '—')
    .filter((value) => /[\u4e00-\u9fff]/u.test(value) ? value.length >= 2 : value.length >= 3);
  const codeTerms = [
    ...extractGb2760ReferenceCodeTerms(ingredient.eNumber),
    ...extractGb2760ReferenceCodeTerms(ingredient.gbCode)
  ];

  return {
    nameTerms: [...new Set(nameTerms)].slice(0, 8),
    codeTerms: [...new Set(codeTerms)].slice(0, 8)
  };
}

function buildGb2760ReferenceNameFilter(term: string) {
  const escapedTerm = escapeLikePattern(term);
  const asciiParenPattern = `${escapedTerm}(%`;
  const cjkParenPattern = `${escapedTerm}（%`;
  return sql`(
    lower(${gb2760OfficialReferenceRows.rowName}) = lower(${term})
    OR ${gb2760OfficialReferenceRows.rowName} ILIKE ${asciiParenPattern} ESCAPE '\\'
    OR ${gb2760OfficialReferenceRows.rowName} ILIKE ${cjkParenPattern} ESCAPE '\\'
    OR lower(coalesce(${gb2760OfficialReferenceRows.rowData}->>'additiveNameCn', '')) = lower(${term})
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'additiveNameCn', '') ILIKE ${asciiParenPattern} ESCAPE '\\'
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'additiveNameCn', '') ILIKE ${cjkParenPattern} ESCAPE '\\'
    OR lower(coalesce(${gb2760OfficialReferenceRows.rowData}->>'processingAidNameCn', '')) = lower(${term})
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'processingAidNameCn', '') ILIKE ${asciiParenPattern} ESCAPE '\\'
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'processingAidNameCn', '') ILIKE ${cjkParenPattern} ESCAPE '\\'
    OR lower(coalesce(${gb2760OfficialReferenceRows.rowData}->>'flavorNameCn', '')) = lower(${term})
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'flavorNameCn', '') ILIKE ${asciiParenPattern} ESCAPE '\\'
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'flavorNameCn', '') ILIKE ${cjkParenPattern} ESCAPE '\\'
    OR lower(coalesce(${gb2760OfficialReferenceRows.rowData}->>'processingAidNameEn', '')) = lower(${term})
    OR lower(coalesce(${gb2760OfficialReferenceRows.rowData}->>'flavorNameEn', '')) = lower(${term})
  )`;
}

function buildGb2760ReferenceCodeFilter(term: string) {
  const tokenPattern = buildReferenceCodeTokenPattern(term);
  return sql`(
    coalesce(${gb2760OfficialReferenceRows.rowData}->>'insNumber', '') ~* ${tokenPattern}
    OR coalesce(${gb2760OfficialReferenceRows.rowData}->>'cnsNumber', '') ~* ${tokenPattern}
  )`;
}

function extractGb2760ReferenceCodeTerms(value: string | null | undefined) {
  const matches = String(value || '').match(/\b(?:E|INS|CNS)?\s*\d+(?:\.\d+)?(?:\([ivx]+\)|[a-z])?/giu) || [];
  return matches
    .map((item) => item.replace(/^(?:E|INS|CNS)\s*/iu, '').trim())
    .filter((item) => /\d/u.test(item) && item.length >= 2 && item.toUpperCase() !== 'N/A');
}

function buildReferenceCodeTokenPattern(value: string) {
  const escaped = escapeRegex(value);
  return `(^|[^0-9A-Za-z.()])${escaped}([^0-9A-Za-z.()]|$)`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIngredientWhere(params: IngredientListParams): SQL | undefined {
  const filters: SQL[] = [];

  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    filters.push(or(
      ilikeEscaped(ingredients.nameCn, pattern),
      ilikeEscaped(ingredients.nameEn, pattern),
      ilikeEscaped(ingredients.gbCode, pattern),
      ilikeEscaped(ingredients.eNumber, pattern),
      ilikeEscaped(ingredients.description, pattern),
      sql`exists (
        select 1
        from jsonb_array_elements_text(${ingredients.aliases}) as alias(value)
        where alias.value ILIKE ${pattern} ESCAPE '\\'
      )`
    ) as SQL);
  }

  if (params.category) {
    filters.push(eq(ingredients.category, params.category));
  }

  if (params.riskLevel) {
    filters.push(eq(ingredients.riskLevel, params.riskLevel));
  }

  if (params.confidenceLevel) {
    filters.push(eq(ingredients.confidenceLevel, params.confidenceLevel));
  }

  if (params.dataStatus) {
    filters.push(eq(ingredients.dataStatus, params.dataStatus));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

function buildIngredientOrderBy(sort: SearchSort | undefined) {
  if (sort === 'risk') {
    return [
      sql`case ${ingredients.riskLevel}
        when 'high' then 0
        when 'medium' then 1
        when 'low' then 2
        else 3
      end`,
      asc(ingredients.nameCn)
    ];
  }

  return [asc(ingredients.nameCn)];
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function ilikeEscaped(column: AnyColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE '\\'`;
}

function normalizeAuditText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

export function normalizeGb2760ReviewStatus(value: string) {
  return value === 'needs_review' ? 'pending_review' : value;
}

function toGb2760SourceReviewAuditPatch(reviewStatus: string, retrievedAt: string) {
  if (!gb2760SourceReviewedStatuses.includes(reviewStatus as typeof gb2760SourceReviewedStatuses[number])) {
    return {};
  }

  const reviewedBy = reviewStatus === 'mapped_candidate'
    ? 'legacy-gb2760-auto-map'
    : reviewStatus === 'verified'
      ? 'legacy-gb2760-seed'
      : 'legacy-gb2760-review';
  const reviewNote = reviewStatus === 'mapped_candidate'
    ? 'Legacy GB 2760 staging mapping recorded before reviewer audit fields were added.'
    : reviewStatus === 'verified'
      ? 'Legacy verified GB 2760 seed row recorded before reviewer audit fields were added.'
      : 'Legacy GB 2760 staging sign-off recorded before reviewer audit fields were added.';

  return {
    reviewedBy,
    reviewedByUserId: reviewedBy,
    reviewedAt: parseAuditDate(retrievedAt),
    reviewNote
  };
}

export function getGb2760OfficialRecordReviewFingerprint(row: Pick<Gb2760OfficialRecordRow, typeof gb2760ReviewFingerprintFields[number]> | Pick<NewGb2760OfficialRecordRow, typeof gb2760ReviewFingerprintFields[number]>) {
  return JSON.stringify(gb2760ReviewFingerprintFields.map((field) => [field, row[field] ?? null]));
}

export function preserveGb2760ManualReviewState(incomingRow: NewGb2760OfficialRecordRow, existingRow: Gb2760OfficialRecordRow | undefined): NewGb2760OfficialRecordRow {
  const incoming = {
    ...incomingRow,
    reviewStatus: normalizeGb2760ReviewStatus(incomingRow.reviewStatus)
  };
  if (!existingRow) {
    return incoming;
  }

  const existingStatus = normalizeGb2760ReviewStatus(existingRow.reviewStatus);
  if (!gb2760ManualReviewStatuses.includes(existingStatus as typeof gb2760ManualReviewStatuses[number])) {
    return incoming;
  }

  return getGb2760OfficialRecordReviewFingerprint(incomingRow) === getGb2760OfficialRecordReviewFingerprint(existingRow)
    ? {
        ...incoming,
        ingredientId: existingRow.ingredientId,
        reviewStatus: existingStatus,
        reviewedBy: existingRow.reviewedBy,
        reviewedByUserId: existingRow.reviewedByUserId,
        reviewedAt: existingRow.reviewedAt,
        reviewNote: existingRow.reviewNote
      }
    : incoming;
}

export function preserveGb2760ManualReviewStatus(incomingRow: NewGb2760OfficialRecordRow, existingRow: Gb2760OfficialRecordRow | undefined) {
  return preserveGb2760ManualReviewState(incomingRow, existingRow).reviewStatus;
}

function parseAuditDate(value: string | undefined) {
  const normalized = normalizeAuditText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00:00.000Z`);
  }

  const parsed = normalized ? new Date(normalized) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

async function searchOneIngredient(db: Database, term: string, includeENumbers: boolean): Promise<BatchSearchResult> {
  const normalized = normalizeTerm(term);
  const eNumber = includeENumbers ? extractENumber(term) : null;
  const pattern = `%${escapeLikePattern(term)}%`;
  const eNumberPattern = eNumber ? `%${escapeLikePattern(eNumber)}%` : null;
  const filters: SQL[] = [
    ilikeEscaped(ingredients.nameCn, pattern),
    ilikeEscaped(ingredients.nameEn, pattern),
    ilikeEscaped(ingredients.gbCode, pattern),
    ilikeEscaped(ingredients.eNumber, pattern),
    sql`exists (
      select 1
      from jsonb_array_elements_text(${ingredients.aliases}) as alias(value)
      where alias.value ILIKE ${pattern} ESCAPE '\\'
    )`
  ];
  if (eNumberPattern) {
    filters.push(
      ilikeEscaped(ingredients.gbCode, eNumberPattern),
      ilikeEscaped(ingredients.eNumber, eNumberPattern),
      sql`exists (
        select 1
        from jsonb_array_elements_text(${ingredients.aliases}) as alias(value)
        where alias.value ILIKE ${eNumberPattern} ESCAPE '\\'
      )`
    );
  }
  const rows = await db
    .select()
    .from(ingredients)
    .where(or(...filters) as SQL)
    .limit(8);

  let best: BatchSearchResult = {
    term,
    eNumber,
    match: null,
    confidence: 0,
    matchType: 'none',
    alternates: []
  };

  const scored = rows
    .map((row) => ({ row, score: scoreIngredient(row, normalized, eNumber) }))
    .filter((item) => item.score.confidence > 0)
    .sort((a, b) => b.score.confidence - a.score.confidence);

  const first = scored[0];
  if (first) {
    best = {
      term,
      eNumber,
      match: first.row,
      confidence: first.score.confidence,
      matchType: first.score.matchType,
      alternates: scored.slice(1, 3).map((item) => item.row)
    };
  }

  return best;
}

function scoreIngredient(row: IngredientRow, normalized: string, eNumber: string | null) {
  const aliases = Array.isArray(row.aliases) ? row.aliases : [];
  const names = [row.nameCn, row.nameEn, row.gbCode, row.eNumber].filter(Boolean);
  const allFields = [...names, ...aliases];
  const normalizedFields = allFields
    .map((field) => normalizeTerm(field || ''))
    .filter(Boolean);

  if (eNumber && normalizeTerm(row.eNumber || '') === normalizeTerm(eNumber)) {
    return { confidence: 0.99, matchType: 'eNumber' as const };
  }
  if (names.some((name) => normalizeTerm(name || '') === normalized)) {
    return { confidence: 1, matchType: 'exact' as const };
  }
  if (aliases.some((alias) => normalizeTerm(alias) === normalized)) {
    return { confidence: 0.92, matchType: 'alias' as const };
  }
  if (normalized.length >= 2 && normalizedFields.some((field) => field.startsWith(normalized) || normalized.startsWith(field))) {
    return { confidence: 0.75, matchType: 'fuzzy' as const };
  }
  if (normalized.length >= 2 && normalizedFields.some((field) => field.includes(normalized) || normalized.includes(field))) {
    return { confidence: 0.55, matchType: 'fuzzy' as const };
  }
  return { confidence: 0, matchType: 'none' as const };
}

function normalizeBatchTerms(value: string[]) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((term) => term.trim())
    .filter(Boolean))]
    .slice(0, 200);
}

function normalizeTerm(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '')
    .replace(/^(?:食品添加剂|添加剂)\s*[:：]?\s*/, '');
}

function extractENumber(value: string) {
  const match = String(value || '').match(/\bE\s*\d{3,4}[a-z]?\b/i);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
}
