// @vitest-environment jsdom
import type { SubtaskView, TaskView } from "@taskly/core";
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

  it("offers Add subtask, Edit and Delete in a task's menu", async () => {
    await renderLoaded();
    openMenu("Seal the bath");
    expect(screen.getByRole("menuitem", { name: "Add subtask" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined();
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

describe("TaskListScreen subtasks", () => {
  const own = { minGrosze: 100_000, maxGrosze: 200_000 };
  const bath = view("Bathroom", { estimate: own });
  const subtask = (
    title: string,
    estimate: SubtaskView["estimate"] = null,
    description: string | null = null,
  ): SubtaskView => ({
    id: crypto.randomUUID(),
    title,
    description,
    estimate,
  });
  const range = (min: number, max = min) => ({ minGrosze: min * 100, maxGrosze: max * 100 });
  const prime = subtask("Prime", range(300, 400));
  const grout = subtask("Grout", range(500));
  /** The server's parent: the sum of its subtasks' estimates and the count of those without. */
  const withSubtasks = (
    parent: TaskView,
    subtasks: SubtaskView[],
    estimate: TaskView["estimate"],
  ): TaskView => ({
    ...parent,
    estimate: subtasks.length === 0 ? parent.estimate : estimate,
    unestimatedSubtasks: subtasks.filter((item) => item.estimate === null).length,
    subtasks,
  });

  /** The row of a task or subtask by its title (a task's row also holds its subtasks). */
  const rowOf = (title: string) =>
    rows().find((row) => row.querySelector('[data-slot="task-title"]')?.textContent === title);
  const subtaskList = (title: string) =>
    screen.getByRole("list", { name: `Subtasks of “${title}”` });
  const subtaskForm = () =>
    within(screen.getByRole("textbox", { name: "New subtask" }).closest("form")!);
  const noticeOf = (title: string) =>
    within(rowOf(title)!)
      .queryAllByRole("status")
      .map((region) => region.textContent)
      .join("");
  const sumStarted = (title: string) =>
    `The estimate of “${title}” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.`;

  /** Renders the screen and waits for the server's rows. */
  async function renderRows() {
    const harness = renderScreen();
    await waitFor(() => expect(rows().length).toBeGreaterThan(0));
    return harness;
  }

  async function startSubtask(title: string) {
    openMenu(title);
    await choose("Add subtask");
    return subtaskForm();
  }

  it("shows subtasks nested under their task with their own estimates and the task's sum", async () => {
    const tiles = subtask("Buy the tiles", null, "Matt, 30 × 60.");
    serverTasks = [withSubtasks(bath, [prime, grout, tiles], range(800, 900))];
    await renderRows();
    const row = rowOf("Bathroom")!;
    expect(estimateOf(row)).toBe(pln("800–900_zł"));
    expect(within(row).getByText("3 subtasks")).toBeDefined();
    expect(within(row).getByText("1 subtask without an estimate")).toBeDefined();
    await click(screen.getByRole("button", { name: "Bathroom" }));
    const nested = subtaskList("Bathroom");
    expect(nested.closest("li")).toBe(row);
    expect(estimateOf(rowOf("Prime"))).toBe(pln("300–400_zł"));
    expect(estimateOf(rowOf("Grout"))).toBe(pln("500_zł"));
    expect(within(rowOf("Buy the tiles")!).getByText("No estimate")).toBeDefined();
    await click(within(nested).getByRole("button", { name: "Buy the tiles" }));
    expect(screen.getByText("Matt, 30 × 60.")).toBeDefined();
  });

  it("shows No estimate and the count when no subtask has an estimate", async () => {
    serverTasks = [withSubtasks(bath, [subtask("Prime"), subtask("Grout")], null)];
    await renderRows();
    const row = rowOf("Bathroom")!;
    expect(estimateOf(row)).toBe("No estimate");
    expect(within(row).getByText("2 subtasks without an estimate")).toBeDefined();
  });

  it("adds a subtask: pending under its task, the task's figure unchanged until the server's task arrives", async () => {
    serverTasks = [bath, seal];
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    const { cached } = await renderRows();
    const form = await startSubtask("Bathroom");
    expect(document.activeElement).toBe(form.getByRole("textbox", { name: "New subtask" }));
    type(form.getByRole("textbox", { name: "New subtask" }), "Prime");
    type(amountField(form), "300");
    type(upToField(form), "400");
    await click(form.getByRole("button", { name: "Description" }));
    type(form.getByRole("textbox", { name: /^Description/ }), "Two coats");
    await click(form.getByRole("button", { name: "Add" }));

    expect(sent("POST", TASKS_URL)).toEqual({
      title: "Prime",
      description: "Two coats",
      estimate: range(300, 400),
      parentId: bath.id,
    });
    const pending = await waitFor(() => {
      const found = rowOf("Prime");
      expect(found).toBeDefined();
      return found!;
    });
    expect(subtaskList("Bathroom").contains(pending)).toBe(true);
    expect(pending.querySelector("[data-pending]")).not.toBeNull();
    expect(within(pending).getByText("Saving…")).toBeDefined();
    const parentRow = rowOf("Bathroom")!;
    expect(estimateOf(parentRow)).toBe(pln("1_000–2_000_zł"));
    expect(within(parentRow).queryByText("1 subtask")).toBeNull();
    expect(cached()?.[0]).toMatchObject({ estimate: own, unestimatedSubtasks: 0 });
    openMenu("Prime");
    expect(screen.getByRole("menuitem", { name: "Edit" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    const created = { ...prime, description: "Two coats" };
    const answer = withSubtasks(bath, [created], range(300, 400));
    serverTasks = [answer, seal];
    post.open(ok(answer));
    await waitFor(() => expect(document.querySelector("[data-pending]")).toBeNull());

    expect(estimateOf(rowOf("Bathroom"))).toBe(pln("300–400_zł"));
    expect(within(rowOf("Bathroom")!).getByText("1 subtask")).toBeDefined();
    expect(estimateOf(rowOf("Prime"))).toBe(pln("300–400_zł"));
    expect(rowOf("Prime")?.querySelector(".row-highlight")).not.toBeNull();
    expect(rowOf("Prime")?.contains(scrollIntoView.mock.contexts.at(-1) as Node)).toBe(true);
    expect(noticeOf("Bathroom")).toBe(sumStarted("Bathroom"));
    // One subtask per opening; "Add subtask" takes focus for the next (decision F7).
    expect(screen.queryByRole("textbox", { name: "New subtask" })).toBeNull();
    expect(document.activeElement).toBe(
      within(rowOf("Bathroom")!).getByRole("button", { name: "Add subtask" }),
    );
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("gives no first-subtask message to a task that had a subtask or no estimate of its own", async () => {
    const hall = view("Hall");
    serverTasks = [withSubtasks(bath, [prime], range(300, 400)), hall];
    handlers.set(`POST ${TASKS_URL}`, (body) => {
      const { title, parentId } = body as { title: string; parentId: string };
      const parent = serverTasks.find((task) => task.id === parentId)!;
      const added = subtask(title);
      const answer = withSubtasks(parent, [...parent.subtasks, added], parent.estimate);
      serverTasks = serverTasks.map((task) => (task.id === parentId ? answer : task));
      return ok(answer);
    });
    await renderRows();
    let form = await startSubtask("Bathroom");
    type(form.getByRole("textbox", { name: "New subtask" }), "Grout");
    await click(form.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(within(rowOf("Bathroom")!).getByText("2 subtasks")).toBeDefined());
    expect(noticeOf("Bathroom")).toBe("");

    form = await startSubtask("Hall");
    type(form.getByRole("textbox", { name: "New subtask" }), "Sweep");
    await click(form.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(within(rowOf("Hall")!).getByText("1 subtask")).toBeDefined());
    expect(within(rowOf("Hall")!).getByText("1 subtask without an estimate")).toBeDefined();
    expect(estimateOf(rowOf("Hall"))).toBe("No estimate");
    expect(noticeOf("Hall")).toBe("");
  });

  it("removes the pending subtask and keeps the text when the add fails", async () => {
    serverTasks = [bath];
    handlers.set(`POST ${TASKS_URL}`, () => fail(500, "internal_error", "Something went wrong"));
    const { cached } = await renderRows();
    const form = await startSubtask("Bathroom");
    type(form.getByRole("textbox", { name: "New subtask" }), "Prime");
    await click(form.getByRole("button", { name: "Add" }));
    expect((await form.findByRole("alert")).textContent).toBe("Could not add the task. Try again.");
    expect((form.getByRole("textbox", { name: "New subtask" }) as HTMLInputElement).value).toBe(
      "Prime",
    );
    expect(rowOf("Prime")).toBeUndefined();
    expect(cached()).toEqual([bath]);
  });

  it("on a 404 shows the deleted-task message, refetches and moves focus to the list", async () => {
    serverTasks = [bath, seal];
    handlers.set(`POST ${TASKS_URL}`, () => {
      serverTasks = [seal];
      return fail(404, "not_found", "Task not found");
    });
    await renderRows();
    const get = gate();
    handlers.set(`GET ${TASKS_URL}`, () => get.promise);
    const form = await startSubtask("Bathroom");
    type(form.getByRole("textbox", { name: "New subtask" }), "Prime");
    await click(form.getByRole("button", { name: "Add" }));
    const deleted = "This task was deleted. The list has been refreshed.";
    expect((await form.findByRole("alert")).textContent).toBe(deleted);
    expect(rowOf("Prime")).toBeUndefined();
    expect(calls("GET", TASKS_URL)).toHaveLength(2);

    get.open(ok(serverTasks));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.getByRole("alert").textContent).toBe(deleted);
    expect(document.activeElement).toBe(list());
  });

  it("changes the task's figure when a subtask's estimate is edited, after the server answers", async () => {
    serverTasks = [withSubtasks(bath, [prime, grout], range(800, 900))];
    const patch = gate();
    handlers.set(`PATCH ${taskUrl(grout.id)}`, () => patch.promise);
    await renderRows();
    await click(screen.getByRole("button", { name: "Bathroom" }));
    const form = await startEdit("Grout");
    expect(amountField(form).value).toBe("500");
    type(amountField(form), "700");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(grout.id))).toEqual({ estimate: range(700) });
    expect(estimateOf(rowOf("Bathroom"))).toBe(pln("800–900_zł"));

    const answer = withSubtasks(
      bath,
      [prime, { ...grout, estimate: range(700) }],
      range(1000, 1100),
    );
    serverTasks = [answer];
    patch.open(ok(answer));
    await waitFor(() => expect(estimateOf(rowOf("Bathroom"))).toBe(pln("1_000–1_100_zł")));
    expect(estimateOf(rowOf("Grout"))).toBe(pln("700_zł"));
  });

  it("edits a task with subtasks without amount fields: their sum is shown as text", async () => {
    const summed = withSubtasks(bath, [prime, grout], range(800, 900));
    serverTasks = [summed];
    handlers.set(`PATCH ${taskUrl(bath.id)}`, () => saved({ ...summed, title: "Main bathroom" }));
    await renderRows();
    const form = await startEdit("Bathroom");
    expect(form.queryByRole("textbox", { name: /^Amount/ })).toBeNull();
    expect(form.queryByRole("textbox", { name: /^up to/ })).toBeNull();
    const sum = document.querySelector('[data-slot="summed-estimate"]');
    expect(sum?.textContent).toBe(
      pln("Sum of subtasks:800–900_zł") + "Change the amounts on the subtasks.",
    );
    type(form.getByRole("textbox", { name: "Title" }), "Main bathroom");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(bath.id))).toEqual({ title: "Main bathroom" });
    expect(await screen.findByText("Main bathroom")).toBeDefined();
  });

  it("shows the sum as not there yet when no subtask has an estimate", async () => {
    serverTasks = [withSubtasks(bath, [subtask("Prime")], null)];
    await renderRows();
    await startEdit("Bathroom");
    expect(document.querySelector('[data-slot="summed-estimate"]')?.textContent).toBe(
      "Sum of subtasks:no estimate yetChange the amounts on the subtasks.",
    );
  });

  it("on a 409 keeps the typed title, gives the amounts way to the sum and saves only the title next", async () => {
    serverTasks = [bath];
    const message = "A task with subtasks takes its estimate from them";
    handlers.set(`PATCH ${taskUrl(bath.id)}`, () => {
      // A subtask was added in another tab.
      serverTasks = [withSubtasks(bath, [prime], range(300, 400))];
      return fail(409, "conflict", message);
    });
    await renderRows();
    const form = await startEdit("Bathroom");
    type(form.getByRole("textbox", { name: "Title" }), "Main bathroom");
    type(amountField(form), "1 200");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(bath.id))).toEqual({
      title: "Main bathroom",
      estimate: range(1200, 2000),
    });
    expect((await form.findByRole("alert")).textContent).toBe(message);
    await waitFor(() => expect(form.queryByRole("textbox", { name: /^Amount/ })).toBeNull());
    expect(document.querySelector('[data-slot="summed-estimate"]')?.textContent).toContain(
      pln("300–400_zł"),
    );
    expect((form.getByRole("textbox", { name: "Title" }) as HTMLInputElement).value).toBe(
      "Main bathroom",
    );

    const answer = { ...withSubtasks(bath, [prime], range(300, 400)), title: "Main bathroom" };
    handlers.set(`PATCH ${taskUrl(bath.id)}`, () => saved(answer));
    await click(form.getByRole("button", { name: "Save" }));
    expect(calls("PATCH", taskUrl(bath.id))[1]?.[1]?.body).toBe(
      JSON.stringify({ title: "Main bathroom" }),
    );
    expect(await screen.findByText("Main bathroom")).toBeDefined();
  });

  it("never sends an estimate from a form opened with the sum, even when a refetch shows the subtasks gone", async () => {
    // Regression: the last subtask was deleted in another tab while this edit form was open.
    serverTasks = [withSubtasks(bath, [prime], range(300, 400))];
    const { client } = await renderRows();
    const form = await startEdit("Bathroom");
    expect(form.queryByRole("textbox", { name: /^Amount/ })).toBeNull();

    serverTasks = [bath];
    await act(() => client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
    await waitFor(() => expect(form.queryByRole("textbox", { name: /^Amount/ })).not.toBeNull());
    // The amount fields are back, empty, though the task's own figure is 1 000–2 000 zł.
    expect(amountField(form).value).toBe("");
    expect(upToField(form).value).toBe("");

    handlers.set(`PATCH ${taskUrl(bath.id)}`, () => saved({ ...bath, title: "Main bathroom" }));
    type(form.getByRole("textbox", { name: "Title" }), "Main bathroom");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(bath.id))).toEqual({ title: "Main bathroom" });
    expect(await screen.findByText("Main bathroom")).toBeDefined();
    expect(estimateOf(rowOf("Main bathroom"))).toBe(pln("1_000–2_000_zł"));
  });

  it("saves amounts typed into the fields that appear when a refetch shows the subtasks gone", async () => {
    serverTasks = [withSubtasks(bath, [prime], range(300, 400))];
    const { client } = await renderRows();
    const form = await startEdit("Bathroom");
    serverTasks = [bath];
    await act(() => client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
    await waitFor(() => expect(form.queryByRole("textbox", { name: /^Amount/ })).not.toBeNull());

    handlers.set(`PATCH ${taskUrl(bath.id)}`, () => saved({ ...bath, estimate: range(1500) }));
    type(amountField(form), "1 500");
    await click(form.getByRole("button", { name: "Save" }));
    expect(sent("PATCH", taskUrl(bath.id))).toEqual({ estimate: range(1500) });
    await waitFor(() => expect(estimateOf(rowOf("Bathroom"))).toBe(pln("1_500_zł")));
  });

  it.each([
    ["invalid text", "abc", "2 000"],
    ["a reversed range", "2 000", "1 500"],
  ])(
    "saves the title when a refetch brings the first subtask while the amounts hold %s",
    async (_, amount, upTo) => {
      // Regression: the first subtask was added in another tab while this edit form was open. The
      // amounts typed before are hidden behind the sum, so they must not block the save.
      serverTasks = [bath];
      const { client } = await renderRows();
      const form = await startEdit("Bathroom");
      type(form.getByRole("textbox", { name: "Title" }), "Main bathroom");
      type(amountField(form), amount);
      type(upToField(form), upTo);

      const summed = withSubtasks(bath, [prime], range(300, 400));
      serverTasks = [summed];
      await act(() => client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
      await waitFor(() => expect(form.queryByRole("textbox", { name: /^Amount/ })).toBeNull());

      handlers.set(`PATCH ${taskUrl(bath.id)}`, () => saved({ ...summed, title: "Main bathroom" }));
      await click(form.getByRole("button", { name: "Save" }));
      expect(sent("PATCH", taskUrl(bath.id))).toEqual({ title: "Main bathroom" });
      expect(await screen.findByText("Main bathroom")).toBeDefined();
      expect(screen.queryByRole("form", { name: "Edit “Bathroom”" })).toBeNull();
    },
  );

  it("names the subtasks in the delete question of their task", async () => {
    serverTasks = [withSubtasks(bath, [prime, grout], range(800, 900))];
    await renderRows();
    openMenu("Bathroom");
    await choose("Delete");
    expect(
      await screen.findByRole("alertdialog", { name: "Delete “Bathroom” and its 2 subtasks?" }),
    ).toBeDefined();
  });

  it("deletes a subtask: the task's figure follows the server, and its own amount comes back with a message", async () => {
    serverTasks = [withSubtasks(bath, [prime, grout], range(800, 900))];
    const answers = [withSubtasks(bath, [prime], range(300, 400)), withSubtasks(bath, [], null)];
    for (const target of [grout, prime]) {
      handlers.set(`DELETE ${taskUrl(target.id)}`, () => {
        const answer = answers.shift()!;
        serverTasks = [answer];
        return ok(answer);
      });
    }
    await renderRows();
    await click(screen.getByRole("button", { name: "Bathroom" }));

    openMenu("Grout");
    await choose("Delete");
    let dialog = await screen.findByRole("alertdialog", { name: "Delete “Grout”?" });
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(rowOf("Grout")).toBeUndefined());
    expect(estimateOf(rowOf("Bathroom"))).toBe(pln("300–400_zł"));
    expect(noticeOf("Bathroom")).toBe("");

    openMenu("Prime");
    await choose("Delete");
    dialog = await screen.findByRole("alertdialog", { name: "Delete “Prime”?" });
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(rowOf("Prime")).toBeUndefined());
    expect(estimateOf(rowOf("Bathroom"))).toBe(pln("1_000–2_000_zł"));
    expect(within(rowOf("Bathroom")!).queryByText(/^\d+ subtasks?/)).toBeNull();
    expect(noticeOf("Bathroom")).toBe(
      pln("The estimate of “Bathroom” is back to your amount: 1_000–2_000_zł."),
    );
  });

  it("gives no message when the last subtask of a task without its own estimate goes", async () => {
    const hall = view("Hall");
    const sweep = subtask("Sweep", range(50));
    serverTasks = [withSubtasks(hall, [sweep], range(50))];
    handlers.set(`DELETE ${taskUrl(sweep.id)}`, () => {
      serverTasks = [hall];
      return ok(hall);
    });
    await renderRows();
    await click(screen.getByRole("button", { name: "Hall" }));
    openMenu("Sweep");
    await choose("Delete");
    const dialog = await screen.findByRole("alertdialog", { name: "Delete “Sweep”?" });
    await click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(rowOf("Sweep")).toBeUndefined());
    expect(estimateOf(rowOf("Hall"))).toBe("No estimate");
    expect(noticeOf("Hall")).toBe("");
  });

  async function addFirstSubtask() {
    serverTasks = [bath, seal];
    handlers.set(`POST ${TASKS_URL}`, () => {
      const answer = withSubtasks(bath, [prime], range(300, 400));
      serverTasks = [answer, seal];
      return ok(answer);
    });
    const harness = await renderRows();
    const form = await startSubtask("Bathroom");
    type(form.getByRole("textbox", { name: "New subtask" }), "Prime");
    await click(form.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(noticeOf("Bathroom")).toBe(sumStarted("Bathroom")));
    return harness;
  }

  it("keeps a roll-up message until the next change", async () => {
    await addFirstSubtask();
    handlers.set(`PATCH ${taskUrl(seal.id)}`, () => saved({ ...seal, title: "Seal the shower" }));
    const form = await startEdit("Seal the bath");
    type(form.getByRole("textbox", { name: "Title" }), "Seal the shower");
    await click(form.getByRole("button", { name: "Save" }));
    expect(noticeOf("Bathroom")).toBe("");
    expect(await screen.findByText("Seal the shower")).toBeDefined();
  });

  it("comes back without a roll-up message after the page was hidden", async () => {
    const { show } = await addFirstSubtask();
    act(() => show(false));
    act(() => show(true));
    expect(noticeOf("Bathroom")).toBe("");
  });
});
