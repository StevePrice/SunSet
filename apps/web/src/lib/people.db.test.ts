// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry } from "./entries";
import { entriesWithName, nameChips, namesByEntry, namesForEntry, setEntryNames } from "./people";

const url = process.env.TEST_DATABASE_URL;
const blank = { story: null, takenAt: null, location: null, photoWidth: 1, photoHeight: 1 };

describe.skipIf(!url)("names on sunsets", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const user = `people-${crypto.randomUUID()}`;
  const other = `people-other-${crypto.randomUUID()}`;
  const [a, b, c] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

  beforeAll(async () => {
    await db.insert(schema.users).values([
      { id: user, name: "Lou", email: `${user}@example.com` },
      { id: other, name: "Oth", email: `${other}@example.com` },
    ]);
    for (const id of [a, b, c]) await createEntry(db, user, id, blank);
  });
  afterAll(async () => {
    await pool.query("delete from users where id = any($1)", [[user, other]]);
    await pool.end();
  });

  it("saves names on a sunset, each once ignoring case", async () => {
    expect(await setEntryNames(db, user, a, ["Steve", "steve", "Maria"])).toBe(true);
    expect(await namesForEntry(db, user, a)).toEqual(["Steve", "Maria"]);
  });

  it("replaces the names, keeping ones that stay and taking a new spelling", async () => {
    await setEntryNames(db, user, a, ["maria", "The grandkids"]);
    expect(await namesForEntry(db, user, a)).toEqual(["maria", "The grandkids"]);
    await setEntryNames(db, user, a, ["Maria", "The grandkids"]);
    expect(await namesForEntry(db, user, a)).toEqual(["Maria", "The grandkids"]);
  });

  it("won't put names on someone else's sunset", async () => {
    expect(await setEntryNames(db, other, a, ["Intruder"])).toBe(false);
    expect(await namesForEntry(db, user, a)).toEqual(["Maria", "The grandkids"]);
  });

  it("offers names used before, most recent first, with counts", async () => {
    await setEntryNames(db, user, b, ["Maria"]);
    await setEntryNames(db, user, c, ["Steve"]);
    expect(await nameChips(db, user)).toEqual([
      { name: "Steve", count: 1 },
      { name: "Maria", count: 2 },
      { name: "The grandkids", count: 1 },
    ]);
    expect(await nameChips(db, other)).toEqual([]);
    expect((await namesByEntry(db, user)).get(b)).toEqual(["Maria"]);
  });

  it("finds a name's sunsets ignoring case", async () => {
    const found = await entriesWithName(db, user, "MARIA");
    expect(found.name).toBe("Maria");
    expect([...found.entryIds].sort()).toEqual([a, b].sort());
  });

  it("clears names with an empty list", async () => {
    await setEntryNames(db, user, b, []);
    expect(await namesForEntry(db, user, b)).toEqual([]);
  });
});
