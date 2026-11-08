// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { SCORER_VERSION } from "@sunset/scoring";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { createEntry } from "./entries";
import { DAILY_SCORING_LIMIT, getScore, requestScore } from "./scores";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("scores data access", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const queue = () => ({ send: vi.fn().mockResolvedValue(undefined) }) as unknown as Queue<{ entryId: string }> & {
    send: ReturnType<typeof vi.fn>;
  };
  const newEntry = async (userId: string) => {
    const id = crypto.randomUUID();
    await createEntry(db, userId, id, { story: null, takenAt: null, location: null, photoWidth: 2560, photoHeight: 1440 });
    return id;
  };

  beforeAll(async () => {
    for (const id of [alice, bob]) await db.insert(schema.users).values({ id, name: id, email: `${id}@example.com` });
  });

  afterAll(async () => {
    for (const id of [alice, bob]) await pool.query("delete from users where id = $1", [id]);
    await pool.end();
  });

  it("queues a new entry and shows it as pending to its owner only", async () => {
    const entryId = await newEntry(alice);
    const q = queue();
    expect(await requestScore(db, q, alice, entryId)).toBe("pending");
    expect(q.send).toHaveBeenCalledWith({ entryId });
    expect(await getScore(db, alice, entryId)).toMatchObject({ status: "pending" });
    expect(await getScore(db, bob, entryId)).toBeNull();
  });

  it("returns the finished score with what the model saw", async () => {
    const entryId = await newEntry(alice);
    await db.insert(schema.entryScores).values({
      entryId,
      scorerVersion: SCORER_VERSION,
      status: "done",
      palette: 7, reach: 6, setting: 8, wow: 5, composite: 6.5, displayScore: 65,
      details: {
        scene: {
          setting: { type: "ocean", reason: "The sea frames it." },
          phenomena: [
            { kind: "reflection", confidence: "clear", description: "on wet sand" },
            { kind: "halo", confidence: "possible", description: "faint" },
          ],
          wow_reason: "The reflection doubles the colour.",
        },
      },
    });
    expect(await getScore(db, alice, entryId)).toMatchObject({
      status: "done",
      displayScore: 65,
      settingType: "ocean",
      phenomena: [{ kind: "reflection", description: "on wet sand" }],
    });
  });

  it("stops queueing after the daily limit and resets a re-request", async () => {
    const q = queue();
    for (let i = 0; i < DAILY_SCORING_LIMIT; i++) await requestScore(db, q, bob, await newEntry(bob));
    const over = await newEntry(bob);
    expect(await requestScore(db, q, bob, over)).toBe("limited");
    expect(q.send).toHaveBeenCalledTimes(DAILY_SCORING_LIMIT);
    expect(await getScore(db, bob, over)).toMatchObject({ status: "limited" });
  });
});
