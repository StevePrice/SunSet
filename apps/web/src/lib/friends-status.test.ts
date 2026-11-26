import { describe, expect, it } from "vitest";
import { friendsStatus } from "./friends-status";

describe("friendsStatus", () => {
  it("counts reactions and what friends added", () => {
    expect(friendsStatus(true, 4, 2)).toBe("Shared · 4 reactions · 2 added to the story");
    expect(friendsStatus(true, 1, 0)).toBe("Shared · 1 reaction");
    expect(friendsStatus(true, 0, 1)).toBe("Shared · 1 added to the story");
  });

  it("says when nothing has come in, or the sunset isn't shared", () => {
    expect(friendsStatus(true, 0, 0)).toBe("No reactions yet");
    expect(friendsStatus(false, 0, 0)).toBe("Not shared yet");
    expect(friendsStatus(false, 3, 1)).toBe("Not shared");
  });
});
