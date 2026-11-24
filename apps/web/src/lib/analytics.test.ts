import { describe, expect, it } from "vitest";
import { anonymous, captureRequest, DEFAULT_POSTHOG_HOST, isBot, wordBucket } from "./analytics";

describe("captureRequest", () => {
  it("sends nothing without a PostHog key", () => {
    expect(captureRequest({}, "entry_saved", "u1")).toBeNull();
    expect(captureRequest({ POSTHOG_KEY: "" }, "entry_saved", "u1")).toBeNull();
  });

  it("posts the event to PostHog's capture endpoint, without the Worker's IP", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    const request = captureRequest({ POSTHOG_KEY: "phc_test" }, "story_saved", "u1", { has_voice: true }, now)!;
    expect(request.url).toBe(`${DEFAULT_POSTHOG_HOST}/i/v0/e/`);
    expect(request.init.method).toBe("POST");
    expect(JSON.parse(request.init.body as string)).toEqual({
      api_key: "phc_test",
      event: "story_saved",
      distinct_id: "u1",
      timestamp: "2026-11-23T10:00:00.000Z",
      properties: { has_voice: true, $ip: null, $lib: "sunset-server" },
    });
  });

  it("uses another host when set (an EU project)", () => {
    const request = captureRequest({ POSTHOG_KEY: "k", POSTHOG_HOST: "https://eu.i.posthog.com/" }, "signed_up", "u1")!;
    expect(request.url).toBe("https://eu.i.posthog.com/i/v0/e/");
  });
});

describe("anonymous", () => {
  it("gives a fresh id and asks PostHog not to make a person profile", () => {
    const a = anonymous({ share_id: "s1" });
    const b = anonymous();
    expect(a.distinctId).toMatch(/^anon-/);
    expect(a.distinctId).not.toBe(b.distinctId);
    expect(a.properties).toEqual({ share_id: "s1", $process_person_profile: false });
  });
});

describe("isBot", () => {
  it.each([
    [null, true],
    ["facebookexternalhit/1.1", true],
    ["WhatsApp/2.23", true],
    ["Slackbot-LinkExpanding 1.0", true],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", false],
    ["Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36", false],
  ])("%s → %s", (ua, expected) => {
    expect(isBot(ua)).toBe(expected);
  });
});

describe("wordBucket", () => {
  it("sends a length range, never the words", () => {
    expect(wordBucket("   ")).toBe("0");
    expect(wordBucket("golden light over the bay")).toBe("1-19");
    expect(wordBucket("word ".repeat(20))).toBe("20-49");
    expect(wordBucket("word ".repeat(250))).toBe("200+");
  });
});
