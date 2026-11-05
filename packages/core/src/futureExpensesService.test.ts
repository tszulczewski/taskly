import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./errors";
import type { TaskView } from "./schemas";
import type { Db } from "./types";

const listTasks = vi.fn();
vi.mock("./tasks", () => ({ listTasks }));

const { futureExpensesService } = await import("./futureExpensesService");

const db = {} as Db;
const view = (completed: boolean, minGrosze: number, maxGrosze: number): TaskView => ({
  id: "00000000-0000-4000-8000-000000000001",
  title: "Tiles",
  description: null,
  estimate: { minGrosze, maxGrosze },
  completed,
  position: "a0",
  unestimatedSubtasks: 0,
  subtasks: [],
});

beforeEach(() => {
  listTasks.mockReset();
});

describe("futureExpensesService", () => {
  it("reads the list through listTasks and returns its future expenses", async () => {
    listTasks.mockResolvedValue([view(false, 100, 200), view(true, 1000, 2000)]);
    await expect(futureExpensesService(db, "u1", "l1")).resolves.toEqual({
      total: { minGrosze: 100, maxGrosze: 200 },
      unestimated: [],
    });
    expect(listTasks).toHaveBeenCalledExactlyOnceWith(db, "u1", "l1");
  });

  it("passes on the list's authorization error", async () => {
    const error = new NotFoundError("List");
    listTasks.mockRejectedValue(error);
    await expect(futureExpensesService(db, "u1", "l1")).rejects.toBe(error);
  });
});
