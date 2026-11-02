import { describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { enabledSocialProviders } = await import("./auth");

describe("enabledSocialProviders", () => {
  it("enables a provider only when both its ID and secret are set", () => {
    expect(enabledSocialProviders({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).toEqual({
      google: true,
      apple: false,
    });
    expect(enabledSocialProviders({ APPLE_CLIENT_ID: "id", APPLE_CLIENT_SECRET: "" })).toEqual({
      google: false,
      apple: false,
    });
  });
});
