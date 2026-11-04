import { describe, expect, it } from "vitest";
import { can } from "./authorization";
import { positionBetween } from "./position";
import { estimateSchema } from "./schemas";

describe("authorization", () => {
  it("applies role hierarchy", () => {
    expect(can("viewer", "read")).toBe(true);
    expect(can("viewer", "write")).toBe(false);
    expect(can("editor", "write")).toBe(true);
    expect(can("editor", "manage")).toBe(false);
    expect(can("owner", "manage")).toBe(true);
    expect(can(null, "read")).toBe(false);
  });
});

describe("position", () => {
  it("generates ordered keys without renumbering", () => {
    const a = positionBetween(null, null);
    const c = positionBetween(a, null);
    const b = positionBetween(a, c);
    expect(a < b && b < c).toBe(true);
  });
});

describe("estimate", () => {
  it("rejects min > max", () => {
    expect(estimateSchema.safeParse({ minGrosze: 10, maxGrosze: 5 }).success).toBe(false);
    expect(estimateSchema.safeParse({ minGrosze: 5, maxGrosze: 10 }).success).toBe(true);
  });
});
