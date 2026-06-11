ALTER TABLE "ingredients" ADD COLUMN "source_name" text DEFAULT '待补充来源名称' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "source_type" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "source_version" text DEFAULT '待补充来源版本' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "source_url" text DEFAULT '待补充来源链接' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "effective_date" text DEFAULT '待人工核验' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "confidence_level" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "last_reviewed_at" text DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "regulatory_basis" text DEFAULT '待补充法规依据' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "raw_source_text" text DEFAULT '待补充原始来源片段' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;
