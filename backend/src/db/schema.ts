import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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

export type Gb2760PromotionBaseState = {
  dataStatus: string;
  reviewStatus: string;
  isVerified: boolean;
  sourceName: string;
  sourceType: string;
  sourceScope: string;
  sourceVersion: string;
  sourceUrl: string;
  effectiveDate: string;
  confidenceLevel: string;
  matchConfidence: string;
  lastReviewedAt: string;
  reviewNote: string;
  sourceNote: string;
  sourceReferences: SourceReference[];
  regulatoryBasis: string;
  rawSourceText: string;
  gbCode: string;
  gbStatus: string;
  usageLimits: UsageLimit[];
  foodCategories: string[];
};

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
  dataStatus: text('data_status').notNull().default('unverified'),
  dataVersion: text('data_version').notNull(),
  reviewedBy: text('reviewed_by').notNull().default('system'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  changeNote: text('change_note').notNull().default('seed import'),
  updatedAt: text('updated_at').notNull(),
  sourceName: text('source_name').notNull(),
  sourceType: text('source_type').notNull(),
  sourceScope: text('source_scope').notNull().default('unknown'),
  sourceVersion: text('source_version').notNull(),
  sourceUrl: text('source_url').notNull(),
  effectiveDate: text('effective_date').notNull(),
  confidenceLevel: text('confidence_level').notNull(),
  matchConfidence: text('match_confidence').notNull().default('unverified'),
  lastReviewedAt: text('last_reviewed_at').notNull(),
  reviewNote: text('review_note').notNull().default(''),
  regulatoryBasis: text('regulatory_basis').notNull(),
  rawSourceText: text('raw_source_text').notNull(),
  isVerified: boolean('is_verified').notNull().default(false),
  gbCode: text('gb_code').notNull(),
  gbStatus: text('gb_status').notNull(),
  eNumber: text('e_number'),
  adi: text('adi'),
  usageLimits: jsonb('usage_limits').$type<UsageLimit[]>().notNull().default(sql`'[]'::jsonb`),
  foodCategories: jsonb('food_categories').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  gb2760PromotionBaseState: jsonb('gb2760_promotion_base_state').$type<Gb2760PromotionBaseState | null>(),
  allergenTypes: jsonb('allergen_types').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cautionGroups: jsonb('caution_groups').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('ingredients_category_idx').on(table.category),
  index('ingredients_risk_level_idx').on(table.riskLevel),
  index('ingredients_confidence_level_idx').on(table.confidenceLevel),
  index('ingredients_data_status_idx').on(table.dataStatus),
  index('ingredients_data_version_idx').on(table.dataVersion),
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

export const gb2760OfficialRecords = pgTable('gb2760_official_records', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').references(() => ingredients.id, { onDelete: 'set null' }),
  standardCode: text('standard_code').notNull(),
  standardTitle: text('standard_title').notNull(),
  tableName: text('table_name').notNull(),
  additiveNameCn: text('additive_name_cn').notNull(),
  additiveNameEn: text('additive_name_en'),
  cnsNumber: text('cns_number'),
  insNumber: text('ins_number'),
  functionText: text('function_text').notNull(),
  foodCategoryCode: text('food_category_code').notNull(),
  foodCategoryName: text('food_category_name').notNull(),
  maxUseLevel: text('max_use_level').notNull(),
  unit: text('unit').notNull().default(''),
  note: text('note').notNull().default(''),
  pdfPage: integer('pdf_page').notNull(),
  standardPage: integer('standard_page').notNull(),
  rawSourceText: text('raw_source_text').notNull(),
  sourceName: text('source_name').notNull(),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url').notNull(),
  downloadEndpoint: text('download_endpoint').notNull(),
  platformRecordId: text('platform_record_id').notNull(),
  announcementRecordId: text('announcement_record_id').notNull(),
  fileGuid: text('file_guid').notNull(),
  factName: text('fact_name').notNull(),
  pdfSha256: text('pdf_sha256').notNull(),
  retrievedAt: text('retrieved_at').notNull(),
  extractionStatus: text('extraction_status').notNull(),
  reviewStatus: text('review_status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('gb2760_official_records_ingredient_id_idx').on(table.ingredientId),
  index('gb2760_official_records_additive_name_cn_idx').on(table.additiveNameCn),
  index('gb2760_official_records_review_status_idx').on(table.reviewStatus),
  index('gb2760_official_records_pdf_sha256_idx').on(table.pdfSha256)
]);

export const gb2760OfficialPages = pgTable('gb2760_official_pages', {
  id: text('id').primaryKey(),
  standardCode: text('standard_code').notNull(),
  standardTitle: text('standard_title').notNull(),
  pdfPage: integer('pdf_page').notNull(),
  standardPageLabel: text('standard_page_label').notNull().default(''),
  text: text('text').notNull(),
  textSha256: text('text_sha256').notNull(),
  sourceName: text('source_name').notNull(),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url').notNull(),
  downloadEndpoint: text('download_endpoint').notNull(),
  platformRecordId: text('platform_record_id').notNull(),
  announcementRecordId: text('announcement_record_id').notNull(),
  fileGuid: text('file_guid').notNull(),
  factName: text('fact_name').notNull(),
  pdfSha256: text('pdf_sha256').notNull(),
  retrievedAt: text('retrieved_at').notNull(),
  extractionTool: text('extraction_tool').notNull(),
  extractionScope: text('extraction_scope').notNull(),
  generatedAt: text('generated_at').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('gb2760_official_pages_pdf_page_unique_idx').on(table.pdfPage),
  index('gb2760_official_pages_standard_page_label_idx').on(table.standardPageLabel),
  index('gb2760_official_pages_text_sha256_idx').on(table.textSha256),
  index('gb2760_official_pages_pdf_sha256_idx').on(table.pdfSha256)
]);

export const gb2760OfficialReferenceRows = pgTable('gb2760_official_reference_rows', {
  id: text('id').primaryKey(),
  standardCode: text('standard_code').notNull(),
  standardTitle: text('standard_title').notNull(),
  tableName: text('table_name').notNull(),
  tableTitle: text('table_title').notNull(),
  rowNumber: integer('row_number').notNull(),
  rowCode: text('row_code').notNull(),
  rowName: text('row_name').notNull(),
  rowData: jsonb('row_data').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  pdfPage: integer('pdf_page').notNull(),
  standardPage: integer('standard_page').notNull(),
  rawSourceText: text('raw_source_text').notNull(),
  sourceName: text('source_name').notNull(),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url').notNull(),
  downloadEndpoint: text('download_endpoint').notNull(),
  platformRecordId: text('platform_record_id').notNull(),
  announcementRecordId: text('announcement_record_id').notNull(),
  fileGuid: text('file_guid').notNull(),
  factName: text('fact_name').notNull(),
  pdfSha256: text('pdf_sha256').notNull(),
  retrievedAt: text('retrieved_at').notNull(),
  extractionTool: text('extraction_tool').notNull(),
  extractionScope: text('extraction_scope').notNull(),
  generatedAt: text('generated_at').notNull(),
  extractionStatus: text('extraction_status').notNull(),
  reviewStatus: text('review_status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('gb2760_official_reference_rows_table_name_idx').on(table.tableName),
  index('gb2760_official_reference_rows_row_code_idx').on(table.rowCode),
  index('gb2760_official_reference_rows_pdf_sha256_idx').on(table.pdfSha256)
]);

export const additiveUsageRules = pgTable('additive_usage_rules', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  foodCategoryCode: text('food_category_code').notNull(),
  foodCategoryName: text('food_category_name').notNull(),
  maxUseLevel: text('max_use_level').notNull(),
  unit: text('unit').notNull().default(''),
  functionText: text('function_text').notNull(),
  note: text('note').notNull().default(''),
  sourceStagingId: text('source_staging_id').notNull().references(() => gb2760OfficialRecords.id, { onDelete: 'restrict' }),
  sourcePage: integer('source_page').notNull(),
  sourceTable: text('source_table').notNull(),
  sourceHash: text('source_hash').notNull(),
  dataStatus: text('data_status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('additive_usage_rules_source_staging_id_unique_idx').on(table.sourceStagingId),
  index('additive_usage_rules_ingredient_id_idx').on(table.ingredientId),
  index('additive_usage_rules_food_category_code_idx').on(table.foodCategoryCode),
  index('additive_usage_rules_data_status_idx').on(table.dataStatus),
  index('additive_usage_rules_source_hash_idx').on(table.sourceHash),
  check('additive_usage_rules_data_status_check', sql`${table.dataStatus} in ('verified_regulation')`)
]);

export const sourceDocuments = pgTable('source_documents', {
  id: text('id').primaryKey(),
  docCode: text('doc_code').notNull(),
  title: text('title').notNull(),
  pdfFileName: text('pdf_file_name').notNull(),
  pdfSha256: text('pdf_sha256').notNull(),
  platformRecordId: text('platform_record_id').notNull(),
  attachmentId: text('attachment_id').notNull(),
  publishDate: text('publish_date').notNull(),
  effectiveDate: text('effective_date').notNull(),
  downloadEndpoint: text('download_endpoint').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('source_documents_pdf_sha256_unique_idx').on(table.pdfSha256),
  index('source_documents_doc_code_idx').on(table.docCode),
  index('source_documents_platform_record_id_idx').on(table.platformRecordId)
]);

export const importRuns = pgTable('import_runs', {
  id: text('id').primaryKey(),
  sourceDocumentId: text('source_document_id').notNull().references(() => sourceDocuments.id, { onDelete: 'restrict' }),
  runType: text('run_type').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  totalRows: integer('total_rows').notNull().default(0),
  succeededRows: integer('succeeded_rows').notNull().default(0),
  failedRows: integer('failed_rows').notNull().default(0),
  status: text('status').notNull(),
  note: text('note').notNull().default('')
}, (table) => [
  index('import_runs_source_document_id_idx').on(table.sourceDocumentId),
  index('import_runs_run_type_idx').on(table.runType),
  index('import_runs_status_idx').on(table.status),
  index('import_runs_started_at_idx').on(table.startedAt),
  check('import_runs_run_type_check', sql`${table.runType} in ('fulltext', 'a1_staging', 'reference_tables', 'promote')`),
  check('import_runs_status_check', sql`${table.status} in ('running', 'succeeded', 'failed')`)
]);

export const importErrors = pgTable('import_errors', {
  id: text('id').primaryKey(),
  importRunId: text('import_run_id').notNull().references(() => importRuns.id, { onDelete: 'cascade' }),
  rowRef: text('row_ref').notNull(),
  reason: text('reason').notNull(),
  rawSourceText: text('raw_source_text').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('import_errors_import_run_id_idx').on(table.importRunId),
  index('import_errors_created_at_idx').on(table.createdAt)
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

export const userFavorites = pgTable('user_favorites', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  ingredientId: text('ingredient_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.category, table.ingredientId] }),
  index('user_favorites_user_id_idx').on(table.userId)
]);

export const userHistory = pgTable('user_history', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.query] }),
  index('user_history_user_id_idx').on(table.userId),
  index('user_history_created_at_idx').on(table.createdAt)
]);

