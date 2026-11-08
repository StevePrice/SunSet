CREATE TABLE "entry_scores" (
	"entry_id" text NOT NULL,
	"scorer_version" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"palette" smallint,
	"reach" smallint,
	"setting" smallint,
	"wow" smallint,
	"composite" numeric(4, 2),
	"display_score" smallint,
	"details" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scored_at" timestamp with time zone,
	CONSTRAINT "entry_scores_entry_id_scorer_version_pk" PRIMARY KEY("entry_id","scorer_version")
);
--> statement-breakpoint
ALTER TABLE "entry_scores" ADD CONSTRAINT "entry_scores_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;