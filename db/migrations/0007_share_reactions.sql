CREATE TABLE "reaction_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"share_id" text,
	"visitor_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reaction_notes_share_visitor_unique" UNIQUE("share_id","visitor_id")
);
--> statement-breakpoint
CREATE TABLE "reaction_visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"share_id" text,
	"visitor_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_share_visitor_kind_unique" UNIQUE("share_id","visitor_id","kind")
);
--> statement-breakpoint
ALTER TABLE "reaction_notes" ADD CONSTRAINT "reaction_notes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_notes" ADD CONSTRAINT "reaction_notes_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_notes" ADD CONSTRAINT "reaction_notes_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reaction_notes_entry_idx" ON "reaction_notes" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "reactions_entry_idx" ON "reactions" USING btree ("entry_id");