CREATE TABLE "gb2760_official_reference_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"standard_code" text NOT NULL,
	"standard_title" text NOT NULL,
	"table_name" text NOT NULL,
	"table_title" text NOT NULL,
	"row_number" integer NOT NULL,
	"row_code" text NOT NULL,
	"row_name" text NOT NULL,
	"row_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
	"extraction_tool" text NOT NULL,
	"extraction_scope" text NOT NULL,
	"generated_at" text NOT NULL,
	"extraction_status" text NOT NULL,
	"review_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "gb2760_official_reference_rows_table_name_idx" ON "gb2760_official_reference_rows" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "gb2760_official_reference_rows_row_code_idx" ON "gb2760_official_reference_rows" USING btree ("row_code");--> statement-breakpoint
CREATE INDEX "gb2760_official_reference_rows_pdf_sha256_idx" ON "gb2760_official_reference_rows" USING btree ("pdf_sha256");