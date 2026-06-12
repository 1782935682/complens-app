ALTER TABLE "ingredients" ADD COLUMN "reviewed_by" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "reviewed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "change_note" text DEFAULT 'seed import' NOT NULL;--> statement-breakpoint
CREATE INDEX "ingredients_confidence_level_idx" ON "ingredients" USING btree ("confidence_level");--> statement-breakpoint
CREATE INDEX "ingredients_data_version_idx" ON "ingredients" USING btree ("data_version");