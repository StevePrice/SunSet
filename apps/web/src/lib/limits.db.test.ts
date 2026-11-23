// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry } from "./entries";
import { entriesToday } from "./limits";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("upload limits", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const user = `limits-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(schema.users).values({ id: user, name: "Lim", email: `${user}@example.com` });
  });
  afterAll(async () => {
    await pool.query("delete from users where id = $1", [user]);
    await pool.end();
  });

  it("counts only the last 24 hours of a person's new sunsets", async () => {
    expect(await entriesToday(db, user)).toBe(0);
    await createEntry(db, user, crypto.randomUUID(), { story: null, takenAt: null, location: null, photoWidth: 1, photoHeight: 1 });
    const old = crypto.randomUUID();
    await createEntry(db, user, old, { story: null, takenAt: null, location: null, photoWidth: 1, photoHeight: 1 });
    await pool.query("update entries set created_at = now() - interval '25 hours' where id = $1", [old]);
    expect(await entriesToday(db, user)).toBe(1);
  });
});
