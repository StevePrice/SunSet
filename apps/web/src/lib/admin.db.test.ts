// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { SCORER_VERSION } from "@sunset/scoring";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { getEntryOwner, isAdmin, listUsers, logAdminView, queueRescoreAll } from "./admin";
import { nextPair, recordVote, results } from "./calibration";
import { createEntry } from "./entries";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("admin and calibration", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const admin = `admin-${crypto.randomUUID()}`;
  const user = `user-${crypto.randomUUID()}`;
  const photos = ["a", "b", "c", "d"].map((x) => `test-${x}-${crypto.randomUUID().slice(0, 8)}`);

  beforeAll(async () => {
    await db.insert(schema.users).values([
      { id: admin, name: "Admin", email: `${admin}@example.com`, role: "admin" },
      { id: user, name: "User", email: `${user}@example.com` },
    ]);
    await db.insert(schema.calibrationPhotos).values(
      photos.map((id, i) => ({ id, title: id, model: { scorerVersion: "test", isSunset: true, wow: i + 1 } })),
    );
  });

  afterAll(async () => {
    for (const id of [admin, user]) await pool.query("delete from users where id = $1", [id]);
    await pool.query("delete from calibration_photos where id = any($1)", [photos]);
    await pool.end();
  });

  it("knows who is an admin", async () => {
    expect(await isAdmin(db, admin)).toBe(true);
    expect(await isAdmin(db, user)).toBe(false);
  });

  it("lists users with their entry counts and finds an entry's owner", async () => {
    const entryId = crypto.randomUUID();
    await createEntry(db, user, entryId, { story: null, takenAt: null, location: null, photoWidth: 10, photoHeight: 10 });
    const row = (await listUsers(db)).find((u) => u.id === user);
    expect(row).toMatchObject({ entryCount: 1, role: "user" });
    expect(await getEntryOwner(db, entryId)).toBe(user);
  });

  it("logs views of other people's journals, not your own", async () => {
    await logAdminView(db, admin, user);
    await logAdminView(db, admin, admin);
    const { rows } = await pool.query("select viewed_user_id from admin_views where admin_id = $1", [admin]);
    expect(rows.map((r) => r.viewed_user_id)).toEqual([user]);
  });

  it("queues only entries without a current score", async () => {
    const scored = crypto.randomUUID();
    await createEntry(db, user, scored, { story: null, takenAt: null, location: null, photoWidth: 10, photoHeight: 10 });
    await db.insert(schema.entryScores).values({ entryId: scored, scorerVersion: SCORER_VERSION, status: "done" });
    const queue = { sendBatch: vi.fn().mockResolvedValue(undefined) } as unknown as Queue<{ entryId: string }> & { sendBatch: ReturnType<typeof vi.fn> };
    await queueRescoreAll(db, queue);
    const sent = queue.sendBatch.mock.calls.flatMap(([batch]) => batch.map((m: { body: { entryId: string } }) => m.body.entryId));
    expect(sent).not.toContain(scored);
    expect(await queueRescoreAll(db, queue)).toBe(0);
  });

  it("offers each pair once, then ranks photos by votes against the scorer", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const pair = (await nextPair(db, admin, "wow"))!;
      const key = [pair.left.id, pair.right.id].sort().join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      // The admin prefers the photo the scorer rated higher, so the orders should agree.
      const leftIndex = photos.indexOf(pair.left.id);
      const rightIndex = photos.indexOf(pair.right.id);
      if (leftIndex < 0 || rightIndex < 0) continue;
      await recordVote(db, admin, "wow", pair.left.id, pair.right.id, leftIndex > rightIndex ? "left" : "right");
    }
    const mine = await results(db, "wow", admin);
    const ours = mine.photos.filter((p) => photos.includes(p.id)).map((p) => p.id);
    expect(ours).toEqual([...photos].reverse());
  });
});
