import { describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { enabledSocialProviders } = await import("./auth");

const none = { GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", APPLE_CLIENT_ID: "", APPLE_CLIENT_SECRET: "" };

describe("enabledSocialProviders", () => {
  it("enables a provider only when both its ID and secret are set", () => {
    expect(enabledSocialProviders({ ...none, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).toEqual({
      google: true,
      apple: false,
    });
    expect(enabledSocialProviders({ ...none, APPLE_CLIENT_ID: "id" })).toEqual({ google: false, apple: false });
  });
});
