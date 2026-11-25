import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { isDrizzleQueryError } from "./errors";

describe("isDrizzleQueryError", () => {
  it("matches the error Drizzle throws for a failed query", () => {
    expect(isDrizzleQueryError(new DrizzleQueryError("select 1", []))).toBe(true);
  });

  it.each([
    ["a plain Error", new Error("boom")],
    ["an Error named like it", Object.assign(new Error("boom"), { name: "DrizzleQueryError" })],
    ["a non-Error throwable", "DrizzleQueryError"],
  ])("rejects %s", (_, thrown) => {
    expect(isDrizzleQueryError(thrown)).toBe(false);
  });
});
