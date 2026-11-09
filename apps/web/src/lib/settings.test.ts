import { expect, it } from "vitest";
import { storyHelpAllowed } from "./settings";

it("allows AI only when the user has AI story help on", () => {
  expect(storyHelpAllowed({ aiStoryHelp: true, noticeSeen: false })).toBe(true);
  expect(storyHelpAllowed({ aiStoryHelp: false, noticeSeen: true })).toBe(false);
  expect(storyHelpAllowed(null)).toBe(false);
});
