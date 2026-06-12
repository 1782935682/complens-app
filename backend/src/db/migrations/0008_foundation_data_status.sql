ALTER TABLE "ingredients" ADD COLUMN "data_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "source_scope" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "match_confidence" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "review_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "ingredients_data_status_idx" ON "ingredients" USING btree ("data_status");
