import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { describeError } from "./log-error";

/** A pg error as `pg` throws it: the code is a field, the row values sit in the message/detail. */
function pgError(code: unknown, detail = "Failing row contains (Secret title)") {
  return Object.assign(new Error(`violates constraint: ${detail}`), { code, detail });
}

describe("describeError", () => {
  it("names a DrizzleQueryError and its pg cause's code, never the query, params or cause", () => {
    const error = new DrizzleQueryError(
      'insert into "tasks" ("title") values ($1)',
      ["Secret title"],
      pgError("40P01"),
    );
    expect(describeError(error)).toBe("DrizzleQueryError (code 40P01)");
  });

  it("names a DrizzleQueryError without a cause by its class alone", () => {
    expect(describeError(new DrizzleQueryError("select 1", ["Secret title"]))).toBe(
      "DrizzleQueryError",
    );
  });

  it("prefers the error's own code, as on a Node connection error", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432"), {
      code: "ECONNREFUSED",
      cause: pgError("40001"),
    });
    expect(describeError(error)).toBe("Error (code ECONNREFUSED)");
  });

  it("keeps a subclass name", () => {
    class TimeoutError extends Error {}
    expect(describeError(new TimeoutError("Secret title"))).toBe("TimeoutError");
  });

  it.each([
    ["holds spaces", "Secret title"],
    ["is too long", "A".repeat(65)],
    ["is a number", 23505],
    ["is empty", ""],
  ])("drops a code that %s", (_, code) => {
    expect(describeError(pgError(code))).toBe("Error");
  });

  it("falls back to Error when the class has no usable name", () => {
    const Anonymous = (() => class extends Error {})();
    Object.defineProperty(Anonymous, "name", { value: "Secret title" });
    expect(describeError(new Anonymous("x"))).toBe("Error");
  });

  it.each([
    ["a string", "Secret title", "string"],
    ["undefined", undefined, "undefined"],
    ["null", null, "object"],
    ["a plain object", { message: "Secret title" }, "object"],
    [
      "a plain object with a code",
      { code: "57P01", message: "Secret title" },
      "object (code 57P01)",
    ],
  ])("describes %s by its type only", (_, thrown, expected) => {
    expect(describeError(thrown)).toBe(expected);
  });
});
