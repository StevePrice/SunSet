// Phase 5b on /admin: an admin named only by ADMIN_EMAILS (wrangler.e2e.jsonc) signs up and becomes
// admin, then promotes, demotes, disables, re-enables, signs out everywhere and deletes a second
// test account. Each step must show in the activity log, and the admin can't demote or disable
// themself. No AI runs.
//
// Only against the local Worker (CI's smoke job): it reads the confirmation and magic-link emails
// from the server log, and it needs an ADMIN_EMAILS account. See the pull request that added this
// file for what running it on staging would take.
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { deployed, emailCount, emailedLink, expectSignedOut, signIn, signUp, submitAuth, trySignIn } from "./helpers";

// Must match ADMIN_EMAILS in wrangler.e2e.jsonc. The address and password are fixed so a local rerun
// against the same database signs back in to the admin made by the first run.
const ADMIN_EMAIL = "smoke-admin@example.com";
const ADMIN_PASSWORD = "Smoke-admin-e2e-only-4f7Q";
const userEmail = `smoke-user-${Date.now()}@example.com`;
const userPassword = `Smoke-${crypto.randomUUID()}`;

test.describe.configure({ mode: "serial" });
test.skip(deployed, "Needs the server log for emails and an ADMIN_EMAILS account; local and CI only.");

let adminContext: BrowserContext;
let userContext: BrowserContext;
let admin: Page;
let user: Page;

async function newPage(browser: Browser): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext();
  return [context, await context.newPage()];
}

test.beforeAll(async ({ browser }) => {
  [adminContext, admin] = await newPage(browser);
  [userContext, user] = await newPage(browser);
});

test.afterAll(async () => {
  await adminContext?.close();
  await userContext?.close();
});

/** The users-table row for an address. */
function row(email: string): Locator {
  return admin.locator(`tr[data-email="${email}"]`);
}

/** Expects a line in the activity log on /admin that contains every part, in order. */
async function expectLogged(...parts: (string | RegExp)[]) {
  const log = admin.locator("section").filter({ has: admin.getByRole("heading", { name: "Activity log" }) });
  const pattern = new RegExp(parts.map((p) => (typeof p === "string" ? p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : p.source)).join(".*"));
  await expect(log.getByRole("listitem").filter({ hasText: pattern })).toHaveCount(1);
}

/** Clicks one of the user row's action buttons and waits for the result line. */
async function act(email: string, button: string, result: string) {
  await row(email).getByRole("button", { name: button, exact: true }).click();
  await expect(row(email).getByRole("status")).toHaveText(result);
}

test("an account named only by ADMIN_EMAILS signs up and becomes admin", async () => {
  // A rerun against the same local database finds the admin the first run made.
  const existing = await trySignIn(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
  if (existing.status() === 200) {
    test.info().annotations.push({ type: "note", description: "Admin existed already (rerun on the same database); sign-up not repeated." });
    await expect(admin).toHaveURL(/\/journal$/);
  } else {
    await signUp(admin, "Smoke Admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  }

  await admin.goto("/admin");
  await expect(admin.getByRole("heading", { name: /^Users/ })).toBeVisible();
  await expect(row(ADMIN_EMAIL).getByText("admin", { exact: true })).toBeVisible();
  await expectLogged("The system", `${ADMIN_EMAIL} became admin through ADMIN_EMAILS`);
});

test("a second test account signs up", async () => {
  await signUp(user, "Smoke User", userEmail, userPassword);
  // An ordinary account doesn't see /admin.
  const response = await user.goto("/admin");
  expect(response?.status()).toBe(404);
});

test("the admin can't demote, disable or delete themself", async () => {
  await admin.goto("/admin");
  const own = row(ADMIN_EMAIL);
  await expect(own.getByRole("button", { name: "Make user", exact: true })).toBeDisabled();
  await expect(own.getByRole("button", { name: "Disable", exact: true })).toBeDisabled();
  await expect(own.getByRole("button", { name: "Delete…", exact: true })).toBeDisabled();
});

test("promote the user to admin", async () => {
  await admin.goto("/admin");
  await expect(row(userEmail)).toBeVisible();
  await act(userEmail, "Make admin", "Role changed.");
  await expect(row(userEmail).getByText("admin", { exact: true })).toBeVisible();
  await expectLogged(ADMIN_EMAIL, `changed the role of ${userEmail} from user to admin`);

  // The user's open session now reaches /admin.
  await user.goto("/admin");
  await expect(user.getByRole("heading", { name: /^Users/ })).toBeVisible();
});

test("demote them again, which ends their sessions", async () => {
  await act(userEmail, "Make user", "Role changed.");
  await expect(row(userEmail).getByText("admin", { exact: true })).toHaveCount(0);
  await expectLogged(ADMIN_EMAIL, `changed the role of ${userEmail} from admin to user`);
  await expectSignedOut(user);
});

test("disable the account: signed out at once, and no password or magic-link sign-in", async () => {
  await signIn(user, userEmail, userPassword);

  await act(userEmail, "Disable", "Account disabled.");
  await expect(row(userEmail).getByText("disabled", { exact: true })).toBeVisible();
  await expectLogged(ADMIN_EMAIL, `disabled ${userEmail} and ended `, /[1-9]\d* sessions/);

  // The open session is gone.
  await expectSignedOut(user);

  // Password: refused, with the reason.
  const byPassword = await trySignIn(user, userEmail, userPassword);
  expect(byPassword.status()).toBe(403);
  expect((await byPassword.json()).code).toBe("ACCOUNT_DISABLED");
  await expect(user.locator("main").getByRole("alert")).toContainText("This account has been disabled");
  await expectSignedOut(user);

  // Magic link: the email can still be sent, but opening it starts no session.
  await user.goto("/sign-in");
  await user.getByPlaceholder("Email").fill(userEmail);
  const before = emailCount(userEmail);
  const request = await submitAuth(user, user.getByRole("button", { name: "Email me a sign-in link" }), "/sign-in/magic-link");
  expect(request.status()).toBe(200);
  await user.goto(await emailedLink(userEmail, before));
  await expectSignedOut(user);
});

test("re-enable the account: they can sign in", async () => {
  await act(userEmail, "Enable", "Account enabled.");
  await expect(row(userEmail).getByText("disabled", { exact: true })).toHaveCount(0);
  await expectLogged(ADMIN_EMAIL, `enabled ${userEmail}`);
  await signIn(user, userEmail, userPassword);
});

test("sign the user out everywhere", async () => {
  await act(userEmail, "Sign out everywhere", "Signed out everywhere.");
  await expectLogged(ADMIN_EMAIL, `signed ${userEmail} out everywhere (`, /[1-9]\d* sessions\)/);
  await expectSignedOut(user);
});

test("delete the account: it can't sign in any more", async () => {
  await row(userEmail).getByRole("button", { name: "Delete…", exact: true }).click();
  await row(userEmail).getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(row(userEmail)).toHaveCount(0);
  await expectLogged(ADMIN_EMAIL, `deleted the account of ${userEmail}`);

  const response = await trySignIn(user, userEmail, userPassword);
  expect(response.status()).toBe(401);
  await expect(user.locator("main").getByRole("alert")).toBeVisible();
  await expectSignedOut(user);
});
