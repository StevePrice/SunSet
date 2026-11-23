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
  await page.getByRole("button", { name: "Save for now" }).click();
  await expect(page).toHaveURL(/\/journal\/(?!new$)[\w-]+$/);
  entryUrl = new URL(page.url()).pathname;

  await page.goto("/journal");
  await expect(page.locator(`a[href="${entryUrl}"]`)).toBeVisible();

  // Photos shows the count, and plain /journal opens the view used last.
  await page.goto("/journal?view=photos");
  await expect(page.getByText(/^\d+ sunsets?$/)).toBeVisible();
  await page.goto("/journal");
  await expect(page.getByRole("link", { name: "Photos", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goto("/journal?view=stories");
  await expect(page.getByText(/^\d+ sunsets?$/)).toHaveCount(0);
});

test("add a story by typing, then change it with Edit", async ({ page, context }) => {
  await context.addCookies(session);
  await page.goto(entryUrl);
  await page.getByRole("link", { name: "Add your story" }).click();
  await expect(page).toHaveURL(/\/story$/);
  await expect(page.getByRole("heading", { name: "The story behind this moment" })).toBeVisible();
  await expect(page.getByText("Rather talk than type?")).toBeVisible();
  await page.getByLabel("Your story", { exact: true }).fill("The sky went gold over the water.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${entryUrl}$`));
  await expect(page.getByText("The sky went gold over the water.")).toBeVisible();

  // Edit: the same screen with the words and a title field; a change sticks.
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const words = page.getByLabel("Here are your words. Change anything you like.");
  await expect(words).toHaveValue("The sky went gold over the water.");
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  await words.fill("The sky went gold, then pink, over the water.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${entryUrl}$`));
  await expect(page.getByText("The sky went gold, then pink, over the water.")).toBeVisible();
});

test("share in one tap, open the link signed out, then stop sharing from From your friends", async ({ page, context, browser }) => {
  await context.addCookies(session);
  // Test browsers have no share menu: stand in for it and keep what the page shared.
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: ShareData };
    navigator.share = async (data?: ShareData) => {
      w.shared = data;
    };
    navigator.canShare = () => false;
  });
  await page.goto(entryUrl);
  await expect(page.getByRole("link", { name: /See what friends sent/ })).toContainText("Not shared yet");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shared = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared);
  const link = (await shared.jsonValue())!.url!;
  expect(link).toMatch(/\/s\/[\w-]+$/);
  await expect(page.getByRole("link", { name: /See what friends sent/ })).toContainText("No reactions yet");

  // A fresh browser context has no session: this is what a friend sees.
  const friend = await browser.newContext();
  const friendPage = await friend.newPage();
  const path = new URL(link).pathname;
  const response = await friendPage.goto(path);
  expect(response?.status()).toBe(200);
  await expect(friendPage.getByRole("main")).toBeVisible();

  // The friend taps Sending hugs (asked for a first name once), sees the checkmark state, and
  // sends a note; the owner sees both on From your friends.
  await friendPage.getByRole("button", { name: /Sending hugs/ }).click();
  await friendPage.getByLabel(/first name/).fill("Maria");
  await friendPage.getByRole("button", { name: "Continue" }).click();
  await expect(friendPage.getByRole("button", { name: /Sending hugs/ })).toHaveAttribute("aria-pressed", "true");
  await expect(friendPage.getByText("Reacting as Maria.", { exact: false })).toBeVisible();
  await friendPage.getByLabel(/Your note to/).fill("Beautiful, thank you");
  await friendPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(friendPage.getByRole("status")).toContainText("will see your reaction");

  // From your friends has Share again and the link settings; Stop sharing kills the link.
  await page.reload();
  await expect(page.getByRole("link", { name: /See what friends sent/ })).toContainText("Shared · 1 reaction");
  await page.getByRole("link", { name: /See what friends sent/ }).click();
  await expect(page.getByText("Maria", { exact: true })).toBeVisible();
  await expect(page.getByText("Beautiful, thank you")).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Sending hugs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share again" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Link settings" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByText(/^Not shared/)).toBeVisible();
  expect((await friendPage.goto(path))?.status()).toBe(404);
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
