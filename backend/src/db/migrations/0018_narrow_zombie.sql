CREATE TABLE "ingredient_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text NOT NULL,
	"alias_name" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"alias_type" text NOT NULL,
	"language" text DEFAULT 'zh' NOT NULL,
	"source_id" text,
	"source_status" text DEFAULT 'official' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_aliases_source_status_check" CHECK ("ingredient_aliases"."source_status" in ('official', 'format_variant', 'legacy_unverified'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_master" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"ingredient_type" text NOT NULL,
	"regulatory_status" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cns_code" text,
	"ins_code" text,
	"cas_number" text,
	"source_status" text DEFAULT 'unverified' NOT NULL,
	"legacy_ingredient_id" text,
	"legacy_kind" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_master_ingredient_type_check" CHECK ("ingredient_master"."ingredient_type" in ('ordinary_ingredient', 'food_additive', 'nutrition_fortifier', 'novel_food_ingredient', 'food_medicine_substance', 'food_microorganism', 'allergen_source', 'compound_ingredient', 'other')),
	CONSTRAINT "ingredient_master_source_status_check" CHECK ("ingredient_master"."source_status" in ('official', 'pending_review', 'internal_lexicon', 'safety_evaluation_only', 'unverified'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_regulatory_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text NOT NULL,
	"source_id" text NOT NULL,
	"food_category_code" text NOT NULL,
	"food_category_name" text NOT NULL,
	"allowed_status" text NOT NULL,
	"max_use_level" text,
	"unit" text,
	"residue_level" text,
	"use_principle" text,
	"restrictions" text,
	"notes" text,
	"valid_from" text,
	"valid_to" text,
	"status" text NOT NULL,
	"legacy_additive_usage_rule_id" text,
	"source_staging_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_regulatory_rules_allowed_status_check" CHECK ("ingredient_regulatory_rules"."allowed_status" in ('allowed', 'restricted', 'not_allowed', 'unknown')),
	CONSTRAINT "ingredient_regulatory_rules_status_check" CHECK ("ingredient_regulatory_rules"."status" in ('current', 'pending_review', 'superseded', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_relations" (
	"source_ingredient_id" text NOT NULL,
	"target_ingredient_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"official_source_id" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_relations_source_ingredient_id_target_ingredient_id_relation_type_pk" PRIMARY KEY("source_ingredient_id","target_ingredient_id","relation_type")
);
--> statement-breakpoint
CREATE TABLE "ingredient_source_relations" (
	"ingredient_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_location" text DEFAULT '' NOT NULL,
	"page_number" integer,
	"table_name" text,
	"row_reference" text,
	"original_name" text NOT NULL,
	"evidence_summary" text NOT NULL,
	"valid_from" text,
	"valid_to" text,
	"status" text NOT NULL,
	CONSTRAINT "ingredient_source_relations_ingredient_id_source_id_source_location_original_name_pk" PRIMARY KEY("ingredient_id","source_id","source_location","original_name"),
	CONSTRAINT "ingredient_source_relations_status_check" CHECK ("ingredient_source_relations"."status" in ('current', 'pending_review', 'superseded', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_type_tags" (
	"ingredient_id" text NOT NULL,
	"tag" text NOT NULL,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_type_tags_ingredient_id_tag_pk" PRIMARY KEY("ingredient_id","tag")
);
--> statement-breakpoint
CREATE TABLE "official_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_org" text NOT NULL,
	"source_type" text NOT NULL,
	"standard_no" text,
	"announcement_no" text,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"publication_date" text NOT NULL,
	"effective_date" text,
	"retrieved_at" text NOT NULL,
	"content_hash" text NOT NULL,
	"parser_version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_sources_status_check" CHECK ("official_sources"."status" in ('active', 'superseded', 'revoked', 'draft'))
);
--> statement-breakpoint
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_source_id_official_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_master" ADD CONSTRAINT "ingredient_master_legacy_ingredient_id_ingredients_id_fk" FOREIGN KEY ("legacy_ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_regulatory_rules" ADD CONSTRAINT "ingredient_regulatory_rules_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_regulatory_rules" ADD CONSTRAINT "ingredient_regulatory_rules_source_id_official_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_regulatory_rules" ADD CONSTRAINT "ingredient_regulatory_rules_source_staging_id_gb2760_official_records_id_fk" FOREIGN KEY ("source_staging_id") REFERENCES "public"."gb2760_official_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_relations" ADD CONSTRAINT "ingredient_relations_source_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("source_ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_relations" ADD CONSTRAINT "ingredient_relations_target_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("target_ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_relations" ADD CONSTRAINT "ingredient_relations_official_source_id_official_sources_id_fk" FOREIGN KEY ("official_source_id") REFERENCES "public"."official_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_source_relations" ADD CONSTRAINT "ingredient_source_relations_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_source_relations" ADD CONSTRAINT "ingredient_source_relations_source_id_official_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_type_tags" ADD CONSTRAINT "ingredient_type_tags_ingredient_id_ingredient_master_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_type_tags" ADD CONSTRAINT "ingredient_type_tags_source_id_official_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_aliases_ingredient_alias_type_unique_idx" ON "ingredient_aliases" USING btree ("ingredient_id","normalized_alias","alias_type");--> statement-breakpoint
CREATE INDEX "ingredient_aliases_ingredient_id_idx" ON "ingredient_aliases" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_aliases_normalized_alias_idx" ON "ingredient_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "ingredient_aliases_source_id_idx" ON "ingredient_aliases" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_master_normalized_type_unique_idx" ON "ingredient_master" USING btree ("normalized_name","ingredient_type");--> statement-breakpoint
CREATE INDEX "ingredient_master_canonical_name_idx" ON "ingredient_master" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "ingredient_master_normalized_name_idx" ON "ingredient_master" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "ingredient_master_ingredient_type_idx" ON "ingredient_master" USING btree ("ingredient_type");--> statement-breakpoint
CREATE INDEX "ingredient_master_regulatory_status_idx" ON "ingredient_master" USING btree ("regulatory_status");--> statement-breakpoint
CREATE INDEX "ingredient_master_source_status_idx" ON "ingredient_master" USING btree ("source_status");--> statement-breakpoint
CREATE INDEX "ingredient_master_legacy_ingredient_id_idx" ON "ingredient_master" USING btree ("legacy_ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_regulatory_rules_source_staging_unique_idx" ON "ingredient_regulatory_rules" USING btree ("source_staging_id");--> statement-breakpoint
CREATE INDEX "ingredient_regulatory_rules_ingredient_id_idx" ON "ingredient_regulatory_rules" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_regulatory_rules_source_id_idx" ON "ingredient_regulatory_rules" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "ingredient_regulatory_rules_food_category_code_idx" ON "ingredient_regulatory_rules" USING btree ("food_category_code");--> statement-breakpoint
CREATE INDEX "ingredient_regulatory_rules_status_idx" ON "ingredient_regulatory_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingredient_relations_target_ingredient_id_idx" ON "ingredient_relations" USING btree ("target_ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_relations_relation_type_idx" ON "ingredient_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "ingredient_relations_official_source_id_idx" ON "ingredient_relations" USING btree ("official_source_id");--> statement-breakpoint
CREATE INDEX "ingredient_source_relations_source_id_idx" ON "ingredient_source_relations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "ingredient_source_relations_status_idx" ON "ingredient_source_relations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingredient_type_tags_tag_idx" ON "ingredient_type_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "ingredient_type_tags_source_id_idx" ON "ingredient_type_tags" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "official_sources_source_type_idx" ON "official_sources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "official_sources_standard_no_idx" ON "official_sources" USING btree ("standard_no");--> statement-breakpoint
CREATE INDEX "official_sources_content_hash_idx" ON "official_sources" USING btree ("content_hash");
