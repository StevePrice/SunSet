// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createEntry, deleteEntry } from "./entries";
import { createVisitor } from "./reactions";
import {
  applyShareChoice,
  createShare,
  deleteShare,
  getPublicShare,
  getRecipient,
  getShareForEntry,
  linkRecipientVisitor,
  recipientVisitorIds,
  shareVoiceLinks,
  stopSharingVoice,
  updateSharePlace,
} from "./shares";

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
    expect(view).toMatchObject({ entryId, ownerName: "Alice", story: "Gold over the bay" });
    expect(view).not.toHaveProperty("score");
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

  it("starts a new link with the entry's place in words and dates it in the entry's time zone", async () => {
    const id = crypto.randomUUID();
    await createEntry(db, alice, id, {
      story: "Over the pier",
      takenAt: new Date("2026-08-23T03:30:00Z"),
      location: { latitude: 33.15, longitude: -117.35 },
      placeName: "Carlsbad, California",
      timeZone: "America/Los_Angeles",
      photoWidth: 100,
      photoHeight: 100,
    });
    // Shared from a phone set to London: the entry's own time zone still wins.
    const share = await createShare(db, alice, id, "Europe/London");
    expect(share?.place).toBe("Carlsbad, California");
    const view = await getPublicShare(db, share!.id);
    expect(view?.timeZone).toBe("America/Los_Angeles");
    await deleteEntry(db, alice, id);
  });

  it("makes one personal link per name, with its own voice switch (4f-3)", async () => {
    const entryId = await newEntry(alice);
    const share = (await createShare(db, alice, entryId, "UTC"))!;
    expect(await applyShareChoice(db, bob, share.id, { recipient: "Steve", includeVoice: true })).toBeNull();

    const steve = await applyShareChoice(db, alice, share.id, { recipient: "Steve", includeVoice: false });
    const again = await applyShareChoice(db, alice, share.id, { recipient: " steve ", includeVoice: true });
    expect(steve?.token).toMatch(/^[0-9A-Za-z]{22}$/);
    expect(again?.token).toBe(steve?.token);
    expect(await getRecipient(db, share.id, steve!.token)).toMatchObject({ name: "Steve", includeVoice: true, visitorId: null });

    // The normal link keeps its own switch, off unless turned on.
    expect((await getPublicShare(db, share.id))?.includeVoice).toBe(false);
    expect(await applyShareChoice(db, alice, share.id, { recipient: null, includeVoice: true })).toEqual({ token: null });
    expect(await shareVoiceLinks(db, share.id)).toEqual({ normal: true, people: ["Steve"] });

    expect(await stopSharingVoice(db, bob, entryId)).toBe(false);
    expect(await stopSharingVoice(db, alice, entryId)).toBe(true);
    expect(await shareVoiceLinks(db, share.id)).toEqual({ normal: false, people: [] });
    await deleteEntry(db, alice, entryId);
  });

  it("only opens a personal link with its own share's token, and remembers who reacted through it", async () => {
    const [e1, e2] = [await newEntry(alice), await newEntry(alice)];
    const [s1, s2] = [(await createShare(db, alice, e1, "UTC"))!, (await createShare(db, alice, e2, "UTC"))!];
    const { token } = (await applyShareChoice(db, alice, s1.id, { recipient: "Maria", includeVoice: false }))!;
    expect(await getRecipient(db, s2.id, token)).toBeNull();
    expect(await getRecipient(db, s1.id, null)).toBeNull();

    const recipient = (await getRecipient(db, s1.id, token))!;
    const [first, second] = [await createVisitor(db, "Maria"), await createVisitor(db, "Maria")];
    await linkRecipientVisitor(db, recipient.id, first);
    await linkRecipientVisitor(db, recipient.id, second);
    expect([...(await recipientVisitorIds(db, s1.id))]).toEqual([first]);

    // Stop sharing ends the personal links with it.
    await deleteShare(db, alice, e1);
    expect(await getRecipient(db, s1.id, token)).toBeNull();
    for (const id of [e1, e2]) await deleteEntry(db, alice, id);
    await pool.query("delete from reaction_visitors where id = any($1)", [[first, second]]);
  });
});
