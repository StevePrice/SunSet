CREATE TABLE "set_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_notes_set_visitor_unique" UNIQUE("set_id","visitor_id")
);
--> statement-breakpoint
CREATE TABLE "set_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_reactions_set_visitor_kind_unique" UNIQUE("set_id","visitor_id","kind")
);
--> statement-breakpoint
CREATE TABLE "share_set_entries" (
	"set_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "share_set_entries_set_id_entry_id_pk" PRIMARY KEY("set_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "share_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"person_name" text NOT NULL,
	"include_voice" boolean DEFAULT false NOT NULL,
	"time_zone" text NOT NULL,
	"visitor_id" text,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "set_notes" ADD CONSTRAINT "set_notes_set_id_share_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."share_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_notes" ADD CONSTRAINT "set_notes_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_reactions" ADD CONSTRAINT "set_reactions_set_id_share_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."share_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_reactions" ADD CONSTRAINT "set_reactions_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_set_entries" ADD CONSTRAINT "share_set_entries_set_id_share_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."share_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_set_entries" ADD CONSTRAINT "share_set_entries_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sets" ADD CONSTRAINT "share_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sets" ADD CONSTRAINT "share_sets_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "share_set_entries_entry_idx" ON "share_set_entries" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "share_sets_user_idx" ON "share_sets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "share_sets_live_person_idx" ON "share_sets" USING btree ("user_id",lower("person_name")) WHERE "share_sets"."stopped_at" is null;