import { describe, expect, it } from "vitest";
import { firstNameSchema, MAX_FIRST_NAME_LENGTH } from "./first-name";

describe("first name", () => {
  it("trims and keeps the name on one line", () => {
    expect(firstNameSchema.parse("  Louise \n")).toBe("Louise");
    expect(firstNameSchema.parse("Mary\nAnn")).toBe("Mary Ann");
  });

  it("refuses a blank or overlong name", () => {
    expect(firstNameSchema.safeParse("   ").success).toBe(false);
    expect(firstNameSchema.safeParse("x".repeat(MAX_FIRST_NAME_LENGTH + 1)).success).toBe(false);
    expect(firstNameSchema.safeParse("x".repeat(MAX_FIRST_NAME_LENGTH)).success).toBe(true);
  });
});
