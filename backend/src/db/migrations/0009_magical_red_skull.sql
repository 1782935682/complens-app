CREATE TABLE "gb2760_official_records" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text,
	"standard_code" text NOT NULL,
	"standard_title" text NOT NULL,
	"table_name" text NOT NULL,
	"additive_name_cn" text NOT NULL,
	"additive_name_en" text,
	"cns_number" text,
	"ins_number" text,
	"function_text" text NOT NULL,
	"food_category_code" text NOT NULL,
	"food_category_name" text NOT NULL,
	"max_use_level" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"pdf_page" integer NOT NULL,
	"standard_page" integer NOT NULL,
	"raw_source_text" text NOT NULL,
	"source_name" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"download_endpoint" text NOT NULL,
	"platform_record_id" text NOT NULL,
	"announcement_record_id" text NOT NULL,
	"file_guid" text NOT NULL,
	"fact_name" text NOT NULL,
	"pdf_sha256" text NOT NULL,
	"retrieved_at" text NOT NULL,
	"extraction_status" text NOT NULL,
	"review_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gb2760_official_records" ADD CONSTRAINT "gb2760_official_records_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gb2760_official_records_ingredient_id_idx" ON "gb2760_official_records" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "gb2760_official_records_additive_name_cn_idx" ON "gb2760_official_records" USING btree ("additive_name_cn");--> statement-breakpoint
CREATE INDEX "gb2760_official_records_review_status_idx" ON "gb2760_official_records" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "gb2760_official_records_pdf_sha256_idx" ON "gb2760_official_records" USING btree ("pdf_sha256");