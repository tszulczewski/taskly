// @vitest-environment jsdom
import type { TaskView } from "@taskly/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "../../lib/query-keys";
import { TaskListScreen } from "./task-list-screen";

const LIST = crypto.randomUUID();
const TASKS_URL = `/api/lists/${LIST}/tasks`;
const taskUrl = (id: string) => `/api/tasks/${id}`;
const NBSP = String.fromCharCode(0xa0);
const pln = (text: string) => text.replaceAll("_", NBSP);

function view(title: string, extra: Partial<TaskView> = {}): TaskView {
  return {
    id: crypto.randomUUID(),
    title,
    description: null,
    estimate: null,
    unestimatedSubtasks: 0,
    subtasks: [],
    ...extra,
  };
}

const tile = view("Tile the wall", {
  description: "White, 20 × 20.",
  estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
});
const seal = view("Seal the bath", { estimate: { minGrosze: 50_000, maxGrosze: 50_000 } });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ok = (data: unknown) => json({ ok: true, data });
const fail = (status: number, code: string, message: string, fieldErrors?: object) =>
  json({ ok: false, error: { code, message, ...(fieldErrors && { fieldErrors }) } }, status);

function gate() {
  let open!: (res: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

type Handler = (body: unknown) => Response | Promise<Response>;
let handlers: Map<string, Handler>;
let serverTasks: TaskView[];
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const key = `${init.method ?? "GET"} ${url}`;
  const handler = handlers.get(key);
  if (!handler) throw new Error(`Unexpected ${key}`);
  return handler(init.body === undefined ? undefined : JSON.parse(String(init.body)));
});
const calls = (method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => (init?.method ?? "GET") === method && u === url);
/** The body of the only `method url` request so far. */
const sent = (method: string, url: string) => {
  const [call] = calls(method, url);
  return call?.[1]?.body === undefined ? undefined : JSON.parse(String(call[1].body));
};

/** The server keeps what it confirmed, so the refetch after a change agrees with it. */
const created = (task: TaskView) => {
  serverTasks = [...serverTasks, task];
  return ok(task);
};
const saved = (task: TaskView) => {
  serverTasks = serverTasks.map((current) => (current.id === task.id ? task : current));
  return ok(task);
};

const scrollIntoView = vi.fn();
let reducedMotion = false;

beforeEach(() => {
  serverTasks = [tile, seal];
  handlers = new Map([[`GET ${TASKS_URL}`, () => ok(serverTasks)]]);
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  scrollIntoView.mockClear();
  reducedMotion = false;
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn(() => ({ matches: reducedMotion }) as MediaQueryList);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderScreen({ visible = true } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const ui = (shown: boolean) => (
    <QueryClientProvider client={client}>
      <button type="button">Elsewhere</button>
      <Activity mode={shown ? "visible" : "hidden"}>
        <TaskListScreen listId={LIST} />
      </Activity>
    </QueryClientProvider>
  );
  const utils = render(ui(visible));
  const cached = () => client.getQueryData<TaskView[]>(queryKeys.tasks(LIST));
  return { client, cached, show: (shown: boolean) => utils.rerender(ui(shown)) };
}

async function renderLoaded() {
  const harness = renderScreen();
  await screen.findByText("Tile the wall");
  return harness;
}

const quickAdd = () => within(document.querySelector<HTMLElement>('[data-slot="quick-add"]')!);
const titleField = () => quickAdd().getByRole("textbox", { name: "New task" }) as HTMLInputElement;
// jsdom drops the space before the "(optional)" marker in the accessible name.
const amountField = (scope = quickAdd()) =>
  scope.getByRole("textbox", { name: /^Amount/ }) as HTMLInputElement;
const upToField = (scope = quickAdd()) =>
  scope.getByRole("textbox", { name: /^up to/ }) as HTMLInputElement;
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};
/** A row's estimate, exactly as shown (the Testing Library text matchers fold NBSP into spaces). */
const estimateOf = (row: HTMLElement | undefined) =>
  row?.querySelector('[data-slot="estimate-range"]')?.textContent;
// By selector: an open dialog hides the rest of the page from role queries (aria-hidden).
const list = () => document.querySelector<HTMLElement>('ul[aria-label="Tasks"]');
const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="task-row"]'));
const emptyState = () =>
  document.querySelector<HTMLElement>('[data-slot="surface"][tabindex="-1"]');
const openMenu = (title: string) =>
  fireEvent.keyDown(screen.getByRole("button", { name: `More actions for “${title}”` }), {
    key: "Enter",
  });
