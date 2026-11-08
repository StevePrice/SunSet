import { hashPassword as hashScrypt } from "better-auth/crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("long-test-password-42!");
    expect(hash).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(await verifyPassword({ hash, password: "long-test-password-42!" })).toBe(true);
    expect(await verifyPassword({ hash, password: "long-test-password-43!" })).toBe(false);
  });

  it("uses a fresh salt for every hash", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });

  it("still verifies Better Auth's older scrypt hashes", async () => {
    const legacy = await hashScrypt("an-older-password!");
    expect(await verifyPassword({ hash: legacy, password: "an-older-password!" })).toBe(true);
    expect(await verifyPassword({ hash: legacy, password: "wrong" })).toBe(false);
  });
});