export const userAllergens = pgTable('user_allergens', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  allergenId: text('allergen_id').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.allergenId] }),
  index('user_allergens_user_id_idx').on(table.userId)
]);

export const userProfileIngredients = pgTable('user_profile_ingredients', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  ingredientId: text('ingredient_id').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.kind, table.ingredientId] }),
  index('user_profile_ingredients_user_id_idx').on(table.userId),
  index('user_profile_ingredients_kind_idx').on(table.kind),
  check('user_profile_ingredients_kind_check', sql`${table.kind} in ('watch', 'avoid')`)
]);

export const userReports = pgTable('user_reports', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportId: text('report_id').notNull(),
  category: text('category').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.reportId] }),
  index('user_reports_user_id_idx').on(table.userId),
  index('user_reports_category_idx').on(table.category)
]);

export const productArchives = pgTable('product_archives', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  category: text('category').notNull().default('food'),
  productName: text('product_name').notNull(),
  brandName: text('brand_name'),
  thumbnailUrl: text('thumbnail_url'),
  originalText: text('original_text').notNull(),
  parsedIngredients: jsonb('parsed_ingredients').$type<Record<string, unknown>[]>().notNull().default(sql`'[]'::jsonb`),
  matchResults: jsonb('match_results').$type<Record<string, unknown>[]>().notNull().default(sql`'[]'::jsonb`),
  reportId: text('report_id'),
  riskGrade: text('risk_grade'),
  isFavorite: boolean('is_favorite').notNull().default(false),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  index('product_archives_user_id_idx').on(table.userId),
  index('product_archives_category_idx').on(table.category),
  index('product_archives_product_name_idx').on(table.productName),
  index('product_archives_is_favorite_idx').on(table.isFavorite)
]);

