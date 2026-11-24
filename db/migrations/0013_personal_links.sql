CREATE TABLE "share_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"include_voice" boolean DEFAULT false NOT NULL,
	"visitor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_recipients_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "include_voice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "share_recipients" ADD CONSTRAINT "share_recipients_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_recipients" ADD CONSTRAINT "share_recipients_visitor_id_reaction_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."reaction_visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "share_recipients_share_name_idx" ON "share_recipients" USING btree ("share_id",lower("name"));