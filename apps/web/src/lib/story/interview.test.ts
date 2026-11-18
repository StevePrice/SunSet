import { describe, expect, it } from "vitest";
import { finishStep } from "./interview";

const long = "We drove up to Mammoth Lakes, went for a hike, and then watched the sunset from the porch with everyone.";

describe("finishStep", () => {
  it("saves an answer still in the box before finishing", () => {
    expect(finishStep({ pending: "Louise's aunt is named Kathy.", answers: [long], hasNextQuestion: true, offeredOneMore: false })).toBe(
      "save-then-finish",
    );
  });

  it("saves the pending answer even when one more question would otherwise be offered", () => {
    expect(finishStep({ pending: "More words", answers: ["Short one"], hasNextQuestion: true, offeredOneMore: false })).toBe(
      "save-then-finish",
    );
  });

  it("ignores a box with only spaces", () => {
    expect(finishStep({ pending: "   ", answers: [long], hasNextQuestion: true, offeredOneMore: false })).toBe("finish");
  });

  it("offers one more question after a single short answer, once", () => {
    const base = { pending: "", answers: ["It was pretty"], hasNextQuestion: true };
    expect(finishStep({ ...base, offeredOneMore: false })).toBe("offer-one-more");
    expect(finishStep({ ...base, offeredOneMore: true })).toBe("finish");
  });

  it("finishes straight away after a long answer", () => {
    expect(finishStep({ pending: "", answers: [long], hasNextQuestion: true, offeredOneMore: false })).toBe("finish");
  });
});
