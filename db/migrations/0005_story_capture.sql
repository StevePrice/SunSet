CREATE TABLE "ai_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_sessions" (
	"entry_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"openers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asked" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"turns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_question" text,
	"wrap_up" boolean DEFAULT false NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"safety_concern" boolean DEFAULT false NOT NULL,
	"drafts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"title" text,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_sessions" ADD CONSTRAINT "story_sessions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_sessions" ADD CONSTRAINT "story_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_user_created_idx" ON "ai_calls" USING btree ("user_id","created_at");