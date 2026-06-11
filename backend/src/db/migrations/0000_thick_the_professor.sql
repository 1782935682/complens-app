CREATE TABLE "ingredient_sources" (
	"ingredient_id" text NOT NULL,
	"source_index" integer NOT NULL,
	"title" text NOT NULL,
	"standard" text NOT NULL,
	"region" text,
	"url" text,
	"published_at" text,
	"retrieved_at" text,
	CONSTRAINT "ingredient_sources_ingredient_id_source_index_pk" PRIMARY KEY("ingredient_id","source_index")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"data_category" text NOT NULL,
	"name_cn" text NOT NULL,
	"name_en" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"functions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text NOT NULL,
	"risk_level" text NOT NULL,
	"risk_summary" text,
	"suitable_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caution_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_note" text NOT NULL,
	"source_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text NOT NULL,
	"data_version" text NOT NULL,
	"updated_at" text NOT NULL,
	"gb_code" text NOT NULL,
	"gb_status" text NOT NULL,
	"e_number" text,
	"adi" text,
	"usage_limits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"food_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergen_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caution_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient_sources" ADD CONSTRAINT "ingredient_sources_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_sources_ingredient_id_idx" ON "ingredient_sources" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ingredients_risk_level_idx" ON "ingredients" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "ingredients_gb_code_idx" ON "ingredients" USING btree ("gb_code");--> statement-breakpoint
CREATE INDEX "ingredients_e_number_idx" ON "ingredients" USING btree ("e_number");