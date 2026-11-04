CREATE TABLE "admin_views" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"viewed_user_id" text NOT NULL,
	"entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"credit" text,
	"source_url" text,
	"is_sunset" boolean DEFAULT true NOT NULL,
	"model" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"rater_id" text NOT NULL,
	"param" text NOT NULL,
	"left_id" text NOT NULL,
	"right_id" text NOT NULL,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_views" ADD CONSTRAINT "admin_views_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_votes" ADD CONSTRAINT "calibration_votes_rater_id_users_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_votes" ADD CONSTRAINT "calibration_votes_left_id_calibration_photos_id_fk" FOREIGN KEY ("left_id") REFERENCES "public"."calibration_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_votes" ADD CONSTRAINT "calibration_votes_right_id_calibration_photos_id_fk" FOREIGN KEY ("right_id") REFERENCES "public"."calibration_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_views_viewed_idx" ON "admin_views" USING btree ("viewed_user_id","created_at");--> statement-breakpoint
CREATE INDEX "calibration_votes_param_idx" ON "calibration_votes" USING btree ("param","rater_id");