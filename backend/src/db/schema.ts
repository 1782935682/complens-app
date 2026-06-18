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

export const officialSources = pgTable('official_sources', {
  id: text('id').primaryKey(),
  sourceTier: text('source_tier').notNull().default('S0'),
  sourceStatus: text('source_status').notNull().default('verified_official_standard'),
  sourceOrg: text('source_org').notNull(),
  sourceType: text('source_type').notNull(),
  standardNo: text('standard_no'),
  announcementNo: text('announcement_no'),
  title: text('title').notNull(),
  sourceUrl: text('source_url').notNull(),
  officialPageUrl: text('official_page_url'),
  attachmentUrl: text('attachment_url'),
  originalSourceUrl: text('original_source_url'),
  localFilePath: text('local_file_path'),
  publicationDate: text('publication_date').notNull(),
  effectiveDate: text('effective_date'),
  expiryDate: text('expiry_date'),
  retrievedAt: text('retrieved_at').notNull(),
  contentHash: text('content_hash').notNull(),
  sourceVersion: text('source_version'),
  license: text('license').notNull().default('government_public_document'),
  parserVersion: text('parser_version').notNull(),
  verificationStatus: text('verification_status').notNull().default('verified'),
  confidenceScore: text('confidence_score').notNull().default('0.95'),
  supersedesSourceId: text('supersedes_source_id'),
  supersededBySourceId: text('superseded_by_source_id'),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('official_sources_source_tier_idx').on(table.sourceTier),
  index('official_sources_source_status_idx').on(table.sourceStatus),
  index('official_sources_source_type_idx').on(table.sourceType),
  index('official_sources_standard_no_idx').on(table.standardNo),
  index('official_sources_content_hash_idx').on(table.contentHash),
  index('official_sources_local_file_path_idx').on(table.localFilePath),
  check('official_sources_source_tier_check', sql`${table.sourceTier} in ('S0', 'S1', 'S2', 'S3', 'S4')`),
  check('official_sources_status_check', sql`${table.status} in ('active', 'superseded', 'revoked', 'draft')`)
]);

export const ingredientMaster = pgTable('ingredient_master', {
  id: text('id').primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  ingredientType: text('ingredient_type').notNull(),
  regulatoryStatus: text('regulatory_status').notNull(),
  description: text('description').notNull().default(''),
  cnsCode: text('cns_code'),
  insCode: text('ins_code'),
  casNumber: text('cas_number'),
  sourceStatus: text('source_status').notNull().default('unverified'),
  legacyIngredientId: text('legacy_ingredient_id').references(() => ingredients.id, { onDelete: 'set null' }),
  legacyKind: text('legacy_kind'),
  enabled: boolean('enabled').notNull().default(true),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('ingredient_master_normalized_type_unique_idx').on(table.normalizedName, table.ingredientType),
  index('ingredient_master_canonical_name_idx').on(table.canonicalName),
  index('ingredient_master_normalized_name_idx').on(table.normalizedName),
  index('ingredient_master_ingredient_type_idx').on(table.ingredientType),
  index('ingredient_master_regulatory_status_idx').on(table.regulatoryStatus),
  index('ingredient_master_source_status_idx').on(table.sourceStatus),
  index('ingredient_master_legacy_ingredient_id_idx').on(table.legacyIngredientId),
  check('ingredient_master_ingredient_type_check', sql`${table.ingredientType} in ('ordinary_ingredient', 'food_additive', 'nutrition_fortifier', 'novel_food_ingredient', 'food_medicine_substance', 'food_microorganism', 'allergen_source', 'compound_ingredient', 'other')`),
  check('ingredient_master_source_status_check', sql`${table.sourceStatus} in ('official', 'pending_review', 'internal_lexicon', 'safety_evaluation_only', 'unverified')`)
]);

export const ingredientTypeTags = pgTable('ingredient_type_tags', {
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.ingredientId, table.tag] }),
  index('ingredient_type_tags_tag_idx').on(table.tag),
  index('ingredient_type_tags_source_id_idx').on(table.sourceId)
]);

