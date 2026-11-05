import { describe, expect, it } from "vitest";
import { rollUpEstimate } from "./estimate";
import { futureExpenses } from "./futureExpenses";
import { MAX_ESTIMATE_GROSZE } from "./money";
import type { Estimate, SubtaskView, TaskView } from "./schemas";

const range = (minGrosze: number, maxGrosze: number) => ({ minGrosze, maxGrosze });
const zl = (amount: number) => amount * 100;

let ids = 0;
const nextId = () => `00000000-0000-4000-8000-${String((ids += 1)).padStart(12, "0")}`;

function subtask(estimate: Estimate | null, completed = false): SubtaskView {
  return { id: nextId(), title: "Subtask", description: null, estimate, completed, position: "a0" };
}

/** A main task as `listTasks` returns it: its estimate rolled up from its subtasks. */
function task(
  own: Estimate | null,
  { completed = false, subtasks = [] }: { completed?: boolean; subtasks?: SubtaskView[] } = {},
): TaskView {
  const { estimate, unestimatedSubtasks } = rollUpEstimate(
    own,
    subtasks.map((s) => s.estimate),
  );
  return {
    id: nextId(),
    title: "Task",
    description: null,
    estimate,
    completed,
    position: "a0",
    unestimatedSubtasks,
    subtasks,
  };
}

describe("futureExpenses", () => {
  it("adds up the ranges of open tasks (#21 AC1)", () => {
    const views = [task(range(zl(1000), zl(2000))), task(range(zl(500), zl(700)))];
    expect(futureExpenses(views)).toEqual({ total: range(zl(1500), zl(2700)) });
  });

  it("counts a task with subtasks once, with their sum, never its own figure (#21 AC2)", () => {
    const views = [
      task(range(zl(1000), zl(2000)), {
        subtasks: [subtask(range(zl(300), zl(400))), subtask(range(zl(500), zl(500)))],
      }),
    ];
    expect(futureExpenses(views)).toEqual({ total: range(zl(800), zl(900)) });
  });

  it("leaves out a task without an estimate, also one whose subtasks all lack one (#21 AC3)", () => {
    const views = [
      task(null),
      task(range(zl(1000), zl(2000)), { subtasks: [subtask(null), subtask(null)] }),
      task(range(zl(100), zl(200))),
    ];
    expect(futureExpenses(views)).toEqual({ total: range(zl(100), zl(200)) });
  });

  it("leaves out a completed task; completed subtasks of an open task still count (#21 AC4)", () => {
    const views = [
      task(range(zl(1000), zl(2000)), { completed: true }),
      task(null, {
        subtasks: [subtask(range(zl(300), zl(400)), true), subtask(range(zl(50), zl(50)))],
      }),
    ];
    expect(futureExpenses(views)).toEqual({ total: range(zl(350), zl(450)) });
  });

  it("is null when no open task has an estimate (#21 AC5)", () => {
    expect(futureExpenses([])).toEqual({ total: null });
    const views = [task(null), task(range(zl(1), zl(2)), { completed: true })];
    expect(futureExpenses(views)).toEqual({ total: null });
  });

  it("adds exact prices into an exact total (#21 AC7)", () => {
    const views = [task(range(zl(500), zl(500))), task(range(zl(300), zl(300)))];
    expect(futureExpenses(views)).toEqual({ total: range(zl(800), zl(800)) });
  });

  it("counts an exact price of 0 zł as an estimate", () => {
    expect(futureExpenses([task(range(0, 0))])).toEqual({ total: range(0, 0) });
  });

  it("adds up integer grosze exactly beyond the cap on one typed amount", () => {
    const views = [
      task(range(MAX_ESTIMATE_GROSZE, MAX_ESTIMATE_GROSZE)),
      task(range(1, MAX_ESTIMATE_GROSZE)),
      task(range(1, 2)),
    ];
    expect(futureExpenses(views)).toEqual({
      total: range(MAX_ESTIMATE_GROSZE + 2, 2 * MAX_ESTIMATE_GROSZE + 2),
    });
  });
});
