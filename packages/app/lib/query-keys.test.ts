import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("builds stable keys", () => {
    expect(queryKeys.lists()).toEqual(["lists"]);
    expect(queryKeys.tasks("l1")).toEqual(["lists", "l1", "tasks"]);
    expect(queryKeys.shopping("l1")).toEqual(["lists", "l1", "shopping"]);
    expect(queryKeys.summary()).toEqual(["summary"]);
    expect(queryKeys.summary("l1")).toEqual(["lists", "l1", "summary"]);
  });
});
