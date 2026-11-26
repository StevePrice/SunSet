CREATE TABLE "story_additions" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"share_id" text,
	"visitor_id" text NOT NULL,
	"body" text,
	"r2_key" text,
	"content_type" text,
	"duration_ms" integer,
	"size_bytes" integer,
	"transcript" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_additions_share_visitor_unique" UNIQUE("share_id","visitor_id")
);
--> statement-breakpoint
ALTER TABLE "story_additions" ADD CONSTRAINT "story_additions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_additions" ADD CONSTRAINT "story_additions_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_additions" ADD CONSTRAINT "story_additions_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_additions_entry_idx" ON "story_additions" USING btree ("entry_id","sent_at");