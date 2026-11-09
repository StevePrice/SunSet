// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry } from "../entries";
import { getStorySettings, markAiNoticeSeen, setAiStoryHelp } from "../settings";
import { withAi } from "./ai-guard";
import {
  clipKey,
  clipsForAnswer,
  createClip,
  deleteAllRecordings,
  deleteEntryRecordings,
  getClip,
  listClips,
  setClipTranscript,
} from "./clips";
import { addTurn, aiCallsToday, ensureSession, getSession } from "./sessions";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("voice recordings and Settings", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const newEntry = async (userId: string) => {
    const id = crypto.randomUUID();
    await createEntry(db, userId, id, { story: null, takenAt: null, location: null, photoWidth: 2560, photoHeight: 1440 });
    return id;
  };
  const newClip = async (userId: string, entryId: string) => {
    const id = crypto.randomUUID();
    const r2Key = clipKey(userId, entryId, id, "m4a");
    return createClip(db, userId, entryId, { id, r2Key, contentType: "audio/mp4", durationMs: 4000, sizeBytes: 1234 });
  };

  beforeAll(async () => {
    for (const id of [alice, bob]) await db.insert(schema.users).values({ id, name: id, email: `${id}@example.com` });
  });
  afterAll(async () => {
    for (const id of [alice, bob]) await pool.query("delete from users where id = $1", [id]);
    await pool.end();
  });

  it("only the entry's owner can add or read its clips", async () => {
    const entryId = await newEntry(alice);
    expect(await newClip(bob, entryId)).toBeNull();
    const clip = (await newClip(alice, entryId))!;
    expect(clip.r2Key).toBe(`entries/${alice}/${entryId}/clips/${clip.id}.m4a`);
    expect(await getClip(db, alice, clip.id)).toMatchObject({ id: clip.id, transcript: null });
    expect(await getClip(db, bob, clip.id)).toBeNull();
    expect(await listClips(db, bob, entryId)).toEqual([]);
    expect(await clipsForAnswer(db, bob, entryId, [clip.id])).toEqual([]);
    await setClipTranscript(db, bob, clip.id, "Bob's words");
    expect((await getClip(db, alice, clip.id))!.transcript).toBeNull();
    await setClipTranscript(db, alice, clip.id, "Gold over the bay");
    expect((await getClip(db, alice, clip.id))!.transcript).toBe("Gold over the bay");
  });

  it("deleting an entry deletes its clips", async () => {
    const entryId = await newEntry(alice);
    const clips = [(await newClip(alice, entryId))!, (await newClip(alice, entryId))!];
    expect((await listClips(db, alice, entryId)).map((c) => c.id)).toEqual(clips.map((c) => c.id));
    expect(await deleteEntry(db, alice, entryId)).toBe(true);
    expect(await listClips(db, alice, entryId)).toEqual([]);
    for (const clip of clips) expect(await getClip(db, alice, clip.id)).toBeNull();
  });

  it("deleting an entry's recording keeps the words and only touches that entry", async () => {
    const entryId = await newEntry(alice);
    const other = await newEntry(alice);
    const clip = (await newClip(alice, entryId))!;
    const kept = (await newClip(alice, other))!;
    const session = (await ensureSession(db, alice, entryId))!;
    await addTurn(db, session, { question: null, answer: "Gold over the bay", via: "spoken", clipIds: [clip.id] });

    expect(await deleteEntryRecordings(db, bob, entryId)).toEqual([]);
    expect(await deleteEntryRecordings(db, alice, entryId)).toEqual([clip.r2Key]);
    expect(await listClips(db, alice, entryId)).toEqual([]);
    expect(await getClip(db, alice, kept.id)).not.toBeNull();
    const turns = (await getSession(db, alice, entryId))!.turns;
    expect(turns).toEqual([{ question: null, answer: "Gold over the bay", via: "spoken" }]);
  });

  it("delete all recordings removes every clip of that user only", async () => {
    const mine = [await newEntry(bob), await newEntry(bob)];
    const keys = [(await newClip(bob, mine[0]))!.r2Key, (await newClip(bob, mine[1]))!.r2Key, (await newClip(bob, mine[1]))!.r2Key];
    const aliceEntry = await newEntry(alice);
    const alicesClip = (await newClip(alice, aliceEntry))!;

    expect((await deleteAllRecordings(db, bob)).sort()).toEqual(keys.sort());
    for (const entryId of mine) expect(await listClips(db, bob, entryId)).toEqual([]);
    expect(await getClip(db, alice, alicesClip.id)).not.toBeNull();
    expect(await deleteAllRecordings(db, bob)).toEqual([]);
  });

  it("AI story help defaults on; turned off, no AI call runs or is counted", async () => {
    expect(await getStorySettings(db, alice)).toEqual({ aiStoryHelp: true, noticeSeen: false });
    await markAiNoticeSeen(db, alice);
    await setAiStoryHelp(db, alice, false);
    expect(await getStorySettings(db, alice)).toEqual({ aiStoryHelp: false, noticeSeen: true });

    const call = vi.fn(async () => ({ usage: null, text: "hello" }));
    const before = await aiCallsToday(db, alice);
    expect(await withAi(db, alice, "transcribe", call)).toBe("off");
    expect(call).not.toHaveBeenCalled();
    expect(await aiCallsToday(db, alice)).toBe(before);

    await setAiStoryHelp(db, alice, true);
    expect(await withAi(db, alice, "transcribe", call)).toEqual({ usage: null, text: "hello" });
    expect(call).toHaveBeenCalledOnce();
    expect(await aiCallsToday(db, alice)).toBe(before + 1);
  });
});
