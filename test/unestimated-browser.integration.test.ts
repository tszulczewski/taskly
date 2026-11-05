import { createTask, ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { like } from "drizzle-orm";
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

const run = `unestimatedbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

// Amounts as the screen renders them: NBSP groups thousands and precedes "zł", an en dash joins a
// range.
const shown = (text: string) => text.replaceAll(" ", "\u00a0").replaceAll("-", "\u2013");
const QUICK_ADD = '[data-slot="quick-add"]';
const SUMMARY = '[data-slot="future-expenses"]';
const ESTIMATE_FORM = `${SUMMARY} form`;
const RULE = "They are not counted in future expenses until they have an estimate.";

// #47 (E03-S03) in the browser against the production build, sign-up closed: the collapsed line
// under future expenses names what has no estimate (AC6, AC8, AC9), and "Add estimate" prices an
// item in place, which leaves the list and joins the total (AC4); focus goes to the total after
// the last one. Which items are listed (AC1–AC3, AC5, AC7) is covered by the core tests.
describe("what has no estimate, in the browser (#47, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-unestimated-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(61);

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
    await browser.waitForHydrated(`${QUICK_ADD} [name="title"]`);
  }

  /** The total as shown, or null while it loads. */
  const total = () =>
    browser.evaluate<string | null>(`(() => {
      const line = document.querySelector('${SUMMARY} [role="status"]');
      return line?.querySelector("span:last-child")?.textContent ?? null;
    })()`);
  async function expectTotal(expected: string) {
    await browser.waitFor(
      () => total() === expected,
      () => `the total ${JSON.stringify(expected)} (shown: ${JSON.stringify(total())})`,
    );
  }

  /** The collapsed line's trigger: its count and whether it is open; null when not shown. */
  const line = () =>
    browser.evaluate<{ text: string; expanded: string | null } | null>(`(() => {
      const trigger = document.querySelector('${SUMMARY} button[aria-expanded]');
      return trigger && { text: trigger.textContent, expanded: trigger.getAttribute("aria-expanded") };
    })()`);
  async function expectLine(text: string | null) {
    await browser.waitFor(
      () => (line()?.text ?? null) === text,
      () => `the line ${JSON.stringify(text)} (shown: ${JSON.stringify(line())})`,
    );
  }
  const items = () =>
    browser.evaluate<string[]>(
      `[...document.querySelectorAll('${SUMMARY} li')].map((e) => e.innerText.replace(/\\s+/g, " ").trim())`,
    );
  const summaryText = () =>
    browser.evaluate<string>(`document.querySelector('${SUMMARY}').innerText`);
  const focused = () =>
    browser.evaluate<string>(`(() => {
      const el = document.activeElement;
      if (el?.matches('${SUMMARY} [role="status"]')) return "total";
      return el?.getAttribute("aria-label") ?? el?.tagName ?? "none";
    })()`);

  async function openLine(count: string) {
    browser.clickRole("button", count);
    await browser.waitForText(RULE);
    await browser.waitForAnimations();
  }

  async function addEstimate(name: string, amount: string, upTo?: string) {
    browser.clickRole("button", name);
    await browser.waitForHydrated(`${ESTIMATE_FORM} [name="amount"]`);
    browser.typeInto(`${ESTIMATE_FORM} [name="amount"]`, amount);
    if (upTo !== undefined) browser.typeInto(`${ESTIMATE_FORM} [name="upTo"]`, upTo);
    browser.click(`${ESTIMATE_FORM} button[type="submit"]`);
    await browser.waitFor(
      () => browser.count(ESTIMATE_FORM) === 0,
      () => `the estimate form for ${name} to close`,
    );
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3210,
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

  it("names what has no estimate, collapsed, and prices each item in place (AC4, AC6, AC9)", async () => {
    const user = await signIn("price");
    const add = (title: string, extra: object = {}) =>
      createTask(db, user.id, user.listId, { title, ...extra });
    await add("Seal the bath");
    await add("Hooks");
    const bathroom = await add("Bathroom tiles");
    await add("Tiles", { parentId: bathroom.id });
    await add("Grout", {
      parentId: bathroom.id,
      estimate: { minGrosze: 40_000, maxGrosze: 40_000 },
    });
    await openTasks(user);
    await expectTotal(shown("400 zł"));

    // Collapsed by default, one line under the total (AC6), counting what is listed (AC9).
    await expectLine("2 tasks and 1 subtask without an estimate");
    expect(line()?.expanded).toBe("false");
    expect(summaryText()).not.toContain(RULE);

    await openLine("2 tasks and 1 subtask without an estimate");
    expect(line()?.expanded).toBe("true");
    expect(items()).toEqual([
      "Seal the bath Add estimate",
      "Hooks Add estimate",
      "Tiles · Bathroom tiles Add estimate",
    ]);

    // An exact price: the item goes, the count drops, the total counts it (AC4, R18).
    await addEstimate("Add estimate for “Hooks”", "300");
    await expectLine("1 task and 1 subtask without an estimate");
    await expectTotal(shown("700 zł"));
    expect(items()).toEqual(["Seal the bath Add estimate", "Tiles · Bathroom tiles Add estimate"]);
    expect(focused()).toBe("Add estimate for “Tiles” in “Bathroom tiles”");

    // A range.
    await addEstimate("Add estimate for “Seal the bath”", "100", "200");
    await expectLine("1 subtask without an estimate");
    await expectTotal(shown("800-900 zł"));

    // The last one: the line goes and focus moves to the total.
    await addEstimate("Add estimate for “Tiles” in “Bathroom tiles”", "500");
    await expectLine(null);
    await expectTotal(shown("1 300-1 400 zł"));
    expect(focused()).toBe("total");

    // The server holds what the screen shows.
    browser.reload();
    await browser.waitForHydrated(`${QUICK_ADD} [name="title"]`);
    await expectTotal(shown("1 300-1 400 zł"));
    expect(line()).toBeNull();
  });

  it("counts subtasks and tasks in the wording and hides the line when nothing is missing (AC8, AC9)", async () => {
    const user = await signIn("wording");
    const walls = await createTask(db, user.id, user.listId, { title: "Walls" });
    for (const title of ["Prime", "Plaster", "Paint"]) {
      await createTask(db, user.id, user.listId, { title, parentId: walls.id });
    }
    await openTasks(user);
    await expectLine("3 subtasks without an estimate");

    // Completing the task lists nothing of it (AC5): nothing open lacks an estimate (AC8).
    browser.clickRole("checkbox", "Complete “Walls”");
    await browser.waitForText("Complete “Walls” and its 3 open subtasks?");
    browser.clickRole("button", "Complete task");
    await expectLine(null);
    expect(summaryText()).toContain("No estimates yet");

    browser.typeInto(`${QUICK_ADD} [name="title"]`, "Lamp");
    browser.clickRole("button", "Add");
    await expectLine("1 task without an estimate");
  });
});
