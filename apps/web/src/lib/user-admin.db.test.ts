// Runs against a real PostGIS database when TEST_DATABASE_URL is set (CI sets it).
import { and, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { listActivity } from "./admin-log";
import { createEntry } from "./entries";
import {
  deleteAccount,
  deleteAccountFiles,
  onSessionStart,
  parseAdminEmails,
  promoteListedAdmin,
  setDisabled,
  setRole,
  signOutEverywhere,
} from "./user-admin";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const url = process.env.TEST_DATABASE_URL;
const none = new Set<string>();

describe.skipIf(!url)("user administration", () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const tag = crypto.randomUUID().slice(0, 8);
  const ids: string[] = [];

  async function makeUser(role = "user", extra: Partial<typeof schema.users.$inferInsert> = {}) {
    const id = `u-${tag}-${ids.length}`;
    ids.push(id);
    await db.insert(schema.users).values({ id, name: id, email: `${id}@example.com`, role, emailVerified: true, ...extra });
    return id;
  }
  async function addSession(userId: string) {
    const id = crypto.randomUUID();
    await db.insert(schema.sessions).values({ id, token: id, userId, expiresAt: new Date(Date.now() + 3600_000) });
  }
  async function sessionCount(userId: string) {
    const { rows } = await pool.query("select count(*)::int as n from sessions where user_id = $1", [userId]);
    return rows[0].n as number;
  }
  async function actionsFor(targetId: string) {
    const { rows } = await pool.query("select action, details from admin_log where target_user_id = $1 order by created_at", [targetId]);
    return rows as { action: string; details: Record<string, unknown> | null }[];
  }

  // The last-admin rule needs a database where our admin is the only enabled one, but the test
  // database may hold others. Run these inside a transaction that is rolled back.
  async function aloneAsAdmin(keep: string, fn: (tx: typeof db) => Promise<void>) {
    const stop = new Error("rollback");
    await db
      .transaction(async (tx) => {
        await tx.update(schema.users).set({ role: "user" }).where(and(eq(schema.users.role, "admin"), ne(schema.users.id, keep)));
        await fn(tx as unknown as typeof db);
        throw stop;
      })
      .catch((e) => {
        if (e !== stop) throw e;
      });
  }

  afterAll(async () => {
    await pool.query("delete from users where id = any($1)", [ids]);
    await pool.query("delete from admin_log where admin_id = any($1) or target_user_id = any($1)", [ids]);
    await pool.end();
  });

  beforeAll(() => {
    // Nothing to set up; each test makes its own users.
  });

  it("reads ADMIN_EMAILS case-insensitively, split on commas and spaces", () => {
    expect([...parseAdminEmails(" A@x.com,b@X.com\n c@x.com ")]).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
    expect(parseAdminEmails(undefined).size).toBe(0);
  });

  it("promotes a verified account named in ADMIN_EMAILS, and logs it as the system", async () => {
    const id = await makeUser();
    const listed = new Set([`${id}@EXAMPLE.com`.toLowerCase()]);
    expect(await promoteListedAdmin(db, id, none)).toBe(false);
    expect(await promoteListedAdmin(db, id, listed)).toBe(true);
    expect((await db.select().from(schema.users).where(eq(schema.users.id, id)))[0].role).toBe("admin");
    const [row] = await actionsFor(id);
    expect(row).toMatchObject({ action: "set_role", details: { to: "admin", via: "ADMIN_EMAILS" } });
    expect(await promoteListedAdmin(db, id, listed)).toBe(false);
  });

  it("does not promote an unverified or disabled account", async () => {
    const unverified = await makeUser("user", { emailVerified: false });
    const disabled = await makeUser("user", { disabledAt: new Date() });
    for (const id of [unverified, disabled]) {
      expect(await promoteListedAdmin(db, id, new Set([`${id}@example.com`]))).toBe(false);
    }
  });

  it("changes a role, logs it, and ends the sessions when it is lowered", async () => {
    const admin = await makeUser("admin");
    const other = await makeUser("admin");
    const user = await makeUser();
    await addSession(other);
    expect(await setRole(db, admin, user, "admin", none)).toEqual({ ok: true });
    expect(await setRole(db, admin, other, "user", none)).toEqual({ ok: true });
    expect(await sessionCount(other)).toBe(0);
    expect((await actionsFor(other))[0]).toMatchObject({ action: "set_role", details: { from: "admin", to: "user", sessionsEnded: 1 } });
    expect(await setRole(db, admin, user, "owner", none)).toMatchObject({ ok: false });
  });

  it("stops an admin demoting or disabling themself", async () => {
    const admin = await makeUser("admin");
    await makeUser("admin");
    expect(await setRole(db, admin, admin, "user", none)).toMatchObject({ ok: false });
    expect(await setDisabled(db, admin, admin, true, none)).toMatchObject({ ok: false });
    expect(await deleteAccount(db, admin, admin, none)).toMatchObject({ ok: false });
  });

  it("never lets the last enabled admin be demoted, disabled or deleted", async () => {
    const last = await makeUser("admin");
    const actor = await makeUser();
    await aloneAsAdmin(last, async (tx) => {
      expect(await setRole(tx, actor, last, "user", none)).toEqual({ ok: false, error: "There must always be at least one admin." });
      expect(await setDisabled(tx, actor, last, true, none)).toMatchObject({ ok: false });
      expect(await deleteAccount(tx, actor, last, none)).toMatchObject({ ok: false });
      // A second admin makes it allowed; a disabled admin does not count.
      const disabledAdmin = await makeUser("admin", { disabledAt: new Date() });
      expect(await setRole(tx, actor, last, "user", none)).toMatchObject({ ok: false });
      expect(disabledAdmin).toBeTruthy();
      const second = `${disabledAdmin}-2`;
      await tx.insert(schema.users).values({ id: second, name: "x", email: `${second}@example.com`, role: "admin" });
      expect(await setRole(tx, actor, last, "user", none)).toMatchObject({ ok: true });
    });
  });

  it("refuses to demote, disable or delete an account named in ADMIN_EMAILS", async () => {
    const actor = await makeUser("admin");
    const listed = await makeUser("admin");
    const emails = new Set([`${listed}@example.com`]);
    expect(await setRole(db, actor, listed, "user", emails)).toMatchObject({ ok: false });
    expect(await setDisabled(db, actor, listed, true, emails)).toMatchObject({ ok: false });
    expect(await deleteAccount(db, actor, listed, emails)).toMatchObject({ ok: false });
  });

  it("disables and enables an account, ending its sessions at once", async () => {
    const admin = await makeUser("admin");
    const user = await makeUser();
    await addSession(user);
    await addSession(user);
    expect(await setDisabled(db, admin, user, true, none)).toEqual({ ok: true });
    expect(await sessionCount(user)).toBe(0);
    expect(await onSessionStart(db, user, none)).toEqual({ allowed: false });
    expect(await setDisabled(db, admin, user, false, none)).toEqual({ ok: true });
    expect(await onSessionStart(db, user, none)).toEqual({ allowed: true });
    expect((await actionsFor(user)).map((a) => a.action)).toEqual(["disable", "enable"]);
  });

  it("signs an account out everywhere", async () => {
    const admin = await makeUser("admin");
    const user = await makeUser();
    await addSession(user);
    expect(await signOutEverywhere(db, admin, user)).toEqual({ ok: true, sessionsEnded: 1 });
    expect(await sessionCount(user)).toBe(0);
    expect(await signOutEverywhere(db, admin, "nobody")).toMatchObject({ ok: false });
  });

  it("deletes an account with everything that hangs off it, and keeps the log", async () => {
    const admin = await makeUser("admin");
    const user = await makeUser();
    const entryId = crypto.randomUUID();
    await createEntry(db, user, entryId, { story: "x", takenAt: null, location: null, photoWidth: 1, photoHeight: 1 });
    const shareId = crypto.randomUUID();
    await db.insert(schema.shares).values({ id: shareId, entryId, userId: user, timeZone: "UTC" });
    const visitor = crypto.randomUUID();
    const keeper = crypto.randomUUID();
    await db.insert(schema.reactionVisitors).values([
      { id: visitor, name: "Friend" },
      { id: keeper, name: "Also" },
    ]);
    await db.insert(schema.reactions).values({ id: crypto.randomUUID(), entryId, shareId, visitorId: visitor, kind: "wow" });
    await db.insert(schema.storyClips).values({
      id: crypto.randomUUID(), entryId, userId: user, r2Key: `entries/${user}/${entryId}/clips/c.webm`, contentType: "audio/webm", durationMs: 1, sizeBytes: 1,
    });
    await db.insert(schema.aiCalls).values({ id: crypto.randomUUID(), userId: user, kind: "story" });
    await addSession(user);
    await db.insert(schema.verifications).values({ id: crypto.randomUUID(), identifier: `${user}@example.com`, value: "t", expiresAt: new Date(Date.now() + 1000) });
    await db.insert(schema.adminLog).values({ id: crypto.randomUUID(), adminId: user, action: "view_journal" });

    const result = await deleteAccount(db, admin, user, none);
    expect(result).toEqual({ ok: true, userId: user, shareIds: [shareId] });

    const count = async (table: string, column: string, value: string) =>
      (await pool.query(`select count(*)::int as n from ${table} where ${column} = $1`, [value])).rows[0].n as number;
    for (const [table, column, value] of [
      ["users", "id", user], ["entries", "user_id", user], ["shares", "user_id", user], ["story_clips", "user_id", user],
      ["ai_calls", "user_id", user], ["sessions", "user_id", user], ["reactions", "entry_id", entryId],
      ["reaction_visitors", "id", visitor], ["verifications", "identifier", `${user}@example.com`],
    ] as const) {
      expect(await count(table, column, value), `${table} still has rows`).toBe(0);
    }
    expect(await count("reaction_visitors", "id", keeper)).toBe(1); // reacted nowhere here: left alone
    await pool.query("delete from reaction_visitors where id = $1", [keeper]);

    const log = (await listActivity(db, 500)).filter((r) => r.targetUserId === user);
    expect(log[0]).toMatchObject({ action: "delete_account", adminId: admin, targetEmail: `${user}@example.com` });
    // The deleted account's own log rows survive it.
    expect(await count("admin_log", "admin_id", user)).toBe(1);
  });

  it("removes an account's R2 files: photos, recordings and share cards, page by page", async () => {
    const keys = new Set(["entries/u1/e1/display.jpg", "entries/u1/e1/clips/a.webm", "shares/s1/card-x.jpg", "entries/u10/e/display.jpg", "shares/s2/card.jpg"]);
    const bucket = {
      list: vi.fn(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
        const all = [...keys].filter((k) => k.startsWith(prefix) && (!cursor || k > cursor)).sort();
        const objects = all.slice(0, 1).map((key) => ({ key }));
        const truncated = all.length > 1;
        return { objects, truncated, cursor: truncated ? objects[0].key : undefined };
      }),
      delete: vi.fn(async (list: string[]) => void list.forEach((k) => keys.delete(k))),
    };
    expect(await deleteAccountFiles(bucket as never, "u1", ["s1"])).toBe(3);
    expect([...keys].sort()).toEqual(["entries/u10/e/display.jpg", "shares/s2/card.jpg"]);
  });
});
