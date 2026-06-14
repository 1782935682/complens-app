CREATE TABLE "import_errors" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"row_ref" text NOT NULL,
	"reason" text NOT NULL,
	"raw_source_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_document_id" text NOT NULL,
	"run_type" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"succeeded_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "import_runs_run_type_check" CHECK ("import_runs"."run_type" in ('fulltext', 'a1_staging', 'reference_tables', 'promote')),
	CONSTRAINT "import_runs_status_check" CHECK ("import_runs"."status" in ('running', 'succeeded', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"doc_code" text NOT NULL,
	"title" text NOT NULL,
	"pdf_file_name" text NOT NULL,
	"pdf_sha256" text NOT NULL,
	"platform_record_id" text NOT NULL,
	"attachment_id" text NOT NULL,
	"publish_date" text NOT NULL,
	"effective_date" text NOT NULL,
	"download_endpoint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_errors_import_run_id_idx" ON "import_errors" USING btree ("import_run_id");--> statement-breakpoint
CREATE INDEX "import_errors_created_at_idx" ON "import_errors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "import_runs_source_document_id_idx" ON "import_runs" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "import_runs_run_type_idx" ON "import_runs" USING btree ("run_type");--> statement-breakpoint
CREATE INDEX "import_runs_status_idx" ON "import_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_runs_started_at_idx" ON "import_runs" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_pdf_sha256_unique_idx" ON "source_documents" USING btree ("pdf_sha256");--> statement-breakpoint
CREATE INDEX "source_documents_doc_code_idx" ON "source_documents" USING btree ("doc_code");--> statement-breakpoint
CREATE INDEX "source_documents_platform_record_id_idx" ON "source_documents" USING btree ("platform_record_id");