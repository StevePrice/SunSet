// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { nearestPlace } from "./places";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("nearest place", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  // Ids far above GeoNames' own, so a loaded table is left alone.
  const base = 2_000_000_000 + Math.floor(Math.random() * 100_000_000);
  const ids = [base, base + 1, base + 2];

  beforeAll(async () => {
    await db.insert(schema.places).values([
      { id: ids[0], name: "Carlsbad", region: "California", countryCode: "US", country: "United States", population: 114000, timeZone: "America/Los_Angeles", location: { x: -117.35059, y: 33.15809 } },
      { id: ids[1], name: "Oceanside", region: "California", countryCode: "US", country: "United States", population: 175000, timeZone: "America/Los_Angeles", location: { x: -117.37948, y: 33.19587 } },
      { id: ids[2], name: "Arles", region: "Provence-Alpes-Côte d'Azur", countryCode: "FR", country: "France", population: 53000, timeZone: "Europe/Paris", location: { x: 4.63031, y: 43.67681 } },
    ]);
  });

  afterAll(async () => {
    await db.delete(schema.places).where(inArray(schema.places.id, ids));
    await pool.end();
  });

  it("names the nearest town, with its time zone", async () => {
    // A beach just south of Carlsbad's centre: nearer Carlsbad than Oceanside.
    expect(await nearestPlace(db, { latitude: 33.14, longitude: -117.34 })).toEqual({ name: "Carlsbad, California", timeZone: "America/Los_Angeles" });
    expect(await nearestPlace(db, { latitude: 43.68, longitude: 4.62 })).toEqual({ name: "Arles, France", timeZone: "Europe/Paris" });
  });

  it("gives no name far from any town, but still a time zone", async () => {
    // Out in the Pacific, hundreds of kilometres from Carlsbad.
    const place = await nearestPlace(db, { latitude: 30, longitude: -121 });
    expect(place.name).toBeNull();
    expect(place.timeZone).not.toBeNull();
  });
});
