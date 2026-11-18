CREATE TABLE "admin_log" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text,
	"admin_email" text,
	"action" text NOT NULL,
	"target_user_id" text,
	"target_email" text,
	"entry_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Keep the existing Journal views: they become view_journal / view_entry rows, with the emails
-- copied in. admin_views is then dropped (and its cascade-on-delete foreign key with it).
INSERT INTO "admin_log" ("id", "admin_id", "admin_email", "action", "target_user_id", "target_email", "entry_id", "created_at")
SELECT v."id", v."admin_id", a."email",
	CASE WHEN v."entry_id" IS NULL THEN 'view_journal' ELSE 'view_entry' END,
	v."viewed_user_id", t."email", v."entry_id", v."created_at"
FROM "admin_views" v
LEFT JOIN "users" a ON a."id" = v."admin_id"
LEFT JOIN "users" t ON t."id" = v."viewed_user_id";--> statement-breakpoint
DROP TABLE "admin_views" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "admin_log_target_idx" ON "admin_log" USING btree ("target_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_log_created_idx" ON "admin_log" USING btree ("created_at");