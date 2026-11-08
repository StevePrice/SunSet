import { describe, expect, it } from "vitest";
import { interviewText, originalWords, storyPrompt } from "./prompts";
import { toView } from "./sessions";

const turns = [
  { question: "Who were you with?", answer: "Steve. Our first road trip together.", via: "typed" as const },
  { question: null, answer: "  The trees were standing like sticks. ", via: "typed" as const },
];

describe("story prompts", () => {
  it("wraps the user's words as data and lists questions already asked", () => {
    const text = interviewText(turns, ["Who were you with?"]);
    expect(text).toContain("<answer>Steve. Our first road trip together.</answer>");
    expect(text).toContain("(the user started talking without a question)");
    expect(text).toContain("Already asked:\n- Who were you with?");
  });

  it("keeps typed words exactly, without the questions", () => {
    expect(originalWords(turns)).toBe("Steve. Our first road trip together.\n\nThe trees were standing like sticks.");
  });

  it("allows photo details only in the crafted-with-photo version", () => {
    expect(storyPrompt("crafted-photo")).toContain("clearly visible in the photo");
    expect(storyPrompt("crafted-plain")).toContain("Don't describe anything from the photo");
    expect(storyPrompt("my-short")).toContain("Nothing from the photo");
    expect(storyPrompt("my-line")).toContain("one sentence");
  });
});

describe("toView", () => {
  it("counts follow-ups left after the first answer", () => {
    expect(toView(null).followUpsLeft).toBe(3);
    const session = { turns, openers: [], nextQuestion: "Why?", wrapUp: false, sensitive: false, safetyConcern: false };
    expect(toView(session as never).followUpsLeft).toBe(2);
  });
});
