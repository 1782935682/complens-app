import { and, desc, eq, sql } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { userAllergens, userFavorites, userHistory, userReports } from '../db/schema.js';

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
  listReports(userId: string): Promise<UserReportItem[]>;
  addReport(userId: string, report: UserReportItem): Promise<UserReportItem[]>;
  replaceReports(userId: string, reports: UserReportItem[]): Promise<UserReportItem[]>;
  deleteReport(userId: string, reportId?: string): Promise<UserReportItem[]>;
};

let defaultClient: DatabaseClient | null = null;
let defaultService: UserService | null = null;

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

function uniqueStrings(values: unknown[]) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizeText(value))
    .filter(Boolean))];
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
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
  code: 'invalid_item' | 'invalid_report';

  constructor(code: 'invalid_item' | 'invalid_report') {
    super(code);
    this.code = code;
  }
}
