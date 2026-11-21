// Shared by the smoke specs: reading emails from the server log, and the sign-in form.
import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, type Response } from "@playwright/test";

export const deployed = Boolean(process.env.E2E_BASE_URL);
const logPath = process.env.E2E_SERVER_LOG ?? "e2e/server.log";

function emailsTo(address: string): string[] {
  // NEXTJS_ENV=development logs each email as `[email] to=... subject="..."` and then its text.
  return readFileSync(logPath, "utf8").split("[email] to=").filter((chunk) => chunk.startsWith(`${address} `));
}

/** How many emails have been logged for this address so far (pass it to emailedLink as `after`). */
export function emailCount(address: string): number {
  return emailsTo(address).length;
}

/** The link in the latest email logged for this address, waiting for email number `after + 1` if given. */
export async function emailedLink(address: string, after = 0): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      () => {
        const emails = emailsTo(address);
        link = emails.length > after ? emails.at(-1)?.match(/https?:\/\/\S+/)?.[0] : undefined;
        return link;
      },
      { message: `no new email logged for ${address}` },
    )
    .toBeTruthy();
  return link!;
}

/**
 * Clicks a button that posts to Better Auth and returns the response. Sign-in and sign-up allow 3
 * requests per 10 seconds from one address, and every test signs in from 127.0.0.1, so a 429 waits
 * out the window and clicks again.
 */
export async function submitAuth(page: Page, button: Locator, path: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/auth${path}`) && r.request().method() === "POST"),
      button.click(),
    ]);
    if (response.status() !== 429 || attempt >= 3) return response;
    const seconds = Number(response.headers()["x-retry-after"]) || 10;
    await page.waitForTimeout((seconds + 1) * 1000);
  }
}

/** Fills in the password sign-in form and submits it. Returns the response; doesn't check it. */
export async function trySignIn(page: Page, email: string, password: string): Promise<Response> {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in with a password" }).click();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  return submitAuth(page, page.getByRole("button", { name: "Sign in", exact: true }), "/sign-in/email");
}

export async function signIn(page: Page, email: string, password: string) {
  const response = await trySignIn(page, email, password);
  expect(response.status(), "sign-in response").toBe(200);
  await expect(page).toHaveURL(/\/journal$/);
}

/** Creates an account with a password and opens the confirmation link, which signs it in. */
export async function signUp(page: Page, name: string, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /create an account|sign up/i }).click();
  await page.getByPlaceholder("First name").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder(/^Password/).fill(password);
  const before = emailCount(email);
  const response = await submitAuth(page, page.getByRole("button", { name: "Create account" }), "/sign-up/email");
  expect(response.status(), "sign-up response").toBe(200);

  await page.goto(await emailedLink(email, before));
  await expect(page).toHaveURL(/\/journal$/);
}

/** True when the page's browser context has no session (a signed-out visit to /journal goes to /sign-in). */
export async function expectSignedOut(page: Page) {
  await page.goto("/journal");
  await expect(page).toHaveURL(/\/sign-in/);
}
