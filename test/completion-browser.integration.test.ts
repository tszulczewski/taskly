import { createTask, ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authRequest,
  clientIps,
  closeUserDb,
  createBrowser,
  createUser,
  type RunningApp,
  sessionCookie,
  startApp,
} from "./helpers";

const run = `completionbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

type Row = { title: string; completed: boolean };
type Shown = Row & { subtasks: Row[]; error: string };

// #20 (E03-S01) in the browser against the production build, sign-up closed: AC8 (the question and
// Cancel), AC9–AC12 (order), Q2-1, a refused completion (s04.28) and complete → reopen while the
// first answer is held back (review R2). The other criteria are covered by the core and HTTP tests.
describe("completing and reopening tasks in the browser (#20, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-completion-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(40);

  async function signIn(slug: string) {
    const user = await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    const cookie = sessionCookie(res);
    if (!cookie) throw new Error(`Sign-in over HTTP failed with ${res.status}`);
    return { id: user.id, cookie, listId: await ensureDefaultList(db, user.id) };
  }

  /** Tasks A, B, C in this order, A with subtasks s1, s2, s3; then `/` opened, signed in. */
  async function openPlanned(slug: string) {
    const user = await signIn(slug);
    const a = await createTask(db, user.id, user.listId, { title: "A" });
    for (const title of ["s1", "s2", "s3"]) {
      await createTask(db, user.id, user.listId, { title, parentId: a.id });
    }
    for (const title of ["B", "C"]) await createTask(db, user.id, user.listId, { title });
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForHydrated('[role="checkbox"]');
    await expectOrder(["A", "B", "C"]);
    browser.clearRequests();
    return user;
  }

  /** The top-level rows in screen order: checkbox state, shown subtasks, row error. */
  const shown = () =>
    browser.evaluate<Shown[]>(`(() => {
      const row = (li) => ({
        title: li.querySelector('[data-slot="task-title"]').textContent,
        completed: li.querySelector('[role="checkbox"]').getAttribute("aria-checked") === "true",
      });
      return [...document.querySelectorAll('ul[aria-label="Tasks"] > li[data-slot="task-row"]')]
        .map((li) => ({
          ...row(li),
          subtasks: [...li.querySelectorAll('ul[aria-label^="Subtasks of"] > li')].map(row),
          error: li.querySelector('[role="alert"]')?.textContent ?? "",
        }));
    })()`);
  const mark = (row: Row) => `${row.title}${row.completed ? "✓" : ""}`;
  const order = () => shown().map(mark);
  const subtaskOrder = (title: string) =>
    shown()
      .find((task) => task.title === title)
      ?.subtasks.map(mark);

  async function expectOrder(expected: string[]) {
    await browser.waitFor(
      () => JSON.stringify(order()) === JSON.stringify(expected),
      () => `tasks ${expected.join(", ")} (shown: ${order().join(", ")})`,
    );
  }
  async function expectSubtasks(title: string, expected: string[]) {
    await browser.waitFor(
      () => JSON.stringify(subtaskOrder(title)) === JSON.stringify(expected),
      () => `subtasks ${expected.join(", ")} (shown: ${subtaskOrder(title)?.join(", ")})`,
    );
  }

  const dialogClosed = () =>
    browser.waitFor(
      () => browser.count('[role="alertdialog"]') === 0,
      () => "the question to close",
    );
  const toggle = (title: string) => browser.clickRole("checkbox", `Complete “${title}”`);
  /**
   * Opens a task's row to show its subtasks, unless it is open (it stays open when it moves). It
   * waits for the rows to stop moving first (a click on a moving row can miss) and for the row to
   * finish opening after (its subtasks are clipped until then).
   */
  async function expand(title: string) {
    await browser.waitForAnimations();
    const open =
      browser.evaluate<boolean>(`[...document.querySelectorAll('[data-slot="task-title"]')]
      .some((e) => e.textContent === ${JSON.stringify(title)} && e.getAttribute("aria-expanded") === "true")`);
    if (!open) browser.clickRole("button", title);
    await browser.waitForAnimations();
  }
  const puts = () =>
    browser.requests("/completion").filter((request) => request.method === "PUT").length;
  async function waitForPuts(count: number) {
    await browser.waitFor(
      () => puts() === count,
      () => `${count} completion requests (sent: ${puts()})`,
    );
  }

  /** Each row's stored status by title. */
  const stored = async (listId: string) =>
    Object.fromEntries(
      (
        await db
          .select({ title: schema.tasks.title, status: schema.tasks.status })
          .from(schema.tasks)
          .where(eq(schema.tasks.listId, listId))
      ).map((row) => [row.title, row.status]),
    );

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3208,
      env: { ALLOW_SIGN_UP: "false" },
    });
  });

  beforeEach(() => {
    browser.open("about:blank");
    browser.clearCookies();
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app?.stop();
    // Default lists, with their tasks, go with their user.
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  it("orders completed rows last and reopened rows first, asking before it completes open subtasks (AC8–AC12)", async () => {
    const { listId } = await openPlanned("order");
    await expand("A");
    await expectSubtasks("A", ["s1", "s2", "s3"]);

    toggle("s1");
    await expectSubtasks("A", ["s2", "s3", "s1✓"]);
    await waitForPuts(1);

    toggle("A");
    await browser.waitForText("Complete “A” and its 2 open subtasks?");
    browser.clickRole("button", "Cancel");
    await dialogClosed();
    expect(order()).toEqual(["A", "B", "C"]);
    expect(puts()).toBe(1);

    toggle("A");
    await browser.waitForText("Complete “A” and its 2 open subtasks?");
    browser.clickRole("button", "Complete task");
    await expectOrder(["B", "C", "A✓"]);
    await waitForPuts(2);
    await expect
      .poll(() => stored(listId))
      .toEqual({ A: "done", s1: "done", s2: "done", s3: "done", B: "todo", C: "todo" });

    toggle("A");
    await expectOrder(["A", "B", "C"]);
    await expand("A");
    await expectSubtasks("A", ["s1✓", "s2✓", "s3✓"]);
    toggle("s3");
    await expectSubtasks("A", ["s3", "s1✓", "s2✓"]);
    await waitForPuts(4);
    await expect
      .poll(() => stored(listId))
      .toEqual({ A: "todo", s1: "done", s2: "done", s3: "todo", B: "todo", C: "todo" });
  });

  it("reopens a subtask of a completed task first; the task stays completed (Q2-1)", async () => {
    const { listId } = await openPlanned("q2");
    toggle("A");
    await browser.waitForText("Complete “A” and its 3 open subtasks?");
    browser.clickRole("button", "Complete task");
    await expectOrder(["B", "C", "A✓"]);
    await dialogClosed();
    await expand("A");
    await expectSubtasks("A", ["s1✓", "s2✓", "s3✓"]);

    toggle("s2");

    await expectSubtasks("A", ["s2", "s1✓", "s3✓"]);
    expect(order()).toEqual(["B", "C", "A✓"]);
    await waitForPuts(2);
    await expect
      .poll(() => stored(listId))
      .toEqual({ A: "done", s1: "done", s2: "todo", s3: "done", B: "todo", C: "todo" });
  });

  it("puts a refused completion back with a message in its row (s04.28)", async () => {
    const { listId } = await openPlanned("refused");
    browser.abortRequests("**/completion");
    try {
      toggle("B");
      await browser.waitFor(
        () =>
          shown().find((task) => task.title === "B")?.error ===
          "Could not save “B”. It is back as it was.",
        () => `B's row message (alerts: ${JSON.stringify(browser.alerts())})`,
      );
      await expectOrder(["A", "B", "C"]);
    } finally {
      browser.unroute("**/completion");
    }
    expect((await stored(listId)).B).toBe("todo");

    // The next change clears the message.
    toggle("C");
    await expectOrder(["A", "B", "C✓"]);
    expect(shown().find((task) => task.title === "B")?.error).toBe("");
  });

  it("shows complete → reopen as reopened while the first answer is held back, and ends reopened (review R2)", async () => {
    const { listId } = await openPlanned("delayed");
    // The completion locks the list row first, so a transaction holding it holds the answer back.
    const holder = await pool.connect();
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT id FROM lists WHERE id = $1 FOR NO KEY UPDATE", [listId]);
      const { rows } = await holder.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      const holderPid = rows[0]!.pid;

      toggle("C");
      await expectOrder(["A", "B", "C✓"]);
      await waitForPuts(1);
      await expect
        .poll(async () => {
          const blocked = await pool.query<{ n: number }>(
            "SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))",
            [holderPid],
          );
          return blocked.rows[0]!.n;
        })
        .toBe(1);

      toggle("C");
      await expectOrder(["C", "A", "B"]);
      // One list queue: the reopen waits for the first answer.
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(puts()).toBe(1);

      await holder.query("COMMIT");
    } finally {
      await holder.query("ROLLBACK").catch(() => undefined);
      holder.release();
    }
    await waitForPuts(2);
    await expect.poll(async () => (await stored(listId)).C).toBe("todo");
    await expectOrder(["C", "A", "B"]);
  });
});
