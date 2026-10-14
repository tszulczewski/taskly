import { describe, expect, it } from "vitest";
import { can } from "./authorization";
import { positionBetween } from "./position";
import { estimateSchema } from "./schemas";
import { summarize } from "./summary";

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

describe("summarize", () => {
  it("treats missing amounts as zero", () => {
    const s = summarize([
      { status: "todo", costGrosze: null, estimateMinGrosze: null, estimateMaxGrosze: null },
    ]);
    expect(s).toEqual({ spentGrosze: 0, upcomingMinGrosze: 0, upcomingMaxGrosze: 0 });
  });

  it("splits spent and upcoming", () => {
    const s = summarize([
      { status: "done", costGrosze: 1000, estimateMinGrosze: 800, estimateMaxGrosze: 900 },
      { status: "todo", costGrosze: null, estimateMinGrosze: 500, estimateMaxGrosze: 700 },
    ]);
    expect(s).toEqual({ spentGrosze: 1000, upcomingMinGrosze: 500, upcomingMaxGrosze: 700 });
  });
});