export const ingredientAliases = pgTable('ingredient_aliases', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  aliasName: text('alias_name').notNull(),
  normalizedAlias: text('normalized_alias').notNull(),
  aliasType: text('alias_type').notNull(),
  language: text('language').notNull().default('zh'),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  sourceStatus: text('source_status').notNull().default('official'),
  isOfficial: boolean('is_official').notNull().default(false),
  confidenceScore: text('confidence_score'),
  aliasConfidence: text('alias_confidence').notNull().default('high'),
  matchPolicy: text('match_policy').notNull().default('normal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  ,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('ingredient_aliases_ingredient_alias_type_unique_idx').on(table.ingredientId, table.normalizedAlias, table.aliasType),
  index('ingredient_aliases_ingredient_id_idx').on(table.ingredientId),
  index('ingredient_aliases_normalized_alias_idx').on(table.normalizedAlias),
  index('ingredient_aliases_alias_confidence_idx').on(table.aliasConfidence),
  index('ingredient_aliases_match_policy_idx').on(table.matchPolicy),
  index('ingredient_aliases_source_id_idx').on(table.sourceId),
  check('ingredient_aliases_source_status_check', sql`${table.sourceStatus} in ('official', 'format_variant', 'legacy_unverified')`),
  check('ingredient_aliases_alias_confidence_check', sql`${table.aliasConfidence} in ('high', 'medium', 'low', 'ambiguous')`),
  check('ingredient_aliases_match_policy_check', sql`${table.matchPolicy} in ('normal', 'candidate_only', 'blocked')`)
]);

export const ingredientSourceRelations = pgTable('ingredient_source_relations', {
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  sourceLocation: text('source_location').notNull().default(''),
  pageNumber: integer('page_number'),
  tableName: text('table_name'),
  rowReference: text('row_reference'),
  originalName: text('original_name').notNull(),
  evidenceSummary: text('evidence_summary').notNull(),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull()
}, (table) => [
  primaryKey({ columns: [table.ingredientId, table.sourceId, table.sourceLocation, table.originalName] }),
  index('ingredient_source_relations_source_id_idx').on(table.sourceId),
  index('ingredient_source_relations_status_idx').on(table.status),
  check('ingredient_source_relations_status_check', sql`${table.status} in ('current', 'pending_review', 'superseded', 'revoked')`)
]);

