import { describe, expect, it } from "vitest";
import { CARD_LAYOUT, markBox, STORIES_LAYOUT } from "./share-card";

describe("share card layout", () => {
  it("places the link card's mark 12pt in, at 2px per point", () => {
    expect(CARD_LAYOUT).toMatchObject({ width: 1200, height: 630, scale: 2, inset: 12 });
    expect(markBox(CARD_LAYOUT)).toEqual({ left: 24, top: 24, size: 96, radius: 20, markWidth: 68 });
  });

  it("places the Stories card's mark 24pt in, at 1080/393 ≈ 2.75px per point", () => {
    expect(STORIES_LAYOUT).toMatchObject({ width: 1080, height: 1920, scale: 2.75, inset: 24 });
    expect(markBox(STORIES_LAYOUT)).toEqual({ left: 66, top: 66, size: 132, radius: 27.5, markWidth: 93.5 });
  });

  it("keeps the mark's scrim square inside the image", () => {
    for (const layout of [CARD_LAYOUT, STORIES_LAYOUT]) {
      const box = markBox(layout);
      expect(box.left + box.size).toBeLessThan(layout.width / 2);
      expect(box.top + box.size).toBeLessThan(layout.height / 2);
    }
  });
});
