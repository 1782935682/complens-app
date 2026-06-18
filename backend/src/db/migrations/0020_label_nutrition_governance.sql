ALTER TABLE "ingredient_aliases" ADD COLUMN IF NOT EXISTS "alias_confidence" text NOT NULL DEFAULT 'high';
ALTER TABLE "ingredient_aliases" ADD COLUMN IF NOT EXISTS "match_policy" text NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ingredient_aliases_alias_confidence_check'
  ) THEN
    ALTER TABLE "ingredient_aliases"
      ADD CONSTRAINT "ingredient_aliases_alias_confidence_check"
      CHECK ("alias_confidence" in ('high', 'medium', 'low', 'ambiguous'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ingredient_aliases_match_policy_check'
  ) THEN
    ALTER TABLE "ingredient_aliases"
      ADD CONSTRAINT "ingredient_aliases_match_policy_check"
      CHECK ("match_policy" in ('normal', 'candidate_only', 'blocked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ingredient_aliases_alias_confidence_idx" ON "ingredient_aliases" USING btree ("alias_confidence");
CREATE INDEX IF NOT EXISTS "ingredient_aliases_match_policy_idx" ON "ingredient_aliases" USING btree ("match_policy");

CREATE TABLE IF NOT EXISTS "allergen_aliases" (
  "id" text PRIMARY KEY NOT NULL,
  "allergen_category_id" text NOT NULL REFERENCES "allergen_categories" ("id") ON DELETE cascade,
  "alias_name" text NOT NULL,
  "normalized_alias" text NOT NULL,
  "alias_type" text NOT NULL DEFAULT 'example',
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "evidence_summary" text NOT NULL DEFAULT '',
  "confidence" text NOT NULL DEFAULT '0.70',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "allergen_aliases_category_alias_unique_idx" ON "allergen_aliases" USING btree ("allergen_category_id", "normalized_alias");
CREATE INDEX IF NOT EXISTS "allergen_aliases_category_id_idx" ON "allergen_aliases" USING btree ("allergen_category_id");
CREATE INDEX IF NOT EXISTS "allergen_aliases_normalized_alias_idx" ON "allergen_aliases" USING btree ("normalized_alias");
CREATE INDEX IF NOT EXISTS "allergen_aliases_source_id_idx" ON "allergen_aliases" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "allergen_aliases_review_status_idx" ON "allergen_aliases" USING btree ("review_status");

CREATE TABLE IF NOT EXISTS "allergen_labeling_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "allergen_category_id" text REFERENCES "allergen_categories" ("id") ON DELETE set null,
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "rule_type" text NOT NULL,
  "title" text NOT NULL,
  "section_title" text NOT NULL DEFAULT '',
  "page_number" integer,
  "source_file" text NOT NULL DEFAULT '',
  "source_url" text NOT NULL DEFAULT '',
  "raw_text" text NOT NULL DEFAULT '',
  "evidence_summary" text NOT NULL DEFAULT '',
  "confidence" text NOT NULL DEFAULT '0.78',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "valid_from" text,
  "valid_to" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "allergen_labeling_rules_source_rule_unique_idx" ON "allergen_labeling_rules" USING btree ("source_id", "rule_type", "title");
CREATE INDEX IF NOT EXISTS "allergen_labeling_rules_category_id_idx" ON "allergen_labeling_rules" USING btree ("allergen_category_id");
CREATE INDEX IF NOT EXISTS "allergen_labeling_rules_source_id_idx" ON "allergen_labeling_rules" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "allergen_labeling_rules_review_status_idx" ON "allergen_labeling_rules" USING btree ("review_status");

CREATE TABLE IF NOT EXISTS "digital_label_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "rule_type" text NOT NULL,
  "title" text NOT NULL,
  "section_title" text NOT NULL DEFAULT '',
  "page_number" integer,
  "source_file" text NOT NULL DEFAULT '',
  "source_url" text NOT NULL DEFAULT '',
  "raw_text" text NOT NULL DEFAULT '',
  "evidence_summary" text NOT NULL DEFAULT '',
  "confidence" text NOT NULL DEFAULT '0.76',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "valid_from" text,
  "valid_to" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "digital_label_rules_source_rule_unique_idx" ON "digital_label_rules" USING btree ("source_id", "rule_type");
CREATE INDEX IF NOT EXISTS "digital_label_rules_source_id_idx" ON "digital_label_rules" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "digital_label_rules_review_status_idx" ON "digital_label_rules" USING btree ("review_status");

CREATE TABLE IF NOT EXISTS "nutrition_polyol_energy_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "source_id" text REFERENCES "official_sources" ("id") ON DELETE set null,
  "polyol_name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "energy_factor_kj_per_g" text NOT NULL,
  "include_in_energy_calculation" boolean NOT NULL DEFAULT false,
  "carbohydrate_energy_adjustment" text NOT NULL DEFAULT '',
  "section_title" text NOT NULL DEFAULT '',
  "source_file" text NOT NULL DEFAULT '',
  "source_url" text NOT NULL DEFAULT '',
  "raw_text" text NOT NULL DEFAULT '',
  "evidence_summary" text NOT NULL DEFAULT '',
  "confidence" text NOT NULL DEFAULT '0.80',
  "review_status" text NOT NULL DEFAULT 'pending_review',
  "valid_from" text,
  "valid_to" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_polyol_energy_rules_source_name_unique_idx" ON "nutrition_polyol_energy_rules" USING btree ("source_id", "normalized_name");
CREATE INDEX IF NOT EXISTS "nutrition_polyol_energy_rules_source_id_idx" ON "nutrition_polyol_energy_rules" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "nutrition_polyol_energy_rules_review_status_idx" ON "nutrition_polyol_energy_rules" USING btree ("review_status");
