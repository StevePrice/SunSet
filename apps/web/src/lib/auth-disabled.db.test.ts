// A disabled account can't start a session by password or magic link, and ADMIN_EMAILS promotes at
// sign-in. This drives the real Better Auth instance against the test database (social sign-in ends
// in the same session-creation hook, which is what these tests exercise).
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { hashPassword } from "./password";
import { setDisabled } from "./user-admin";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
const sent: { to: string; text: string }[] = [];
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  sendEmail: async (_env: unknown, message: { to: string; text: string }) => void sent.push(message),
}));

const { createAuth } = await import("./auth");
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("sign-in for disabled accounts", () => {
  const client = new Client({ connectionString: url });
  const db = drizzle(client, { schema });
  const tag = crypto.randomUUID().slice(0, 8);
  const password = "a-long-test-password-1";
  const ids: string[] = [];
  const env = (adminEmails = "") =>
    ({
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      ADMIN_EMAILS: adminEmails,
      GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", APPLE_CLIENT_ID: "", APPLE_CLIENT_SECRET: "",
    }) as unknown as CloudflareEnv;
  const authFor = (adminEmails?: string) => createAuth(env(adminEmails), client, () => {});

  async function makeUser(name: string) {
    const id = `a-${tag}-${name}`;
    ids.push(id);
    await db.insert(schema.users).values({ id, name, email: `${id}@example.com`, emailVerified: true });
    await db.insert(schema.accounts).values({ id: `${id}-acc`, accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
    return { id, email: `${id}@example.com` };
  }

  beforeAll(() => client.connect());
  afterAll(async () => {
    await client.query("delete from users where id = any($1)", [ids]);
    await client.query("delete from admin_log where target_user_id = any($1)", [ids]);
    await client.query("delete from verifications where identifier like $1", [`%${tag}%`]);
    await client.end();
  });

  it("signs in by password, until the account is disabled", async () => {
    const user = await makeUser("pw");
    const admin = await makeUser("pw-admin");
    await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, admin.id));
    const auth = authFor();
    expect((await auth.api.signInEmail({ body: { email: user.email, password } })).user.id).toBe(user.id);

    await setDisabled(db, admin.id, user.id, true, new Set());
    await expect(auth.api.signInEmail({ body: { email: user.email, password } })).rejects.toMatchObject({ body: { code: "ACCOUNT_DISABLED" } });
    const { rows } = await client.query("select count(*)::int as n from sessions where user_id = $1", [user.id]);
    expect(rows[0].n).toBe(0);

    await setDisabled(db, admin.id, user.id, false, new Set());
    expect((await auth.api.signInEmail({ body: { email: user.email, password } })).user.id).toBe(user.id);
  });

  it("refuses a magic link for a disabled account", async () => {
    const user = await makeUser("ml");
    const admin = await makeUser("ml-admin");
    await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, admin.id));
    const auth = authFor();
    await setDisabled(db, admin.id, user.id, true, new Set());
    await auth.api.signInMagicLink({ body: { email: user.email }, headers: new Headers() });
    const link = sent.filter((m) => m.to === user.email).at(-1)!.text.match(/https?:\/\/\S+/)![0];
    const token = new URL(link).searchParams.get("token")!;
    await expect(auth.api.magicLinkVerify({ query: { token }, headers: new Headers() })).rejects.toBeTruthy();
    const { rows } = await client.query("select count(*)::int as n from sessions where user_id = $1", [user.id]);
    expect(rows[0].n).toBe(0);

    // Control: once enabled, a fresh link does start a session, so the refusal above was the disable.
    await setDisabled(db, admin.id, user.id, false, new Set());
    await auth.api.signInMagicLink({ body: { email: user.email }, headers: new Headers() });
    const fresh = sent.filter((m) => m.to === user.email).at(-1)!.text.match(/https?:\/\/\S+/)![0];
    await auth.api.magicLinkVerify({ query: { token: new URL(fresh).searchParams.get("token")! }, headers: new Headers() });
    const after = await client.query("select count(*)::int as n from sessions where user_id = $1", [user.id]);
    expect(after.rows[0].n).toBe(1);
  });

  it("makes an ADMIN_EMAILS account an admin when it signs in", async () => {
    const user = await makeUser("env");
    await authFor(user.email.toUpperCase()).api.signInEmail({ body: { email: user.email, password } });
    const [row] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, user.id));
    expect(row.role).toBe("admin");
  });
});
