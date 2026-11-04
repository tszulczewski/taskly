import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("builds stable keys", () => {
    expect(queryKeys.lists()).toEqual(["lists"]);
    expect(queryKeys.tasks("l1")).toEqual(["lists", "l1", "tasks"]);
    expect(queryKeys.taskChanges("l1")).toEqual(["lists", "l1", "tasks", "change"]);
    expect(queryKeys.taskChange("l1", "completion")).toEqual([
      "lists",
      "l1",
      "tasks",
      "change",
      "completion",
    ]);
    expect(queryKeys.shopping("l1")).toEqual(["lists", "l1", "shopping"]);
    expect(queryKeys.futureExpenses("l1")).toEqual(["lists", "l1", "future-expenses"]);
  });
});
