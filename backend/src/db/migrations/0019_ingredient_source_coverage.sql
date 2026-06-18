ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "source_tier" text NOT NULL DEFAULT 'S0';
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "source_status" text NOT NULL DEFAULT 'verified_official_standard';
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "official_page_url" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "attachment_url" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "original_source_url" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "local_file_path" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "expiry_date" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "source_version" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "license" text NOT NULL DEFAULT 'government_public_document';
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'verified';
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "confidence_score" text NOT NULL DEFAULT '0.95';
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "supersedes_source_id" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "superseded_by_source_id" text;
ALTER TABLE "official_sources" ADD COLUMN IF NOT EXISTS "notes" text NOT NULL DEFAULT '';
ALTER TABLE "ingredient_master" ADD COLUMN IF NOT EXISTS "valid_from" text;
ALTER TABLE "ingredient_master" ADD COLUMN IF NOT EXISTS "valid_to" text;
ALTER TABLE "ingredient_aliases" ADD COLUMN IF NOT EXISTS "is_official" boolean NOT NULL DEFAULT false;
ALTER TABLE "ingredient_aliases" ADD COLUMN IF NOT EXISTS "confidence_score" text;
ALTER TABLE "ingredient_aliases" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'official_sources_source_tier_check'
  ) THEN
    ALTER TABLE "official_sources"
      ADD CONSTRAINT "official_sources_source_tier_check"
      CHECK ("source_tier" in ('S0', 'S1', 'S2', 'S3', 'S4'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "official_sources_source_tier_idx" ON "official_sources" USING btree ("source_tier");
CREATE INDEX IF NOT EXISTS "official_sources_source_status_idx" ON "official_sources" USING btree ("source_status");
CREATE INDEX IF NOT EXISTS "official_sources_local_file_path_idx" ON "official_sources" USING btree ("local_file_path");

CREATE TABLE IF NOT EXISTS "ingredient_import_staging" (
  "id" text PRIMARY KEY NOT NULL,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "source_tier" text NOT NULL,
  "source_status" text NOT NULL,
  "record_type" text NOT NULL,
  "canonical_name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "ingredient_type" text NOT NULL,
  "page_number" integer,
  "table_name" text,
  "row_reference" text,
  "raw_source_text" text NOT NULL DEFAULT '',
  "parsed_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "parse_status" text NOT NULL DEFAULT 'parsed',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "confidence_score" text NOT NULL DEFAULT '0.80',
  "content_hash" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "ingredient_import_staging_source_record_unique_idx" ON "ingredient_import_staging" USING btree ("source_id", "record_type", "normalized_name", "row_reference");
CREATE INDEX IF NOT EXISTS "ingredient_import_staging_source_id_idx" ON "ingredient_import_staging" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "ingredient_import_staging_record_type_idx" ON "ingredient_import_staging" USING btree ("record_type");
CREATE INDEX IF NOT EXISTS "ingredient_import_staging_review_status_idx" ON "ingredient_import_staging" USING btree ("review_status");
CREATE INDEX IF NOT EXISTS "ingredient_import_staging_content_hash_idx" ON "ingredient_import_staging" USING btree ("content_hash");

CREATE TABLE IF NOT EXISTS "nutrition_fortifier_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "ingredient_id" text NOT NULL REFERENCES "ingredient_master" ("id") ON DELETE cascade,
  "nutrient_id" text,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "compound_name" text,
  "food_category_code" text NOT NULL,
  "food_category_name" text NOT NULL,
  "min_use_level" text,
  "max_use_level" text,
  "unit" text,
  "restrictions" text,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_fortifier_rules_source_unique_idx" ON "nutrition_fortifier_rules" USING btree ("source_id", "ingredient_id", "food_category_code", "food_category_name", "max_use_level");
CREATE INDEX IF NOT EXISTS "nutrition_fortifier_rules_ingredient_id_idx" ON "nutrition_fortifier_rules" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "nutrition_fortifier_rules_source_id_idx" ON "nutrition_fortifier_rules" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "nutrition_fortifier_rules_status_idx" ON "nutrition_fortifier_rules" USING btree ("status");

CREATE TABLE IF NOT EXISTS "allergen_categories" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "canonical_name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "allergen_categories_code_unique_idx" ON "allergen_categories" USING btree ("code");
CREATE INDEX IF NOT EXISTS "allergen_categories_source_id_idx" ON "allergen_categories" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "allergen_categories_status_idx" ON "allergen_categories" USING btree ("status");

CREATE TABLE IF NOT EXISTS "ingredient_allergen_relations" (
  "ingredient_id" text NOT NULL REFERENCES "ingredient_master" ("id") ON DELETE cascade,
  "allergen_category_id" text NOT NULL REFERENCES "allergen_categories" ("id") ON DELETE cascade,
  "relation_type" text NOT NULL,
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "evidence_summary" text NOT NULL DEFAULT '',
  "confidence" text NOT NULL DEFAULT '0.80',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "valid_from" text,
  "valid_to" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ingredient_allergen_relations_ingredient_id_allergen_category_id_relation_type_pk" PRIMARY KEY("ingredient_id", "allergen_category_id", "relation_type"),
  CONSTRAINT "ingredient_allergen_relations_relation_type_check" CHECK ("relation_type" in ('direct', 'inferred', 'possible'))
);
CREATE INDEX IF NOT EXISTS "ingredient_allergen_relations_source_id_idx" ON "ingredient_allergen_relations" USING btree ("source_id");

CREATE TABLE IF NOT EXISTS "nutrients" (
  "id" text PRIMARY KEY NOT NULL,
  "canonical_name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "standard_unit" text,
  "nutrient_type" text NOT NULL DEFAULT 'other',
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrients_normalized_name_unique_idx" ON "nutrients" USING btree ("normalized_name");
CREATE INDEX IF NOT EXISTS "nutrients_nutrient_type_idx" ON "nutrients" USING btree ("nutrient_type");

CREATE TABLE IF NOT EXISTS "nutrition_aliases" (
  "id" text PRIMARY KEY NOT NULL,
  "nutrient_id" text NOT NULL REFERENCES "nutrients" ("id") ON DELETE cascade,
  "alias_name" text NOT NULL,
  "normalized_alias" text NOT NULL,
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "is_official" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_aliases_nutrient_alias_unique_idx" ON "nutrition_aliases" USING btree ("nutrient_id", "normalized_alias");
CREATE INDEX IF NOT EXISTS "nutrition_aliases_normalized_alias_idx" ON "nutrition_aliases" USING btree ("normalized_alias");

CREATE TABLE IF NOT EXISTS "nutrition_reference_values" (
  "id" text PRIMARY KEY NOT NULL,
  "nutrient_id" text NOT NULL REFERENCES "nutrients" ("id") ON DELETE cascade,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "value" text NOT NULL,
  "unit" text NOT NULL,
  "population_scope" text NOT NULL DEFAULT 'general',
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_reference_values_unique_idx" ON "nutrition_reference_values" USING btree ("nutrient_id", "source_id", "population_scope", "valid_from");
CREATE INDEX IF NOT EXISTS "nutrition_reference_values_status_idx" ON "nutrition_reference_values" USING btree ("status");

CREATE TABLE IF NOT EXISTS "nutrition_claim_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "nutrient_id" text NOT NULL REFERENCES "nutrients" ("id") ON DELETE cascade,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "claim_type" text NOT NULL,
  "comparison_operator" text NOT NULL,
  "threshold_value" text NOT NULL,
  "threshold_unit" text NOT NULL,
  "basis_type" text NOT NULL,
  "additional_conditions" text,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "nutrition_claim_rules_basis_type_check" CHECK ("basis_type" in ('per_100g', 'per_100ml', 'per_serving', 'energy_ratio', 'other'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_claim_rules_unique_idx" ON "nutrition_claim_rules" USING btree ("nutrient_id", "source_id", "claim_type", "basis_type", "threshold_value");
CREATE INDEX IF NOT EXISTS "nutrition_claim_rules_status_idx" ON "nutrition_claim_rules" USING btree ("status");

CREATE TABLE IF NOT EXISTS "microorganism_strains" (
  "id" text PRIMARY KEY NOT NULL,
  "ingredient_id" text NOT NULL REFERENCES "ingredient_master" ("id") ON DELETE cascade,
  "strain_code" text NOT NULL DEFAULT '',
  "permitted_for_general_food" boolean NOT NULL DEFAULT false,
  "permitted_for_infant_food" boolean NOT NULL DEFAULT false,
  "age_restrictions" text,
  "usage_restrictions" text,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "microorganism_strains_unique_idx" ON "microorganism_strains" USING btree ("ingredient_id", "strain_code", "source_id");
CREATE INDEX IF NOT EXISTS "microorganism_strains_source_id_idx" ON "microorganism_strains" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "microorganism_strains_status_idx" ON "microorganism_strains" USING btree ("status");

CREATE TABLE IF NOT EXISTS "novel_food_ingredient_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "ingredient_id" text NOT NULL REFERENCES "ingredient_master" ("id") ON DELETE cascade,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "source_species" text,
  "edible_part" text,
  "production_process" text,
  "recommended_daily_intake" text,
  "intake_unit" text,
  "unsuitable_populations" text,
  "label_requirements" text,
  "quality_requirements" text,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "novel_food_ingredient_rules_unique_idx" ON "novel_food_ingredient_rules" USING btree ("ingredient_id", "source_id");
CREATE INDEX IF NOT EXISTS "novel_food_ingredient_rules_status_idx" ON "novel_food_ingredient_rules" USING btree ("status");

CREATE TABLE IF NOT EXISTS "food_medicine_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "ingredient_id" text NOT NULL REFERENCES "ingredient_master" ("id") ON DELETE cascade,
  "source_id" text NOT NULL REFERENCES "official_sources" ("id") ON DELETE restrict,
  "botanical_name" text,
  "latin_name" text,
  "family_name" text,
  "edible_part" text,
  "permitted_use" text,
  "usage_restrictions" text,
  "valid_from" text,
  "valid_to" text,
  "status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "food_medicine_rules_unique_idx" ON "food_medicine_rules" USING btree ("ingredient_id", "source_id");
CREATE INDEX IF NOT EXISTS "food_medicine_rules_status_idx" ON "food_medicine_rules" USING btree ("status");
