CREATE TABLE "story_clips" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_type" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"transcript" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_sessions" ADD COLUMN "said" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_story_help" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_notice_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_clips" ADD CONSTRAINT "story_clips_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_clips" ADD CONSTRAINT "story_clips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_clips_entry_idx" ON "story_clips" USING btree ("entry_id","created_at");--> statement-breakpoint
CREATE INDEX "story_clips_user_idx" ON "story_clips" USING btree ("user_id");