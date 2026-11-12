import { createPlace, createTask, ensureDefaultList, listPlaces } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { asc, eq, like } from "drizzle-orm";
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

const run = `placesbrowser${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const PREDEFINED = [
  "Salon",
  "Sypialnia",
  "Łazienka",
  "Kuchnia",
  "Garaż",
  "Ogródek",
  "Strych",
  "Biuro",
];
const NAME_FIELD = '[data-slot="place-picker"] input[name="name"]';

// #19 (E02-S03) in the browser against the production build, sign-up closed: the eight places on
// first use, ticking and unticking (also a new place), the duplicate-name message, rename,
// recolour and delete seen on the rows, a subtask's own places, the limit of 20, and the places
// failing to load while the list keeps working (P-1).
describe("assigning tasks to places in the browser (#19, sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-places-browser");
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

  /** Tasks A (with subtask s1) and B; then `/` opened, signed in. */
  async function openPlanned(
    slug: string,
    before?: (user: { id: string; listId: string }) => Promise<void>,
  ) {
    const user = await signIn(slug);
    const a = await createTask(db, user.id, user.listId, { title: "A" });
    await createTask(db, user.id, user.listId, { title: "s1", parentId: a.id });
    await createTask(db, user.id, user.listId, { title: "B" });
    await before?.(user);
    browser.setSessionCookie(user.cookie, app.url);
    browser.open(`${app.url}/`);
    await browser.waitForHydrated('[role="checkbox"]');
    return user;
  }

  /** Each row's own place names, by title (subtasks included once shown). */
  const tags = () =>
    browser.evaluate<Record<string, string[]>>(`(() => {
      const rows = [...document.querySelectorAll('[data-slot="task-row"]')];
      return Object.fromEntries(rows.map((row) => [
        row.querySelector('[data-slot="task-title"]').textContent,
        [...row.querySelectorAll('[data-slot="place-tag"]')]
          .filter((tag) => tag.closest('[data-slot="task-row"]') === row)
          .map((tag) => tag.textContent),
      ]));
    })()`);
  async function expectTags(expected: Record<string, string[]>) {
    await browser.waitFor(
      () => {
        const now = tags();
        return Object.entries(expected).every(
          ([title, names]) => JSON.stringify(now[title]) === JSON.stringify(names),
        );
      },
      () => `places ${JSON.stringify(expected)} (shown: ${JSON.stringify(tags())})`,
    );
  }

  /** The names in the open picker's list, in order. */
  const pickerNames = () =>
    browser.evaluate<string[]>(
      `[...document.querySelectorAll('[data-slot="place-picker"] [data-slot="place-tag"]')].map((t) => t.textContent)`,
    );
  const pickerText = () =>
    browser.evaluate<string>(
      `document.querySelector('[data-slot="place-picker"]')?.textContent ?? ""`,
    );
  async function waitForPickerText(text: string) {
    await browser.waitFor(
      () => pickerText().includes(text),
      () => `"${text}" in the picker (shown: ${pickerText()})`,
    );
  }

  async function openPlaces(title: string) {
    await browser.waitForAnimations();
    browser.clickRole("button", `More actions for “${title}”`);
    browser.clickRole("menuitem", "Places…");
    await browser.waitFor(
      () => browser.count('[data-slot="place-picker"]') === 1,
      () => "the place picker to open",
    );
  }

  async function closePlaces() {
    browser.click("h1");
    await browser.waitFor(
      () => browser.count('[data-slot="place-picker"]') === 0,
      () => "the place picker to close",
    );
  }

  async function expand(title: string) {
    await browser.waitForAnimations();
    browser.clickRole("button", title);
    await browser.waitForAnimations();
  }

  /** The user's places as stored, in their order. */
  const storedPlaces = async (userId: string) =>
    db
      .select({ name: schema.places.name, color: schema.places.color })
      .from(schema.places)
      .where(eq(schema.places.userId, userId))
      .orderBy(asc(schema.places.position));

  /** Each task's stored place names by title. */
  const storedTicks = async (listId: string) => {
    const rows = await db
      .select({ title: schema.tasks.title, place: schema.places.name })
      .from(schema.taskPlaces)
      .innerJoin(schema.tasks, eq(schema.tasks.id, schema.taskPlaces.taskId))
      .innerJoin(schema.places, eq(schema.places.id, schema.taskPlaces.placeId))
      .where(eq(schema.tasks.listId, listId));
    const byTitle: Record<string, string[]> = {};
    for (const { title, place } of rows) (byTitle[title] ??= []).push(place);
    for (const names of Object.values(byTitle)) names.sort();
    return byTitle;
  };

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3213,
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
    // Places, lists and tasks go with their user.
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  // PLACES-001 (#19 AC1–AC4, S-2 in the browser: Jadalnia is the ninth, colour 9).
  it("shows the eight places on first use, ticks one and a new place, unticks one, and keeps them after a reload", async () => {
    const user = await openPlanned("assign");

    await openPlaces("A");
    await browser.waitFor(
      () => JSON.stringify(pickerNames()) === JSON.stringify(PREDEFINED),
      () => `the eight places (shown: ${JSON.stringify(pickerNames())})`,
    );
    browser.clickRole("checkbox", "Kuchnia");
    browser.clickRole("checkbox", "Garaż");
    await expectTags({ A: ["Kuchnia", "Garaż"], B: [] });

    browser.typeInto(NAME_FIELD, "Jadalnia");
    browser.clickRole("button", "Create");
    await expectTags({ A: ["Kuchnia", "Garaż", "Jadalnia"] });
    await expect
      .poll(() => storedTicks(user.listId))
      .toEqual({
        A: ["Garaż", "Jadalnia", "Kuchnia"],
      });
    expect((await storedPlaces(user.id)).at(-1)).toEqual({ name: "Jadalnia", color: 9 });

    browser.clickRole("checkbox", "Garaż");
    await expectTags({ A: ["Kuchnia", "Jadalnia"] });
    await expect.poll(() => storedTicks(user.listId)).toEqual({ A: ["Jadalnia", "Kuchnia"] });
    await closePlaces();

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expectTags({ A: ["Kuchnia", "Jadalnia"], B: [] });
  });

  // PLACES-002 (#19 AC5–AC8).
  it("refuses a duplicate name, and shows a rename, a recolour and a delete on every row", async () => {
    const user = await openPlanned("edit", async ({ id: userId, listId }) => {
      const places = await listPlaces(db, userId);
      const kuchnia = places.find((place) => place.name === "Kuchnia")!;
      const salon = places.find((place) => place.name === "Salon")!;
      const tasks = await db
        .select({ id: schema.tasks.id, title: schema.tasks.title })
        .from(schema.tasks)
        .where(eq(schema.tasks.listId, listId));
      for (const { id } of tasks.filter((task) => ["A", "B"].includes(task.title))) {
        await db.insert(schema.taskPlaces).values([
          { taskId: id, placeId: kuchnia.id },
          { taskId: id, placeId: salon.id },
        ]);
      }
    });
    await expectTags({ A: ["Salon", "Kuchnia"], B: ["Salon", "Kuchnia"] });

    await openPlaces("A");
    browser.typeInto(NAME_FIELD, "łazienka");
    browser.clickRole("button", "Create");
    await waitForPickerText("A place with this name already exists.");

    browser.clickRole("button", "Edit places");
    browser.clickRole("button", "Edit Kuchnia");
    browser.retypeInto(NAME_FIELD, "Aneks");
    browser.clickRole("radio", "Teal");
    browser.clickRole("button", "Save");
    await expectTags({ A: ["Salon", "Aneks"], B: ["Salon", "Aneks"] });
    await expect
      .poll(async () => (await storedPlaces(user.id)).find((place) => place.name === "Aneks"))
      .toEqual({ name: "Aneks", color: 9 });

    browser.clickRole("button", "Edit Salon");
    browser.clickRole("button", "Delete place");
    await waitForPickerText("Delete “Salon”? It is removed from every task.");
    browser.clickRole("button", "Delete place");
    await expectTags({ A: ["Aneks"], B: ["Aneks"] });
    await expect.poll(() => storedTicks(user.listId)).toEqual({ A: ["Aneks"], B: ["Aneks"] });
    expect((await storedPlaces(user.id)).map((place) => place.name)).not.toContain("Salon");
  });

  // PLACES-003 (#19 AC9).
  it("gives a subtask its own places, never its task's, also after a reload", async () => {
    const user = await openPlanned("subtask");
    await expand("A");

    await openPlaces("s1");
    browser.clickRole("checkbox", "Łazienka");
    await expectTags({ A: [], s1: ["Łazienka"] });
    await closePlaces();
    await openPlaces("A");
    browser.clickRole("checkbox", "Strych");
    await expectTags({ A: ["Strych"], s1: ["Łazienka"] });
    await expect.poll(() => storedTicks(user.listId)).toEqual({ A: ["Strych"], s1: ["Łazienka"] });
    await closePlaces();

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expand("A");
    await expectTags({ A: ["Strych"], s1: ["Łazienka"], B: [] });
  });

  // PLACES-004 (#19 AC10).
  it("shows the limit instead of New place at 20 places", async () => {
    await openPlanned("limit", async ({ id: userId }) => {
      for (let index = 9; index <= 20; index += 1) {
        await createPlace(db, userId, { name: `Place ${index}` });
      }
    });

    await openPlaces("B");
    await waitForPickerText("You can have up to 20 places. Delete one to add another.");
    expect(browser.count(NAME_FIELD)).toBe(0);
    expect(pickerNames()).toHaveLength(20);
  });

  // PLACES-005 (spec E02 P-1).
  it("shows the places' load failure with Try again in the picker, while the list keeps working", async () => {
    const user = await signIn("failed");
    await createTask(db, user.id, user.listId, { title: "B" });
    browser.setSessionCookie(user.cookie, app.url);
    browser.abortRequests("**/api/places");
    try {
      browser.open(`${app.url}/`);
      await browser.waitForHydrated('[role="checkbox"]');
      await openPlaces("B");
      await waitForPickerText("Could not load your places.");
      expect(pickerText()).not.toContain("No places yet.");
      expect(browser.count(NAME_FIELD)).toBe(0);
    } finally {
      browser.unroute("**/api/places");
    }

    browser.clickRole("button", "Try again");
    await browser.waitFor(
      () => JSON.stringify(pickerNames()) === JSON.stringify(PREDEFINED),
      () => `the eight places after Try again (shown: ${JSON.stringify(pickerNames())})`,
    );
    browser.clickRole("checkbox", "Biuro");
    await expectTags({ B: ["Biuro"] });
  });
});
