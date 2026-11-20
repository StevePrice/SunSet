// Phase 4e part 1: an account made by email link has no first name, so the first visit to the
// Journal asks for one (Welcome), then the header and bottom bar take over, and You can change
// the name. Only against the local Worker: it reads the sign-in email from the server log.
import { expect, test } from "@playwright/test";
import { deployed, emailCount, emailedLink, submitAuth } from "./helpers";

const email = `smoke-welcome-${Date.now()}@example.com`;

test.skip(deployed, "Reads the sign-in email from the server log; local and CI only.");

test("a new account by email link gives its first name once, then can change it on You", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(email);
  const before = emailCount(email);
  const response = await submitAuth(page, page.getByRole("button", { name: "Email me a sign-in link" }), "/sign-in/magic-link");
  expect(response.status(), "magic-link response").toBe(200);

  // The link signs in and lands on the Journal, which sends a nameless account to Welcome.
  await page.goto(await emailedLink(email, before));
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "Welcome to Sunset Soul" })).toBeVisible();
  await page.getByLabel("First name").fill("Wendy");
  await expect(page.getByText("Wendy", { exact: true })).toBeVisible(); // the live preview
  await page.getByRole("button", { name: "Continue" }).click();

  // The Journal, with the header's New sunset button and the bottom bar.
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByRole("link", { name: "New sunset" })).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
  // A new account's Journal is empty: the invitation to save the first sunset.
  await expect(page.getByRole("heading", { name: "No sunsets yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Save your first sunset" })).toHaveAttribute("href", "/journal/new");

  // Welcome is shown once: with a name it goes straight back to the Journal.
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/journal$/);

  // You: the name is there, Save appears only after a change, and the change sticks.
  await bar.getByRole("link", { name: "You" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByLabel("First name")).toHaveValue("Wendy");
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await page.getByLabel("First name").fill("Wen");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("First name")).toHaveValue("Wen");
});
