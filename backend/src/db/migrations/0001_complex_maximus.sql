CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX "ingredients_name_cn_trgm_idx" ON "ingredients" USING gin ("name_cn" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ingredients_name_en_trgm_idx" ON "ingredients" USING gin ("name_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ingredients_description_trgm_idx" ON "ingredients" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ingredients_aliases_gin_idx" ON "ingredients" USING gin ("aliases");
