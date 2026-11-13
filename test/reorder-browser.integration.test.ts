import { createTask, ensureDefaultList, moveTask, setTaskCompleted } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { and, eq, isNull, like } from "drizzle-orm";
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

const run = `reorderbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

// #17 (E02-S01) in the browser against the production build, sign-up closed: a keyboard move on
// the handle kept after a reload, a subtask moved within its task, "Move up / Move down" with
// focus staying on the row, no handle or move items on a completed row, and a stale move refused
// by the server and put back with the row's message. AC7's long press and pointer drag are covered by
// the design system's interaction stories and a manual check (run log).
describe("reordering tasks in the browser (#17, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-reorder-browser");
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

  type Ids = Record<string, string>;

  /** Tasks A (with subtasks s1, s2), B and C, in that order; then `/` opened, signed in. */
  async function openPlanned(
    slug: string,
    before?: (user: { id: string }, ids: Ids) => Promise<void>,
  ) {
    const user = await signIn(slug);
    const ids: Ids = {};
    const add = async (title: string, parentId?: string) => {
      ids[title] = (await createTask(db, user.id, user.listId, { title, parentId })).id;
    };
    await add("A");
    await add("s1", ids.A);
    await add("s2", ids.A);
    await add("B");
    await add("C");
    await before?.(user, ids);
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForHydrated('[role="checkbox"]');
    return { ...user, ids };
  }

  /** The titles of a group's rows, in the order shown. */
  const shown = (list: string) =>
    browser.evaluate<string[]>(
      `[...document.querySelectorAll(${JSON.stringify(`ul[aria-label="${list}"] > li`)})].map((li) => li.querySelector('[data-slot="task-title"]').textContent)`,
    );
  async function expectShown(list: string, titles: string[]) {
    await browser.waitFor(
      () => JSON.stringify(shown(list)) === JSON.stringify(titles),
      () => `${list}: ${JSON.stringify(titles)} (shown: ${JSON.stringify(shown(list))})`,
    );
  }

  /** The stored order of the list's tasks, or of one task's subtasks, by key as `COLLATE "C"`. */
  const stored = async (listId: string, parentId: string | null = null) => {
    const rows = await db
      .select({ title: schema.tasks.title, position: schema.tasks.position })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.listId, listId),
          parentId === null ? isNull(schema.tasks.parentId) : eq(schema.tasks.parentId, parentId),
        ),
      );
    return rows.sort((a, b) => (a.position < b.position ? -1 : 1)).map((row) => row.title);
  };

  const handles = () => browser.count('button[aria-label^="Move “"]');
  const menuItems = () =>
    browser.evaluate<string[]>(
      `[...document.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent)`,
    );

  async function openMenu(title: string) {
    await browser.waitForAnimations();
    browser.clickRole("button", `More actions for “${title}”`);
    await browser.waitFor(
      () => browser.count('[role="menu"]') === 1,
      () => `the menu of ${title} to open`,
    );
  }

  async function expand(title: string) {
    await browser.waitForAnimations();
    browser.clickRole("button", title);
    await browser.waitForAnimations();
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3214,
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
    // Lists and tasks go with their user.
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  // REORDER-001 (#17 AC1, AC2, AC7 by keyboard).
  it("moves a task with the keyboard on its handle and keeps the order after a reload", async () => {
    const user = await openPlanned("keyboard");
    await expectShown("Tasks", ["A", "B", "C"]);

    browser.focus('button[aria-label="Move “A”"]');
    browser.press("Space");
    await browser.waitForAnimations();
    browser.press("ArrowDown");
    await browser.waitForAnimations();
    browser.press("Space");

    await expectShown("Tasks", ["B", "A", "C"]);
    await expect.poll(() => stored(user.listId)).toEqual(["B", "A", "C"]);
    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expectShown("Tasks", ["B", "A", "C"]);
  });

  // REORDER-002 (#17 AC4, AC6).
  it("moves a subtask within its task and a task from the menu, focus staying on the row", async () => {
    const user = await openPlanned("menu");
    await expand("A");
    await expectShown("Subtasks of “A”", ["s1", "s2"]);

    await openMenu("s2");
    browser.clickRole("menuitem", "Move up");
    await expectShown("Subtasks of “A”", ["s2", "s1"]);
    await expect.poll(() => stored(user.listId, user.ids.A!)).toEqual(["s2", "s1"]);
    expect(await stored(user.listId)).toEqual(["A", "B", "C"]);

    await openMenu("C");
    browser.clickRole("menuitem", "Move up");
    await expectShown("Tasks", ["A", "C", "B"]);
    await browser.waitFor(
      () =>
        browser.evaluate<string | null>(`document.activeElement?.getAttribute("aria-label")`) ===
        "More actions for “C”",
      () => "focus on the moved row's “…”",
    );
    await expect.poll(() => stored(user.listId)).toEqual(["A", "C", "B"]);

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expand("A");
    await expectShown("Tasks", ["A", "C", "B"]);
    await expectShown("Subtasks of “A”", ["s2", "s1"]);
  });

  // REORDER-003 (#17 AC8).
  it("shows no handle and no move items on a completed row", async () => {
    await openPlanned("completed", async ({ id }, ids) => {
      await setTaskCompleted(db, id, ids.B!, { completed: true });
    });
    await expectShown("Tasks", ["A", "C", "B"]);
    expect(handles()).toBe(2);
    expect(browser.count('button[aria-label="Move “B”"]')).toBe(0);

    await openMenu("B");
    expect(menuItems().filter((item) => item.startsWith("Move"))).toEqual([]);
  });

  // REORDER-004 (#17 AC3, spec M-1 and s04.24).
  it("puts a stale move back with the row's message when the order changed elsewhere", async () => {
    const user = await openPlanned("stale");
    await expectShown("Tasks", ["A", "B", "C"]);
    // Another tab moves C between A and B; this page still shows A, B, C.
    await moveTask(db, user.id, user.ids.C!, { afterId: user.ids.A!, beforeId: user.ids.B! });

    await openMenu("A");
    browser.clickRole("menuitem", "Move down");

    await browser.waitFor(
      () => browser.alerts().includes("Could not move “A”. It is back where it was."),
      () => `the move message (alerts: ${JSON.stringify(browser.alerts())})`,
    );
    await expectShown("Tasks", ["A", "C", "B"]);
    expect(await stored(user.listId)).toEqual(["A", "C", "B"]);
  });
});
