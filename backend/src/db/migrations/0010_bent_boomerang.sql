CREATE TABLE "gb2760_official_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"standard_code" text NOT NULL,
	"standard_title" text NOT NULL,
	"pdf_page" integer NOT NULL,
	"standard_page_label" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"text_sha256" text NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gb2760_official_pages_pdf_page_unique_idx" ON "gb2760_official_pages" USING btree ("pdf_page");--> statement-breakpoint
CREATE INDEX "gb2760_official_pages_standard_page_label_idx" ON "gb2760_official_pages" USING btree ("standard_page_label");--> statement-breakpoint
CREATE INDEX "gb2760_official_pages_text_sha256_idx" ON "gb2760_official_pages" USING btree ("text_sha256");--> statement-breakpoint
CREATE INDEX "gb2760_official_pages_pdf_sha256_idx" ON "gb2760_official_pages" USING btree ("pdf_sha256");