const choose = (item: string) => click(screen.getByRole("menuitem", { name: item }));
const editForm = (title: string) => screen.getByRole("form", { name: `Edit “${title}”` });

async function startEdit(title: string) {
  openMenu(title);
  await choose("Edit");
  return within(editForm(title));
}

describe("TaskListScreen states", () => {
  it("shows a skeleton while the list loads, then the rows", async () => {
    const get = gate();
    handlers.set(`GET ${TASKS_URL}`, () => get.promise);
    renderScreen();
    expect(screen.getByRole("status").textContent).toBe("Loading tasks…");
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(titleField()).toBeDefined();
    get.open(ok(serverTasks));
    await screen.findByText("Tile the wall");
    expect(rows().map((row) => row.querySelector('[data-slot="task-title"]')?.textContent)).toEqual(
      ["Tile the wall", "Seal the bath"],
    );
    expect(
      document.querySelector('[data-slot="task-list-screen"]')?.getAttribute("data-list-id"),
    ).toBe(LIST);
  });

  it("shows the estimate or No estimate, and the description only in the opened row", async () => {
    serverTasks = [tile, seal, view("Paint")];
    await renderLoaded();
    const [tileRow, sealRow, paintRow] = rows();
    expect(estimateOf(tileRow)).toBe(pln("1_500–2_000_zł"));
    expect(estimateOf(sealRow)).toBe(pln("500_zł"));
    expect(within(paintRow!).getByText("No estimate").className).toContain("text-muted");
    expect(screen.queryByText("White, 20 × 20.")).toBeNull();
    await click(screen.getByRole("button", { name: "Tile the wall" }));
    expect(screen.getByText("White, 20 × 20.")).toBeDefined();
  });

  it("offers Edit and Delete but no Add subtask (subtasks come later)", async () => {
    await renderLoaded();
    expect(screen.queryByRole("button", { name: "Seal the bath" })).toBeNull();
    openMenu("Seal the bath");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined();
    expect(screen.queryByRole("menuitem", { name: "Add subtask" })).toBeNull();
  });

  it("shows the empty state with focus in the quick-add title", async () => {
    serverTasks = [];
    renderScreen();
    const empty = await screen.findByText("No tasks yet.");
    expect(empty.parentElement?.textContent).toContain("Add the first thing you need to do.");
    expect(document.activeElement).toBe(titleField());
  });

  it("leaves focus where the user moved it while the empty list was loading", async () => {
    serverTasks = [];
    const get = gate();
    handlers.set(`GET ${TASKS_URL}`, () => get.promise);
    renderScreen();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    get.open(ok([]));
    await screen.findByText("No tasks yet.");
    expect(document.activeElement).toBe(elsewhere);
  });

  it("does not move focus to quick add when the list becomes empty later", async () => {
    serverTasks = [seal];
    handlers.set(`DELETE ${taskUrl(seal.id)}`, () => ok(null));
    renderScreen();
    await screen.findByText("Seal the bath");
    openMenu("Seal the bath");
    await choose("Delete");
    serverTasks = [];
    await click(await screen.findByRole("button", { name: "Delete task" }));
    await screen.findByText("No tasks yet.");
    await waitFor(() => expect(document.activeElement).toBe(emptyState()));
    expect(document.activeElement).not.toBe(titleField());
  });

  it("shows a load failure with Try again, which loads the list", async () => {
    handlers.set(`GET ${TASKS_URL}`, () => fail(500, "internal_error", "Something went wrong"));
    renderScreen();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Could not load your tasks.");
    const get = gate();
    handlers.set(`GET ${TASKS_URL}`, () => get.promise);
    await click(within(alert).getByRole("button", { name: "Try again" }));
    expect(within(alert).getByRole("button", { name: "Trying again…" })).toBeDefined();
    get.open(ok(serverTasks));
    expect(await screen.findByText("Tile the wall")).toBeDefined();
  });

  it("treats a malformed list as a load failure and caches nothing", async () => {
    handlers.set(`GET ${TASKS_URL}`, () => ok([{ ...tile, subtasks: undefined }]));
    const { cached } = renderScreen();
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load your tasks.");
    expect(cached()).toBeUndefined();
  });
});

