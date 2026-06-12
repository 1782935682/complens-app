import { and, asc, count, desc, eq, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { ingredientSources, ingredients, type IngredientRow, type NewIngredientRow, type NewIngredientSourceRow, type SourceReference } from '../db/schema.js';

export const validRiskLevels = ['low', 'medium', 'high', 'unknown'] as const;
export const validConfidenceLevels = ['high', 'medium', 'low', 'unverified'] as const;
export const validSearchSorts = ['relevance', 'risk', 'name'] as const;

export type RiskLevel = typeof validRiskLevels[number];
export type ConfidenceLevel = typeof validConfidenceLevels[number];
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
  dataVersion: string;
  updatedAt: string;
  sourceName: string;
  sourceType: string;
  sourceVersion: string;
  sourceUrl: string;
  effectiveDate: string;
  confidenceLevel: ConfidenceLevel;
  lastReviewedAt: string;
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

export type IngredientListParams = {
  q?: string;
  category?: string;
  riskLevel?: RiskLevel;
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
  getCategorySummaries(): Promise<IngredientCategorySummary[]>;
  batchSearch(params: BatchSearchParams): Promise<BatchSearchResult[]>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: IngredientService | null = null;

export function isRiskLevel(value: string): value is RiskLevel {
  return validRiskLevels.includes(value as RiskLevel);
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
    getCategorySummaries() {
      return getLazyService().getCategorySummaries();
    },
    batchSearch(params) {
      return getLazyService().batchSearch(params);
    }
  };
}

export function toIngredientRow(additive: FoodAdditiveInput): NewIngredientRow {
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
    dataVersion: additive.dataVersion,
    updatedAt: additive.updatedAt,
    sourceName: additive.sourceName,
    sourceType: additive.sourceType,
    sourceVersion: additive.sourceVersion,
    sourceUrl: additive.sourceUrl,
    effectiveDate: additive.effectiveDate,
    confidenceLevel: additive.confidenceLevel,
    lastReviewedAt: additive.lastReviewedAt,
    regulatoryBasis: additive.regulatoryBasis,
    rawSourceText: additive.rawSourceText,
    isVerified: additive.isVerified,
    gbCode: additive.gbCode,
    gbStatus: additive.gbStatus,
    eNumber: additive.eNumber ?? null,
    adi: additive.adi ?? null,
    usageLimits: additive.usageLimits ?? [],
    foodCategories: additive.foodCategories ?? [],
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

export async function upsertIngredients(db: Database, additives: FoodAdditiveInput[]) {
  await db.transaction(async (tx) => {
    for (const additive of additives) {
      const row = toIngredientRow(additive);
      await tx
        .insert(ingredients)
        .values(row)
        .onConflictDoUpdate({
          target: ingredients.id,
          set: {
            ...row,
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

  if (eNumber && normalizeTerm(row.eNumber || '') === normalizeTerm(eNumber)) {
    return { confidence: 0.99, matchType: 'eNumber' as const };
  }
  if (names.some((name) => normalizeTerm(name || '') === normalized)) {
    return { confidence: 1, matchType: 'exact' as const };
  }
  if (aliases.some((alias) => normalizeTerm(alias) === normalized)) {
    return { confidence: 0.92, matchType: 'alias' as const };
  }
  if (allFields.some((field) => normalizeTerm(field || '').startsWith(normalized) || normalized.startsWith(normalizeTerm(field || '')))) {
    return { confidence: 0.75, matchType: 'fuzzy' as const };
  }
  if (normalized.length >= 2 && allFields.some((field) => normalizeTerm(field || '').includes(normalized) || normalized.includes(normalizeTerm(field || '')))) {
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
