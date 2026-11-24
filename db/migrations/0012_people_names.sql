CREATE TABLE "entry_people" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_people" ADD CONSTRAINT "entry_people_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_people" ADD CONSTRAINT "entry_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entry_people_entry_name_idx" ON "entry_people" USING btree ("entry_id",lower("name"));--> statement-breakpoint
CREATE INDEX "entry_people_user_idx" ON "entry_people" USING btree ("user_id","created_at" DESC NULLS LAST);