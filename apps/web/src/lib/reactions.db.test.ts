// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry } from "./entries";
import {
  createVisitor,
  deleteReaction,
  deleteReactionNote,
  getAfterglow,
  getPublicReactions,
  MAX_VISITOR_CHANGES_PER_ENTRY,
  reactionTotals,
  setReactionNote,
  toggleReaction,
} from "./reactions";
import { createShare, deleteShare } from "./shares";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("reactions data access", () => {
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
    await createEntry(db, userId, entryId, {
      story: "Gold over the bay",
      takenAt: null,
      location: { latitude: 32.75, longitude: -117.25 },
      photoWidth: 2560,
      photoHeight: 1440,
    });
    const share = (await createShare(db, userId, entryId, "UTC"))!;
    return { entryId, shareId: share.id };
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
    await pool.query("delete from rate_limits where key like any($1)", [visitors.map((v) => `reactions:visitor:${v}:%`)]);
    await pool.end();
  });

  it("lets a visitor pick several reactions and tap again to undo", async () => {
    const { shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    expect(await getPublicReactions(db, shareId, steve)).toEqual({
      counts: { wow: 0, wish: 0, love: 0 },
      mine: [],
      note: null,
      name: "Steve",
    });

    await toggleReaction(db, shareId, steve, "love");
    const both = await toggleReaction(db, shareId, steve, "wow");
    expect(both).toMatchObject({ status: "ok", reactions: { counts: { wow: 1, wish: 0, love: 1 }, mine: ["wow", "love"] } });

    const undone = await toggleReaction(db, shareId, steve, "wow");
    expect(undone).toMatchObject({ status: "ok", reactions: { counts: { wow: 0, wish: 0, love: 1 }, mine: ["love"] } });
  });

  it("shows friends counts only, and the owner names and notes", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    const louise = await visitor("Louise");
    await toggleReaction(db, shareId, steve, "wow");
    await toggleReaction(db, shareId, louise, "wow");
    await toggleReaction(db, shareId, louise, "wish");
    await setReactionNote(db, shareId, steve, "Best night of the whole trip");

    // Another friend, or anyone without a cookie, sees counts and nothing about who.
    const stranger = await getPublicReactions(db, shareId, null);
    expect(stranger).toEqual({ counts: { wow: 2, wish: 1, love: 0 }, mine: [], note: null, name: null });
    expect(JSON.stringify(await getPublicReactions(db, shareId, louise))).not.toMatch(/Steve|Best night/);
    // A visitor sees their own note.
    expect((await getPublicReactions(db, shareId, steve))?.note).toBe("Best night of the whole trip");

    const afterglow = await getAfterglow(db, alice, entryId);
    expect(afterglow?.counts).toEqual({ wow: 2, wish: 1, love: 0 });
    expect(afterglow?.people).toMatchObject([
      { name: "Steve", reactions: [{ kind: "wow" }], note: { body: "Best night of the whole trip" } },
      { name: "Louise", reactions: [{ kind: "wow" }, { kind: "wish" }], note: null },
    ]);
  });

  it("keeps one note per visitor per share, and a blank note removes it", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    await setReactionNote(db, shareId, steve, "First");
    await setReactionNote(db, shareId, steve, "Second");
    expect((await getAfterglow(db, alice, entryId))?.people).toMatchObject([{ note: { body: "Second" } }]);
    await setReactionNote(db, shareId, steve, null);
    expect((await getAfterglow(db, alice, entryId))?.people).toEqual([]);
  });

  it("lets the owner delete any reaction or note, and the counts update", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    await toggleReaction(db, shareId, steve, "love");
    await toggleReaction(db, shareId, steve, "wish");
    await setReactionNote(db, shareId, steve, "So pretty");
    const [person] = (await getAfterglow(db, alice, entryId))!.people;
    const love = person.reactions.find((r) => r.kind === "love")!;

    // Not someone else's to delete.
    expect(await deleteReaction(db, bob, love.id)).toBe(false);
    expect(await deleteReactionNote(db, bob, person.note!.id)).toBe(false);

    expect(await deleteReaction(db, alice, love.id)).toBe(true);
    expect(await deleteReactionNote(db, alice, person.note!.id)).toBe(true);
    expect((await getPublicReactions(db, shareId, null))?.counts).toEqual({ wow: 0, wish: 1, love: 0 });
    expect((await getAfterglow(db, alice, entryId))?.people).toMatchObject([{ reactions: [{ kind: "wish" }], note: null }]);
  });

  it("never lets another user read someone else's reactions", async () => {
    const { entryId, shareId } = await sharedEntry(alice);
    const steve = await visitor("Steve");
    await toggleReaction(db, shareId, steve, "wow");
    await setReactionNote(db, shareId, steve, "Private to Alice");
    expect(await getAfterglow(db, bob, entryId)).toBeNull();
    expect((await reactionTotals(db, bob)).has(entryId)).toBe(false);
    expect((await reactionTotals(db, alice)).get(entryId)).toBe(1);
  });

  it("hides reactions from the public once sharing stops, but the owner keeps them", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    await toggleReaction(db, shareId, steve, "wow");
    await setReactionNote(db, shareId, steve, "Lovely");

    await deleteShare(db, alice, entryId);
    expect(await getPublicReactions(db, shareId, steve)).toBeNull();
    expect(await toggleReaction(db, shareId, steve, "love")).toEqual({ status: "not_found" });
    expect(await setReactionNote(db, shareId, steve, "Again")).toEqual({ status: "not_found" });

    // A new link starts with no public reactions, while Afterglow still has the old ones.
    const next = (await createShare(db, alice, entryId, "UTC"))!;
    expect((await getPublicReactions(db, next.id, steve))?.counts).toEqual({ wow: 0, wish: 0, love: 0 });
    expect((await getAfterglow(db, alice, entryId))?.people).toMatchObject([
      { name: "Steve", reactions: [{ kind: "wow" }], note: { body: "Lovely" } },
    ]);
  });

  it("goes away with the entry", async () => {
    const { entryId, shareId } = await sharedEntry();
    const steve = await visitor("Steve");
    await toggleReaction(db, shareId, steve, "wow");
    await deleteEntry(db, alice, entryId);
    const { rows } = await pool.query("select count(*)::int n from reactions where entry_id = $1", [entryId]);
    expect(rows[0].n).toBe(0);
  });

  it("caps how many changes one visitor can make on one entry", async () => {
    const { shareId } = await sharedEntry();
    const spammer = await visitor("Spammer");
    const now = Date.now();
    for (let i = 0; i < MAX_VISITOR_CHANGES_PER_ENTRY; i++) {
      expect((await toggleReaction(db, shareId, spammer, "wow", now)).status).toBe("ok");
    }
    expect(await toggleReaction(db, shareId, spammer, "wow", now)).toEqual({ status: "limited" });
    expect(await setReactionNote(db, shareId, spammer, "hi", now)).toEqual({ status: "limited" });
    // Another visitor isn't affected, and the limit resets the next day.
    expect((await toggleReaction(db, shareId, await visitor("Friend"), "wow", now)).status).toBe("ok");
    expect((await toggleReaction(db, shareId, spammer, "wow", now + 25 * 60 * 60 * 1000)).status).toBe("ok");
  });
});