describe("TaskListScreen quick add", () => {
  it("shows a pending row at once and the confirmed row scrolled into view and highlighted", async () => {
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    type(amountField(), "1 500");
    type(upToField(), "2 000");
    await click(quickAdd().getByRole("button", { name: "Add" }));

    expect(sent("POST", TASKS_URL)).toEqual({
      title: "Fit the mirror",
      description: null,
      estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
      parentId: null,
    });
    await waitFor(() => expect(rows()).toHaveLength(3));
    const pending = rows()[2]!;
    expect(pending.querySelector("[data-pending]")).not.toBeNull();
    expect(within(pending).getByText("Saving…")).toBeDefined();
    expect(quickAdd().getByRole("button", { name: "Adding…" })).toBeDefined();
    // Nothing can be sent with the temporary id.
    openMenu("Fit the mirror");
    expect(screen.getByRole("menuitem", { name: "Edit" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Delete" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    const mirror = view("Fit the mirror", { estimate: { minGrosze: 150_000, maxGrosze: 200_000 } });
    post.open(created(mirror));
    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());

    const added = rows()[2]!;
    expect(added.querySelector("[data-pending]")).toBeNull();
    expect(estimateOf(added)).toBe(pln("1_500–2_000_zł"));
    expect(added.querySelector(".row-highlight")).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(added.contains(scrollIntoView.mock.contexts.at(-1) as Node)).toBe(true);
    expect(document.activeElement).toBe(titleField());
    expect(titleField().value).toBe("");
    expect(amountField().value).toBe("");
    expect(upToField().value).toBe("");
    openMenu("Fit the mirror");
    expect(screen.getByRole("menuitem", { name: "Edit" }).getAttribute("aria-disabled")).toBeNull();
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("scrolls without animation under reduced motion", async () => {
    reducedMotion = true;
    const mirror = view("Fit the mirror");
    handlers.set(`POST ${TASKS_URL}`, () => created(mirror));
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" }),
    );
  });

  it.each([
    ["only Amount", { amount: "500" }, { minGrosze: 50_000, maxGrosze: 50_000 }, "500_zł"],
    ["only up to", { upTo: "500" }, { minGrosze: 50_000, maxGrosze: 50_000 }, "500_zł"],
    ["both", { amount: "12,5", upTo: "20" }, { minGrosze: 1_250, maxGrosze: 2_000 }, "12,50–20_zł"],
    ["no amounts", {}, null, "No estimate"],
  ])("adds with %s", async (_label, amounts, estimate, shown) => {
    handlers.set(`POST ${TASKS_URL}`, (body) =>
      created(
        view("Fit the mirror", { estimate: (body as { estimate: TaskView["estimate"] }).estimate }),
      ),
    );
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    if ("amount" in amounts) type(amountField(), amounts.amount);
    if ("upTo" in amounts) type(upToField(), amounts.upTo);
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect(sent("POST", TASKS_URL)).toEqual({
      title: "Fit the mirror",
      description: null,
      estimate,
      parentId: null,
    });
    await waitFor(() => expect(estimateOf(rows()[2])).toBe(pln(shown)));
    expect(rows()[2]?.querySelector("[data-pending]")).toBeNull();
  });

  it("refuses Amount above up to on the client, under up to", async () => {
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    type(amountField(), "2 000");
    type(upToField(), "1 500");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect(quickAdd().getByText("“Up to” must not be less than the amount.")).toBeDefined();
    expect(upToField().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(upToField());
    expect(calls("POST", TASKS_URL)).toHaveLength(0);
    expect(rows()).toHaveLength(2);
  });

  it("collapses and clears the description toggle after an add", async () => {
    handlers.set(`POST ${TASKS_URL}`, () =>
      created(view("Fit the mirror", { description: "Oval" })),
    );
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    const toggle = quickAdd().getByRole("button", { name: "Description" });
    await click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    type(quickAdd().getByRole("textbox", { name: /^Description/ }), "Oval");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect(sent("POST", TASKS_URL)).toMatchObject({ description: "Oval" });
    await waitFor(() => expect(toggle.getAttribute("aria-expanded")).toBe("false"));
    await click(toggle);
    expect(
      (quickAdd().getByRole("textbox", { name: /^Description/ }) as HTMLTextAreaElement).value,
    ).toBe("");
  });

  it("shows the server's message on a 409, rolls the row back and keeps the text", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => fail(409, "conflict", "Please try again"));
    const { cached } = await renderLoaded();
    type(titleField(), "Fit the mirror");
    type(amountField(), "500");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect((await quickAdd().findByRole("alert")).textContent).toBe("Please try again");
    expect(titleField().value).toBe("Fit the mirror");
    expect(amountField().value).toBe("500");
    expect(rows()).toHaveLength(2);
    expect(cached()).toEqual([tile, seal]);
  });

  it("puts server field errors under the field that holds the amount", async () => {
    handlers.set(`POST ${TASKS_URL}`, () =>
      fail(400, "validation_error", "Invalid input", {
        "estimate.minGrosze": ["Enter at most 10 000 000 zł"],
        "estimate.maxGrosze": ["Enter at most 10 000 000 zł"],
      }),
    );
    await renderLoaded();
    type(titleField(), "Fit the mirror");
    type(upToField(), "500");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect(await quickAdd().findByText("Enter at most 10 000 000 zł")).toBeDefined();
    expect(upToField().getAttribute("aria-invalid")).toBe("true");
    expect(amountField().getAttribute("aria-invalid")).not.toBe("true");
    expect(rows()).toHaveLength(2);
  });

  it.each([
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a malformed response", () => ok({ ...view("Fit the mirror"), subtasks: undefined })],
    ["a server error", () => fail(500, "internal_error", "Something went wrong")],
  ])(
    "shows the generic add error on %s and lets nothing invalid into the cache",
    async (_l, reply) => {
      handlers.set(`POST ${TASKS_URL}`, reply);
      const { cached } = await renderLoaded();
      type(titleField(), "Fit the mirror");
      await click(quickAdd().getByRole("button", { name: "Add" }));
      expect((await quickAdd().findByRole("alert")).textContent).toBe(
        "Could not add the task. Try again.",
      );
      expect(titleField().value).toBe("Fit the mirror");
      expect(cached()).toEqual([tile, seal]);
      expect(rows()).toHaveLength(2);
    },
  );

  it("comes back without the last add's highlight after the page was hidden", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => created(view("Fit the mirror")));
    const { show } = await renderLoaded();
    type(titleField(), "Fit the mirror");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    await waitFor(() => expect(document.querySelector(".row-highlight")).not.toBeNull());
    act(() => show(false));
    act(() => show(true));
    expect(document.querySelector(".row-highlight")).toBeNull();
  });
});

