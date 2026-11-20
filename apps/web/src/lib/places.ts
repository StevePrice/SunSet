// Turning a photo's location into words, e.g. "Carlsbad, California", from the GeoNames towns in
// the `places` table (scripts/load-places.mjs). Nothing leaves our database: no geocoding service
// sees anyone's location. City level on purpose: the exact point is never shown.
import { sql } from "drizzle-orm";
import type { Location } from "@/lib/entry-input";
import type { Db } from "@/lib/db";

/** Farther than this from any town (at sea, deep wilderness), there's no name to give. */
export const MAX_PLACE_DISTANCE_METERS = 50_000;

/** Countries where people name the state or province rather than the country. */
const REGION_COUNTRIES = new Set(["US", "CA", "AU", "GB"]);

export type PlaceRow = { name: string; region: string | null; countryCode: string; country: string | null };

/** "Carlsbad, California" in the US, Canada, Australia and the UK; "Arles, France" elsewhere. */
export function placeLabel(place: PlaceRow): string {
  const second = REGION_COUNTRIES.has(place.countryCode) ? (place.region ?? place.country) : (place.country ?? place.region);
  return second && second !== place.name ? `${place.name}, ${second}` : place.name;
}

/**
 * The nearest town to a point and its time zone. The name is null beyond MAX_PLACE_DISTANCE_METERS;
 * the time zone is still the nearest town's. Both null when the table is empty.
 */
export async function nearestPlace(db: Db, location: Location): Promise<{ name: string | null; timeZone: string | null }> {
  const point = sql`ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)`;
  const result = await db.execute<{
    name: string;
    region: string | null;
    country_code: string;
    country: string | null;
    time_zone: string | null;
    meters: number;
  }>(sql`
    SELECT name, region, country_code, country, time_zone, ST_DistanceSphere(location, ${point}) AS meters
    FROM places
    ORDER BY location <-> ${point}
    LIMIT 1
  `);
  const row = result.rows[0];
  if (!row) return { name: null, timeZone: null };
  const near = Number(row.meters) <= MAX_PLACE_DISTANCE_METERS;
  return {
    name: near ? placeLabel({ name: row.name, region: row.region, countryCode: row.country_code, country: row.country }) : null,
    timeZone: row.time_zone,
  };
}
