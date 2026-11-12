import { createTask, ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { and, eq, like } from "drizzle-orm";
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

const run = `markersbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

type Marker = "Important" | "Urgent";

// #18 (E02-S02) in the browser against the production build, sign-up closed: AC1–AC4 through the
// row menu and a reload, a failed toggle rolled back with the row message, and two quick toggles
// of one row while the first answer is held back (the list queue, spec E02 Q-1 for markers).
describe("marking tasks important and urgent in the browser (#18, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-markers-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(60);

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

  /** Tasks A (with subtasks s1, s2) and B; then `/` opened, signed in. */
  async function openPlanned(slug: string) {
    const user = await signIn(slug);
    const a = await createTask(db, user.id, user.listId, { title: "A" });
    for (const title of ["s1", "s2"]) {
      await createTask(db, user.id, user.listId, { title, parentId: a.id });
    }
    await createTask(db, user.id, user.listId, { title: "B" });
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForHydrated('[role="checkbox"]');
    browser.clearRequests();
    return user;
  }

  /** The marker words on each row's own meta line, by title (subtasks included once shown). */
  const shown = () =>
    browser.evaluate<Record<string, string[]>>(`(() => {
      const rows = [...document.querySelectorAll('[data-slot="task-row"]')];
      return Object.fromEntries(rows.map((row) => [
        row.querySelector('[data-slot="task-title"]').textContent,
        [...row.querySelectorAll('[data-slot="marker"]')]
          .filter((word) => word.closest('[data-slot="task-row"]') === row)
          .map((word) => word.textContent),
      ]));
    })()`);
  const rowError = (title: string) =>
    browser.evaluate<string>(`(() => {
      const row = [...document.querySelectorAll('[data-slot="task-row"]')]
        .find((e) => e.querySelector('[data-slot="task-title"]').textContent === ${JSON.stringify(title)});
      return [...(row?.querySelectorAll('[role="alert"]') ?? [])]
        .filter((alert) => alert.closest('[data-slot="task-row"]') === row)
        .map((alert) => alert.textContent).join("");
    })()`);

  async function expectShown(expected: Record<string, string[]>) {
    await browser.waitFor(
      () => {
        const now = shown();
        return Object.entries(expected).every(
          ([title, words]) => JSON.stringify(now[title]) === JSON.stringify(words),
        );
      },
      () => `markers ${JSON.stringify(expected)} (shown: ${JSON.stringify(shown())})`,
    );
  }

  /** "…" → "Important" or "Urgent" on a row; the menu closes after the choice. */
  async function toggle(title: string, marker: Marker) {
    await browser.waitForAnimations();
    browser.clickRole("button", `More actions for “${title}”`);
    browser.clickRole("menuitemcheckbox", marker);
    await browser.waitFor(
      () => browser.count('[role="menu"]') === 0,
      () => "the menu to close",
    );
  }

  async function expand(title: string) {
    await browser.waitForAnimations();
    browser.clickRole("button", title);
    await browser.waitForAnimations();
  }

  const patches = () =>
    browser.requests("/api/tasks/").filter((request) => request.method === "PATCH").length;
  async function waitForPatches(count: number) {
    await browser.waitFor(
      () => patches() === count,
      () => `${count} PATCH requests (sent: ${patches()})`,
    );
  }

  /** Each row's stored markers by title. */
  const stored = async (listId: string) =>
    Object.fromEntries(
      (
        await db
          .select({
            title: schema.tasks.title,
            important: schema.tasks.important,
            urgent: schema.tasks.urgent,
          })
          .from(schema.tasks)
          .where(eq(schema.tasks.listId, listId))
      ).map((row) => [row.title, [row.important, row.urgent]]),
    );

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3211,
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

  // MARKERS-001 (#18 AC1–AC3).
  it("sets important alone, then urgent too, clears urgent keeping important, and keeps them after a reload", async () => {
    const { listId } = await openPlanned("task");

    await toggle("B", "Important");
    await expectShown({ B: ["Important"], A: [] });
    await waitForPatches(1);
    await expect.poll(() => stored(listId)).toMatchObject({ B: [true, false], A: [false, false] });

    await toggle("B", "Urgent");
    await expectShown({ B: ["Important", "Urgent"] });
    await waitForPatches(2);
    await expect.poll(() => stored(listId)).toMatchObject({ B: [true, true] });

    await toggle("B", "Urgent");
    await expectShown({ B: ["Important"] });
    await waitForPatches(3);
    await expect.poll(() => stored(listId)).toMatchObject({ B: [true, false] });

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expectShown({ A: [], B: ["Important"] });
  });

  // MARKERS-002 (#18 AC4).
  it("marks a subtask without marking its task, and a task without marking its subtasks, also after a reload", async () => {
    const { listId } = await openPlanned("subtask");
    await expand("A");
    await expectShown({ A: [], s1: [], s2: [] });

    await toggle("s1", "Important");
    await expectShown({ A: [], s1: ["Important"], s2: [] });
    await waitForPatches(1);

    await toggle("A", "Urgent");
    await expectShown({ A: ["Urgent"], s1: ["Important"], s2: [] });
    await waitForPatches(2);
    await expect
      .poll(() => stored(listId))
      .toEqual({
        A: [false, true],
        s1: [true, false],
        s2: [false, false],
        B: [false, false],
      });

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expand("A");
    await expectShown({ A: ["Urgent"], s1: ["Important"], s2: [], B: [] });
  });

  // MARKERS-003 (spec E02, UI/UX "Refused or failed").
  it("puts a marker whose save fails back as it was, with the message in its row", async () => {
    const { listId } = await openPlanned("refused");
    browser.abortRequests("**/api/tasks/**");
    try {
      await toggle("B", "Urgent");
      await browser.waitFor(
        () => rowError("B") === "Could not save “B”. It is back as it was.",
        () => `B's row message (alerts: ${JSON.stringify(browser.alerts())})`,
      );
      await expectShown({ B: [] });
    } finally {
      browser.unroute("**/api/tasks/**");
    }
    expect((await stored(listId)).B).toEqual([false, false]);

    // The next change clears the message and saves.
    await toggle("A", "Important");
    await expectShown({ A: ["Important"] });
    expect(rowError("B")).toBe("");
    await expect.poll(async () => (await stored(listId)).A).toEqual([true, false]);
  });

  // MARKERS-004 (spec E02, UI/UX "One queue per list"; Edge cases "Toggle important, then urgent, quickly").
  it("shows important then urgent at once while the first answer is held back, sends the second only after it, and ends with both", async () => {
    const { listId } = await openPlanned("held");
    const [b] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.listId, listId), eq(schema.tasks.title, "B")));
    // updateTask locks the task row FOR UPDATE, so a transaction holding it holds the answer back.
    const holder = await pool.connect();
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT id FROM tasks WHERE id = $1 FOR UPDATE", [b!.id]);
      const { rows } = await holder.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      const holderPid = rows[0]!.pid;

      await toggle("B", "Important");
      await expectShown({ B: ["Important"] });
      await waitForPatches(1);
      await expect
        .poll(async () => {
          const blocked = await pool.query<{ n: number }>(
            "SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))",
            [holderPid],
          );
          return blocked.rows[0]!.n;
        })
        .toBe(1);

      await toggle("B", "Urgent");
      await expectShown({ B: ["Important", "Urgent"] });
      // One list queue: the second toggle waits for the first answer.
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(patches()).toBe(1);

      await holder.query("COMMIT");
    } finally {
      await holder.query("ROLLBACK").catch(() => undefined);
      holder.release();
    }
    await waitForPatches(2);
    await expect.poll(async () => (await stored(listId)).B).toEqual([true, true]);
    await expectShown({ B: ["Important", "Urgent"] });
  });
});
