import { describe, expect, it } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("reports the PostGIS version when the database answers", async () => {
    const report = await checkHealth(async () => "3.5");
    expect(report).toEqual({ status: "ok", database: { reachable: true, postgis: "3.5" } });
  });

  it("reports an error when the database query fails", async () => {
    const report = await checkHealth(async () => {
      throw new Error("connection refused");
    });
    expect(report).toEqual({
      status: "error",
      database: { reachable: false, error: "connection refused" },
    });
  });
});
