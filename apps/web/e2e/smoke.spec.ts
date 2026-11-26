// The smoke path: sign up, verify the email, sign in, save an entry, open the Journal, share an
// entry and open the link signed out. No AI or scoring runs: the entry is saved without a story,
// and saving only queues a score that nothing consumes here.
//
// Locally and in CI the sign-up email is read from the server log (NEXTJS_ENV=development logs
// mail instead of sending it). Against a deployment (E2E_BASE_URL) nothing can read the mailbox,
// so the tests sign in as an existing account named by E2E_USER_EMAIL and E2E_USER_PASSWORD and
// skip sign-up and verification.
import { expect, test, type BrowserContext } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
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

test("name who's in a sunset, then find it under With people and Sunsets with (Phase 4f-2)", async ({ page, context }) => {
  await context.addCookies(session);
  // The test photo has no people, so the card opens from Edit ("Add who's in it").
  await page.goto(`${entryUrl}/edit`);
  await page.getByRole("button", { name: "Add who's in it" }).click();
  await expect(page.getByRole("heading", { name: "Who's in this one?" })).toBeVisible();
  await page.getByLabel("Add a name").fill("Smoke Friend");
  await page.getByRole("button", { name: "Add this name" }).click();
  await expect(page.getByRole("button", { name: "Smoke Friend" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${entryUrl}$`));

  // Entry Detail: "With" and the name, which opens Sunsets with [Name].
  await expect(page.getByText("With", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Smoke Friend" }).click();
  await expect(page.getByRole("heading", { name: "Sunsets with Smoke Friend" })).toBeVisible();
  await expect(page.locator(`a[href="${entryUrl}"]`)).toBeVisible();

  // The Journal filter: With people shows it with the name chip; Pure sunset doesn't.
  await page.goto("/journal?view=stories&show=people");
  await expect(page.getByRole("link", { name: "With people" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(`a[href="${entryUrl}"]`)).toContainText("With Smoke Friend");
  await expect(page.getByRole("link", { name: /^Smoke Friend\s*\d+$/ })).toBeVisible();
  await page.goto("/journal?view=stories&show=pure");
  await expect(page.locator(`a[href="${entryUrl}"]`)).toHaveCount(0);
  // Back to All, so later tests (and the next visit) see everything.
  await page.goto("/journal?view=stories&show=all");
  await expect(page.locator(`a[href="${entryUrl}"]`)).toBeVisible();
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
  // The sunset has a name on it (the test above), so Share asks who it's for first (4f-3).
  await page.getByRole("link", { name: "Share", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Before you share" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Smoke Friend/ })).toBeChecked();
  await page.getByRole("radio", { name: /Someone else/ }).check();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shared = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared);
  const link = (await shared.jsonValue())!.url!;
  expect(link).toMatch(/\/s\/[\w-]+$/);
  await page.goto(entryUrl);
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
  await expect(friendPage.getByText("Sending as Maria.", { exact: false })).toBeVisible();
  await friendPage.getByLabel(/A short note to/).fill("Beautiful, thank you");
  // Add to the story (4f-4): typed, sent with the note by the one Send button.
  await expect(friendPage.getByRole("heading", { name: "Were you there? Add to the story." })).toBeVisible();
  await friendPage.getByLabel("What you'd like to add").fill("You sent me a photo from that same trip.");
  await friendPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(friendPage.getByRole("status")).toContainText("will see your reaction, note and what you added to the story");

  // "Start your own Journal" goes through /join (counted, Phase 7a) to sign-up.
  await friendPage.getByRole("link", { name: "Start your own Journal" }).click();
  await expect(friendPage).toHaveURL(/\/sign-in\?mode=sign-up$/);

  // From your friends has Share again and the link settings; Stop sharing kills the link.
  await page.reload();
  await expect(page.getByRole("link", { name: /See what friends sent/ })).toContainText("Shared · 1 reaction · 1 added to the story");
  // What Maria added shows on Entry Detail too, for the owner only.
  await expect(page.getByRole("heading", { name: "Maria added to the story" })).toBeVisible();
  await page.getByRole("link", { name: /See what friends sent/ }).click();
  await expect(page.getByRole("list", { name: "Reactions and notes" }).getByText("Maria", { exact: true })).toBeVisible();
  await expect(page.getByText("Beautiful, thank you")).toBeVisible();
  await expect(page.getByText("“You sent me a photo from that same trip.”")).toBeVisible();
  await expect(page.getByText("Written · Private to you")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove what Maria added" }).click();
  await expect(page.getByRole("heading", { name: "Maria added to the story" })).toHaveCount(0);
  await expect(page.getByRole("term").filter({ hasText: "Sending hugs" })).toBeVisible();
  // A link to Before you share, since this sunset has a name on it (4f-3).
  await expect(page.getByRole("link", { name: "Share again" })).toHaveAttribute("href", `${entryUrl}/share`);
  await expect(page.getByRole("heading", { name: "Link settings" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByText(/^Not shared/)).toBeVisible();
  expect((await friendPage.goto(path))?.status()).toBe(404);
  await friend.close();
});

test("a personal link greets the person in the photo, who taps I was there! without giving a name (Phase 4f-3)", async ({ page, context, browser }) => {
  await context.addCookies(session);
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: ShareData };
    navigator.share = async (data?: ShareData) => {
      w.shared = data;
    };
    navigator.canShare = () => false;
  });
  await page.goto(`${entryUrl}/share`);
  await expect(page.getByRole("radio", { name: /Smoke Friend/ })).toBeChecked();
  await expect(page.getByText("“Smoke Friend, you're in")).toBeVisible();
  // No spoken story, so no Include my voice.
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shared = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared);
  const link = (await shared.jsonValue())!.url!;
  expect(link).toMatch(/\/s\/[\w-]+\?r=[\w]+$/);

  const friend = await browser.newContext();
  const friendPage = await friend.newPage();
  const url = new URL(link);
  await friendPage.goto(url.pathname + url.search);
  await expect(friendPage.getByText(/^Smoke Friend, you're in .+ sunset$/)).toBeVisible();
  await expect(friendPage.getByRole("button", { name: /Wish I was there/ })).toHaveCount(0);
  await friendPage.getByRole("button", { name: /I was there!/ }).click();
  await expect(friendPage.getByRole("button", { name: /I was there!/ })).toHaveAttribute("aria-pressed", "true");
  await expect(friendPage.getByLabel(/first name/)).toHaveCount(0);
  await friend.close();

  // The owner sees it as "I was there!" from Smoke Friend.
  await page.goto(`${entryUrl}/afterglow`);
  await expect(page.getByRole("listitem").filter({ hasText: "Smoke Friend" }).getByText("I was there!")).toBeVisible();
});

test("send someone all your sunsets together as one link, and they reply once for the set (Phase 4f-5)", async ({ page, context, browser }) => {
  await context.addCookies(session);
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: ShareData };
    navigator.share = async (data?: ShareData) => {
      w.shared = data;
    };
    navigator.canShare = () => false;
  });
  await page.goto(`/journal/people/${encodeURIComponent("Smoke Friend")}`);
  await page.getByRole("link", { name: /^Send Smoke Friend (all )?your sunsets? together$/ }).click();

  // Review: everything checked to start; with nothing checked there's nothing to share.
  await expect(page.getByRole("heading", { name: "Share with Smoke Friend" })).toBeVisible();
  const row = page.getByRole("list", { name: "Sunsets to send" }).getByRole("listitem").filter({ has: page.locator(`img[src*="${entryUrl.split("/").pop()}"]`) });
  const box = row.getByRole("checkbox");
  await expect(box).toBeChecked();
  await expect(page.getByRole("switch")).toHaveCount(0);
  await box.uncheck();
  const total = await page.getByRole("list", { name: "Sunsets to send" }).getByRole("checkbox").count();
  await expect(page.getByText(`${total - 1} of ${total} selected`)).toBeVisible();
  await box.check();
  await page.getByRole("button", { name: /^Share \d+ sunsets?$/ }).click();
  const shared = await page.waitForFunction(() => (window as unknown as { shared?: ShareData }).shared);
  const data = (await shared.jsonValue())!;
  expect(data.url).toMatch(/\/s\/set\/[0-9A-Za-z]{22}$/);
  expect(data.text).toMatch(/^Smoke Friend, .+ shared \d+ sunsets? with you$/);
  await expect(page.getByRole("heading", { name: "Shared with Smoke Friend" })).toBeVisible();

  // The friend: greeted by name, the sunsets in a list, one reply for the set, no name asked.
  const friend = await browser.newContext();
  const friendPage = await friend.newPage();
  const path = new URL(data.url!).pathname;
  expect((await friendPage.goto(path))?.status()).toBe(200);
  await expect(friendPage.getByText(/^Smoke Friend, .+ shared \d+ sunsets? with you$/)).toBeVisible();
  await expect(friendPage.getByRole("heading", { name: "Our sunsets together" })).toBeVisible();
  await expect(friendPage.getByText("One reply for the whole set. Tap one or more.")).toBeVisible();
  await expect(friendPage.getByText("Were you there? Add to the story.")).toHaveCount(0);
  const photo = friendPage.getByRole("list", { name: "The sunsets" }).locator("img").first();
  await expect(photo).toBeVisible();
  expect((await friendPage.request.get(new URL((await photo.getAttribute("src"))!, data.url!).pathname)).status()).toBe(200);
  await friendPage.getByRole("button", { name: /I was there!/ }).click();
  await expect(friendPage.getByRole("button", { name: /I was there!/ })).toHaveAttribute("aria-pressed", "true");
  await expect(friendPage.getByLabel(/first name/)).toHaveCount(0);
  await friendPage.getByLabel(/A short note to/).fill("Best summer ever");
  await friendPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(friendPage.getByRole("status")).toContainText("will see your reaction and note");

  // The owner sees the reply on Sunsets with [Name], then stops sharing: the link is gone.
  await page.reload();
  const replies = page.getByRole("region", { name: "Replies to your sunsets together" });
  await expect(replies.getByText("I was there!")).toBeVisible();
  await expect(replies.getByText("“Best summer ever”")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByRole("heading", { name: "Shared with Smoke Friend" })).toHaveCount(0);
  // The reply stays with the owner.
  await expect(replies.getByText("“Best summer ever”")).toBeVisible();
  expect((await friendPage.goto(path))?.status()).toBe(404);
  await friend.close();
});

test("the web app manifest is public, so phones can install it (Phase 7a)", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = (await response.json()) as { name: string; display: string; icons: { sizes: string; purpose: string; src: string }[] };
  expect(manifest).toMatchObject({ name: "Sunset Soul", display: "standalone" });
  expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "192x192 maskable", "512x512 maskable"]);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
});

test("the privacy policy and terms are public and linked from every page (Phase 7a)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
});

test("an error report from the browser is accepted (Phase 7a)", async ({ request }) => {
  const response = await request.post("/api/client-errors", { data: { message: "smoke test", path: "/smoke" } });
  expect(response.status()).toBe(204);
});

test("download your sunsets as a ZIP (Phase 7a)", async ({ context }) => {
  await context.addCookies(session);
  const response = await context.request.get("/api/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/zip");
  const files = unzipSync(new Uint8Array(await response.body()));
  expect(Object.keys(files)).toContain("sunset-soul/README.txt");
  const journal = JSON.parse(strFromU8(files["sunset-soul/journal.json"])) as { sunsets: { photo: string | null }[] };
  expect(journal.sunsets.length).toBeGreaterThan(0);
  // Every listed photo is in the ZIP, as a JPEG.
  for (const { photo } of journal.sunsets.filter((s) => s.photo)) {
    expect([...files[`sunset-soul/${photo}`].slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  }
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
