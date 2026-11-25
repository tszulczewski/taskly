import {
  createPlace,
  createTask,
  deletePlace,
  futureExpensesService,
  listPlaces,
} from "@taskly/core/server";
import { schema } from "@taskly/db";
import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { useSignedInBrowserSuite } from "./browser-suite";
import { createBrowser } from "./helpers";

const run = `placesbrowser${Date.now()}`;
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
const PICKER = '[data-slot="place-picker"]';
const NAME_FIELD = `${PICKER} input[name="name"]`;

type Browser = ReturnType<typeof createBrowser>;

// #19 (E02-S03) in the browser against the production build, sign-up closed: the eight places on
// first use, ticking and unticking (also a new place), the duplicate-name message, rename,
// recolour and delete seen on the rows, a subtask's own places, the limit of 20, and the places
// failing to load while the list keeps working (P-1). Then #83 (E02-S04): places chosen and
// created in the quick add of a task and of a subtask, a refused add and its retry.
describe("assigning tasks to places in the browser (#19, sign-up closed)", () => {
  const { app, browser, db, signIn } = useSignedInBrowserSuite({
    run,
    port: 3213,
    session: "taskly-places-browser",
  });

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
    browser.setSessionCookie(user.cookie, app().url);
    browser.open(`${app().url}/`);
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
    await browser.rowAction(title, "Places…");
    await browser.waitFor(
      () => browser.count('[data-slot="place-picker"]') === 1,
      () => "the place picker to open",
    );
    await browser.waitForSteady(PICKER);
  }

  /** In the open picker: "Edit places", then the place's "Edit" once the new view is placed. */
  async function editPlace(on: Browser, name: string) {
    on.clickRole("button", "Edit places");
    await on.waitForText("Back to choosing");
    await on.waitForSteady(PICKER);
    on.clickRole("button", `Edit ${name}`);
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

    await editPlace(browser, "Kuchnia");
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

  it("preserves a newer colour when another tab saves a stale name-only edit", async () => {
    const user = await openPlanned("stale-edit");
    await openPlaces("A");
    await editPlace(browser, "Kuchnia");

    const peer = createBrowser("taskly-places-stale-peer");
    try {
      peer.setSessionCookie(user.cookie, app().url);
      peer.open(`${app().url}/`);
      await peer.waitForHydrated('[role="checkbox"]');
      await peer.rowAction("A", "Places…");
      await peer.waitForText("Edit places");
      await peer.waitForSteady(PICKER);
      await editPlace(peer, "Kuchnia");
      peer.clickRole("radio", "Teal");
      peer.clickRole("button", "Save");
      await expect
        .poll(async () => (await storedPlaces(user.id)).find((place) => place.name === "Kuchnia"))
        .toEqual({ name: "Kuchnia", color: 9 });

      browser.retypeInto(NAME_FIELD, "Aneks");
      browser.clickRole("button", "Save");
      await expect
        .poll(async () => (await storedPlaces(user.id)).find((place) => place.name === "Aneks"))
        .toEqual({ name: "Aneks", color: 9 });
    } finally {
      peer.close();
    }
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

  // #90: "Add places" at the end of the meta line, on a task and on a subtask.
  it("adds places from a row's Add places, on a task and a subtask, and gives focus back to it", async () => {
    const user = await openPlanned("row-button");
    const addPlaces = (title: string) => `button[aria-label="Add places to “${title}”"]`;
    /** The parts of a row's meta line after its title and estimate, in order. */
    const metaOf = (title: string) =>
      browser.evaluate<string[]>(
        `[...document.querySelector('${addPlaces(title)}').parentElement.children].map((part) => part.textContent)`,
      );
    async function pickFromRow(title: string, place: string) {
      await browser.waitForAnimations();
      browser.clickRole("button", `Add places to “${title}”`);
      await browser.waitFor(
        () => browser.count(PICKER) === 1,
        () => "the place picker to open",
      );
      await browser.waitForSteady(PICKER);
      browser.clickRole("checkbox", place);
      browser.press("Escape");
      await browser.waitFor(
        () => browser.count(PICKER) === 0,
        () => "the place picker to close",
      );
      expect(
        browser.evaluate<boolean>(
          `document.activeElement === document.querySelector('${addPlaces(title)}')`,
        ),
      ).toBe(true);
    }

    expect(metaOf("B")).toEqual(["Add places"]);
    await pickFromRow("B", "Kuchnia");
    await expectTags({ A: [], B: ["Kuchnia"] });
    expect(metaOf("B")).toEqual(["Kuchnia", "Add places"]);

    await expand("A");
    await pickFromRow("s1", "Łazienka");
    await expectTags({ A: [], s1: ["Łazienka"], B: ["Kuchnia"] });
    await expect.poll(() => storedTicks(user.listId)).toEqual({ B: ["Kuchnia"], s1: ["Łazienka"] });
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
    browser.setSessionCookie(user.cookie, app().url);
    browser.abortRequests("**/api/places");
    try {
      browser.open(`${app().url}/`);
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

  // Places while adding (#83, E02-S04): the top quick add and a subtask's.
  const TOP = '[data-slot="task-list-screen"] > [data-slot="quick-add"]';
  const SUB = '[data-slot="task-row"] [data-slot="quick-add"]';
  /** The chosen places' text in a quick add ("" when none). */
  const chosenIn = (form: string) =>
    browser.evaluate<string>(
      `document.querySelector('${form} [aria-label="Chosen places"]')?.textContent ?? ""`,
    );
  async function openDraftPlaces(form: string) {
    await browser.waitForAnimations();
    browser.click(`${form} button[aria-haspopup="dialog"]`);
    await browser.waitFor(
      () => browser.count('[data-slot="place-picker"]') === 1,
      () => "the draft place picker to open",
    );
  }
  async function closeDraftPlaces(form: string) {
    browser.press("Escape");
    await browser.waitFor(
      () => browser.count('[data-slot="place-picker"]') === 0,
      () => "the draft place picker to close",
    );
    // Closing gives focus back to "Places…" (AC18).
    expect(
      browser.evaluate<boolean>(
        `document.activeElement === document.querySelector('${form} button[aria-haspopup="dialog"]')`,
      ),
    ).toBe(true);
  }
  const formAlert = (form: string) =>
    browser.evaluate<string>(`document.querySelector('${form} [role="alert"]')?.textContent ?? ""`);

  // PLACES-006 (#83 AC11, AC12, AC14, AC17).
  it("adds a task with two places and a new one from quick add, keeps them after a reload, and starts the next task with none", async () => {
    const user = await openPlanned("draft");

    await openDraftPlaces(TOP);
    browser.clickRole("checkbox", "Kuchnia");
    browser.clickRole("checkbox", "Salon");
    browser.typeInto(NAME_FIELD, "Jadalnia");
    browser.clickRole("button", "Create");
    await browser.waitFor(
      () => chosenIn(TOP).includes("Jadalnia"),
      () => `Jadalnia chosen (shown: ${chosenIn(TOP)})`,
    );
    await closeDraftPlaces(TOP);
    browser.typeInto(`${TOP} input[name="title"]`, "Lamp");
    browser.click(`${TOP} button[type="submit"]`);

    await expectTags({ Lamp: ["Salon", "Kuchnia", "Jadalnia"], A: [], B: [] });
    await browser.waitFor(
      () => chosenIn(TOP) === "",
      () => "the choice cleared",
    );
    expect(
      browser.evaluate<boolean>(
        `document.activeElement === document.querySelector('${TOP} input[name="title"]')`,
      ),
    ).toBe(true);
    await expect
      .poll(() => storedTicks(user.listId))
      .toEqual({ Lamp: ["Jadalnia", "Kuchnia", "Salon"] });

    // Cancelling a subtask draft after creating a place adds nothing but keeps the place (AC17).
    await expand("B");
    browser.clickRole("button", "Add subtask");
    await openDraftPlaces(SUB);
    browser.typeInto(NAME_FIELD, "Spiżarnia");
    browser.clickRole("button", "Create");
    await browser.waitFor(
      () => chosenIn(SUB).includes("Spiżarnia"),
      () => `Spiżarnia chosen (shown: ${chosenIn(SUB)})`,
    );
    await closeDraftPlaces(SUB);
    browser.click(`${SUB} input[name="title"]`);
    browser.press("Escape");
    await browser.waitFor(
      () => browser.count(SUB) === 0,
      () => "the subtask form to close",
    );

    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expectTags({ Lamp: ["Salon", "Kuchnia", "Jadalnia"], A: [], B: [] });
    expect(await storedTicks(user.listId)).toEqual({ Lamp: ["Jadalnia", "Kuchnia", "Salon"] });
    expect((await storedPlaces(user.id)).map((place) => place.name)).toContain("Spiżarnia");
  });

  // PLACES-007 (#83 AC11, AC13).
  it("adds a subtask with its own place, copying nothing from or to its task", async () => {
    const user = await openPlanned("draft-sub", async ({ id: userId, listId }) => {
      const salon = (await listPlaces(db, userId)).find((place) => place.name === "Salon")!;
      const [a] = await db
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(and(eq(schema.tasks.listId, listId), eq(schema.tasks.title, "A")));
      await db.insert(schema.taskPlaces).values({ taskId: a!.id, placeId: salon.id });
    });

    await expand("A");
    browser.clickRole("button", "Add subtask");
    await openDraftPlaces(SUB);
    expect(
      browser.evaluate<string | null>(
        `document.querySelector('[data-slot="place-picker"] [role="checkbox"][aria-checked="true"]')?.id ?? null`,
      ),
    ).toBeNull();
    browser.clickRole("checkbox", "Biuro");
    await closeDraftPlaces(SUB);
    browser.typeInto(`${SUB} input[name="title"]`, "s2");
    browser.click(`${SUB} button[type="submit"]`);

    await expectTags({ A: ["Salon"], s1: [], s2: ["Biuro"] });
    await expect.poll(() => storedTicks(user.listId)).toEqual({ A: ["Salon"], s2: ["Biuro"] });
    browser.reload();
    await browser.waitForHydrated('[role="checkbox"]');
    await expand("A");
    await expectTags({ A: ["Salon"], s1: [], s2: ["Biuro"] });
  });

  // PLACES-008 (#83 AC14, AC16, AC18).
  it("refuses an add whose chosen place was deleted meanwhile, keeps the draft, and adds one task after the correction", async () => {
    const user = await openPlanned("draft-gone");
    const garage = (await listPlaces(db, user.id)).find((place) => place.name === "Garaż")!;

    await openDraftPlaces(TOP);
    browser.clickRole("checkbox", "Salon");
    browser.clickRole("checkbox", "Garaż");
    await closeDraftPlaces(TOP);
    browser.typeInto(`${TOP} input[name="title"]`, "Shelf");
    browser.typeInto(`${TOP} input[name="amount"]`, "500");
    // Another tab deletes Garaż before Add.
    await deletePlace(db, user.id, garage.id);
    browser.click(`${TOP} button[type="submit"]`);

    await browser.waitFor(
      () => formAlert(TOP).includes("A place you chose no longer exists."),
      () => `the refusal (shown: ${formAlert(TOP)})`,
    );
    await browser.waitFor(
      () => chosenIn(TOP).includes("Deleted place"),
      () => `the deleted place shown (shown: ${chosenIn(TOP)})`,
    );
    expect(
      browser.evaluate<string>(`document.querySelector('${TOP} input[name="title"]').value`),
    ).toBe("Shelf");
    expect(await storedTicks(user.listId)).toEqual({});

    browser.clickRole("button", "Remove the deleted place");
    browser.click(`${TOP} button[type="submit"]`);
    await expectTags({ Shelf: ["Salon"] });
    await expect
      .poll(
        async () =>
          (
            await db
              .select()
              .from(schema.tasks)
              .where(and(eq(schema.tasks.listId, user.listId), eq(schema.tasks.title, "Shelf")))
          ).length,
      )
      .toBe(1);
    expect((await futureExpensesService(db, user.id, user.listId)).total).toEqual({
      minGrosze: 50_000,
      maxGrosze: 50_000,
    });
  });

  // PLACES-009 (#83 AC15).
  it("shows the places failing to load in the quick add picker and still adds a task without places", async () => {
    const user = await signIn("draft-failed");
    browser.setSessionCookie(user.cookie, app().url);
    browser.abortRequests("**/api/places");
    try {
      browser.open(`${app().url}/`);
      await browser.waitForHydrated(`${TOP} input[name="title"]`);
      await openDraftPlaces(TOP);
      await waitForPickerText("Could not load your places.");
      expect(pickerText()).not.toContain("No places yet.");
      expect(browser.count(NAME_FIELD)).toBe(0);
      await closeDraftPlaces(TOP);
      browser.typeInto(`${TOP} input[name="title"]`, "Lamp");
      browser.click(`${TOP} button[type="submit"]`);
      await expectTags({ Lamp: [] });
    } finally {
      browser.unroute("**/api/places");
    }
  });
});
