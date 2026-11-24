import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, parseReactionRequest, parseVisitorId } from "./reaction-input";
import { newShareId } from "./shares";

describe("parseReactionRequest", () => {
  it("accepts the four positive reactions only", () => {
    for (const kind of ["wow", "wish", "love", "hugs"]) {
      expect(parseReactionRequest({ action: "toggle", kind })).toEqual({ ok: true, value: { action: "toggle", kind } });
    }
    expect(parseReactionRequest({ action: "toggle", kind: "meh" }).ok).toBe(false);
    expect(parseReactionRequest({ action: "toggle" }).ok).toBe(false);
    expect(parseReactionRequest({ action: "delete", kind: "wow" }).ok).toBe(false);
    expect(parseReactionRequest(null).ok).toBe(false);
    expect(parseReactionRequest("wow").ok).toBe(false);
  });

  it("cleans up the first name and requires one when given", () => {
    expect(parseReactionRequest({ action: "toggle", kind: "wow", name: "  Steve\n " })).toEqual({
      ok: true,
      value: { action: "toggle", kind: "wow", name: "Steve" },
    });
    expect(parseReactionRequest({ action: "toggle", kind: "wow", name: "   " })).toEqual({
      ok: false,
      error: "Please type your first name.",
    });
    expect(parseReactionRequest({ action: "toggle", kind: "wow", name: "x".repeat(41) }).ok).toBe(false);
  });

  it("keeps notes to one short line, and a blank note means none", () => {
    expect(parseReactionRequest({ action: "note", note: "  Best   night\nof the trip " })).toEqual({
      ok: true,
      value: { action: "note", note: "Best night of the trip" },
    });
    expect(parseReactionRequest({ action: "note", note: "   " })).toEqual({ ok: true, value: { action: "note", note: null } });
    expect(parseReactionRequest({ action: "note", note: "x".repeat(MAX_NOTE_LENGTH) }).ok).toBe(true);
    expect(parseReactionRequest({ action: "note", note: "x".repeat(MAX_NOTE_LENGTH + 1) })).toEqual({
      ok: false,
      error: `Keep your note to ${MAX_NOTE_LENGTH} characters.`,
    });
    expect(parseReactionRequest({ action: "note", note: 42 }).ok).toBe(false);
  });
});

describe("parseVisitorId", () => {
  it("accepts only ids the app made", () => {
    const id = newShareId();
    expect(parseVisitorId(id)).toBe(id);
    expect(parseVisitorId(undefined)).toBeNull();
    expect(parseVisitorId("short")).toBeNull();
    expect(parseVisitorId(`${id.slice(0, 21)};`)).toBeNull();
  });
});

describe("personal links (4f-3)", () => {
  it("says I was there! for the person in the photo, Wish I was there for everyone else", async () => {
    const { reactionLabel } = await import("./reaction-input");
    expect(reactionLabel("wish", true)).toBe("I was there!");
    expect(reactionLabel("wish")).toBe("Wish I was there");
    expect(reactionLabel("love", true)).toBe("Love this!");
  });

  it("accepts only a well-formed personal link token", async () => {
    const { parseReactionRequest } = await import("./reaction-input");
    expect(parseReactionRequest({ action: "toggle", kind: "wish", recipient: "A".repeat(22) }).ok).toBe(true);
    expect(parseReactionRequest({ action: "toggle", kind: "wish", recipient: "short" }).ok).toBe(false);
  });
});