export type IngredientRow = typeof ingredients.$inferSelect;
export type NewIngredientRow = typeof ingredients.$inferInsert;
export type NewIngredientSourceRow = typeof ingredientSources.$inferInsert;
export type Gb2760OfficialRecordRow = typeof gb2760OfficialRecords.$inferSelect;
export type NewGb2760OfficialRecordRow = typeof gb2760OfficialRecords.$inferInsert;
export type Gb2760OfficialPageRow = typeof gb2760OfficialPages.$inferSelect;
export type NewGb2760OfficialPageRow = typeof gb2760OfficialPages.$inferInsert;
export type Gb2760OfficialReferenceRow = typeof gb2760OfficialReferenceRows.$inferSelect;
export type NewGb2760OfficialReferenceRow = typeof gb2760OfficialReferenceRows.$inferInsert;
export type AdditiveUsageRuleRow = typeof additiveUsageRules.$inferSelect;
export type NewAdditiveUsageRuleRow = typeof additiveUsageRules.$inferInsert;
export type SourceDocumentRow = typeof sourceDocuments.$inferSelect;
export type NewSourceDocumentRow = typeof sourceDocuments.$inferInsert;
export type ImportRunRow = typeof importRuns.$inferSelect;
export type NewImportRunRow = typeof importRuns.$inferInsert;
export type ImportErrorRow = typeof importErrors.$inferSelect;
export type NewImportErrorRow = typeof importErrors.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type UserFavoriteRow = typeof userFavorites.$inferSelect;
export type NewUserFavoriteRow = typeof userFavorites.$inferInsert;
export type UserHistoryRow = typeof userHistory.$inferSelect;
export type NewUserHistoryRow = typeof userHistory.$inferInsert;
export type UserAllergenRow = typeof userAllergens.$inferSelect;
export type NewUserAllergenRow = typeof userAllergens.$inferInsert;
export type UserProfileIngredientRow = typeof userProfileIngredients.$inferSelect;
export type NewUserProfileIngredientRow = typeof userProfileIngredients.$inferInsert;
export type UserReportRow = typeof userReports.$inferSelect;
export type NewUserReportRow = typeof userReports.$inferInsert;
export type ProductArchiveRow = typeof productArchives.$inferSelect;
export type NewProductArchiveRow = typeof productArchives.$inferInsert;
