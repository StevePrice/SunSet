// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, getEntry } from "../entries";
import { addTurn, aiCallsToday, ensureSession, finishStory, getSession, recordAiCall, saveDraft, setNextQuestion, setOpeners } from "./sessions";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("story sessions", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
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

  it("belongs to the entry's owner only", async () => {
    const entryId = await newEntry(alice);
    expect(await ensureSession(db, bob, entryId)).toBeNull();
    const session = await ensureSession(db, alice, entryId);
    expect(session).toMatchObject({ entryId, turns: [], openers: [] });
    expect(await ensureSession(db, alice, entryId)).toEqual(session);
    expect(await getSession(db, bob, entryId)).toBeNull();
  });

  it("records questions asked and answers in order, and keeps sensitive once set", async () => {
    const entryId = await newEntry(alice);
    let s = (await ensureSession(db, alice, entryId))!;
    s = await setOpeners(db, s, ["A?", "B?", "C?"]);
    s = await addTurn(db, s, { question: "A?", answer: "First", via: "typed" });
    s = await setNextQuestion(db, s, { question: "D?", wrapUp: false, sensitive: true, safetyConcern: false });
    s = await addTurn(db, s, { question: "D?", answer: "Second", via: "typed" });
    s = await setNextQuestion(db, s, { question: "E?", wrapUp: true, sensitive: false, safetyConcern: false });
    expect(s.asked).toEqual(["A?", "B?", "C?", "D?", "E?"]);
    expect(s.turns.map((t) => t.answer)).toEqual(["First", "Second"]);
    expect(s).toMatchObject({ nextQuestion: "E?", wrapUp: true, sensitive: true });
  });

  it("keeps the first suggested title, and saving puts the story on the entry", async () => {
    const entryId = await newEntry(alice);
    let s = (await ensureSession(db, alice, entryId))!;
    s = await addTurn(db, s, { question: null, answer: "Gold over the bay", via: "typed" });
    s = await saveDraft(db, s, "my-short", { text: "Gold over the bay.", turns: 1, edited: false }, { title: "Bay Gold", caption: "Gold over the bay." });
    s = await saveDraft(db, s, "crafted-photo", { text: "Crafted.", turns: 1, edited: false }, { title: "Other", caption: "Other" });
    expect(s.title).toBe("Bay Gold");

    await finishStory(db, s, { style: "my-short", text: "Gold over the bay, edited.", title: "Bay Gold", caption: "Gold." });
    const entry = await getEntry(db, alice, entryId);
    expect(entry).toMatchObject({ story: "Gold over the bay, edited.", title: "Bay Gold", caption: "Gold." });
    expect((await getSession(db, alice, entryId))!.drafts["my-short"]).toMatchObject({ edited: true });
  });

  it("counts AI calls per user", async () => {
    const before = await aiCallsToday(db, bob);
    await recordAiCall(db, bob, "openers", { inputTokens: 10, outputTokens: 5 });
    await recordAiCall(db, bob, "follow_up", null);
    expect(await aiCallsToday(db, bob)).toBe(before + 2);
  });
});
