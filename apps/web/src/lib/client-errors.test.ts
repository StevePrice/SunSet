import { describe, expect, it } from "vitest";
import { MAX_CLIENT_ERROR_FIELD, parseClientError } from "./client-errors";

describe("parseClientError", () => {
  it("needs a message", () => {
    expect(parseClientError(null)).toBeNull();
    expect(parseClientError({ message: "  " })).toBeNull();
    expect(parseClientError({ message: 42 })).toBeNull();
  });

  it("keeps short strings and drops the query string from the path", () => {
    expect(parseClientError({ message: "Boom", digest: "123", path: "/journal/abc?token=secret#x" })).toEqual({
      message: "Boom",
      digest: "123",
      path: "/journal/abc",
    });
  });

  it("cuts long messages", () => {
    expect(parseClientError({ message: "x".repeat(5000) })!.message).toHaveLength(MAX_CLIENT_ERROR_FIELD);
  });
});
