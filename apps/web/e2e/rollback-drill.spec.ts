// The rollback drill for the "Deploy to staging" workflow: run it with "Fail the smoke tests on
// purpose" ticked and this test fails, so the workflow must roll the Worker back. Skipped
// otherwise, including in CI and locally.
import { expect, test } from "@playwright/test";

test("fails on purpose when E2E_FORCE_FAIL is set (rollback drill)", { tag: "@staging" }, () => {
  test.skip(!process.env.E2E_FORCE_FAIL, "Only for the rollback drill.");
  expect(false, "E2E_FORCE_FAIL is set: failing on purpose so the deploy rolls back").toBe(true);
});
