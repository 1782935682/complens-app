CREATE TABLE IF NOT EXISTS "label_scan_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "label_type_hint" text NOT NULL DEFAULT 'unknown_label',
  "status" text NOT NULL DEFAULT 'draft',
  "images_requested" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "label_scan_sessions_status_check" CHECK ("status" in ('draft', 'in_progress', 'completed')),
  CONSTRAINT "label_scan_sessions_label_type_hint_check" CHECK ("label_type_hint" in ('ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product', 'unknown_label'))
);

CREATE INDEX "label_scan_sessions_status_idx" ON "label_scan_sessions" USING btree ("status");
CREATE INDEX "label_scan_sessions_created_at_idx" ON "label_scan_sessions" USING btree ("created_at");

CREATE TABLE IF NOT EXISTS "label_scan_images" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL REFERENCES "label_scan_sessions" ("id") ON DELETE cascade,
  "asset_id" text NOT NULL,
  "label_type" text NOT NULL,
  "mime_type" text NOT NULL,
  "ocr_result_id" text,
  "status" text NOT NULL DEFAULT 'ocr_input',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "label_scan_images_label_type_check" CHECK ("label_type" in ('ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product', 'unknown_label')),
  CONSTRAINT "label_scan_images_status_check" CHECK ("status" in ('ocr_input', 'ocr_success', 'ocr_failed', 'manual_entry')),
  CONSTRAINT "label_scan_images_mime_type_check" CHECK (length("mime_type") <= 120)
);

CREATE UNIQUE INDEX "label_scan_images_session_asset_unique" ON "label_scan_images" USING btree ("session_id", "asset_id");
CREATE INDEX "label_scan_images_session_id_idx" ON "label_scan_images" USING btree ("session_id");
CREATE INDEX "label_scan_images_status_idx" ON "label_scan_images" USING btree ("status");
