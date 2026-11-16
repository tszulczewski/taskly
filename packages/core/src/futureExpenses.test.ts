import { describe, expect, it } from "vitest";
import { rollUpEstimate } from "./estimate";
import { futureExpenses } from "./futureExpenses";
import { MAX_ESTIMATE_GROSZE } from "./money";
import type { Estimate, SubtaskView, TaskView } from "./schemas";

const range = (minGrosze: number, maxGrosze: number) => ({ minGrosze, maxGrosze });
const zl = (amount: number) => amount * 100;

let ids = 0;
const nextId = () => `00000000-0000-4000-8000-${String((ids += 1)).padStart(12, "0")}`;

function subtask(estimate: Estimate | null, completed = false, title = "Subtask"): SubtaskView {
  return {
    id: nextId(),
    title,
    description: null,
    estimate,
    completed,
    important: false,
    urgent: false,
    places: [],
    position: "a0",
  };
}

/** A main task as `listTasks` returns it: its estimate rolled up from its subtasks. */
function task(
  own: Estimate | null,
  {
    completed = false,
    subtasks = [],
    title = "Task",
  }: { completed?: boolean; subtasks?: SubtaskView[]; title?: string } = {},
): TaskView {
  const { estimate, unestimatedSubtasks } = rollUpEstimate(
    own,
    subtasks.map((s) => s.estimate),
  );
  return {
    id: nextId(),
    title,
    description: null,
    estimate,
    completed,
    important: false,
    urgent: false,
    places: [],
    position: "a0",
    unestimatedSubtasks,
    subtasks,
  };
}

describe("futureExpenses", () => {
  it("adds up the ranges of open tasks (#21 AC1)", () => {
    const views = [task(range(zl(1000), zl(2000))), task(range(zl(500), zl(700)))];
    expect(futureExpenses(views).total).toEqual(range(zl(1500), zl(2700)));
  });

  it("counts a task with subtasks once, with their sum, never its own figure (#21 AC2)", () => {
    const views = [
      task(range(zl(1000), zl(2000)), {
        subtasks: [subtask(range(zl(300), zl(400))), subtask(range(zl(500), zl(500)))],
      }),
    ];
    expect(futureExpenses(views).total).toEqual(range(zl(800), zl(900)));
  });

  it("leaves out a task without an estimate, also one whose subtasks all lack one (#21 AC3)", () => {
    const views = [
      task(null),
      task(range(zl(1000), zl(2000)), { subtasks: [subtask(null), subtask(null)] }),
      task(range(zl(100), zl(200))),
    ];
    expect(futureExpenses(views).total).toEqual(range(zl(100), zl(200)));
  });

  it("leaves out a completed task; completed subtasks of an open task still count (#21 AC4)", () => {
    const views = [
      task(range(zl(1000), zl(2000)), { completed: true }),
      task(null, {
        subtasks: [subtask(range(zl(300), zl(400)), true), subtask(range(zl(50), zl(50)))],
      }),
    ];
    expect(futureExpenses(views).total).toEqual(range(zl(350), zl(450)));
  });

  it("is null when no open task has an estimate (#21 AC5)", () => {
    expect(futureExpenses([]).total).toEqual(null);
    const views = [task(null), task(range(zl(1), zl(2)), { completed: true })];
    expect(futureExpenses(views).total).toEqual(null);
  });

  it("adds exact prices into an exact total (#21 AC7)", () => {
    const views = [task(range(zl(500), zl(500))), task(range(zl(300), zl(300)))];
    expect(futureExpenses(views).total).toEqual(range(zl(800), zl(800)));
  });

  it("counts an exact price of 0 zł as an estimate, so it is not listed", () => {
    expect(futureExpenses([task(range(0, 0))])).toEqual({ total: range(0, 0), unestimated: [] });
  });

  it("adds up integer grosze exactly beyond the cap on one typed amount", () => {
    const views = [
      task(range(MAX_ESTIMATE_GROSZE, MAX_ESTIMATE_GROSZE)),
      task(range(1, MAX_ESTIMATE_GROSZE)),
      task(range(1, 2)),
    ];
    expect(futureExpenses(views).total).toEqual(
      range(MAX_ESTIMATE_GROSZE + 2, 2 * MAX_ESTIMATE_GROSZE + 2),
    );
  });
});

describe("futureExpenses unestimated", () => {
  const item = (view: SubtaskView, taskTitle?: string) =>
    taskTitle === undefined
      ? { id: view.id, title: view.title }
      : { id: view.id, title: view.title, taskTitle };

  it("lists an open task without subtasks and without an estimate (#47 AC1)", () => {
    const seal = task(null, { title: "Seal the bath" });
    const priced = task(range(zl(100), zl(200)));
    expect(futureExpenses([seal, priced]).unestimated).toEqual([item(seal)]);
  });

  it("lists the unpriced subtask with its task, not the task or the priced one (#47 AC2)", () => {
    const tiles = subtask(null, false, "Tiles");
    const grout = subtask(range(zl(400), zl(400)), false, "Grout");
    const bathroom = task(null, { title: "Bathroom tiles", subtasks: [tiles, grout] });
    expect(futureExpenses([bathroom]).unestimated).toEqual([item(tiles, "Bathroom tiles")]);
  });

  it("lists every subtask when none has an estimate, never the task itself (#47 AC3)", () => {
    const subtasks = [subtask(null), subtask(null), subtask(null)];
    const paint = task(range(zl(1), zl(2)), { title: "Paint", subtasks });
    expect(futureExpenses([paint]).unestimated).toEqual(subtasks.map((s) => item(s, "Paint")));
  });

  it("lists nothing of a completed task (#47 AC5)", () => {
    const views = [
      task(null, { completed: true }),
      task(null, { completed: true, subtasks: [subtask(null, true), subtask(null)] }),
    ];
    expect(futureExpenses(views).unestimated).toEqual([]);
  });

  it("leaves out a completed subtask without an estimate (#47 AC7)", () => {
    const open = subtask(null, false, "Open");
    const views = [task(null, { title: "Walls", subtasks: [subtask(null, true), open] })];
    expect(futureExpenses(views).unestimated).toEqual([item(open, "Walls")]);
  });

  it("does not list a subtask reopened under a completed task (Q2-1)", () => {
    const reopened = subtask(null, false);
    const views = [task(null, { completed: true, subtasks: [reopened, subtask(null, true)] })];
    expect(futureExpenses(views)).toEqual({ total: null, unestimated: [] });
  });

  it("does not list a task whose subtasks are all completed", () => {
    const views = [task(null, { subtasks: [subtask(null, true)] })];
    expect(futureExpenses(views).unestimated).toEqual([]);
  });

  it("keeps the views' order, a task's subtasks in their place (display order)", () => {
    const first = task(null, { title: "First" });
    const a = subtask(null, false, "A");
    const b = subtask(null, false, "B");
    const middle = task(null, { title: "Middle", subtasks: [a, subtask(range(1, 1)), b] });
    const last = task(null, { title: "Last" });
    expect(futureExpenses([first, middle, last]).unestimated).toEqual([
      item(first),
      item(a, "Middle"),
      item(b, "Middle"),
      item(last),
    ]);
  });
});
