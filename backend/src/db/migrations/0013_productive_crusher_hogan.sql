CREATE TABLE "additive_usage_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text NOT NULL,
	"food_category_code" text NOT NULL,
	"food_category_name" text NOT NULL,
	"max_use_level" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"function_text" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source_staging_id" text NOT NULL,
	"source_page" integer NOT NULL,
	"source_table" text NOT NULL,
	"source_hash" text NOT NULL,
	"data_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "additive_usage_rules_data_status_check" CHECK ("additive_usage_rules"."data_status" in ('verified_regulation'))
);
--> statement-breakpoint
ALTER TABLE "additive_usage_rules" ADD CONSTRAINT "additive_usage_rules_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "additive_usage_rules_source_staging_id_unique_idx" ON "additive_usage_rules" USING btree ("source_staging_id");--> statement-breakpoint
CREATE INDEX "additive_usage_rules_ingredient_id_idx" ON "additive_usage_rules" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "additive_usage_rules_food_category_code_idx" ON "additive_usage_rules" USING btree ("food_category_code");--> statement-breakpoint
CREATE INDEX "additive_usage_rules_data_status_idx" ON "additive_usage_rules" USING btree ("data_status");--> statement-breakpoint
CREATE INDEX "additive_usage_rules_source_hash_idx" ON "additive_usage_rules" USING btree ("source_hash");