export const ingredientRegulatoryRules = pgTable('ingredient_regulatory_rules', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  foodCategoryCode: text('food_category_code').notNull(),
  foodCategoryName: text('food_category_name').notNull(),
  allowedStatus: text('allowed_status').notNull(),
  maxUseLevel: text('max_use_level'),
  unit: text('unit'),
  residueLevel: text('residue_level'),
  usePrinciple: text('use_principle'),
  restrictions: text('restrictions'),
  notes: text('notes'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull(),
  legacyAdditiveUsageRuleId: text('legacy_additive_usage_rule_id'),
  sourceStagingId: text('source_staging_id').references(() => gb2760OfficialRecords.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('ingredient_regulatory_rules_source_staging_unique_idx').on(table.sourceStagingId),
  index('ingredient_regulatory_rules_ingredient_id_idx').on(table.ingredientId),
  index('ingredient_regulatory_rules_source_id_idx').on(table.sourceId),
  index('ingredient_regulatory_rules_food_category_code_idx').on(table.foodCategoryCode),
  index('ingredient_regulatory_rules_status_idx').on(table.status),
  check('ingredient_regulatory_rules_allowed_status_check', sql`${table.allowedStatus} in ('allowed', 'restricted', 'not_allowed', 'unknown')`),
  check('ingredient_regulatory_rules_status_check', sql`${table.status} in ('current', 'pending_review', 'superseded', 'revoked')`)
]);

export const ingredientImportStaging = pgTable('ingredient_import_staging', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  sourceTier: text('source_tier').notNull(),
  sourceStatus: text('source_status').notNull(),
  recordType: text('record_type').notNull(),
  canonicalName: text('canonical_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  ingredientType: text('ingredient_type').notNull(),
  pageNumber: integer('page_number'),
  tableName: text('table_name'),
  rowReference: text('row_reference'),
  rawSourceText: text('raw_source_text').notNull().default(''),
  parsedData: jsonb('parsed_data').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  parseStatus: text('parse_status').notNull().default('parsed'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  confidenceScore: text('confidence_score').notNull().default('0.80'),
  contentHash: text('content_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('ingredient_import_staging_source_record_unique_idx').on(table.sourceId, table.recordType, table.normalizedName, table.rowReference),
  index('ingredient_import_staging_source_id_idx').on(table.sourceId),
  index('ingredient_import_staging_record_type_idx').on(table.recordType),
  index('ingredient_import_staging_review_status_idx').on(table.reviewStatus),
  index('ingredient_import_staging_content_hash_idx').on(table.contentHash)
]);

export const nutritionFortifierRules = pgTable('nutrition_fortifier_rules', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  nutrientId: text('nutrient_id'),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  compoundName: text('compound_name'),
  foodCategoryCode: text('food_category_code').notNull(),
  foodCategoryName: text('food_category_name').notNull(),
  minUseLevel: text('min_use_level'),
  maxUseLevel: text('max_use_level'),
  unit: text('unit'),
  restrictions: text('restrictions'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrition_fortifier_rules_source_unique_idx').on(table.sourceId, table.ingredientId, table.foodCategoryCode, table.foodCategoryName, table.maxUseLevel),
  index('nutrition_fortifier_rules_ingredient_id_idx').on(table.ingredientId),
  index('nutrition_fortifier_rules_source_id_idx').on(table.sourceId),
  index('nutrition_fortifier_rules_status_idx').on(table.status)
]);

export const allergenCategories = pgTable('allergen_categories', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  canonicalName: text('canonical_name').notNull(),
  description: text('description').notNull().default(''),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('allergen_categories_code_unique_idx').on(table.code),
  index('allergen_categories_source_id_idx').on(table.sourceId),
  index('allergen_categories_status_idx').on(table.status)
]);

export const allergenAliases = pgTable('allergen_aliases', {
  id: text('id').primaryKey(),
  allergenCategoryId: text('allergen_category_id').notNull().references(() => allergenCategories.id, { onDelete: 'cascade' }),
  aliasName: text('alias_name').notNull(),
  normalizedAlias: text('normalized_alias').notNull(),
  aliasType: text('alias_type').notNull().default('example'),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  evidenceSummary: text('evidence_summary').notNull().default(''),
  confidence: text('confidence').notNull().default('0.70'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('allergen_aliases_category_alias_unique_idx').on(table.allergenCategoryId, table.normalizedAlias),
  index('allergen_aliases_category_id_idx').on(table.allergenCategoryId),
  index('allergen_aliases_normalized_alias_idx').on(table.normalizedAlias),
  index('allergen_aliases_source_id_idx').on(table.sourceId),
  index('allergen_aliases_review_status_idx').on(table.reviewStatus)
]);

export const allergenLabelingRules = pgTable('allergen_labeling_rules', {
  id: text('id').primaryKey(),
  allergenCategoryId: text('allergen_category_id').references(() => allergenCategories.id, { onDelete: 'set null' }),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  ruleType: text('rule_type').notNull(),
  title: text('title').notNull(),
  sectionTitle: text('section_title').notNull().default(''),
  pageNumber: integer('page_number'),
  sourceFile: text('source_file').notNull().default(''),
  sourceUrl: text('source_url').notNull().default(''),
  rawText: text('raw_text').notNull().default(''),
  evidenceSummary: text('evidence_summary').notNull().default(''),
  confidence: text('confidence').notNull().default('0.78'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('allergen_labeling_rules_source_rule_unique_idx').on(table.sourceId, table.ruleType, table.title),
  index('allergen_labeling_rules_category_id_idx').on(table.allergenCategoryId),
  index('allergen_labeling_rules_source_id_idx').on(table.sourceId),
  index('allergen_labeling_rules_review_status_idx').on(table.reviewStatus)
]);

export const ingredientAllergenRelations = pgTable('ingredient_allergen_relations', {
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  allergenCategoryId: text('allergen_category_id').notNull().references(() => allergenCategories.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  evidenceSummary: text('evidence_summary').notNull().default(''),
  confidence: text('confidence').notNull().default('0.80'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.ingredientId, table.allergenCategoryId, table.relationType] }),
  index('ingredient_allergen_relations_source_id_idx').on(table.sourceId),
  check('ingredient_allergen_relations_relation_type_check', sql`${table.relationType} in ('direct', 'inferred', 'possible')`)
]);

export const digitalLabelRules = pgTable('digital_label_rules', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  ruleType: text('rule_type').notNull(),
  title: text('title').notNull(),
  sectionTitle: text('section_title').notNull().default(''),
  pageNumber: integer('page_number'),
  sourceFile: text('source_file').notNull().default(''),
  sourceUrl: text('source_url').notNull().default(''),
  rawText: text('raw_text').notNull().default(''),
  evidenceSummary: text('evidence_summary').notNull().default(''),
  confidence: text('confidence').notNull().default('0.76'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('digital_label_rules_source_rule_unique_idx').on(table.sourceId, table.ruleType),
  index('digital_label_rules_source_id_idx').on(table.sourceId),
  index('digital_label_rules_review_status_idx').on(table.reviewStatus)
]);

export const nutrients = pgTable('nutrients', {
  id: text('id').primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  standardUnit: text('standard_unit'),
  nutrientType: text('nutrient_type').notNull().default('other'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrients_normalized_name_unique_idx').on(table.normalizedName),
  index('nutrients_nutrient_type_idx').on(table.nutrientType)
]);

export const nutritionAliases = pgTable('nutrition_aliases', {
  id: text('id').primaryKey(),
  nutrientId: text('nutrient_id').notNull().references(() => nutrients.id, { onDelete: 'cascade' }),
  aliasName: text('alias_name').notNull(),
  normalizedAlias: text('normalized_alias').notNull(),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  isOfficial: boolean('is_official').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrition_aliases_nutrient_alias_unique_idx').on(table.nutrientId, table.normalizedAlias),
  index('nutrition_aliases_normalized_alias_idx').on(table.normalizedAlias)
]);

export const nutritionReferenceValues = pgTable('nutrition_reference_values', {
  id: text('id').primaryKey(),
  nutrientId: text('nutrient_id').notNull().references(() => nutrients.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  value: text('value').notNull(),
  unit: text('unit').notNull(),
  populationScope: text('population_scope').notNull().default('general'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrition_reference_values_unique_idx').on(table.nutrientId, table.sourceId, table.populationScope, table.validFrom),
  index('nutrition_reference_values_status_idx').on(table.status)
]);

export const nutritionClaimRules = pgTable('nutrition_claim_rules', {
  id: text('id').primaryKey(),
  nutrientId: text('nutrient_id').notNull().references(() => nutrients.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  claimType: text('claim_type').notNull(),
  comparisonOperator: text('comparison_operator').notNull(),
  thresholdValue: text('threshold_value').notNull(),
  thresholdUnit: text('threshold_unit').notNull(),
  basisType: text('basis_type').notNull(),
  additionalConditions: text('additional_conditions'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrition_claim_rules_unique_idx').on(table.nutrientId, table.sourceId, table.claimType, table.basisType, table.thresholdValue),
  index('nutrition_claim_rules_status_idx').on(table.status),
  check('nutrition_claim_rules_basis_type_check', sql`${table.basisType} in ('per_100g', 'per_100ml', 'per_serving', 'energy_ratio', 'other')`)
]);

export const nutritionPolyolEnergyRules = pgTable('nutrition_polyol_energy_rules', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  polyolName: text('polyol_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  energyFactorKjPerG: text('energy_factor_kj_per_g').notNull(),
  includeInEnergyCalculation: boolean('include_in_energy_calculation').notNull().default(false),
  carbohydrateEnergyAdjustment: text('carbohydrate_energy_adjustment').notNull().default(''),
  sectionTitle: text('section_title').notNull().default(''),
  sourceFile: text('source_file').notNull().default(''),
  sourceUrl: text('source_url').notNull().default(''),
  rawText: text('raw_text').notNull().default(''),
  evidenceSummary: text('evidence_summary').notNull().default(''),
  confidence: text('confidence').notNull().default('0.80'),
  reviewStatus: text('review_status').notNull().default('pending_review'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('nutrition_polyol_energy_rules_source_name_unique_idx').on(table.sourceId, table.normalizedName),
  index('nutrition_polyol_energy_rules_source_id_idx').on(table.sourceId),
  index('nutrition_polyol_energy_rules_review_status_idx').on(table.reviewStatus)
]);

export const microorganismStrains = pgTable('microorganism_strains', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  strainCode: text('strain_code').notNull().default(''),
  permittedForGeneralFood: boolean('permitted_for_general_food').notNull().default(false),
  permittedForInfantFood: boolean('permitted_for_infant_food').notNull().default(false),
  ageRestrictions: text('age_restrictions'),
  usageRestrictions: text('usage_restrictions'),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('microorganism_strains_unique_idx').on(table.ingredientId, table.strainCode, table.sourceId),
  index('microorganism_strains_source_id_idx').on(table.sourceId),
  index('microorganism_strains_status_idx').on(table.status)
]);

export const novelFoodIngredientRules = pgTable('novel_food_ingredient_rules', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  sourceSpecies: text('source_species'),
  ediblePart: text('edible_part'),
  productionProcess: text('production_process'),
  recommendedDailyIntake: text('recommended_daily_intake'),
  intakeUnit: text('intake_unit'),
  unsuitablePopulations: text('unsuitable_populations'),
  labelRequirements: text('label_requirements'),
  qualityRequirements: text('quality_requirements'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('novel_food_ingredient_rules_unique_idx').on(table.ingredientId, table.sourceId),
  index('novel_food_ingredient_rules_status_idx').on(table.status)
]);

export const foodMedicineRules = pgTable('food_medicine_rules', {
  id: text('id').primaryKey(),
  ingredientId: text('ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => officialSources.id, { onDelete: 'restrict' }),
  botanicalName: text('botanical_name'),
  latinName: text('latin_name'),
  familyName: text('family_name'),
  ediblePart: text('edible_part'),
  permittedUse: text('permitted_use'),
  usageRestrictions: text('usage_restrictions'),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  status: text('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('food_medicine_rules_unique_idx').on(table.ingredientId, table.sourceId),
  index('food_medicine_rules_status_idx').on(table.status)
]);

export const ingredientRelations = pgTable('ingredient_relations', {
  sourceIngredientId: text('source_ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  targetIngredientId: text('target_ingredient_id').notNull().references(() => ingredientMaster.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(),
  officialSourceId: text('official_source_id').references(() => officialSources.id, { onDelete: 'set null' }),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.sourceIngredientId, table.targetIngredientId, table.relationType] }),
  index('ingredient_relations_target_ingredient_id_idx').on(table.targetIngredientId),
  index('ingredient_relations_relation_type_idx').on(table.relationType),
  index('ingredient_relations_official_source_id_idx').on(table.officialSourceId)
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
  reviewedBy: text('reviewed_by'),
  reviewedByUserId: text('reviewed_by_user_id'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('gb2760_official_records_ingredient_id_idx').on(table.ingredientId),
  index('gb2760_official_records_additive_name_cn_idx').on(table.additiveNameCn),
  index('gb2760_official_records_review_status_idx').on(table.reviewStatus),
  index('gb2760_official_records_reviewed_at_idx').on(table.reviewedAt),
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

export const labelScanSessions = pgTable('label_scan_sessions', {
  id: text('id').primaryKey(),
  labelTypeHint: text('label_type_hint').notNull().default('unknown_label'),
  status: text('status').notNull().default('draft'),
  imagesRequested: integer('images_requested').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check('label_scan_sessions_status_check', sql`${table.status} in ('draft', 'in_progress', 'completed')`),
  check('label_scan_sessions_label_type_hint_check', sql`${table.labelTypeHint} in ('ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product', 'unknown_label')`),
  index('label_scan_sessions_status_idx').on(table.status),
  index('label_scan_sessions_created_at_idx').on(table.createdAt)
]);

export const labelScanImages = pgTable('label_scan_images', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => labelScanSessions.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull(),
  labelType: text('label_type').notNull(),
  mimeType: text('mime_type').notNull(),
  ocrResultId: text('ocr_result_id'),
  status: text('status').notNull().default('ocr_input'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('label_scan_images_session_asset_unique').on(table.sessionId, table.assetId),
  index('label_scan_images_session_id_idx').on(table.sessionId),
  index('label_scan_images_status_idx').on(table.status),
  check('label_scan_images_label_type_check', sql`${table.labelType} in ('ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product', 'unknown_label')`),
  check('label_scan_images_status_check', sql`${table.status} in ('ocr_input', 'ocr_success', 'ocr_failed', 'manual_entry')`),
  check('label_scan_images_mime_type_check', sql`length(${table.mimeType}) <= 120`)
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
export type OfficialSourceRow = typeof officialSources.$inferSelect;
export type NewOfficialSourceRow = typeof officialSources.$inferInsert;
export type IngredientMasterRow = typeof ingredientMaster.$inferSelect;
export type NewIngredientMasterRow = typeof ingredientMaster.$inferInsert;
export type IngredientTypeTagRow = typeof ingredientTypeTags.$inferSelect;
export type NewIngredientTypeTagRow = typeof ingredientTypeTags.$inferInsert;
export type IngredientAliasRow = typeof ingredientAliases.$inferSelect;
export type NewIngredientAliasRow = typeof ingredientAliases.$inferInsert;
export type IngredientSourceRelationRow = typeof ingredientSourceRelations.$inferSelect;
export type NewIngredientSourceRelationRow = typeof ingredientSourceRelations.$inferInsert;
export type IngredientRegulatoryRuleRow = typeof ingredientRegulatoryRules.$inferSelect;
export type NewIngredientRegulatoryRuleRow = typeof ingredientRegulatoryRules.$inferInsert;
export type IngredientImportStagingRow = typeof ingredientImportStaging.$inferSelect;
export type NewIngredientImportStagingRow = typeof ingredientImportStaging.$inferInsert;
export type NutritionFortifierRuleRow = typeof nutritionFortifierRules.$inferSelect;
export type NewNutritionFortifierRuleRow = typeof nutritionFortifierRules.$inferInsert;
export type AllergenCategoryRow = typeof allergenCategories.$inferSelect;
export type NewAllergenCategoryRow = typeof allergenCategories.$inferInsert;
export type AllergenAliasRow = typeof allergenAliases.$inferSelect;
export type NewAllergenAliasRow = typeof allergenAliases.$inferInsert;
export type AllergenLabelingRuleRow = typeof allergenLabelingRules.$inferSelect;
export type NewAllergenLabelingRuleRow = typeof allergenLabelingRules.$inferInsert;
export type IngredientAllergenRelationRow = typeof ingredientAllergenRelations.$inferSelect;
export type NewIngredientAllergenRelationRow = typeof ingredientAllergenRelations.$inferInsert;
export type DigitalLabelRuleRow = typeof digitalLabelRules.$inferSelect;
export type NewDigitalLabelRuleRow = typeof digitalLabelRules.$inferInsert;
export type NutrientRow = typeof nutrients.$inferSelect;
export type NewNutrientRow = typeof nutrients.$inferInsert;
export type NutritionAliasRow = typeof nutritionAliases.$inferSelect;
export type NewNutritionAliasRow = typeof nutritionAliases.$inferInsert;
export type NutritionReferenceValueRow = typeof nutritionReferenceValues.$inferSelect;
export type NewNutritionReferenceValueRow = typeof nutritionReferenceValues.$inferInsert;
export type NutritionClaimRuleRow = typeof nutritionClaimRules.$inferSelect;
export type NewNutritionClaimRuleRow = typeof nutritionClaimRules.$inferInsert;
export type NutritionPolyolEnergyRuleRow = typeof nutritionPolyolEnergyRules.$inferSelect;
export type NewNutritionPolyolEnergyRuleRow = typeof nutritionPolyolEnergyRules.$inferInsert;
export type MicroorganismStrainRow = typeof microorganismStrains.$inferSelect;
export type NewMicroorganismStrainRow = typeof microorganismStrains.$inferInsert;
export type NovelFoodIngredientRuleRow = typeof novelFoodIngredientRules.$inferSelect;
export type NewNovelFoodIngredientRuleRow = typeof novelFoodIngredientRules.$inferInsert;
export type FoodMedicineRuleRow = typeof foodMedicineRules.$inferSelect;
export type NewFoodMedicineRuleRow = typeof foodMedicineRules.$inferInsert;
export type IngredientRelationRow = typeof ingredientRelations.$inferSelect;
export type NewIngredientRelationRow = typeof ingredientRelations.$inferInsert;
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
export type LabelScanSessionRow = typeof labelScanSessions.$inferSelect;
export type NewLabelScanSessionRow = typeof labelScanSessions.$inferInsert;
export type LabelScanImageRow = typeof labelScanImages.$inferSelect;
export type NewLabelScanImageRow = typeof labelScanImages.$inferInsert;
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
