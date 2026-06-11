CREATE TABLE "user_allergens" (
	"user_id" text NOT NULL,
	"allergen_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_allergens_user_id_allergen_id_pk" PRIMARY KEY("user_id","allergen_id")
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_user_id_category_ingredient_id_pk" PRIMARY KEY("user_id","category","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "user_history" (
	"user_id" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_history_user_id_query_pk" PRIMARY KEY("user_id","query")
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"user_id" text NOT NULL,
	"report_id" text NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_reports_user_id_report_id_pk" PRIMARY KEY("user_id","report_id")
);
--> statement-breakpoint
ALTER TABLE "user_allergens" ADD CONSTRAINT "user_allergens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_allergens_user_id_idx" ON "user_allergens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_favorites_user_id_idx" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_history_user_id_idx" ON "user_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_history_created_at_idx" ON "user_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_reports_user_id_idx" ON "user_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_reports_category_idx" ON "user_reports" USING btree ("category");