describe("TaskListScreen edit", () => {
  it("prefills an exact price in Amount only and opens the description when there is one", async () => {
    await renderLoaded();
    const sealForm = await startEdit("Seal the bath");
    expect(amountField(sealForm).value).toBe("500");
    expect(upToField(sealForm).value).toBe("");
    expect(sealForm.queryByRole("textbox", { name: /^Description/ })).toBeNull();
    await click(sealForm.getByRole("button", { name: "Cancel" }));
    const tileForm = await startEdit("Tile the wall");
    expect(amountField(tileForm).value).toBe(pln("1_500"));
    expect(upToField(tileForm).value).toBe(pln("2_000"));
    expect(
      (tileForm.getByRole("textbox", { name: /^Description/ }) as HTMLTextAreaElement).value,
    ).toBe("White, 20 × 20.");
  });

  it("sends only the changed title and changes the row only after the server confirms", async () => {
    const patch = gate();
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () => patch.promise);
    const { cached } = await renderLoaded();
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal the shower");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(seal.id))).toEqual({ title: "Seal the shower" });
    expect(form.getByRole("button", { name: "Saving…" })).toBeDefined();
    expect(cached()?.[1]?.title).toBe("Seal the bath");
    expect(screen.queryByText("Seal the shower")).toBeNull();

    patch.open(saved({ ...seal, title: "Seal the shower" }));
    expect(await within(rows()[1]!).findByText("Seal the shower")).toBeDefined();
    expect(screen.queryByRole("form", { name: "Edit “Seal the bath”" })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "More actions for “Seal the shower”" }),
    );
  });

  it("removes the estimate when both amounts are cleared", async () => {
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () => saved({ ...seal, estimate: null }));
    await renderLoaded();
    const form = await startEdit("Seal the bath");
    type(amountField(form), "");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(seal.id))).toEqual({ estimate: null });
    await waitFor(() => expect(estimateOf(rows()[1])).toBe("No estimate"));
  });

  it("closes without a request when nothing changed", async () => {
    await renderLoaded();
    const form = await startEdit("Seal the bath");
    await click(form.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("form", { name: "Edit “Seal the bath”" })).toBeNull();
    expect(calls("PATCH", taskUrl(seal.id))).toHaveLength(0);
  });

  it("keeps the form open with the server's message on a 409", async () => {
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () =>
      fail(409, "conflict", "A task with subtasks takes its estimate from them"),
    );
    await renderLoaded();
    const form = await startEdit("Seal the bath");
    type(amountField(form), "600");
    await click(form.getByRole("button", { name: "Save" }));
    expect((await form.findByRole("alert")).textContent).toBe(
      "A task with subtasks takes its estimate from them",
    );
    expect(amountField(form).value).toBe("600");
  });

  it("puts a server field error under the title", async () => {
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () =>
      fail(400, "validation_error", "Invalid input", { title: ["Enter a title."] }),
    );
    await renderLoaded();
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal it");
    await click(form.getByRole("button", { name: "Save" }));
    expect(await form.findByText("Enter a title.")).toBeDefined();
  });

  it.each([
    ["a server error", () => fail(500, "internal_error", "Something went wrong")],
    ["a malformed response", () => ok({ ...seal, title: "" })],
  ])("keeps the form open with the generic message on %s", async (_label, reply) => {
    handlers.set(`PATCH ${taskUrl(seal.id)}`, reply);
    const { cached } = await renderLoaded();
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal the shower");
    await click(form.getByRole("button", { name: "Save" }));
    expect((await form.findByRole("alert")).textContent).toBe(
      "Could not save the task. Try again.",
    );
    expect(cached()?.[1]).toEqual(seal);
    await click(form.getByRole("button", { name: "Cancel" }));
    expect(within(rows()[1]!).getByText("Seal the bath")).toBeDefined();
  });

  it("on a 404 shows the deleted-task message, refetches and moves focus to the list", async () => {
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () => fail(404, "not_found", "Task not found"));
    await renderLoaded();
    const get = gate();
    handlers.set(`GET ${TASKS_URL}`, () => get.promise);
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal the shower");
    await click(form.getByRole("button", { name: "Save" }));
    const deleted = "This task was deleted. The list has been refreshed.";
    expect((await form.findByRole("alert")).textContent).toBe(deleted);
    expect(calls("GET", TASKS_URL)).toHaveLength(2);

    get.open(ok([tile]));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.getByRole("alert").textContent).toBe(deleted);
    expect(document.activeElement).toBe(list());

    // The message lasts until the next change.
    handlers.set(`GET ${TASKS_URL}`, () => ok([tile]));
    handlers.set(`POST ${TASKS_URL}`, () => fail(409, "conflict", "Please try again"));
    type(titleField(), "Fit the mirror");
    await click(quickAdd().getByRole("button", { name: "Add" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Please try again");
  });

  it("on a 404 for the last task moves focus to the empty state", async () => {
    serverTasks = [seal];
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () => {
      serverTasks = [];
      return fail(404, "not_found", "Task not found");
    });
    renderScreen();
    await screen.findByText("Seal the bath");
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal the shower");
    await click(form.getByRole("button", { name: "Save" }));
    await screen.findByText("No tasks yet.");
    expect(screen.getByRole("alert").textContent).toBe(
      "This task was deleted. The list has been refreshed.",
    );
    expect(document.activeElement).toBe(emptyState());
  });
});

