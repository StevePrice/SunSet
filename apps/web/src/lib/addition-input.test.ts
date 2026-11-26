import { describe, expect, it } from "vitest";
import { sentMessage } from "@/app/s/[id]/reactions";
import { MAX_ADDITION_LENGTH, parseAdditionRequest } from "./addition-input";

describe("Add to the story input (4f-4)", () => {
  it("keeps paragraphs, tidies spaces, and treats blank as nothing", () => {
    const parsed = parseAdditionRequest({ text: "  We kept going.\r\n\r\n\r\n\r\nSo glad   we did.\u0007 ", spoken: false });
    expect(parsed).toEqual({ ok: true, value: { text: "We kept going.\n\nSo glad we did.", spoken: false } });
    expect(parseAdditionRequest({ text: "   ", spoken: true })).toEqual({ ok: true, value: { text: null, spoken: true } });
  });

  it("refuses words over the limit, and anything malformed", () => {
    expect(parseAdditionRequest({ text: "a".repeat(MAX_ADDITION_LENGTH + 1), spoken: false })).toEqual({ ok: false, error: `Keep it to ${MAX_ADDITION_LENGTH} characters.` });
    expect(parseAdditionRequest({ text: "Hi" }).ok).toBe(false);
    expect(parseAdditionRequest({ text: "Hi", spoken: false, recipient: "short" }).ok).toBe(false);
  });

  it("thanks the friend for exactly what they sent", () => {
    expect(sentMessage("Louise", { reacted: true, noted: false, added: true })).toBe("Sent! Louise will see your reaction and what you added to the story.");
    expect(sentMessage("Louise", { reacted: true, noted: true, added: false })).toBe("Sent! Louise will see your reaction and note.");
    expect(sentMessage("Louise", { reacted: true, noted: true, added: true })).toBe("Sent! Louise will see your reaction, note and what you added to the story.");
    expect(sentMessage("Louise", { reacted: false, noted: true, added: true })).toBe("Sent! Louise will see your note and what you added to the story.");
    expect(sentMessage("Louise", { reacted: false, noted: false, added: true })).toBe("Sent! Louise will see what you added to the story.");
    expect(sentMessage("Louise", { reacted: false, noted: false, added: false })).toBe("Sent!");
  });
});
