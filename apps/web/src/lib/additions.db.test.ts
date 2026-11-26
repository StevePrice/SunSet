// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  additionKeysForEntry,
  countAdditions,
  deleteAddition,
  getAdditionClip,
  getMyAddition,
  listAdditions,
  planAdditionClip,
  saveAdditionClip,
  sendAddition,
  setAdditionTranscript,
} from "./additions";
import { createEntry, deleteEntry } from "./entries";
import { createVisitor } from "./reactions";
import { createShare, deleteShare } from "./shares";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Add to the story data access (4f-4)", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const visitors: string[] = [];
  const visitor = async (name: string) => {
    const id = await createVisitor(db, name);
    visitors.push(id);
    return id;
  };
  const sharedEntry = async (userId = alice) => {
    const entryId = crypto.randomUUID();
    await createEntry(db, userId, entryId, { story: "Gold over the bay", takenAt: null, location: null, photoWidth: 2560, photoHeight: 1440 });
    const share = (await createShare(db, userId, entryId, "UTC"))!;
    return { entryId, shareId: share.id };
  };
  const record = async (shareId: string, visitorId: string, durationMs = 41_000) => {
    const plan = (await planAdditionClip(db, shareId, "m4a"))!;
    const saved = await saveAdditionClip(db, shareId, visitorId, { entryId: plan.entryId, r2Key: plan.r2Key, contentType: "audio/mp4", durationMs, sizeBytes: 1234 });
    return { plan, saved };
  };

  beforeAll(async () => {
    await db.insert(schema.users).values([
      { id: alice, name: "Alice", email: `${alice}@example.com` },
      { id: bob, name: "Bob", email: `${bob}@example.com` },
    ]);
  });

  afterAll(async () => {
    for (const id of [alice, bob]) await pool.query("delete from users where id = $1", [id]);
    if (visitors.length) await pool.query("delete from reaction_visitors where id = any($1)", [visitors]);
    await pool.end();
  });

  it("keeps what a friend typed for the owner only, and lets them change it", async () => {
    const { entryId, shareId } = await sharedEntry();
    const maria = await visitor("Maria");
    expect(await sendAddition(db, shareId, maria, { text: null, spoken: false })).toEqual({ status: "empty" });

    const sent = await sendAddition(db, shareId, maria, { text: "It's on my fridge.", spoken: false });
    expect(sent).toMatchObject({ status: "ok", droppedKey: null, addition: { text: "It's on my fridge.", spoken: false, sent: true } });
    // Changing it keeps one addition per friend per link.
    await sendAddition(db, shareId, maria, { text: "It's still on my fridge.", spoken: false });

    const list = await listAdditions(db, alice, entryId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Maria", text: "It's still on my fridge.", spoken: false, transcribed: false });
    expect(await countAdditions(db, alice, entryId)).toBe(1);
    // Nobody else can see it.
    expect(await listAdditions(db, bob, entryId)).toEqual([]);
    expect(await countAdditions(db, bob, entryId)).toBe(0);
  });

  it("holds a recording back until Send, and replaces it on Record again", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    const first = await record(shareId, steve);
    expect(first.saved).toEqual({ oldKey: null });
    expect(first.plan.r2Key).toBe(`entries/${alice}/${entryId}/additions/${first.plan.id}.m4a`);
    // Not sent yet: the owner sees nothing, and can't play it.
    expect(await listAdditions(db, alice, entryId)).toEqual([]);
    expect(await getMyAddition(db, shareId, steve)).toEqual({ text: null, spoken: true, durationMs: 41_000, sent: false });

    const again = await record(shareId, steve, 30_000);
    expect(again.saved).toEqual({ oldKey: first.plan.r2Key });
    // A transcript for the replaced recording is ignored.
    await setAdditionTranscript(db, shareId, steve, first.plan.r2Key, "old words");
    await setAdditionTranscript(db, shareId, steve, again.plan.r2Key, "We almost turned back");

    await sendAddition(db, shareId, steve, { text: "We almost turned back. I'm so glad we kept going.", spoken: true });
    const [added] = await listAdditions(db, alice, entryId);
    expect(added).toMatchObject({ name: "Steve", spoken: true, durationMs: 30_000, transcribed: true, text: "We almost turned back. I'm so glad we kept going." });
    expect(await getAdditionClip(db, alice, added.id)).toEqual({ r2Key: again.plan.r2Key, contentType: "audio/mp4", sizeBytes: 1234 });
    expect(await getAdditionClip(db, bob, added.id)).toBeNull();
    expect(await additionKeysForEntry(db, alice, entryId)).toEqual([again.plan.r2Key]);
  });

  it("drops the recording when the friend switches to typing, and removes an emptied addition", async () => {
    const { entryId, shareId } = await sharedEntry();
    const ana = await visitor("Ana");
    const { plan } = await record(shareId, ana);
    const typed = await sendAddition(db, shareId, ana, { text: "Typed instead", spoken: false });
    expect(typed).toMatchObject({ status: "ok", droppedKey: plan.r2Key, addition: { spoken: false, text: "Typed instead" } });
    expect(await additionKeysForEntry(db, alice, entryId)).toEqual([]);

    const cleared = await sendAddition(db, shareId, ana, { text: null, spoken: false });
    expect(cleared).toEqual({ status: "ok", addition: null, droppedKey: null });
    expect(await listAdditions(db, alice, entryId)).toEqual([]);
  });

  it("lets only the owner remove an addition, and returns its recording to delete", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    const { plan } = await record(shareId, steve);
    await sendAddition(db, shareId, steve, { text: null, spoken: true });
    const [added] = await listAdditions(db, alice, entryId);
    expect(await deleteAddition(db, bob, added.id)).toEqual({ deleted: false, r2Key: null });
    expect(await deleteAddition(db, alice, added.id)).toEqual({ deleted: true, r2Key: plan.r2Key });
    expect(await listAdditions(db, alice, entryId)).toEqual([]);
  });

  it("accepts nothing through a stopped link, keeps what was sent, and goes with the entry", async () => {
    const { entryId, shareId } = await sharedEntry();
    const maria = await visitor("Maria");
    await sendAddition(db, shareId, maria, { text: "Before it stopped", spoken: false });
    await deleteShare(db, alice, entryId);
    expect(await sendAddition(db, shareId, maria, { text: "After", spoken: false })).toEqual({ status: "not_found" });
    expect(await planAdditionClip(db, shareId, "m4a")).toBeNull();
    expect((await listAdditions(db, alice, entryId)).map((a) => a.text)).toEqual(["Before it stopped"]);

    await deleteEntry(db, alice, entryId);
    expect(await listAdditions(db, alice, entryId)).toEqual([]);
  });
});
