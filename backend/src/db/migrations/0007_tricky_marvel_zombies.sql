CREATE TABLE "user_profile_ingredients" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_ingredients_user_id_kind_ingredient_id_pk" PRIMARY KEY("user_id","kind","ingredient_id"),
	CONSTRAINT "user_profile_ingredients_kind_check" CHECK ("user_profile_ingredients"."kind" in ('watch', 'avoid'))
);
--> statement-breakpoint
ALTER TABLE "user_profile_ingredients" ADD CONSTRAINT "user_profile_ingredients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profile_ingredients_user_id_idx" ON "user_profile_ingredients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profile_ingredients_kind_idx" ON "user_profile_ingredients" USING btree ("kind");