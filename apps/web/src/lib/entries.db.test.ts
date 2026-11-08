// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry, getEntry, listEntries, updateEntry } from "./entries";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("entries data access", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const photo = { photoWidth: 2560, photoHeight: 1920 };

  beforeAll(async () => {
    for (const id of [alice, bob]) {
      await db.insert(schema.users).values({ id, name: id, email: `${id}@example.com` });
    }
  });

  afterAll(async () => {
    for (const id of [alice, bob]) {
      await pool.query("delete from users where id = $1", [id]);
    }
    await pool.end();
  });

  it("stores and returns an entry with its exact location", async () => {
    const id = crypto.randomUUID();
    const created = await createEntry(db, alice, id, {
      story: "Last night of the trip",
      takenAt: new Date("2026-08-01T02:30:00Z"),
      location: { latitude: 37.77, longitude: -122.42 },
      ...photo,
    });
    expect(created).toMatchObject({ id, story: "Last night of the trip", location: { latitude: 37.77, longitude: -122.42 } });
    const { rows } = await pool.query("select ST_SRID(location) srid from entries where id = $1", [id]);
    expect(rows[0].srid).toBe(4326);
  });

  it("lists entries newest first, only for their owner", async () => {
    await createEntry(db, alice, crypto.randomUUID(), { story: null, takenAt: new Date("2026-09-01"), location: null, ...photo });
    await createEntry(db, bob, crypto.randomUUID(), { story: "Bob's", takenAt: new Date("2026-09-02"), location: null, ...photo });
    const aliceEntries = await listEntries(db, alice);
    expect(aliceEntries.map((e) => e.story)).toEqual([null, "Last night of the trip"]);
    expect((await listEntries(db, bob)).map((e) => e.story)).toEqual(["Bob's"]);
  });

  it("never lets another user read, edit or delete an entry", async () => {
    const id = crypto.randomUUID();
    await createEntry(db, alice, id, { story: "Private", takenAt: null, location: null, ...photo });
    expect(await getEntry(db, bob, id)).toBeNull();
    expect(await updateEntry(db, bob, id, { story: "Changed" })).toBe(false);
    expect(await deleteEntry(db, bob, id)).toBe(false);
    expect((await getEntry(db, alice, id))?.story).toBe("Private");
  });

  it("lets the owner edit the story, clear the location and delete", async () => {
    const id = crypto.randomUUID();
    await createEntry(db, alice, id, { story: "Old", takenAt: null, location: { latitude: 1, longitude: 2 }, ...photo });
    expect(await updateEntry(db, alice, id, { story: "New", location: null })).toBe(true);
    expect(await getEntry(db, alice, id)).toMatchObject({ story: "New", location: null });
    expect(await deleteEntry(db, alice, id)).toBe(true);
    expect(await getEntry(db, alice, id)).toBeNull();
  });
});
