import { and, asc, count, desc, eq, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { ingredientSources, ingredients, type IngredientRow, type NewIngredientRow, type NewIngredientSourceRow, type SourceReference } from '../db/schema.js';

export const validRiskLevels = ['low', 'medium', 'high', 'unknown'] as const;
export const validConfidenceLevels = ['high', 'medium', 'low', 'unverified'] as const;

export type RiskLevel = typeof validRiskLevels[number];
export type ConfidenceLevel = typeof validConfidenceLevels[number];

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
  page: number;
  limit: number;
};

export type IngredientListResult = {
  items: IngredientRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type IngredientCategorySummary = {
  name: string;
  count: number;
};

export type IngredientService = {
  listIngredients(params: IngredientListParams): Promise<IngredientListResult>;
  getIngredientById(id: string): Promise<IngredientRow | null>;
  getCategorySummaries(): Promise<IngredientCategorySummary[]>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: IngredientService | null = null;

export function isRiskLevel(value: string): value is RiskLevel {
  return validRiskLevels.includes(value as RiskLevel);
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
        .orderBy(asc(ingredients.nameCn))
        .limit(params.limit)
        .offset(offset);

      return {
        items: rows,
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit))
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

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function ilikeEscaped(column: AnyColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE '\\'`;
}
