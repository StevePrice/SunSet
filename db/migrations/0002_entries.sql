CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"story" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" geometry(Point,4326),
	"photo_width" integer NOT NULL,
	"photo_height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_taken_at_idx" ON "entries" USING btree ("user_id","taken_at" DESC NULLS LAST);