CREATE TABLE "places" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"country_code" text NOT NULL,
	"country" text,
	"population" integer DEFAULT 0 NOT NULL,
	"time_zone" text,
	"location" geometry(Point,4326) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "place_name" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "time_zone" text;--> statement-breakpoint
CREATE INDEX "places_location_idx" ON "places" USING gist ("location");