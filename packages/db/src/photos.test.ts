import { describe, expect, it } from "vitest";
import { entryPhotoKeys, photoKey } from "./photos";

describe("photo keys", () => {
  it("keeps every variant of an entry under its folder", () => {
    expect(photoKey("u1", "e1", "share")).toBe("entries/u1/e1/share.jpg");
    expect(entryPhotoKeys("u1", "e1")).toEqual([
      "entries/u1/e1/display.jpg",
      "entries/u1/e1/thumb.jpg",
      "entries/u1/e1/share.jpg",
    ]);
  });
});
