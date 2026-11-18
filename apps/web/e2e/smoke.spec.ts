// The smoke path: sign up, verify the email, sign in, save an entry, open the Journal, share an
// entry and open the link signed out. No AI or scoring runs: the entry is saved without a story,
// and saving only queues a score that nothing consumes here.
//
// Locally and in CI the sign-up email is read from the server log (NEXTJS_ENV=development logs
// mail instead of sending it). Against a deployment (E2E_BASE_URL) nothing can read the mailbox,
// so the tests sign in as an existing account named by E2E_USER_EMAIL and E2E_USER_PASSWORD and
// skip sign-up and verification.
import { expect, test, type BrowserContext } from "@playwright/test";
import { deployed, signIn, signUp } from "./helpers";

const email = deployed ? (process.env.E2E_USER_EMAIL ?? "") : `smoke-${Date.now()}@example.com`;
const password = deployed ? (process.env.E2E_USER_PASSWORD ?? "") : `Smoke-${crypto.randomUUID()}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (deployed && (!email || !password)) throw new Error("Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run against a deployment.");
});

test("sign up and verify the email", async ({ page }) => {
  test.skip(deployed, "Can't read a real mailbox; the deployed run uses an existing account.");
  // Verifying the email signs the new account in.
  await signUp(page, "Smoke Tester", email, password);
});

// Sign-in is rate limited, so only this test signs in; the rest reuse its session cookies.
let session: Awaited<ReturnType<BrowserContext["cookies"]>> = [];

test("sign in", async ({ page, context }) => {
  await signIn(page, email, password);
  session = await context.cookies();
});

let entryUrl = "";

test("save an entry and see it in the Journal", async ({ page, context }) => {
  await context.addCookies(session);
  await page.goto("/journal/new");
  await page.locator('input[type="file"]').last().setInputFiles("e2e/fixtures/sunset.jpg");
  await page.getByRole("button", { name: "Save without a story" }).click();
  await expect(page).toHaveURL(/\/journal\/(?!new$)[\w-]+$/);
  entryUrl = new URL(page.url()).pathname;

  await page.goto("/journal");
  await expect(page.locator(`a[href="${entryUrl}"]`)).toBeVisible();
});

test("create a share link and open it signed out", async ({ page, context, browser }) => {
  await context.addCookies(session);
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Create a share link" }).click();
  const link = await page.getByLabel("Share link").inputValue();
  expect(link).toMatch(/\/s\/[\w-]+$/);

  // A fresh browser context has no session: this is what a friend sees.
  const friend = await browser.newContext();
  const friendPage = await friend.newPage();
  const response = await friendPage.goto(link);
  expect(response?.status()).toBe(200);
  await expect(friendPage.getByRole("main")).toBeVisible();
  await friend.close();
});

// Leaves a shared account's Journal as it was (matters on staging, where the account is reused).
test("delete the test entry", async ({ page, context }) => {
  await context.addCookies(session);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Delete this sunset" }).click();
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.locator(`a[href="${entryUrl}"]`)).toHaveCount(0);
});
