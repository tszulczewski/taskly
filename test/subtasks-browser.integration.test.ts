import { isDeepStrictEqual } from "node:util";
import { createTask, deleteTask, ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";
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

const run = `subtasksbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

// Amounts as the screen renders them: NBSP (U+00A0) groups thousands and precedes "zł", an en
// dash (U+2013) without spaces joins a range. Compared exactly, so a plain space cannot pass.
const NBSP = "\u00a0";
const shown = (text: string) => text.replaceAll(" ", NBSP).replaceAll("-", "\u2013");

// Roll-up messages (spec E01, Q1), shown in the task's row.
const sumStarted = (title: string) =>
  `The estimate of “${title}” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.`;
const sumBack = (title: string, amount: string) =>
  `The estimate of “${title}” is back to your amount: ${shown(amount)}.`;

// The meta line's subtask progress since E03: "0/2" shown, "0 of 2 subtasks completed" read out.
const progress = (done: number, total: number) =>
  `${done}/${total}${done} of ${total} ${total === 1 ? "subtask" : "subtasks"} completed`;

// Spec E01, UI/UX: a 404 on a save or a subtask add, and the 409 of a task that got subtasks.
const DELETED = "This task was deleted. The list has been refreshed.";
const HAS_SUBTASKS = "A task with subtasks takes its estimate from them";

const QUICK_ADD = '[data-slot="quick-add"]';
const field = (name: string) => `${QUICK_ADD} [name="${name}"]`;
// The "New subtask" form inside a task's row; the quick add above the list has the same fields.
const SUBTASK_ADD = `[data-slot="task-row"] ${QUICK_ADD}`;
const subtaskField = (name: string) => `${SUBTASK_ADD} [name="${name}"]`;
const editForm = (title: string) => `form[aria-label="Edit “${title}”"]`;

type SubtaskState = {
  title: string;
  estimate: string;
  pending: boolean;
  description: string | null;
};
type TaskState = {
  title: string;
  estimate: string;
  /** The meta line under the title: the subtask progress and the count without an estimate. */
  meta: string[];
  /** The row's `role="status"` text: a roll-up message, or "". */
  notice: string;
  expanded: string | null;
  pending: boolean;
  /** The subtasks shown under the task (only while it is expanded). */
  subtasks: SubtaskState[];
};
type NewTask = { title: string; amount?: string; upTo?: string; description?: string };

// #16 (E01-S02, ACs as rewritten on 2026-10-28) in the browser against the production build, with
// sign-up closed: users made with `createUser` and signed in over HTTP, one per test. AC5 (a
// subtask on a task the owner cannot access → not found) is an API rule, covered in
// tasks-http.integration.test.ts and the core integration tests.
describe("subtasks and the roll-up in the browser (#16, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-subtasks-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(180);

  const columns = {
    id: schema.tasks.id,
    parentId: schema.tasks.parentId,
    title: schema.tasks.title,
    description: schema.tasks.description,
    min: schema.tasks.estimateMinGrosze,
    max: schema.tasks.estimateMaxGrosze,
  };
  /** The list's top-level task with this title, as stored: its own (typed) estimate. */
  const storedTask = async (listId: string, title: string) => {
    const found = await db
      .select(columns)
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.listId, listId),
          isNull(schema.tasks.parentId),
          eq(schema.tasks.title, title),
        ),
      );
    expect(found).toHaveLength(1);
    return found[0]!;
  };
  /** A task's subtasks in list order, as stored. */
  const storedSubtasks = (parentId: string) =>
    db
      .select(columns)
      .from(schema.tasks)
      .where(eq(schema.tasks.parentId, parentId))
      .orderBy(sql`${schema.tasks.position} collate "C"`);

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

  async function listReady() {
    await browser.waitForHydrated(field("title"));
    await browser.waitFor(
      () => browser.count('[data-slot="task-list"][aria-busy="true"]') === 0,
      () => "the task list to load",
    );
  }

  /** Signs in a new user and opens `/` with an empty list ready to use. */
  async function openAs(slug: string) {
    const user = await signIn(slug);
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await listReady();
    return user;
  }

  /** The top-level task with this title as the screen shows it; undefined if it is not shown. */
  const task = (title: string) =>
    browser.evaluate<TaskState | null>(`(() => {
      const own = (li) => {
        const title = li.querySelector('[data-slot="task-title"]');
        return { li, title, estimate: li.querySelector('[data-slot="estimate-range"]').textContent };
      };
      const row = [...document.querySelectorAll('li[data-slot="task-row"]')]
        .filter((li) => li.parentElement.closest('li[data-slot="task-row"]') === null)
        .find((li) => own(li).title?.textContent === ${JSON.stringify(title)});
      if (!row) return null;
      const { title, estimate } = own(row);
      const meta = title.parentElement.nextElementSibling;
      const subtaskList = row.querySelector(
        'ul[aria-label=' + JSON.stringify("Subtasks of “" + title.textContent + "”") + ']',
      );
      return {
        title: title.textContent,
        estimate,
        meta: meta ? [...meta.children].map((e) => e.textContent) : [],
        notice: row.querySelector(':scope > div > [role="status"]').textContent,
        expanded: title.getAttribute("aria-expanded"),
        pending: title.closest("[data-pending]") !== null,
        subtasks: subtaskList
          ? [...subtaskList.children].map((li) => ({
              title: own(li).title.textContent,
              estimate: own(li).estimate,
              pending: own(li).title.closest("[data-pending]") !== null,
              description: li.querySelector("p.whitespace-pre-line")?.textContent ?? null,
            }))
          : [],
      };
    })()`) ?? undefined;

  /** Waits until `settled()` and the task's row equal `expected`, then asserts it. */
  async function expectTask(expected: TaskState, settled: () => boolean = () => true) {
    await browser.waitFor(
      () => settled() && isDeepStrictEqual(task(expected.title), expected),
      () =>
        `“${expected.title}” as ${JSON.stringify(expected)} (shown: ${JSON.stringify(task(expected.title))}, alerts: ${JSON.stringify(browser.alerts())})`,
    );
    expect(task(expected.title)).toEqual(expected);
  }

  const fieldValue = (selector: string) =>
    browser.evaluate<string>(`document.querySelector(${JSON.stringify(selector)}).value`);

  /** Fills the quick add above the list with real key presses and waits for the server's row. */
  async function addTask({ title, amount, upTo }: NewTask) {
    browser.typeInto(field("title"), title);
    if (amount !== undefined) browser.typeInto(field("amount"), amount);
    if (upTo !== undefined) browser.typeInto(field("upTo"), upTo);
    browser.clickRole("button", "Add");
    await browser.waitFor(
      () => task(title)?.pending === false && fieldValue(field("title")) === "",
      () => `the saved task "${title}"`,
    );
  }

  /** Opens a row's "…" menu (a task's or a subtask's) and picks an item. */
  function rowAction(title: string, item: "Add subtask" | "Edit" | "Delete") {
    browser.clickRole("button", `More actions for “${title}”`);
    browser.clickRole("menuitem", item);
  }

  /** "…" → "Add subtask": waits for the row's "New subtask" form. */
  async function openSubtaskForm(taskTitle: string) {
    rowAction(taskTitle, "Add subtask");
    await browser.waitFor(
      () => browser.count(subtaskField("title")) === 1,
      () => `the "New subtask" form of "${taskTitle}"`,
    );
  }

  /** Fills the open "New subtask" form with real key presses and submits it. */
  async function fillSubtask({ title, amount, upTo, description }: NewTask) {
    browser.typeInto(subtaskField("title"), title);
    if (amount !== undefined) browser.typeInto(subtaskField("amount"), amount);
    if (upTo !== undefined) browser.typeInto(subtaskField("upTo"), upTo);
    if (description !== undefined) {
      // The form's "Description" toggle, not the one of the quick add above the list.
      browser.click(`${SUBTASK_ADD} button[aria-expanded]`);
      await browser.waitFor(
        () => browser.count(subtaskField("description")) === 1,
        () => "the subtask's description field",
      );
      browser.typeInto(subtaskField("description"), description);
    }
    browser.click(`${SUBTASK_ADD} button[type="submit"]`);
  }

  /** Adds a subtask through its task's menu; settled once the form has closed after the answer. */
  async function addSubtask(taskTitle: string, subtask: NewTask) {
    await openSubtaskForm(taskTitle);
    await fillSubtask(subtask);
  }
  const subtaskFormClosed = () => browser.count(SUBTASK_ADD) === 0;

  /** "…" → "Delete" on a row, confirms the named dialog; settled once the dialog has closed. */
  async function deleteRow(title: string, question: string) {
    rowAction(title, "Delete");
    await browser.waitForText(question);
    browser.clickRole("button", "Delete task");
  }
  const dialogClosed = () => browser.count('[role="alertdialog"]') === 0;
  const formClosed = () => browser.count('[data-slot="task-form"]') === 0;

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3207,
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
    // Default lists (and with them memberships, tasks and subtasks) go with their user.
    const users = await db
      .delete(schema.user)
      .where(like(schema.user.email, `${run}-%`))
      .returning({ id: schema.user.id });
    if (users.length > 0) {
      const ids = users.map((u) => u.id);
      expect(
        await db.select().from(schema.lists).where(inArray(schema.lists.defaultForUserId, ids)),
      ).toEqual([]);
      expect(
        await db.select().from(schema.session).where(inArray(schema.session.userId, ids)),
      ).toEqual([]);
    }
    await pool.end();
    await closeUserDb();
  });

  it("AC1: a subtask with a description and an estimate appears under its task", async () => {
    const user = await openAs("ac1");
    await addTask({ title: "Bathroom floor" });
    await expectTask({
      title: "Bathroom floor",
      estimate: "No estimate",
      meta: [],
      notice: "",
      expanded: "false",
      pending: false,
      subtasks: [],
    });

    await openSubtaskForm("Bathroom floor");
    // The row opened with the form, and focus is in its "New subtask" field.
    expect(
      browser.evaluate<{ label: string; focused: boolean }>(`(() => {
        const input = document.querySelector(${JSON.stringify(subtaskField("title"))});
        return { label: input.labels[0].textContent.trim(), focused: document.activeElement === input };
      })()`),
    ).toEqual({ label: "New subtask", focused: true });
    expect(task("Bathroom floor")?.expanded).toBe("true");

    const description = "Two coats of primer, wait 4 h between.";
    await fillSubtask({ title: "Prime the floor", amount: "300", upTo: "400", description });
    await expectTask(
      {
        title: "Bathroom floor",
        estimate: shown("300-400 zł"),
        meta: [progress(0, 1)],
        notice: "",
        expanded: "true",
        pending: false,
        subtasks: [
          {
            title: "Prime the floor",
            estimate: shown("300-400 zł"),
            pending: false,
            description: null,
          },
        ],
      },
      subtaskFormClosed,
    );
    // The form closed after the add; focus waits on the row's "Add subtask" for the next one.
    expect(
      browser.evaluate<{ text: string; row: string }>(`(() => {
        const el = document.activeElement;
        return {
          text: el.textContent.trim(),
          row: el.closest('li[data-slot="task-row"]').querySelector('[data-slot="task-title"]').textContent,
        };
      })()`),
    ).toEqual({ text: "Add subtask", row: "Bathroom floor" });
    // The quick add above the list was not touched.
    expect(fieldValue(field("title"))).toBe("");

    // The subtask's description opens with its own row.
    browser.clickRole("button", "Prime the floor");
    await browser.waitFor(
      () => task("Bathroom floor")?.subtasks[0]?.description === description,
      () => `the subtask's description (shown: ${JSON.stringify(task("Bathroom floor"))})`,
    );

    const parent = await storedTask(user.listId, "Bathroom floor");
    expect(parent).toMatchObject({ parentId: null, min: null, max: null });
    expect(await storedSubtasks(parent.id)).toEqual([
      {
        id: expect.any(String),
        parentId: parent.id,
        title: "Prime the floor",
        description,
        min: 30_000,
        max: 40_000,
      },
    ]);
  });

  it("AC2: subtasks 300–400 and 500 make a 1 000–2 000 task 800–900 zł; deleting both brings 1 000–2 000 zł back", async () => {
    const user = await openAs("ac2");
    await addTask({ title: "Tile the bathroom", amount: "1 000", upTo: "2 000" });
    const own = await storedTask(user.listId, "Tile the bathroom");
    expect(own).toMatchObject({ min: 100_000, max: 200_000 });
    const tile = {
      title: "Tile the bathroom",
      pending: false,
      expanded: "true",
    };
    const prime = {
      title: "Prime the walls",
      estimate: shown("300-400 zł"),
      pending: false,
      description: null,
    };
    const grout = { title: "Grout", estimate: shown("500 zł"), pending: false, description: null };

    await addSubtask("Tile the bathroom", { title: "Prime the walls", amount: "300", upTo: "400" });
    await expectTask(
      {
        ...tile,
        estimate: shown("300-400 zł"),
        meta: [progress(0, 1)],
        notice: sumStarted("Tile the bathroom"),
        subtasks: [prime],
      },
      subtaskFormClosed,
    );

    await addSubtask("Tile the bathroom", { title: "Grout", amount: "500" });
    await expectTask(
      {
        ...tile,
        estimate: shown("800-900 zł"),
        meta: [progress(0, 2)],
        notice: "",
        subtasks: [prime, grout],
      },
      subtaskFormClosed,
    );
    // The typed figure is kept, untouched, under the sum (R15).
    expect(await storedTask(user.listId, "Tile the bathroom")).toEqual(own);
    expect(await storedSubtasks(own.id)).toEqual([
      {
        ...own,
        id: expect.any(String),
        parentId: own.id,
        title: "Prime the walls",
        min: 30_000,
        max: 40_000,
      },
      {
        ...own,
        id: expect.any(String),
        parentId: own.id,
        title: "Grout",
        min: 50_000,
        max: 50_000,
      },
    ]);

    await deleteRow("Grout", "Delete “Grout”?");
    await expectTask(
      {
        ...tile,
        estimate: shown("300-400 zł"),
        meta: [progress(0, 1)],
        notice: "",
        subtasks: [prime],
      },
      dialogClosed,
    );

    await deleteRow("Prime the walls", "Delete “Prime the walls”?");
    await expectTask(
      {
        ...tile,
        estimate: shown("1 000-2 000 zł"),
        meta: [],
        notice: sumBack("Tile the bathroom", "1 000-2 000 zł"),
        subtasks: [],
      },
      dialogClosed,
    );
    expect(await storedTask(user.listId, "Tile the bathroom")).toEqual(own);
    expect(await storedSubtasks(own.id)).toEqual([]);

    // The figure is the server's, not the screen's: a reload shows the same (without the message).
    browser.reload();
    await listReady();
    await expectTask({
      ...tile,
      estimate: shown("1 000-2 000 zł"),
      meta: [],
      notice: "",
      expanded: "false",
      subtasks: [],
    });
  });

  it("AC3: a subtask without an estimate is left out of the sum and counted; all without → No estimate", async () => {
    const user = await openAs("ac3");
    await addTask({ title: "Paint the hallway" });
    const hallway = { title: "Paint the hallway", pending: false, expanded: "true", notice: "" };
    const buyPaint = {
      title: "Buy paint",
      estimate: "No estimate",
      pending: false,
      description: null,
    };

    // A task that never had its own figure: no message, ever.
    await addSubtask("Paint the hallway", { title: "Buy paint" });
    await expectTask(
      {
        ...hallway,
        estimate: "No estimate",
        meta: [progress(0, 1), "1 subtask without an estimate"],
        subtasks: [buyPaint],
      },
      subtaskFormClosed,
    );

    await addSubtask("Paint the hallway", { title: "Paint the walls", amount: "600", upTo: "800" });
    await expectTask(
      {
        ...hallway,
        estimate: shown("600-800 zł"),
        meta: [progress(0, 2), "1 subtask without an estimate"],
        subtasks: [
          buyPaint,
          {
            title: "Paint the walls",
            estimate: shown("600-800 zł"),
            pending: false,
            description: null,
          },
        ],
      },
      subtaskFormClosed,
    );

    await deleteRow("Paint the walls", "Delete “Paint the walls”?");
    await expectTask(
      {
        ...hallway,
        estimate: "No estimate",
        meta: [progress(0, 1), "1 subtask without an estimate"],
        subtasks: [buyPaint],
      },
      dialogClosed,
    );

    await addSubtask("Paint the hallway", { title: "Buy tape" });
    await expectTask(
      {
        ...hallway,
        estimate: "No estimate",
        meta: [progress(0, 2), "2 subtasks without an estimate"],
        subtasks: [buyPaint, { ...buyPaint, title: "Buy tape" }],
      },
      subtaskFormClosed,
    );
    const stored = await storedTask(user.listId, "Paint the hallway");
    expect(stored).toMatchObject({ min: null, max: null });
    expect(
      (await storedSubtasks(stored.id)).map(({ title, min, max }) => ({ title, min, max })),
    ).toEqual([
      { title: "Buy paint", min: null, max: null },
      { title: "Buy tape", min: null, max: null },
    ]);

    // A typed figure is hidden by subtasks without an estimate too: "No estimate", and it is kept.
    await addTask({ title: "Fix the skirting", amount: "700" });
    const skirting = await storedTask(user.listId, "Fix the skirting");
    await addSubtask("Fix the skirting", { title: "Buy skirting boards" });
    await expectTask(
      {
        title: "Fix the skirting",
        estimate: "No estimate",
        meta: [progress(0, 1), "1 subtask without an estimate"],
        notice: sumStarted("Fix the skirting"),
        expanded: "true",
        pending: false,
        subtasks: [{ ...buyPaint, title: "Buy skirting boards" }],
      },
      subtaskFormClosed,
    );
    expect(skirting).toMatchObject({ min: 70_000, max: 70_000 });
    expect(await storedTask(user.listId, "Fix the skirting")).toEqual(skirting);
  });

  it("AC4: editing a subtask's estimate changes the task's figure, and the task's edit form has no amount fields", async () => {
    const user = await openAs("ac4");
    await addTask({ title: "Kitchen", amount: "2 000" });
    const own = await storedTask(user.listId, "Kitchen");
    expect(own).toMatchObject({ min: 200_000, max: 200_000 });
    await addSubtask("Kitchen", { title: "Cabinets", amount: "1 000", upTo: "1 500" });
    await addSubtask("Kitchen", { title: "Sink", amount: "400" });
    const cabinets = {
      title: "Cabinets",
      estimate: shown("1 000-1 500 zł"),
      pending: false,
      description: null,
    };
    const kitchen = {
      title: "Kitchen",
      meta: [progress(0, 2)],
      notice: "",
      expanded: "true",
      pending: false,
    };
    await expectTask(
      {
        ...kitchen,
        estimate: shown("1 400-1 900 zł"),
        subtasks: [cabinets, { ...cabinets, title: "Sink", estimate: shown("400 zł") }],
      },
      subtaskFormClosed,
    );

    // A subtask's menu has the task actions except "Add subtask" (one level only).
    browser.clickRole("button", "More actions for “Sink”");
    await browser.waitFor(
      () => browser.count('[role="menuitem"]') > 0,
      () => "the subtask's menu",
    );
    expect(
      browser.evaluate<string[]>(
        `[...document.querySelectorAll('[role="menuitem"]')].map((e) => e.textContent.trim())`,
      ),
    ).toEqual(["Edit", "Places…", "Delete"]);
    browser.clickRole("menuitem", "Edit");

    // An exact price opens in "Amount" only; filling "up to" makes it a range.
    await browser.waitForHydrated(`${editForm("Sink")} [name="upTo"]`);
    expect([
      fieldValue(`${editForm("Sink")} [name="amount"]`),
      fieldValue(`${editForm("Sink")} [name="upTo"]`),
    ]).toEqual(["400", ""]);
    browser.typeInto(`${editForm("Sink")} [name="upTo"]`, "600");
    browser.clickRole("button", "Save");
    await expectTask(
      {
        ...kitchen,
        estimate: shown("1 400-2 100 zł"),
        subtasks: [cabinets, { ...cabinets, title: "Sink", estimate: shown("400-600 zł") }],
      },
      formClosed,
    );
    const [, sink] = await storedSubtasks(own.id);
    expect(sink).toMatchObject({ title: "Sink", min: 40_000, max: 60_000 });
    expect(await storedTask(user.listId, "Kitchen")).toEqual(own);

    // The task's own form: the read-only sum in place of the amount fields (R12).
    rowAction("Kitchen", "Edit");
    await browser.waitForHydrated(`${editForm("Kitchen")} [name="title"]`);
    expect(browser.count(`${editForm("Kitchen")} input`)).toBe(1);
    expect(
      browser.count(`${editForm("Kitchen")} [name="amount"], ${editForm("Kitchen")} [name="upTo"]`),
    ).toBe(0);
    expect(
      browser.evaluate<string>(
        `document.querySelector(${JSON.stringify(`${editForm("Kitchen")} [data-slot="summed-estimate"]`)}).textContent`,
      ),
    ).toBe(`Sum of subtasks:${shown("1 400-2 100 zł")}Change the amounts on the subtasks.`);

    // Saving a new title sends one PATCH that the server accepts: no estimate goes with it.
    browser.clearRequests();
    browser.retypeInto(`${editForm("Kitchen")} [name="title"]`, "Kitchen units");
    browser.clickRole("button", "Save");
    await expectTask(
      {
        ...kitchen,
        title: "Kitchen units",
        estimate: shown("1 400-2 100 zł"),
        subtasks: [cabinets, { ...cabinets, title: "Sink", estimate: shown("400-600 zł") }],
      },
      formClosed,
    );
    expect(browser.requests("/api/tasks/").filter((r) => r.method === "PATCH")).toHaveLength(1);
    expect(await storedTask(user.listId, "Kitchen units")).toEqual({
      ...own,
      title: "Kitchen units",
    });

    // Deleting the task names its subtasks and takes them with it.
    await deleteRow("Kitchen units", "Delete “Kitchen units” and its 2 subtasks?");
    await browser.waitFor(
      () => dialogClosed() && task("Kitchen units") === undefined,
      () => "the task to go",
    );
    expect(
      await db.select(columns).from(schema.tasks).where(eq(schema.tasks.listId, user.listId)),
    ).toEqual([]);
  });

  // SUBTASKS-001 (spec E01, Edge Cases "Parent deleted while a subtask is being added").
  it("drops the task with the deleted notice when a subtask is added to a task deleted in another tab", async () => {
    const user = await openAs("gone-parent");
    await addTask({ title: "Fix the door" });
    await addTask({ title: "Walls" });
    const walls = await storedTask(user.listId, "Walls");

    await openSubtaskForm("Walls");
    await deleteTask(db, user.id, walls.id);
    await fillSubtask({ title: "Plaster", amount: "200" });

    await browser.waitFor(
      () => task("Walls") === undefined && subtaskFormClosed(),
      () => `“Walls” to go (alerts: ${JSON.stringify(browser.alerts())})`,
    );
    expect(browser.alerts()).toContain(DELETED);
    expect(
      browser.evaluate<string | null>(`document.activeElement?.getAttribute("data-slot") ?? null`),
    ).toBe("task-list");
    expect(task("Fix the door")).toBeDefined();
    expect(
      (
        await db
          .select({ title: schema.tasks.title })
          .from(schema.tasks)
          .where(eq(schema.tasks.listId, user.listId))
      ).map((t) => t.title),
    ).toEqual(["Fix the door"]);
  });

  // SUBTASKS-002 (spec E01, UI/UX "409 on an edit save", and the Edge Case of an estimate and a
  // title changed together while the task got a subtask in another tab).
  it("refuses an estimate save with the server's message when the task got a subtask in another tab, and saving again saves only the title", async () => {
    const user = await openAs("edit-409");
    await addTask({ title: "Shelf", amount: "200" });
    const own = await storedTask(user.listId, "Shelf");
    const form = editForm("Shelf");

    rowAction("Shelf", "Edit");
    await browser.waitForHydrated(`${form} [name="amount"]`);
    await createTask(db, user.id, user.listId, {
      title: "Brackets",
      parentId: own.id,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    });
    browser.retypeInto(`${form} [name="title"]`, "Wall shelf");
    browser.retypeInto(`${form} [name="amount"]`, "500");
    browser.clickRole("button", "Save");

    // The message stays, the typed title too, and the amounts give way to the read-only sum.
    await browser.waitFor(
      () =>
        browser.alerts().includes(HAS_SUBTASKS) &&
        browser.count(`${form} [name="amount"], ${form} [name="upTo"]`) === 0,
      () => `the 409 message and the sum (alerts: ${JSON.stringify(browser.alerts())})`,
    );
    expect(fieldValue(`${form} [name="title"]`)).toBe("Wall shelf");
    expect(
      browser.evaluate<string>(
        `document.querySelector(${JSON.stringify(`${form} [data-slot="summed-estimate"]`)}).textContent`,
      ),
    ).toBe(`Sum of subtasks:${shown("300-400 zł")}Change the amounts on the subtasks.`);
    expect(await storedTask(user.listId, "Shelf")).toEqual(own);

    browser.clickRole("button", "Save");
    await browser.waitFor(
      () => formClosed() && task("Wall shelf")?.estimate === shown("300-400 zł"),
      () => `the renamed task (shown: ${JSON.stringify(task("Wall shelf"))})`,
    );
    // The title is saved; the typed 200 zł is kept under the sum, never the refused 500 zł.
    expect(await storedTask(user.listId, "Wall shelf")).toEqual({ ...own, title: "Wall shelf" });
  });
});
