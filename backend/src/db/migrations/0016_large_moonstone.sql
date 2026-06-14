ALTER TABLE "gb2760_official_records" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "gb2760_official_records" ADD COLUMN "reviewed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "gb2760_official_records" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gb2760_official_records" ADD COLUMN "review_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "gb2760_official_records"
SET
  "reviewed_by" = CASE
    WHEN "review_status" = 'mapped_candidate' THEN 'legacy-gb2760-auto-map'
    WHEN "review_status" = 'verified' THEN 'legacy-gb2760-seed'
    ELSE 'legacy-gb2760-review'
  END,
  "reviewed_by_user_id" = CASE
    WHEN "review_status" = 'mapped_candidate' THEN 'legacy-gb2760-auto-map'
    WHEN "review_status" = 'verified' THEN 'legacy-gb2760-seed'
    ELSE 'legacy-gb2760-review'
  END,
  "reviewed_at" = COALESCE("synced_at", now()),
  "review_note" = CASE
    WHEN "review_status" = 'mapped_candidate' THEN 'Legacy GB 2760 staging mapping recorded before reviewer audit fields were added.'
    WHEN "review_status" = 'verified' THEN 'Legacy verified GB 2760 seed row recorded before reviewer audit fields were added.'
    ELSE 'Legacy GB 2760 staging sign-off recorded before reviewer audit fields were added.'
  END
WHERE "review_status" IN ('mapped_candidate', 'approved', 'promoted', 'verified');--> statement-breakpoint
CREATE INDEX "gb2760_official_records_reviewed_at_idx" ON "gb2760_official_records" USING btree ("reviewed_at");
