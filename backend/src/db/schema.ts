import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const ingredients = pgTable('ingredients', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  dataCategory: text('data_category').notNull(),
  nameCn: text('name_cn').notNull(),
  nameEn: text('name_en'),
  aliases: jsonb('aliases').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  category: text('category').notNull(),
  functions: jsonb('functions').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  description: text('description').notNull(),
  riskLevel: text('risk_level').notNull(),
  riskSummary: text('risk_summary'),
  suitableFor: jsonb('suitable_for').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cautionFor: jsonb('caution_for').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  sourceNote: text('source_note').notNull(),
  sourceReferences: jsonb('source_references').$type<SourceReference[]>().notNull().default(sql`'[]'::jsonb`),
  reviewStatus: text('review_status').notNull(),
  dataVersion: text('data_version').notNull(),
  updatedAt: text('updated_at').notNull(),
  gbCode: text('gb_code').notNull(),
  gbStatus: text('gb_status').notNull(),
  eNumber: text('e_number'),
  adi: text('adi'),
  usageLimits: jsonb('usage_limits').$type<UsageLimit[]>().notNull().default(sql`'[]'::jsonb`),
  foodCategories: jsonb('food_categories').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  allergenTypes: jsonb('allergen_types').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cautionGroups: jsonb('caution_groups').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('ingredients_category_idx').on(table.category),
  index('ingredients_risk_level_idx').on(table.riskLevel),
  index('ingredients_gb_code_idx').on(table.gbCode),
  index('ingredients_e_number_idx').on(table.eNumber),
  index('ingredients_name_cn_trgm_idx').using('gin', table.nameCn.op('gin_trgm_ops')),
  index('ingredients_name_en_trgm_idx').using('gin', table.nameEn.op('gin_trgm_ops')),
  index('ingredients_description_trgm_idx').using('gin', table.description.op('gin_trgm_ops')),
  index('ingredients_aliases_gin_idx').using('gin', table.aliases)
]);

export const ingredientSources = pgTable('ingredient_sources', {
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  sourceIndex: integer('source_index').notNull(),
  title: text('title').notNull(),
  standard: text('standard').notNull(),
  region: text('region'),
  url: text('url'),
  publishedAt: text('published_at'),
  retrievedAt: text('retrieved_at')
}, (table) => [
  primaryKey({ columns: [table.ingredientId, table.sourceIndex] }),
  index('ingredient_sources_ingredient_id_idx').on(table.ingredientId)
]);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('users_email_unique_idx').on(table.email)
]);

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_expires_at_idx').on(table.expiresAt)
]);

export type SourceReference = {
  title: string;
  standard: string;
  region?: string;
  url?: string;
  publishedAt?: string;
  retrievedAt?: string;
};

export type UsageLimit = {
  foodCategory: string;
  limit: string;
  note?: string;
};

export type IngredientRow = typeof ingredients.$inferSelect;
export type NewIngredientRow = typeof ingredients.$inferInsert;
export type NewIngredientSourceRow = typeof ingredientSources.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