describe("TaskListScreen delete", () => {
  async function askToDelete(title: string) {
    openMenu(title);
    await choose("Delete");
    return screen.findByRole("alertdialog", { name: `Delete “${title}”?` });
  }

  it("asks first and removes the row only after the server confirms", async () => {
    const del = gate();
    handlers.set(`DELETE ${taskUrl(seal.id)}`, () => del.promise);
    await renderLoaded();
    const dialog = await askToDelete("Seal the bath");
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    expect(calls("DELETE", taskUrl(seal.id))).toHaveLength(1);
    expect(within(dialog).getByRole("button", { name: "Deleting…" })).toBeDefined();
    expect(rows()).toHaveLength(2);

    serverTasks = [tile];
    del.open(ok(null));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(list()));
  });

  it("keeps the dialog open with the failure when the delete fails", async () => {
    handlers.set(`DELETE ${taskUrl(seal.id)}`, () =>
      fail(500, "internal_error", "Something went wrong"),
    );
    await renderLoaded();
    const dialog = await askToDelete("Seal the bath");
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    expect(await within(dialog).findByText("Could not delete the task. Try again.")).toBeDefined();
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(rows()).toHaveLength(2);
  });

  it("treats a 404 as deleted elsewhere: the dialog closes and the refetch removes the row", async () => {
    handlers.set(`DELETE ${taskUrl(seal.id)}`, () => fail(404, "not_found", "Task not found"));
    await renderLoaded();
    const dialog = await askToDelete("Seal the bath");
    serverTasks = [tile];
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(rows()).toHaveLength(1));
  });
});
