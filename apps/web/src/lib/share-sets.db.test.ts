// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry } from "./entries";
import { setEntryNames } from "./people";
import {
  deleteSetNote,
  deleteSetReaction,
  getLiveSet,
  getPublicSet,
  getPublicSetReactions,
  getSetReplies,
  listSetsForExport,
  resolveSetVisitor,
  setEntryOwner,
  setSetNote,
  shareSet,
  stopSet,
  stopSetVoices,
  toggleSetReaction,
} from "./share-sets";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Shared sets data access (4f-5)", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const alice = `alice-${crypto.randomUUID()}`;
  const bob = `bob-${crypto.randomUUID()}`;
  const visitors: string[] = [];

  /** A sunset of Alice's with these names on it, a day apart so the order is clear. */
  let day = 0;
  const sunset = async (names: string[], userId = alice, title = `Sunset ${day}`) => {
    const id = crypto.randomUUID();
    day += 1;
    await createEntry(db, userId, id, {
      story: `The story of ${title}`,
      takenAt: new Date(Date.UTC(2026, 6, day, 3)),
      location: null,
      photoWidth: 2560,
      photoHeight: 1440,
    });
    await db.update(schema.entries).set({ title, placeName: "Carlsbad, California", timeZone: "America/Los_Angeles" }).where(eq(schema.entries.id, id));
    if (names.length) await setEntryNames(db, userId, id, names);
    return id;
  };
  const visit = async (setId: string, cookieId: string | null = null) => {
    const result = await resolveSetVisitor(db, setId, cookieId);
    if (result.status !== "ok") throw new Error("set not live");
    visitors.push(result.visitorId);
    return result;
  };

  beforeAll(async () => {
    await db.insert(schema.users).values([
      { id: alice, name: "Louise", email: `${alice}@example.com` },
      { id: bob, name: "Bob", email: `${bob}@example.com` },
    ]);
  });

  afterAll(async () => {
    for (const id of [alice, bob]) await pool.query("delete from users where id = $1", [id]);
    if (visitors.length) await pool.query("delete from reaction_visitors where id = any($1)", [visitors]);
    await pool.end();
  });

  it("shares only the owner's sunsets with that name, in order, as one link the person can open", async () => {
    const a = await sunset(["Steve"]);
    const b = await sunset(["steve", "Maria"]);
    const notSteve = await sunset(["Maria"]);
    const bobs = await sunset(["Steve"], bob);
    expect(await shareSet(db, alice, { personName: "Steve", entryIds: [], includeVoice: false, timeZone: "UTC" })).toBeNull();
    expect(await shareSet(db, alice, { personName: "Steve", entryIds: [notSteve, bobs], includeVoice: false, timeZone: "UTC" })).toBeNull();

    const set = (await shareSet(db, alice, { personName: "Steve", entryIds: [b, notSteve, a, bobs], includeVoice: false, timeZone: "UTC" }))!;
    expect(set).toMatchObject({ count: 2, isNew: true });
    expect(set.id).toMatch(/^[0-9A-Za-z]{22}$/);

    const shown = (await getPublicSet(db, set.id))!;
    expect(shown).toMatchObject({ ownerName: "Louise", personName: "Steve", includeVoice: false });
    expect(shown.entries.map((e) => e.entryId)).toEqual([b, a]);
    // The town in words, never the exact location.
    expect(shown.entries[0]).toMatchObject({ place: "Carlsbad, California", timeZone: "America/Los_Angeles", clips: [] });
    expect(shown.entries[0]).not.toHaveProperty("location");

    expect(await setEntryOwner(db, set.id, a)).toEqual({ ownerId: alice, includeVoice: false });
    expect(await setEntryOwner(db, set.id, notSteve)).toBeNull();
    expect(await setEntryOwner(db, set.id, bobs)).toBeNull();
  });

  it("changes the same link when shared again, and leaves nothing to reach once stopped", async () => {
    const a = await sunset(["Ana"]);
    const b = await sunset(["Ana"]);
    const first = (await shareSet(db, alice, { personName: "Ana", entryIds: [b, a], includeVoice: false, timeZone: "UTC" }))!;
    const again = (await shareSet(db, alice, { personName: "ana", entryIds: [a], includeVoice: true, timeZone: "UTC" }))!;
    expect(again).toEqual({ id: first.id, count: 1, isNew: false });
    expect(await getLiveSet(db, alice, "ANA")).toMatchObject({ id: first.id, includeVoice: true, entryIds: [a] });
    expect(await getLiveSet(db, bob, "Ana")).toBeNull();

    // Only the owner can stop it.
    expect(await stopSet(db, bob, first.id)).toBe(false);
    expect(await stopSet(db, alice, first.id)).toBe(true);
    expect(await getPublicSet(db, first.id)).toBeNull();
    expect(await getPublicSetReactions(db, first.id, null)).toBeNull();
    expect(await resolveSetVisitor(db, first.id, null)).toEqual({ status: "not_found" });
    expect(await setEntryOwner(db, first.id, a)).toBeNull();
    expect(await getLiveSet(db, alice, "Ana")).toBeNull();

    // Sharing after stopping makes a new link; the old one stays dead.
    const fresh = (await shareSet(db, alice, { personName: "Ana", entryIds: [a, b], includeVoice: false, timeZone: "UTC" }))!;
    expect(fresh.isNew).toBe(true);
    expect(fresh.id).not.toBe(first.id);
    expect(await getPublicSet(db, first.id)).toBeNull();
  });

  it("takes one reply for the whole set, named for the person, and the owner keeps it after stopping", async () => {
    const a = await sunset(["Steve B"]);
    const set = (await shareSet(db, alice, { personName: "Steve B", entryIds: [a], includeVoice: false, timeZone: "UTC" }))!;
    const steve = await visit(set.id);
    expect(steve.isNew).toBe(true);
    // The same device comes back as the same visitor.
    expect(await visit(set.id, steve.visitorId)).toEqual({ status: "ok", visitorId: steve.visitorId, isNew: false });

    const tapped = await toggleSetReaction(db, set.id, steve.visitorId, "wish");
    expect(tapped).toMatchObject({ status: "ok", reactions: { mine: ["wish"], name: "Steve B", counts: { wish: 1 } } });
    await toggleSetReaction(db, set.id, steve.visitorId, "love");
    await toggleSetReaction(db, set.id, steve.visitorId, "love");
    await setSetNote(db, set.id, steve.visitorId, "What a summer");
    expect(await getPublicSetReactions(db, set.id, steve.visitorId)).toMatchObject({ mine: ["wish"], note: "What a summer" });
    // Someone else sees counts only.
    expect(await getPublicSetReactions(db, set.id, null)).toEqual({ counts: { wow: 0, wish: 1, love: 0, hugs: 0 }, mine: [], note: null, name: null });

    await stopSet(db, alice, set.id);
    expect(await toggleSetReaction(db, set.id, steve.visitorId, "wow")).toEqual({ status: "not_found" });
    const replies = await getSetReplies(db, alice, "steve b");
    expect(replies.counts.wish).toBe(1);
    expect(replies.inSet.has(steve.visitorId)).toBe(true);
    expect(replies.people).toEqual([
      { visitorId: steve.visitorId, name: "Steve B", reactions: [{ id: expect.any(String), kind: "wish" }], note: { id: expect.any(String), body: "What a summer" } },
    ]);
    expect((await getSetReplies(db, bob, "Steve B")).people).toEqual([]);

    // Only the owner can remove them.
    const [person] = replies.people;
    expect(await deleteSetReaction(db, bob, person.reactions[0].id)).toBe(false);
    expect(await deleteSetNote(db, bob, person.note!.id)).toBe(false);
    expect(await deleteSetReaction(db, alice, person.reactions[0].id)).toBe(true);
    expect(await deleteSetNote(db, alice, person.note!.id)).toBe(true);
    expect((await getSetReplies(db, alice, "Steve B")).people).toEqual([]);
  });

  it("includes the voice only while it's on, and turns it off when recordings go", async () => {
    const a = await sunset(["Kai"]);
    const b = await sunset(["Kai"]);
    await db.insert(schema.storyClips).values({ id: crypto.randomUUID(), userId: alice, entryId: a, r2Key: "k", contentType: "audio/mp4", durationMs: 48_000, sizeBytes: 10 });
    const set = (await shareSet(db, alice, { personName: "Kai", entryIds: [a, b], includeVoice: true, timeZone: "UTC" }))!;
    const shown = (await getPublicSet(db, set.id))!;
    expect(shown.entries.map((e) => e.clips.length)).toEqual([1, 0]);
    expect(shown.entries[0].clips[0].durationMs).toBe(48_000);

    // A sunset that isn't in the set leaves it alone.
    const elsewhere = await sunset(["Kai"]);
    await stopSetVoices(db, alice, elsewhere);
    expect((await getPublicSet(db, set.id))!.includeVoice).toBe(true);
    await stopSetVoices(db, alice, a);
    const quiet = (await getPublicSet(db, set.id))!;
    expect(quiet.includeVoice).toBe(false);
    expect(quiet.entries[0].clips).toEqual([]);
  });

  it("drops a deleted sunset from the set, and the set when none are left", async () => {
    const a = await sunset(["Lee"]);
    const b = await sunset(["Lee"]);
    const set = (await shareSet(db, alice, { personName: "Lee", entryIds: [b, a], includeVoice: false, timeZone: "UTC" }))!;
    await deleteEntry(db, alice, b);
    expect((await getPublicSet(db, set.id))!.entries.map((e) => e.entryId)).toEqual([a]);
    await deleteEntry(db, alice, a);
    expect(await getPublicSet(db, set.id)).toBeNull();

    const exported = (await listSetsForExport(db, alice)).find((s) => s.sharedWith === "Lee");
    expect(exported).toMatchObject({ entryIds: [], stoppedAt: null });
  });
});
