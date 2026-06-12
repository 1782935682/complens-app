CREATE TABLE "product_archives" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"category" text DEFAULT 'food' NOT NULL,
	"product_name" text NOT NULL,
	"brand_name" text,
	"thumbnail_url" text,
	"original_text" text NOT NULL,
	"parsed_ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"report_id" text,
	"risk_grade" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_archives_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "product_archives" ADD CONSTRAINT "product_archives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_archives_user_id_idx" ON "product_archives" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_archives_category_idx" ON "product_archives" USING btree ("category");--> statement-breakpoint
CREATE INDEX "product_archives_product_name_idx" ON "product_archives" USING btree ("product_name");--> statement-breakpoint
CREATE INDEX "product_archives_is_favorite_idx" ON "product_archives" USING btree ("is_favorite");