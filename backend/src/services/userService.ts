import { and, count, desc, eq, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { productArchives, userAllergens, userFavorites, userHistory, userProfileIngredients, userReports } from '../db/schema.js';

export type UserFavoriteItem = {
  id: string;
  category: string;
  createdAt?: Date;
};

export type UserHistoryItem = {
  query: string;
  createdAt?: Date;
};

export type UserReportItem = Record<string, unknown> & {
  id: string;
  category?: string;
  createdAt?: string;
};

export type UserProductItem = Record<string, unknown> & {
  id: string;
  category?: string;
  productName?: string;
  brandName?: string;
  originalText?: string;
  reportId?: string;
  riskGrade?: string;
  isFavorite?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfileIngredientKind = 'watch' | 'avoid';

export type UserProductListParams = {
  search?: string;
  isFavorite?: boolean;
  riskGrade?: string;
  page?: number;
  limit?: number;
};

export type UserProductList = {
  items: UserProductItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UserService = {
  listFavorites(userId: string): Promise<UserFavoriteItem[]>;
  addFavorite(userId: string, item: UserFavoriteItem): Promise<UserFavoriteItem[]>;
  replaceFavorites(userId: string, items: UserFavoriteItem[]): Promise<UserFavoriteItem[]>;
  deleteFavorite(userId: string, item?: Pick<UserFavoriteItem, 'id' | 'category'>): Promise<UserFavoriteItem[]>;
  listHistory(userId: string): Promise<string[]>;
  addHistory(userId: string, query: string): Promise<string[]>;
  replaceHistory(userId: string, queries: string[]): Promise<string[]>;
  deleteHistory(userId: string, query?: string): Promise<string[]>;
  listAllergens(userId: string): Promise<string[]>;
  replaceAllergens(userId: string, allergenIds: string[]): Promise<string[]>;
  listProfileIngredients(userId: string, kind: UserProfileIngredientKind): Promise<string[]>;
  replaceProfileIngredients(userId: string, kind: UserProfileIngredientKind, ingredientIds: string[]): Promise<string[]>;
  listReports(userId: string): Promise<UserReportItem[]>;
  addReport(userId: string, report: UserReportItem): Promise<UserReportItem[]>;
  replaceReports(userId: string, reports: UserReportItem[]): Promise<UserReportItem[]>;
  deleteReport(userId: string, reportId?: string): Promise<UserReportItem[]>;
  listProducts(userId: string, params?: UserProductListParams): Promise<UserProductList>;
  getProduct(userId: string, productId: string): Promise<UserProductItem | null>;
  addProduct(userId: string, product: UserProductItem): Promise<UserProductItem[]>;
  replaceProducts(userId: string, products: UserProductItem[]): Promise<UserProductItem[]>;
  updateProduct(userId: string, productId: string, patch: Partial<UserProductItem>): Promise<UserProductItem | null>;
  deleteProduct(userId: string, productId: string): Promise<UserProductItem[]>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: UserService | null = null;
type ProductArchiveSelect = typeof productArchives.$inferSelect;
type NormalizedProductListParams = {
  search: string;
  isFavorite?: boolean;
  riskGrade: string;
  page: number;
  limit: number;
};

export function createUserService(db: Database, now = () => new Date()): UserService {
  const service: UserService = {
    async listFavorites(userId) {
      const rows = await db
        .select()
        .from(userFavorites)
        .where(eq(userFavorites.userId, userId))
        .orderBy(desc(userFavorites.createdAt));

      return rows.map((row) => ({
        id: row.ingredientId,
        category: row.category,
        createdAt: row.createdAt
      }));
    },

    async addFavorite(userId, item) {
      const normalized = normalizeFavorite(item);
      await db
        .insert(userFavorites)
        .values({
          userId,
          category: normalized.category,
          ingredientId: normalized.id,
          createdAt: now()
        })
        .onConflictDoUpdate({
          target: [userFavorites.userId, userFavorites.category, userFavorites.ingredientId],
          set: {
            createdAt: sql`excluded.created_at`
          }
        });

      return service.listFavorites(userId);
    },

    async replaceFavorites(userId, items) {
      await db.transaction(async (tx) => {
        await tx.delete(userFavorites).where(eq(userFavorites.userId, userId));
        const rows = uniqueFavorites(items).map((item, index) => ({
          userId,
          category: item.category,
          ingredientId: item.id,
          createdAt: offsetDate(now(), index)
        }));
        if (rows.length > 0) {
          await tx.insert(userFavorites).values(rows);
        }
      });

      return service.listFavorites(userId);
    },

    async deleteFavorite(userId, item) {
      if (!item) {
        await db.delete(userFavorites).where(eq(userFavorites.userId, userId));
        return [];
      }

      const normalized = normalizeFavorite(item);
      await db.delete(userFavorites).where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.category, normalized.category),
        eq(userFavorites.ingredientId, normalized.id)
      ));
      return service.listFavorites(userId);
    },

    async listHistory(userId) {
      const rows = await db
        .select()
        .from(userHistory)
        .where(eq(userHistory.userId, userId))
        .orderBy(desc(userHistory.createdAt));

      return rows.map((row) => row.query);
    },

    async addHistory(userId, query) {
      const normalized = normalizeText(query);
      await db
        .insert(userHistory)
        .values({
          userId,
          query: normalized,
          createdAt: now()
        })
        .onConflictDoUpdate({
          target: [userHistory.userId, userHistory.query],
          set: {
            createdAt: sql`excluded.created_at`
          }
        });

      return service.listHistory(userId);
    },

    async replaceHistory(userId, queries) {
      await db.transaction(async (tx) => {
        await tx.delete(userHistory).where(eq(userHistory.userId, userId));
        const rows = uniqueStrings(queries).map((query, index) => ({
          userId,
          query,
          createdAt: offsetDate(now(), index)
        }));
        if (rows.length > 0) {
          await tx.insert(userHistory).values(rows);
        }
      });

      return service.listHistory(userId);
    },

    async deleteHistory(userId, query) {
      const normalized = normalizeText(query);
      if (!normalized) {
        await db.delete(userHistory).where(eq(userHistory.userId, userId));
        return [];
      }

      await db.delete(userHistory).where(and(
        eq(userHistory.userId, userId),
        eq(userHistory.query, normalized)
      ));
      return service.listHistory(userId);
    },

    async listAllergens(userId) {
      const rows = await db
        .select()
        .from(userAllergens)
        .where(eq(userAllergens.userId, userId));

      return rows.map((row) => row.allergenId).sort();
    },

    async replaceAllergens(userId, allergenIds) {
      await db.transaction(async (tx) => {
        await tx.delete(userAllergens).where(eq(userAllergens.userId, userId));
        const rows = uniqueStrings(allergenIds).map((allergenId) => ({
          userId,
          allergenId,
          updatedAt: now()
        }));
        if (rows.length > 0) {
          await tx.insert(userAllergens).values(rows);
        }
      });

      return service.listAllergens(userId);
    },

    async listProfileIngredients(userId, kind) {
      const normalizedKind = normalizeProfileIngredientKind(kind);
      const rows = await db
        .select()
        .from(userProfileIngredients)
        .where(and(
          eq(userProfileIngredients.userId, userId),
          eq(userProfileIngredients.kind, normalizedKind)
        ))
        .orderBy(desc(userProfileIngredients.updatedAt));

      return rows.map((row) => row.ingredientId);
    },

    async replaceProfileIngredients(userId, kind, ingredientIds) {
      const normalizedKind = normalizeProfileIngredientKind(kind);
      await db.transaction(async (tx) => {
        await tx.delete(userProfileIngredients).where(and(
          eq(userProfileIngredients.userId, userId),
          eq(userProfileIngredients.kind, normalizedKind)
        ));
        const rows = uniqueStrings(ingredientIds).map((ingredientId, index) => ({
          userId,
          kind: normalizedKind,
          ingredientId,
          updatedAt: offsetDate(now(), index)
        }));
        if (rows.length > 0) {
          await tx.insert(userProfileIngredients).values(rows);
        }
      });

      return service.listProfileIngredients(userId, normalizedKind);
    },

    async listReports(userId) {
      const rows = await db
        .select()
        .from(userReports)
        .where(eq(userReports.userId, userId))
        .orderBy(desc(userReports.createdAt));

      return rows.map((row) => row.data as UserReportItem);
    },

    async addReport(userId, report) {
      const normalized = normalizeReport(report);
      await db
        .insert(userReports)
        .values({
          userId,
          reportId: normalized.id,
          category: normalizeText(normalized.category) || 'food',
          data: normalized,
          createdAt: parseDate(normalized.createdAt) ?? now(),
          updatedAt: now()
        })
        .onConflictDoUpdate({
          target: [userReports.userId, userReports.reportId],
          set: {
            category: sql`excluded.category`,
            data: sql`excluded.data`,
            updatedAt: sql`excluded.updated_at`
          }
        });

      return service.listReports(userId);
    },

    async replaceReports(userId, reports) {
      await db.transaction(async (tx) => {
        await tx.delete(userReports).where(eq(userReports.userId, userId));
        const rows = uniqueReports(reports).map((report) => ({
          userId,
          reportId: report.id,
          category: normalizeText(report.category) || 'food',
          data: report,
          createdAt: parseDate(report.createdAt) ?? now(),
          updatedAt: now()
        }));
        if (rows.length > 0) {
          await tx.insert(userReports).values(rows);
        }
      });

      return service.listReports(userId);
    },

    async deleteReport(userId, reportId) {
      const normalized = normalizeText(reportId);
      if (!normalized) {
        await db.delete(userReports).where(eq(userReports.userId, userId));
        return [];
      }

      await db.delete(userReports).where(and(
        eq(userReports.userId, userId),
        eq(userReports.reportId, normalized)
      ));
      return service.listReports(userId);
    },

    async listProducts(userId, params = {}) {
      const listParams = normalizeProductListParams(params);
      const where = buildProductWhere(userId, listParams);
      const offset = (listParams.page - 1) * listParams.limit;
      const [{ total }] = await db
        .select({ total: count() })
        .from(productArchives)
        .where(where);
      const rows = await db
        .select()
        .from(productArchives)
        .where(where)
        .orderBy(desc(productArchives.updatedAt), desc(productArchives.createdAt))
        .limit(listParams.limit)
        .offset(offset);

      return {
        items: rows.map(rowToProduct),
        total,
        page: listParams.page,
        limit: listParams.limit,
        totalPages: Math.max(1, Math.ceil(total / listParams.limit))
      };
    },

    async getProduct(userId, productId) {
      const normalized = normalizeText(productId);
      if (!normalized) return null;
      const rows = await db
        .select()
        .from(productArchives)
        .where(and(
          eq(productArchives.userId, userId),
          eq(productArchives.id, normalized)
        ))
        .limit(1);

      return rows[0] ? rowToProduct(rows[0]) : null;
    },

    async addProduct(userId, product) {
      const currentTime = now();
      const normalized = normalizeProduct(product, currentTime);
      const row = productToRow(userId, normalized, currentTime);
      await db
        .insert(productArchives)
        .values(row)
        .onConflictDoUpdate({
          target: [productArchives.userId, productArchives.id],
          set: {
            category: sql`excluded.category`,
            productName: sql`excluded.product_name`,
            brandName: sql`excluded.brand_name`,
            thumbnailUrl: sql`excluded.thumbnail_url`,
            originalText: sql`excluded.original_text`,
            parsedIngredients: sql`excluded.parsed_ingredients`,
            matchResults: sql`excluded.match_results`,
            reportId: sql`excluded.report_id`,
            riskGrade: sql`excluded.risk_grade`,
            isFavorite: sql`excluded.is_favorite`,
            tags: sql`excluded.tags`,
            data: sql`excluded.data`,
            createdAt: sql`${productArchives.createdAt}`,
            updatedAt: sql`excluded.updated_at`
          }
        });

      return (await service.listProducts(userId, { limit: 100 })).items;
    },

    async replaceProducts(userId, products) {
      const currentTime = now();
      const rows = uniqueProducts(products).map((product) => productToRow(userId, product, currentTime));
      await db.transaction(async (tx) => {
        await tx.delete(productArchives).where(eq(productArchives.userId, userId));
        if (rows.length > 0) {
          await tx.insert(productArchives).values(rows);
        }
      });

      return (await service.listProducts(userId, { limit: 100 })).items;
    },

    async updateProduct(userId, productId, patch) {
      const existing = await service.getProduct(userId, productId);
      if (!existing) return null;
      const currentTime = now();
      const updated = normalizeProduct({
        ...existing,
        ...normalizeProductPatch(patch),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: currentTime.toISOString()
      }, currentTime);
      const row = productToRow(userId, updated, currentTime);
      await db
        .update(productArchives)
        .set(productToUpdateSet(row))
        .where(and(
          eq(productArchives.userId, userId),
          eq(productArchives.id, updated.id)
        ));
      return service.getProduct(userId, updated.id);
    },

    async deleteProduct(userId, productId) {
      const normalized = normalizeText(productId);
      if (!normalized) throw new UserServiceValidationError('invalid_product');

      await db.delete(productArchives).where(and(
        eq(productArchives.userId, userId),
        eq(productArchives.id, normalized)
      ));
      return (await service.listProducts(userId, { limit: 100 })).items;
    }
  };

  return service;
}

export function getDefaultUserService(): UserService {
  if (!defaultClient) {
    defaultClient = createDatabaseClient();
    defaultService = createUserService(defaultClient.db);
  }

  return defaultService as UserService;
}

export function createLazyUserService(databaseUrl?: string): UserService {
  let lazyClient: DatabaseClient | null = null;
  let lazyService: UserService | null = null;

  function getLazyService() {
    if (!lazyClient) {
      lazyClient = createDatabaseClient(databaseUrl);
      lazyService = createUserService(lazyClient.db);
    }

    return lazyService as UserService;
  }

  return {
    listFavorites(userId) {
      return getLazyService().listFavorites(userId);
    },
    addFavorite(userId, item) {
      return getLazyService().addFavorite(userId, item);
    },
    replaceFavorites(userId, items) {
      return getLazyService().replaceFavorites(userId, items);
    },
    deleteFavorite(userId, item) {
      return getLazyService().deleteFavorite(userId, item);
    },
    listHistory(userId) {
      return getLazyService().listHistory(userId);
    },
    addHistory(userId, query) {
      return getLazyService().addHistory(userId, query);
    },
    replaceHistory(userId, queries) {
      return getLazyService().replaceHistory(userId, queries);
    },
    deleteHistory(userId, query) {
      return getLazyService().deleteHistory(userId, query);
    },
    listAllergens(userId) {
      return getLazyService().listAllergens(userId);
    },
    replaceAllergens(userId, allergenIds) {
      return getLazyService().replaceAllergens(userId, allergenIds);
    },
    listProfileIngredients(userId, kind) {
      return getLazyService().listProfileIngredients(userId, kind);
    },
    replaceProfileIngredients(userId, kind, ingredientIds) {
      return getLazyService().replaceProfileIngredients(userId, kind, ingredientIds);
    },
    listReports(userId) {
      return getLazyService().listReports(userId);
    },
    addReport(userId, report) {
      return getLazyService().addReport(userId, report);
    },
    replaceReports(userId, reports) {
      return getLazyService().replaceReports(userId, reports);
    },
    deleteReport(userId, reportId) {
      return getLazyService().deleteReport(userId, reportId);
    },
    listProducts(userId, params) {
      return getLazyService().listProducts(userId, params);
    },
    getProduct(userId, productId) {
      return getLazyService().getProduct(userId, productId);
    },
    addProduct(userId, product) {
      return getLazyService().addProduct(userId, product);
    },
    replaceProducts(userId, products) {
      return getLazyService().replaceProducts(userId, products);
    },
    updateProduct(userId, productId, patch) {
      return getLazyService().updateProduct(userId, productId, patch);
    },
    deleteProduct(userId, productId) {
      return getLazyService().deleteProduct(userId, productId);
    }
  };
}

function normalizeFavorite(item: Pick<UserFavoriteItem, 'id' | 'category'>): UserFavoriteItem {
  const id = normalizeText(item.id);
  const category = normalizeText(item.category);
  if (!id || !category) {
    throw new UserServiceValidationError('invalid_item');
  }

  return { id, category };
}

function uniqueFavorites(items: UserFavoriteItem[]) {
  const seen = new Set<string>();
  const result: UserFavoriteItem[] = [];
  for (const item of Array.isArray(items) ? items : []) {
    const normalized = normalizeFavorite(item);
    const key = `${normalized.category}:${normalized.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function uniqueReports(reports: UserReportItem[]) {
  const seen = new Set<string>();
  const result: UserReportItem[] = [];
  for (const report of Array.isArray(reports) ? reports : []) {
    const normalized = normalizeReport(report);
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    result.push(normalized);
  }

  return result;
}

function normalizeReport(report: UserReportItem): UserReportItem {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new UserServiceValidationError('invalid_report');
  }

  const id = normalizeText(report.id);
  if (!id) {
    throw new UserServiceValidationError('invalid_report');
  }

  return {
    ...report,
    id
  };
}

function uniqueProducts(products: UserProductItem[]) {
  const seen = new Set<string>();
  const result: UserProductItem[] = [];
  for (const product of Array.isArray(products) ? products : []) {
    const normalized = normalizeProduct(product);
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    result.push(normalized);
  }

  return result;
}

function normalizeProduct(product: UserProductItem, fallbackDate = new Date()): UserProductItem {
  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    throw new UserServiceValidationError('invalid_product');
  }

  const id = normalizeText(product.id);
  const productName = truncateText(product.productName, 100);
  const originalText = normalizeText(product.originalText);
  const reportId = normalizeText(product.reportId);
  if (!id || !productName || !originalText || !reportId) {
    throw new UserServiceValidationError('invalid_product');
  }

  return {
    ...product,
    id,
    category: normalizeText(product.category) || 'food',
    productName,
    brandName: truncateText(product.brandName, 100) || undefined,
    originalText,
    parsedIngredients: Array.isArray(product.parsedIngredients) ? product.parsedIngredients : [],
    matchResults: Array.isArray(product.matchResults) ? product.matchResults : [],
    reportId,
    riskGrade: normalizeRiskGrade(product.riskGrade),
    isFavorite: product.isFavorite === true,
    tags: normalizeTags(product.tags),
    createdAt: (parseDate(product.createdAt) ?? fallbackDate).toISOString(),
    updatedAt: (parseDate(product.updatedAt) ?? fallbackDate).toISOString()
  };
}

function productToRow(userId: string, product: UserProductItem, fallbackDate: Date) {
  return {
    userId,
    id: product.id,
    category: normalizeText(product.category) || 'food',
    productName: normalizeText(product.productName),
    brandName: normalizeText(product.brandName) || null,
    thumbnailUrl: normalizeText(product.thumbnailUrl) || null,
    originalText: normalizeText(product.originalText),
    parsedIngredients: Array.isArray(product.parsedIngredients) ? product.parsedIngredients as Record<string, unknown>[] : [],
    matchResults: Array.isArray(product.matchResults) ? product.matchResults as Record<string, unknown>[] : [],
    reportId: normalizeText(product.reportId) || null,
    riskGrade: normalizeRiskGrade(product.riskGrade),
    isFavorite: product.isFavorite === true,
    tags: normalizeTags(product.tags),
    data: product,
    createdAt: parseDate(product.createdAt) ?? fallbackDate,
    updatedAt: parseDate(product.updatedAt) ?? fallbackDate
  };
}

function productToUpdateSet(row: ReturnType<typeof productToRow>) {
  return {
    category: row.category,
    productName: row.productName,
    brandName: row.brandName,
    thumbnailUrl: row.thumbnailUrl,
    originalText: row.originalText,
    parsedIngredients: row.parsedIngredients,
    matchResults: row.matchResults,
    reportId: row.reportId,
    riskGrade: row.riskGrade,
    isFavorite: row.isFavorite,
    tags: row.tags,
    data: row.data,
    updatedAt: row.updatedAt
  };
}

function rowToProduct(row: ProductArchiveSelect): UserProductItem {
  const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
    ? row.data as UserProductItem
    : {} as UserProductItem;
  return normalizeProduct({
    ...data,
    id: row.id,
    category: row.category,
    productName: row.productName,
    brandName: row.brandName ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    originalText: row.originalText,
    parsedIngredients: row.parsedIngredients,
    matchResults: row.matchResults,
    reportId: row.reportId ?? data.reportId,
    riskGrade: row.riskGrade ?? data.riskGrade,
    isFavorite: row.isFavorite,
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }, row.updatedAt);
}

function normalizeProductPatch(patch: Partial<UserProductItem>) {
  const next: Partial<UserProductItem> = {};
  if (Object.hasOwn(patch, 'productName')) next.productName = patch.productName;
  if (Object.hasOwn(patch, 'brandName')) next.brandName = patch.brandName;
  if (Object.hasOwn(patch, 'isFavorite')) next.isFavorite = patch.isFavorite === true;
  if (Object.hasOwn(patch, 'tags')) next.tags = normalizeTags(patch.tags);
  if (Object.hasOwn(patch, 'riskGrade')) next.riskGrade = normalizeRiskGrade(patch.riskGrade);
  return next;
}

function normalizeProductListParams(params: UserProductListParams): NormalizedProductListParams {
  return {
    search: normalizeText(params.search),
    isFavorite: params.isFavorite,
    riskGrade: normalizeRiskGradeFilter(params.riskGrade),
    page: Math.max(1, Number(params.page) || 1),
    limit: Math.min(100, Math.max(1, Number(params.limit) || 20))
  };
}

function buildProductWhere(userId: string, params: NormalizedProductListParams): SQL | undefined {
  const filters: SQL[] = [eq(productArchives.userId, userId)];
  if (params.search) {
    const pattern = `%${escapeLikePattern(params.search)}%`;
    filters.push(or(
      ilikeEscaped(productArchives.productName, pattern),
      ilikeEscaped(productArchives.brandName, pattern),
      ilikeEscaped(productArchives.originalText, pattern),
      sql`exists (
        select 1
        from jsonb_array_elements_text(${productArchives.tags}) as tag(value)
        where tag.value ILIKE ${pattern} ESCAPE '\\'
      )`
    ) as SQL);
  }
  if (params.isFavorite !== undefined) {
    filters.push(eq(productArchives.isFavorite, params.isFavorite));
  }
  if (params.riskGrade) {
    filters.push(eq(productArchives.riskGrade, params.riskGrade));
  }
  return and(...filters);
}

function ilikeEscaped(column: AnyColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE '\\'`;
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function normalizeRiskGrade(value: unknown) {
  const grade = normalizeText(value);
  return ['A', 'B', 'C', 'D', 'F'].includes(grade) ? grade : 'C';
}

function normalizeRiskGradeFilter(value: unknown) {
  const grade = normalizeText(value);
  return ['A', 'B', 'C', 'D', 'F'].includes(grade) ? grade : '';
}

function normalizeTags(value: unknown) {
  return uniqueStrings(Array.isArray(value) ? value : [])
    .map((tag) => truncateText(tag, 24))
    .filter(Boolean)
    .slice(0, 12);
}

function uniqueStrings(values: unknown[]) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizeText(value))
    .filter(Boolean))];
}

function normalizeProfileIngredientKind(value: unknown): UserProfileIngredientKind {
  if (value === 'watch' || value === 'avoid') return value;
  throw new UserServiceValidationError('invalid_profile_kind');
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function truncateText(value: unknown, maxLength: number) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function offsetDate(base: Date, index: number) {
  return new Date(base.getTime() - index);
}

function parseDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export class UserServiceValidationError extends Error {
  code: 'invalid_item' | 'invalid_report' | 'invalid_product' | 'invalid_profile_kind';

  constructor(code: 'invalid_item' | 'invalid_report' | 'invalid_product' | 'invalid_profile_kind') {
    super(code);
    this.code = code;
  }
}
