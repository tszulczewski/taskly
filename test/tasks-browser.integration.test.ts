import { ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { eq, inArray, like, sql } from "drizzle-orm";
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
  SESSION_COOKIE,
  sessionCookie,
  startApp,
} from "./helpers";

const run = `tasksbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
// Server work between "now" in the test and the write in the app; far below the 1-day renewal step.
const CLOCK_SLACK_MS = 5 * 60 * 1000;

// Amounts as the screen renders them: NBSP (U+00A0) groups thousands and precedes "zł", an en
// dash (U+2013) without spaces joins a range. Compared exactly, so a plain space cannot pass.
const NBSP = "\u00a0";
const shown = (text: string) => text.replaceAll(" ", NBSP).replaceAll("-", "\u2013");

const UP_TO_BELOW_AMOUNT = "“Up to” must not be less than the amount.";
const QUICK_ADD = '[data-slot="quick-add"]';
const field = (name: string) => `${QUICK_ADD} [name="${name}"]`;
const TASKS_API = "**/api/lists/*/tasks";

type Row = { title: string; estimate: string; pending: boolean; description: string | null };
type NewTask = { title: string; amount?: string; upTo?: string; description?: string };

// #15 (E01-S01, ACs as rewritten on 2026-10-28) in the browser against the production build, with
// sign-up closed: the users are made with `createUser` and signed in over HTTP. AC5 (another
// user's list → not found) is an API rule, covered in tasks-http.integration.test.ts.
describe("tasks in the browser (#15, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-tasks-browser");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(160);
  let owner: { id: string; cookie: string; listId: string };

  /** The session row's token: the signed cookie value is `<token>.<signature>`. */
  const tokenOf = (value: string) => decodeURIComponent(value).split(".")[0]!;
  const sessionExpiry = async (token: string) =>
    (await db.select().from(schema.session).where(eq(schema.session.token, token)))[0]?.expiresAt;

  /** The list's top-level tasks in list order, as stored. */
  const storedTasks = (listId: string) =>
    db
      .select({
        title: schema.tasks.title,
        description: schema.tasks.description,
        min: schema.tasks.estimateMinGrosze,
        max: schema.tasks.estimateMaxGrosze,
      })
      .from(schema.tasks)
      .where(eq(schema.tasks.listId, listId))
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

  /** Opens `/` with this session and waits until the list (or its empty state) is ready to use. */
  async function openTasks(user: { cookie: string }) {
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await listReady();
  }

  async function listReady() {
    await browser.waitForHydrated(field("title"));
    await browser.waitFor(
      () => browser.count('[data-slot="task-list"][aria-busy="true"]') === 0,
      () => "the task list to load",
    );
  }

  /** The rows in screen order, with the description of an opened row. */
  const rows = () =>
    browser.evaluate<
      Row[]
    >(`[...document.querySelectorAll('[data-slot="task-row"]')].map((row) => ({
      title: row.querySelector('[data-slot="task-title"]').textContent,
      estimate: row.querySelector('[data-slot="estimate-range"]').textContent,
      pending: row.querySelector("[data-pending]") !== null,
      description: row.querySelector("p.whitespace-pre-line")?.textContent ?? null,
    }))`);
  const row = (title: string) => rows().find((r) => r.title === title);
  const titles = () => rows().map((r) => r.title);
  const fieldValue = (name: string) =>
    browser.evaluate<string>(`document.querySelector(${JSON.stringify(field(name))}).value`);

  /** Fills quick add with real key presses, submits, and waits for the server's row. */
  async function addTask({ title, amount, upTo, description }: NewTask) {
    browser.typeInto(field("title"), title);
    if (amount !== undefined) browser.typeInto(field("amount"), amount);
    if (upTo !== undefined) browser.typeInto(field("upTo"), upTo);
    if (description !== undefined) {
      browser.clickRole("button", "Description");
      await browser.waitFor(
        () => browser.count(field("description")) === 1,
        () => "the description field",
      );
      browser.typeInto(field("description"), description);
    }
    browser.clickRole("button", "Add");
    await browser.waitFor(
      () => row(title)?.pending === false && fieldValue("title") === "",
      () => `the saved row "${title}" (rows: ${JSON.stringify(rows())})`,
    );
  }

  /** Opens a row's "…" menu and picks an item. */
  function rowAction(title: string, item: "Edit" | "Delete") {
    browser.clickRole("button", `More actions for “${title}”`);
    browser.clickRole("menuitem", item);
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3206,
      env: { ALLOW_SIGN_UP: "false" },
    });
    owner = await signIn("owner");
  });

  beforeEach(() => {
    browser.open("about:blank");
    browser.clearCookies();
    browser.unroute(TASKS_API);
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app?.stop();
    // Default lists (and with them memberships and tasks) go with their user through the FKs.
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

  it("runs with sign-up closed", async () => {
    const res = await authRequest(app, "/sign-up/email", {
      forwardedFor: nextIp(),
      body: { name: "Stranger", email: email("intruder"), password },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" });
    expect(
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, email("intruder"))),
    ).toEqual([]);
  });

  it("AC7: quick add shows Title, Amount and up to in one row; the description is behind its toggle", async () => {
    await openTasks(owner);
    const layout = browser.evaluate<
      { name: string; label: string; top: number; height: number }[]
    >(`["title", "amount", "upTo"].map((name) => {
      const input = document.querySelector(${JSON.stringify(QUICK_ADD)} + " [name=" + JSON.stringify(name) + "]");
      const box = input.getBoundingClientRect();
      return { name, label: input.labels[0].textContent.trim(), top: box.top, height: box.height };
    })`);
    expect(layout.map((f) => f.label)).toEqual(["New task", "Amount", "up to (optional)"]);
    for (const f of layout) expect(f.height).toBeGreaterThan(0);
    // One row from 640px (agent-browser's default viewport is wider).
    for (const f of layout) expect(Math.abs(f.top - layout[0]!.top)).toBeLessThan(1);

    const toggle = () =>
      browser.evaluate<string | null>(`(() => {
        const b = [...document.querySelectorAll(${JSON.stringify(`${QUICK_ADD} button`)})].find((e) => e.textContent.trim() === "Description");
        return b ? b.getAttribute("aria-expanded") : null;
      })()`);
    expect(toggle()).toBe("false");
    expect(browser.count(field("description"))).toBe(0);

    browser.clickRole("button", "Description");
    await browser.waitFor(
      () => browser.count(field("description")) === 1,
      () => "the description field",
    );
    expect(toggle()).toBe("true");
    browser.clickRole("button", "Description");
    await browser.waitFor(
      () => browser.count(field("description")) === 0,
      () => "the description to collapse",
    );
  });

  it("AC1: a range with a description shows as 1 500–2 000 zł and the description opens with the row", async () => {
    await openTasks(owner);
    const description = "Grey 30×60 tiles, up to the ceiling.";
    await addTask({ title: "Tile the bathroom wall", amount: "1 500", upTo: "2 000", description });
    expect(row("Tile the bathroom wall")).toEqual({
      title: "Tile the bathroom wall",
      estimate: shown("1 500-2 000 zł"),
      pending: false,
      description: null,
    });
    // Quick add is ready for the next task: fields cleared, toggle collapsed.
    expect([fieldValue("amount"), fieldValue("upTo")]).toEqual(["", ""]);
    expect(browser.count(field("description"))).toBe(0);

    browser.clickRole("button", "Tile the bathroom wall");
    await browser.waitFor(
      () => row("Tile the bathroom wall")?.description === description,
      () => `the description in the opened row (rows: ${JSON.stringify(rows())})`,
    );
    expect((await storedTasks(owner.listId)).at(-1)).toEqual({
      title: "Tile the bathroom wall",
      description,
      min: 150_000,
      max: 200_000,
    });
  });

  it("AC2: 12,50 is stored as 1250 grosze and shown as 12,50 zł", async () => {
    await openTasks(owner);
    await addTask({ title: "Grout", amount: "12,50" });
    expect(row("Grout")?.estimate).toBe(shown("12,50 zł"));
    expect((await storedTasks(owner.listId)).at(-1)).toEqual({
      title: "Grout",
      description: null,
      min: 1_250,
      max: 1_250,
    });
  });

  it("AC3: a task without amounts is saved without an estimate", async () => {
    await openTasks(owner);
    await addTask({ title: "Silicone" });
    expect(row("Silicone")?.estimate).toBe("No estimate");
    expect((await storedTasks(owner.listId)).at(-1)).toEqual({
      title: "Silicone",
      description: null,
      min: null,
      max: null,
    });
  });

  it("AC6: only one amount, in either field, is an exact price shown as one amount", async () => {
    await openTasks(owner);
    await addTask({ title: "Seal the bath", amount: "500" });
    await addTask({ title: "Paint the ceiling", upTo: "500" });
    expect(row("Seal the bath")?.estimate).toBe(shown("500 zł"));
    expect(row("Paint the ceiling")?.estimate).toBe(shown("500 zł"));
    expect((await storedTasks(owner.listId)).slice(-2)).toEqual([
      { title: "Seal the bath", description: null, min: 50_000, max: 50_000 },
      { title: "Paint the ceiling", description: null, min: 50_000, max: 50_000 },
    ]);
  });

  it("AC4: Amount above up to is refused with the message on up to, and nothing is sent", async () => {
    await openTasks(owner);
    const before = await storedTasks(owner.listId);
    const shownBefore = titles();
    browser.clearRequests();

    browser.typeInto(field("title"), "Too cheap");
    browser.typeInto(field("amount"), "2 000");
    browser.typeInto(field("upTo"), "1 500");
    browser.clickRole("button", "Add");
    const fieldError = (name: string) =>
      browser.evaluate<{ invalid: string | null; message: string | null }>(`(() => {
        const input = document.querySelector(${JSON.stringify(field(name))});
        // FormField's message, which it also adds to the input's aria-describedby.
        const error = document.getElementById(input.id + "-error");
        const described = (input.getAttribute("aria-describedby") ?? "").split(" ").includes(error?.id);
        return {
          invalid: input.getAttribute("aria-invalid"),
          message: error && described ? error.textContent : null,
        };
      })()`);
    await browser.waitFor(
      () => fieldError("upTo").message === UP_TO_BELOW_AMOUNT,
      () => `the message under "up to" (${JSON.stringify(fieldError("upTo"))})`,
    );
    expect(fieldError("upTo").invalid).toBe("true");
    expect(fieldError("amount")).toEqual({ invalid: null, message: null });
    // The typed task stays in the form to be corrected.
    expect([fieldValue("title"), fieldValue("amount"), fieldValue("upTo")]).toEqual([
      "Too cheap",
      "2 000",
      "1 500",
    ]);

    const posts = () => browser.requests("/api/lists/").filter((r) => r.method === "POST");
    expect(titles()).toEqual(shownBefore);
    expect(posts()).toEqual([]);
    expect(await storedTasks(owner.listId)).toEqual(before);

    // Corrected, the same form saves; this also shows the request log does capture the POST.
    browser.retypeInto(field("upTo"), "2 500");
    browser.clickRole("button", "Add");
    await browser.waitFor(
      () => row("Too cheap")?.pending === false,
      () => `the corrected row (rows: ${JSON.stringify(rows())})`,
    );
    expect(row("Too cheap")?.estimate).toBe(shown("2 000-2 500 zł"));
    expect(posts()).toHaveLength(1);
    expect(await storedTasks(owner.listId)).toEqual([
      ...before,
      { title: "Too cheap", description: null, min: 200_000, max: 250_000 },
    ]);
  });

  it("keeps added tasks in order after a reload, and edits and deletes them through the UI", async () => {
    const user = await signIn("editor");
    await openTasks(user);
    const added = ["Remove the old tiles", "Fix the door", "Clean up"];
    await addTask({ title: added[0]!, amount: "300", upTo: "400" });
    await addTask({ title: added[1]! });
    await addTask({ title: added[2]!, amount: "80" });
    expect(titles()).toEqual(added);

    browser.reload();
    await listReady();
    expect(rows()).toEqual([
      { title: added[0], estimate: shown("300-400 zł"), pending: false, description: null },
      { title: added[1], estimate: "No estimate", pending: false, description: null },
      { title: added[2], estimate: shown("80 zł"), pending: false, description: null },
    ]);
    expect((await storedTasks(user.listId)).map((t) => t.title)).toEqual(added);

    rowAction("Fix the door", "Edit");
    const editTitle = '[data-slot="task-form"] [name="title"]';
    await browser.waitForHydrated(editTitle);
    browser.retypeInto(editTitle, "Fix the front door");
    browser.clickRole("button", "Save");
    await browser.waitFor(
      () =>
        browser.count('[data-slot="task-form"]') === 0 && row("Fix the front door") !== undefined,
      () => `the renamed row (rows: ${JSON.stringify(rows())})`,
    );

    rowAction("Clean up", "Delete");
    await browser.waitForText("Delete “Clean up”?");
    browser.clickRole("button", "Delete task");
    await browser.waitFor(
      () => row("Clean up") === undefined,
      () => `the deleted row to go (rows: ${JSON.stringify(rows())})`,
    );

    browser.reload();
    await listReady();
    expect(titles()).toEqual(["Remove the old tiles", "Fix the front door"]);
    expect(await storedTasks(user.listId)).toEqual([
      { title: "Remove the old tiles", description: null, min: 30_000, max: 40_000 },
      { title: "Fix the front door", description: null, min: null, max: null },
    ]);
  });

  // Spec E01 step 8, renewal half 2 (half 1, the document request alone, is in tasks-http). The
  // screen's GET is held back at the network until the page has rendered, so the check between
  // the two does not race the screen's first fetch.
  it("renews a session due for renewal through the screen's GET, not the page render", async () => {
    const user = await signIn("renew");
    const token = tokenOf(user.cookie.slice(user.cookie.indexOf("=") + 1));
    // Renewal is due once expiresAt - 30 days + 1 day has passed; 28 days left is 1 day past that.
    const aged = new Date(Date.now() + 28 * DAY_MS);
    await db.update(schema.session).set({ expiresAt: aged }).where(eq(schema.session.token, token));
    const browserCookie = () => browser.cookies().find((c) => c.name === SESSION_COOKIE);

    browser.abortRequests(TASKS_API);
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForText("Could not load your tasks.");
    await browser.waitForHydrated(field("title"));
    expect(await sessionExpiry(token)).toEqual(aged);
    // Still the cookie set above: a session cookie (no expiry), never renewed by the render.
    expect(browserCookie()).toMatchObject({ value: user.cookie.split("=")[1], expires: -1 });

    browser.unroute(TASKS_API);
    browser.clickRole("button", "Try again");
    await browser.waitForText("No tasks yet.");
    const expiresAt = (await sessionExpiry(token))!;
    expect(expiresAt.getTime()).toBeGreaterThan(aged.getTime());
    expect(Math.abs(expiresAt.getTime() - (Date.now() + SESSION_TTL_MS))).toBeLessThan(
      CLOCK_SLACK_MS,
    );
    const renewed = browserCookie()!;
    expect(tokenOf(renewed.value)).toBe(token);
    expect(Math.abs(renewed.expires * 1000 - (Date.now() + SESSION_TTL_MS))).toBeLessThan(
      CLOCK_SLACK_MS,
    );
  });
});
