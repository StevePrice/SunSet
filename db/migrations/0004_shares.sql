CREATE TABLE "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"place" text,
	"time_zone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shares_entry_id_unique" UNIQUE("entry_id")
);
--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shares_user_idx" ON "shares" USING btree ("user_id");