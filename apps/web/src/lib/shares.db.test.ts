// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry } from "./entries";
import { createShare, deleteShare, getPublicShare, getShareForEntry, updateSharePlace } from "./shares";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("shares data access", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const newEntry = async (userId: string) => {
    const id = crypto.randomUUID();
    await createEntry(db, userId, id, {
      story: "Gold over the bay",
      takenAt: null,
      location: { latitude: 32.75, longitude: -117.25 },
      photoWidth: 2560,
      photoHeight: 1440,
    });
    return id;
  };

  beforeAll(async () => {
    await db.insert(schema.users).values([
      { id: alice, name: "Alice", email: `${alice}@example.com` },
      { id: bob, name: " ", email: `${bob}@example.com` },
    ]);
  });

  afterAll(async () => {
    for (const id of [alice, bob]) await pool.query("delete from users where id = $1", [id]);
    await pool.end();
  });

  it("creates one share per entry, for its owner only", async () => {
    const entryId = await newEntry(alice);
    expect(await createShare(db, bob, entryId, "UTC")).toBeNull();
    const first = await createShare(db, alice, entryId, "America/Los_Angeles");
    const again = await createShare(db, alice, entryId, "UTC");
    expect(again).toEqual(first);
    expect(first).toMatchObject({ entryId, place: null, timeZone: "America/Los_Angeles" });
    expect(await getShareForEntry(db, bob, entryId)).toBeNull();
  });

  it("shows the public view without the location or email", async () => {
    const entryId = await newEntry(alice);
    const share = (await createShare(db, alice, entryId, "UTC"))!;
    const view = await getPublicShare(db, share.id);
    expect(view).toMatchObject({ entryId, ownerName: "Alice", story: "Gold over the bay", score: null });
    expect(JSON.stringify(view)).not.toContain("example.com");
    expect(view).not.toHaveProperty("location");
  });

  it("treats a blank name as no name", async () => {
    const share = (await createShare(db, bob, await newEntry(bob), "UTC"))!;
    expect((await getPublicShare(db, share.id))?.ownerName).toBeNull();
  });

  it("lets only the owner set the place or stop sharing, and the link dies for good", async () => {
    const entryId = await newEntry(alice);
    const share = (await createShare(db, alice, entryId, "UTC"))!;
    expect(await updateSharePlace(db, bob, entryId, "Nope")).toBe(false);
    expect(await updateSharePlace(db, alice, entryId, "Ocean Beach")).toBe(true);
    expect((await getPublicShare(db, share.id))?.place).toBe("Ocean Beach");

    expect(await deleteShare(db, bob, entryId)).toBeNull();
    expect(await deleteShare(db, alice, entryId)).toBe(share.id);
    expect(await getPublicShare(db, share.id)).toBeNull();
    const next = (await createShare(db, alice, entryId, "UTC"))!;
    expect(next.id).not.toBe(share.id);
  });

  it("goes away with the entry", async () => {
    const entryId = await newEntry(alice);
    const share = (await createShare(db, alice, entryId, "UTC"))!;
    await deleteEntry(db, alice, entryId);
    expect(await getPublicShare(db, share.id)).toBeNull();
  });
});
