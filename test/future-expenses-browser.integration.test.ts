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

const run = `expensesbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

// Amounts as the screen renders them: NBSP groups thousands and precedes "zł", an en dash joins a
// range. Compared exactly, so a plain space cannot pass.
const shown = (text: string) => text.replaceAll(" ", " ").replaceAll("-", "–");
const QUICK_ADD = '[data-slot="quick-add"]';
const field = (name: string) => `${QUICK_ADD} [name="${name}"]`;
const EDIT_FORM = '[data-slot="task-form"]';
const NO_TOTAL = "No estimates yet";

// #21 (E03-S02) in the browser against the production build, sign-up closed: the total under the
// list's name follows add, edit, delete, complete and reopen (AC1, AC3–AC7, #20 AC7), and counts a
// task with subtasks once with their sum (AC2). The rule itself is covered by the core tests.
describe("future expenses in the browser (#21, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-expenses-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
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

  async function openTasks(user: { cookie: string }) {
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForHydrated(field("title"));
  }

  /** The total as shown: the amount, "No estimates yet", or null while it loads. */
  const total = () =>
    browser.evaluate<string | null>(`(() => {
      const line = document.querySelector('[data-slot="future-expenses"] [role="status"]');
      return line?.querySelector("span:last-child")?.textContent ?? null;
    })()`);
  async function expectTotal(expected: string) {
    await browser.waitFor(
      () => total() === expected,
      () => `the total ${JSON.stringify(expected)} (shown: ${JSON.stringify(total())})`,
    );
  }
  const rowTitles = () =>
    browser.evaluate<string[]>(
      `[...document.querySelectorAll('[data-slot="task-row"] [data-slot="task-title"]')].map((e) => e.textContent)`,
    );

  async function addTask(title: string, amount?: string, upTo?: string) {
    browser.typeInto(field("title"), title);
    if (amount !== undefined) browser.typeInto(field("amount"), amount);
    if (upTo !== undefined) browser.typeInto(field("upTo"), upTo);
    browser.clickRole("button", "Add");
    await browser.waitFor(
      () =>
        rowTitles().includes(title) &&
        browser.count(`[data-slot="task-row"] [data-pending]`) === 0 &&
        browser.evaluate<string>(
          `document.querySelector(${JSON.stringify(field("title"))}).value`,
        ) === "",
      () => `the saved row "${title}"`,
    );
  }

  function rowAction(title: string, item: "Edit" | "Delete") {
    browser.clickRole("button", `More actions for “${title}”`);
    browser.clickRole("menuitem", item);
  }
  const toggle = (title: string) => browser.clickRole("checkbox", `Complete “${title}”`);

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3209,
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

  it("follows add, edit, delete, complete and reopen (AC1, AC3–AC7, #20 AC7)", async () => {
    await openTasks(await signIn("follow"));
    await expectTotal(NO_TOTAL);
    // Under the heading, above quick add (decision I1), and labelled "Future expenses" (D18).
    expect(
      browser.evaluate<boolean>(`(() => {
        const summary = document.querySelector('[data-slot="future-expenses"]');
        const heading = document.querySelector("h1");
        const quickAdd = document.querySelector(${JSON.stringify(QUICK_ADD)});
        return summary.textContent.startsWith("Future expenses") &&
          !!(heading.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          !!(summary.compareDocumentPosition(quickAdd) & Node.DOCUMENT_POSITION_FOLLOWING);
      })()`),
    ).toBe(true);

    await addTask("Tiles", "1000", "2000");
    await expectTotal(shown("1 000-2 000 zł"));
    await addTask("Paint", "500", "700");
    await expectTotal(shown("1 500-2 700 zł"));
    // No estimate: left out (AC3).
    await addTask("Lamp");
    await addTask("Hooks", "300");
    await expectTotal(shown("1 800-3 000 zł"));

    rowAction("Paint", "Edit");
    await browser.waitForHydrated(`${EDIT_FORM} [name="upTo"]`);
    browser.retypeInto(`${EDIT_FORM} [name="upTo"]`, "900");
    browser.clickRole("button", "Save");
    await expectTotal(shown("1 800-3 200 zł"));

    rowAction("Hooks", "Delete");
    await browser.waitForText("Delete “Hooks”?");
    browser.clickRole("button", "Delete task");
    await expectTotal(shown("1 500-2 900 zł"));

    toggle("Paint");
    await expectTotal(shown("1 000-2 000 zł"));
    toggle("Tiles");
    await expectTotal(NO_TOTAL);
    toggle("Tiles");
    await expectTotal(shown("1 000-2 000 zł"));

    // The only summary of version 1 (D18, D19): nothing spent or incurred.
    const text = browser.evaluate<string>("document.body.innerText.toLowerCase()");
    expect(text).not.toMatch(/spent|incurred/);

    // The server holds what the screen shows.
    browser.reload();
    await browser.waitForHydrated(field("title"));
    await expectTotal(shown("1 000-2 000 zł"));
  });

  it("counts a task with subtasks once with their sum; a completed subtask still counts (AC2, AC7, R14)", async () => {
    const user = await signIn("sum");
    const bathroom = await createTask(db, user.id, user.listId, {
      title: "Bathroom",
      estimate: { minGrosze: 100_000, maxGrosze: 200_000 },
    });
    for (const [title, minGrosze, maxGrosze] of [
      ["Plaster", 30_000, 40_000],
      ["Grout", 50_000, 50_000],
    ] as const) {
      await createTask(db, user.id, user.listId, {
        title,
        parentId: bathroom.id,
        estimate: { minGrosze, maxGrosze },
      });
    }
    await createTask(db, user.id, user.listId, {
      title: "Rod",
      estimate: { minGrosze: 50_000, maxGrosze: 50_000 },
    });
    await openTasks(user);
    await expectTotal(shown("1 300-1 400 zł"));

    browser.clickRole("button", "Bathroom");
    await browser.waitForText("Grout");
    toggle("Grout");
    await expect
      .poll(async () => {
        const [grout] = await db
          .select({ status: schema.tasks.status })
          .from(schema.tasks)
          .where(and(eq(schema.tasks.listId, user.listId), eq(schema.tasks.title, "Grout")));
        return grout?.status;
      })
      .toBe("done");
    await expectTotal(shown("1 300-1 400 zł"));
    browser.reload();
    await browser.waitForHydrated(field("title"));
    await expectTotal(shown("1 300-1 400 zł"));
  });
});
