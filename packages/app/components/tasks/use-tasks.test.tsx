// @vitest-environment jsdom
import {
  type CreateTaskInput,
  formatPlnRange,
  type SubtaskView,
  type TaskView,
} from "@taskly/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { isPendingTaskId } from "./task-items";
import {
  type SetCompletedVariables,
  useCreateTask,
  useDeleteTask,
  useFutureExpenses,
  useSetCompleted,
  useTasks,
  useTaskViews,
  useUpdateTask,
} from "./use-tasks";

const LIST = crypto.randomUUID();
const TASKS_URL = `/api/lists/${LIST}/tasks`;
const taskUrl = (id: string) => `/api/tasks/${id}`;

function view(title: string, extra: Partial<TaskView> = {}): TaskView {
  return {
    id: crypto.randomUUID(),
    title,
    description: null,
    estimate: null,
    completed: false,
    position: "a0",
    unestimatedSubtasks: 0,
    subtasks: [],
    ...extra,
  };
}

const tile = view("Tile the wall", { estimate: { minGrosze: 150_000, maxGrosze: 200_000 } });
const paint = view("Paint", { description: "Two coats" });
const input: CreateTaskInput = {
  title: "Seal the bath",
  description: "Silicone",
  estimate: { minGrosze: 5_000, maxGrosze: 5_000 },
  parentId: null,
};
const sealed = view("Seal the bath", { description: "Silicone", estimate: input.estimate });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ok = (data: unknown) => json({ ok: true, data });
const fail = (status: number, code: string, message: string, fieldErrors?: object) =>
  json({ ok: false, error: { code, message, ...(fieldErrors && { fieldErrors }) } }, status);

function gate() {
  let open!: (res: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((resolve, rej) => {
    open = resolve;
    reject = rej;
  });
  return { promise, open, reject };
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

beforeEach(() => {
  serverTasks = [tile, paint];
  handlers = new Map([[`GET ${TASKS_URL}`, () => ok(serverTasks)]]);
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup({ loaded = true } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({
      ...(loaded && { tasks: useTasks(LIST) }),
      create: useCreateTask(LIST),
      update: useUpdateTask(LIST),
      remove: useDeleteTask(LIST),
    }),
    { wrapper },
  );
  const cached = () => client.getQueryData<TaskView[]>(queryKeys.tasks(LIST));
  return { client, result, cached };
}

async function setupLoaded() {
  const harness = setup();
  await waitFor(() => expect(harness.cached()).toEqual([tile, paint]));
  return harness;
}

/** Starts a mutation and returns its settled outcome (value or error) without throwing. */
function start<T>(run: () => Promise<T>): Promise<T | unknown> {
  let outcome!: Promise<T | unknown>;
  act(() => {
    outcome = run().catch((error: unknown) => error);
  });
  return outcome;
}

describe("useTasks", () => {
  it("loads the list through the response schema, unknown fields stripped", async () => {
    serverTasks = [{ ...tile, position: "a0" } as TaskView, paint];
    const { result, cached } = setup();
    await waitFor(() => expect(result.current.tasks?.isSuccess).toBe(true));
    expect(result.current.tasks?.data).toEqual([tile, paint]);
    expect(cached()).toEqual([tile, paint]);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a malformed list with bad_response and caches nothing", async () => {
    handlers.set(`GET ${TASKS_URL}`, () => ok([tile, { ...paint, subtasks: undefined }]));
    const { result, cached } = setup();
    await waitFor(() => expect(result.current.tasks?.isError).toBe(true));
    expect(result.current.tasks?.error).toMatchObject({ status: 200, code: "bad_response" });
    expect(cached()).toBeUndefined();
  });
});

describe("useCreateTask", () => {
  it("appends a pending row at once and swaps in the server's row in its place", async () => {
    const post = gate();
    let sent: unknown;
    handlers.set(`POST ${TASKS_URL}`, (body) => {
      sent = body;
      return post.promise;
    });
    const { result, cached } = await setupLoaded();

    const outcome = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    const [, , temporary] = cached() ?? [];
    expect(isPendingTaskId(temporary?.id ?? "")).toBe(true);
    expect(temporary).toEqual({ ...sealed, id: temporary?.id, position: "" });
    expect(sent).toEqual(input);
    await waitFor(() => expect(result.current.create.context).toEqual({ tempId: temporary?.id }));

    serverTasks = [tile, paint, sealed];
    post.open(ok(sealed));
    expect(await outcome).toEqual(sealed);
    expect(cached()).toEqual([tile, paint, sealed]);
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("removes the pending row when the server refuses the add with 409", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => fail(409, "conflict", "Please try again"));
    const { client, result, cached } = await setupLoaded();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const error = await start(() => result.current.create.mutateAsync(input));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "conflict", message: "Please try again" });
    expect(cached()).toEqual([tile, paint]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tasks(LIST) });
  });

  it("surfaces field errors and rolls back", async () => {
    handlers.set(`POST ${TASKS_URL}`, () =>
      fail(400, "validation_error", "Invalid input", { title: ["Enter a title."] }),
    );
    const { result, cached } = await setupLoaded();
    const error = await start(() => result.current.create.mutateAsync(input));
    expect(error).toMatchObject({ status: 400, fieldErrors: { title: ["Enter a title."] } });
    expect(cached()).toEqual([tile, paint]);
  });

  it("rolls back on a network failure", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => Promise.reject(new TypeError("Failed to fetch")));
    const { result, cached } = await setupLoaded();
    const error = await start(() => result.current.create.mutateAsync(input));
    expect(error).toBeInstanceOf(TypeError);
    expect(cached()).toEqual([tile, paint]);
  });

  it("rejects a malformed response with bad_response and lets nothing invalid into the cache", async () => {
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    const { result, cached } = await setupLoaded();
    const outcome = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    // The server's refetch must not hide what the rollback left behind.
    handlers.set(`GET ${TASKS_URL}`, () => new Promise<Response>(() => {}));

    post.open(ok({ ...sealed, unestimatedSubtasks: "0" }));
    expect(await outcome).toMatchObject({ code: "bad_response", status: 200 });
    expect(cached()).toEqual([tile, paint]);
  });

  it("keeps other adds' pending rows and refetches only after the last one settles", async () => {
    const first = gate();
    const second = gate();
    const gates = [first, second];
    handlers.set(`POST ${TASKS_URL}`, () => (gates.shift() ?? first).promise);
    const { result, cached } = await setupLoaded();
    const other = view("Grout");

    const one = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    const two = start(() => result.current.create.mutateAsync({ ...input, title: "Grout" }));
    await waitFor(() => expect(cached()).toHaveLength(4));
    const secondTempId = cached()?.[3]?.id ?? "";
    expect(secondTempId).not.toBe(cached()?.[2]?.id);

    first.open(ok(sealed));
    await one;
    expect(cached()).toEqual([tile, paint, sealed, expect.objectContaining({ id: secondTempId })]);
    expect(calls("GET", TASKS_URL)).toHaveLength(1);

    serverTasks = [tile, paint, sealed, other];
    second.open(ok(other));
    await two;
    expect(cached()).toEqual([tile, paint, sealed, other]);
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("sends a queued add only after the previous one settled, and a failure removes only its own row", async () => {
    const first = gate();
    const second = gate();
    const gates = [first, second];
    handlers.set(`POST ${TASKS_URL}`, () => (gates.shift() ?? first).promise);
    const { result, cached } = await setupLoaded();

    const one = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    const two = start(() => result.current.create.mutateAsync({ ...input, title: "Grout" }));
    await waitFor(() => expect(cached()).toHaveLength(4));
    const secondTempId = cached()?.[3]?.id;
    // One list queue (spec E03, Order of requests): the second add waits for the first.
    expect(calls("POST", TASKS_URL)).toHaveLength(1);

    first.open(fail(409, "conflict", "Please try again"));
    await one;
    expect(cached()?.map((task) => task.id)).toEqual([tile.id, paint.id, secondTempId]);
    await waitFor(() => expect(calls("POST", TASKS_URL)).toHaveLength(2));
    second.open(ok(sealed));
    await two;
  });

  it("does not duplicate a row that a refetch already brought in", async () => {
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    const { client, result, cached } = await setupLoaded();
    const outcome = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    const temporary = cached()?.[2] as TaskView;

    // The server's list with the new task, the pending row still behind it.
    act(() => client.setQueryData(queryKeys.tasks(LIST), [tile, sealed, paint, temporary]));
    post.open(ok(sealed));
    await outcome;
    expect(cached()).toEqual([tile, sealed, paint]);
  });

  it("appends the server's row when the pending row is gone", async () => {
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    const { client, result, cached } = await setupLoaded();
    const outcome = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));

    act(() => client.setQueryData(queryKeys.tasks(LIST), [tile, paint]));
    post.open(ok(sealed));
    await outcome;
    expect(cached()).toEqual([tile, paint, sealed]);
  });

  it("adds no row to a list that has not loaded", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => ok(sealed));
    const { result, cached } = setup({ loaded: false });
    expect(await start(() => result.current.create.mutateAsync(input))).toEqual(sealed);
    expect(cached()).toBeUndefined();

    handlers.set(`POST ${TASKS_URL}`, () => fail(409, "conflict", "Please try again"));
    expect(await start(() => result.current.create.mutateAsync(input))).toBeInstanceOf(ApiError);
    expect(cached()).toBeUndefined();
  });
});

describe("useCreateTask for a subtask", () => {
  const prime: SubtaskView = {
    id: crypto.randomUUID(),
    title: "Prime",
    description: null,
    estimate: null,
    completed: false,
    position: "a0",
  };
  const own = { minGrosze: 150_000, maxGrosze: 200_000 };
  const subtaskInput = (title: string, parentId = tile.id): CreateTaskInput => ({
    title,
    description: null,
    estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    parentId,
  });
  /** The server's answer: the parent with its subtasks and their sum. */
  const parentWith = (...subtasks: SubtaskView[]): TaskView => ({
    ...tile,
    estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    unestimatedSubtasks: 0,
    subtasks,
  });

  it("puts a pending subtask under its parent, leaving the parent's figure, then the server's parent", async () => {
    const post = gate();
    let sent: unknown;
    handlers.set(`POST ${TASKS_URL}`, (body) => {
      sent = body;
      return post.promise;
    });
    const { result, cached } = await setupLoaded();

    const outcome = start(() => result.current.create.mutateAsync(subtaskInput("Prime")));
    await waitFor(() => expect(cached()?.[0]?.subtasks).toHaveLength(1));
    const [parent, other] = cached() ?? [];
    const temporary = parent?.subtasks[0];
    expect(isPendingTaskId(temporary?.id ?? "")).toBe(true);
    expect(temporary).toEqual({
      id: temporary?.id,
      title: "Prime",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
      completed: false,
      position: "",
    });
    expect(parent).toEqual({ ...tile, estimate: own, subtasks: [temporary] });
    expect(other).toEqual(paint);
    expect(cached()).toHaveLength(2);
    expect(sent).toEqual(subtaskInput("Prime"));

    const created = { ...prime, estimate: { minGrosze: 30_000, maxGrosze: 40_000 } };
    serverTasks = [parentWith(created), paint];
    post.open(ok(parentWith(created)));
    expect(await outcome).toEqual(parentWith(created));
    expect(cached()).toEqual([parentWith(created), paint]);
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("removes only the pending subtask when the add fails", async () => {
    handlers.set(`POST ${TASKS_URL}`, () => fail(404, "not_found", "Task not found"));
    const { result, cached } = await setupLoaded();
    const error = await start(() => result.current.create.mutateAsync(subtaskInput("Prime")));
    expect(error).toMatchObject({ status: 404, code: "not_found" });
    expect(cached()).toEqual([tile, paint]);
  });

  it("never sends a subtask of a pending task", async () => {
    const { result, cached } = await setupLoaded();
    const error = await start(() =>
      result.current.create.mutateAsync(subtaskInput("Prime", "pending-8")),
    );
    expect(error).toEqual(new Error("The task is not saved yet"));
    expect(calls("POST", TASKS_URL)).toHaveLength(0);
    expect(cached()).toEqual([tile, paint]);
  });

  it("keeps another pending subtask of the parent when an answer replaces the parent", async () => {
    const first = gate();
    const second = gate();
    const gates = [first, second];
    const edit = gate();
    handlers.set(`POST ${TASKS_URL}`, () => (gates.shift() ?? first).promise);
    handlers.set(`PATCH ${taskUrl(prime.id)}`, () => edit.promise);
    serverTasks = [parentWith(prime), paint];
    const { result, cached } = setup();
    await waitFor(() => expect(cached()).toHaveLength(2));

    const editing = start(() =>
      result.current.update.mutateAsync({ id: prime.id, input: { title: "x" } }),
    );
    const one = start(() => result.current.create.mutateAsync(subtaskInput("Sand")));
    await waitFor(() => expect(cached()?.[0]?.subtasks).toHaveLength(2));
    const two = start(() => result.current.create.mutateAsync(subtaskInput("Paint")));
    await waitFor(() => expect(cached()?.[0]?.subtasks).toHaveLength(3));
    const [, sandTemp, paintTemp] = cached()?.[0]?.subtasks ?? [];

    // An edit of another subtask answers with the parent: both pending subtasks stay.
    edit.open(ok(parentWith(prime)));
    await editing;
    expect(cached()?.[0]?.subtasks).toEqual([prime, sandTemp, paintTemp]);

    const sand = { ...prime, id: crypto.randomUUID(), title: "Sand" };
    first.open(ok(parentWith(prime, sand)));
    await one;
    expect(cached()?.[0]?.subtasks).toEqual([prime, sand, paintTemp]);

    const painted = { ...prime, id: crypto.randomUUID(), title: "Paint" };
    serverTasks = [parentWith(prime, sand, painted), paint];
    second.open(ok(parentWith(prime, sand, painted)));
    await two;
    expect(cached()).toEqual([parentWith(prime, sand, painted), paint]);
  });
});

describe("useUpdateTask", () => {
  const renamed = { ...paint, title: "Paint the ceiling" };

  it("changes the row only after the server confirms, in place", async () => {
    const patch = gate();
    let sent: unknown;
    handlers.set(`PATCH ${taskUrl(paint.id)}`, (body) => {
      sent = body;
      return patch.promise;
    });
    const { client, result, cached } = await setupLoaded();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const outcome = start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { title: renamed.title } }),
    );
    await waitFor(() => expect(result.current.update.isPending).toBe(true));
    await waitFor(() => expect(sent).toEqual({ title: renamed.title }));
    expect(cached()).toEqual([tile, paint]);

    serverTasks = [tile, renamed];
    patch.open(ok(renamed));
    expect(await outcome).toEqual(renamed);
    expect(cached()).toEqual([tile, renamed]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tasks(LIST) });
  });

  it("puts a returned parent in the parent's row (a subtask edit)", async () => {
    const subtask = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      position: "a0",
    };
    const parent = { ...paint, subtasks: [{ ...subtask, title: "Prime twice" }] };
    serverTasks = [tile, { ...paint, subtasks: [subtask] }];
    handlers.set(`PATCH ${taskUrl(subtask.id)}`, () => ok(parent));
    const { result, cached } = setup();
    await waitFor(() => expect(cached()).toHaveLength(2));

    await start(() =>
      result.current.update.mutateAsync({ id: subtask.id, input: { title: "Prime twice" } }),
    );
    expect(cached()).toEqual([tile, parent]);
  });

  it("does not let a refetch that started before the save undo it", async () => {
    const other = gate();
    handlers.set(`PATCH ${taskUrl(tile.id)}`, () => other.promise);
    handlers.set(`PATCH ${taskUrl(paint.id)}`, () => ok(renamed));
    const { client, result, cached } = await setupLoaded();
    // A second save queued behind the first, so the first one's settle does not refetch.
    const first = start(() =>
      result.current.update.mutateAsync({ id: tile.id, input: { title: "x" } }),
    );
    const second = start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { title: renamed.title } }),
    );
    const stale = gate();
    handlers.set(`GET ${TASKS_URL}`, () => stale.promise);
    act(() => void client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));

    handlers.set(`GET ${TASKS_URL}`, () => ok([tile, renamed]));
    other.open(ok(tile));
    await first;
    await second;
    stale.open(ok([tile, paint]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cached()).toEqual([tile, renamed]);
  });

  it("surfaces a 404 and refetches, so the deleted row disappears", async () => {
    handlers.set(`PATCH ${taskUrl(paint.id)}`, () => fail(404, "not_found", "Task not found"));
    const { result, cached } = await setupLoaded();
    const refetch = gate();
    handlers.set(`GET ${TASKS_URL}`, () => refetch.promise);

    const error = await start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { title: "x" } }),
    );
    expect(error).toMatchObject({ status: 404, code: "not_found", message: "Task not found" });
    expect(cached()).toEqual([tile, paint]);
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    refetch.open(ok([tile]));
    await waitFor(() => expect(cached()).toEqual([tile]));
  });

  it("surfaces a 409 with the server's message and leaves the row as it was", async () => {
    const message = "A task with subtasks takes its estimate from them";
    handlers.set(`PATCH ${taskUrl(paint.id)}`, () => fail(409, "conflict", message));
    const { result, cached } = await setupLoaded();
    const error = await start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { estimate: null } }),
    );
    expect(error).toMatchObject({ status: 409, code: "conflict", message });
    expect(cached()).toEqual([tile, paint]);
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("keeps a malformed response out of the cache", async () => {
    handlers.set(`PATCH ${taskUrl(paint.id)}`, () => ok({ ...renamed, id: "not-a-uuid" }));
    const { result, cached } = await setupLoaded();
    const error = await start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { title: renamed.title } }),
    );
    expect(error).toMatchObject({ code: "bad_response" });
    expect(cached()).toEqual([tile, paint]);
  });

  it("never sends a request for a pending row", async () => {
    const { result } = await setupLoaded();
    const error = await start(() =>
      result.current.update.mutateAsync({ id: "pending-7", input: { title: "x" } }),
    );
    expect(error).toEqual(new Error("The task is not saved yet"));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });
});

describe("useDeleteTask", () => {
  it("removes the row only when the server answers null", async () => {
    const del = gate();
    handlers.set(`DELETE ${taskUrl(tile.id)}`, () => del.promise);
    const { client, result, cached } = await setupLoaded();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const outcome = start(() => result.current.remove.mutateAsync(tile.id));
    await waitFor(() => expect(calls("DELETE", taskUrl(tile.id))).toHaveLength(1));
    expect(cached()).toEqual([tile, paint]);

    serverTasks = [paint];
    del.open(ok(null));
    expect(await outcome).toBeNull();
    expect(cached()).toEqual([paint]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tasks(LIST) });
  });

  it("puts a returned parent in the parent's row (a subtask delete)", async () => {
    const subtask = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      position: "a0",
    };
    serverTasks = [tile, { ...paint, subtasks: [subtask] }];
    handlers.set(`DELETE ${taskUrl(subtask.id)}`, () => ok(paint));
    const { result, cached } = setup();
    await waitFor(() => expect(cached()).toHaveLength(2));

    expect(await start(() => result.current.remove.mutateAsync(subtask.id))).toEqual(paint);
    expect(cached()).toEqual([tile, paint]);
  });

  it("surfaces a 404 and refetches", async () => {
    handlers.set(`DELETE ${taskUrl(tile.id)}`, () => {
      serverTasks = [paint];
      return fail(404, "not_found", "Task not found");
    });
    const { result, cached } = await setupLoaded();
    const error = await start(() => result.current.remove.mutateAsync(tile.id));
    expect(error).toMatchObject({ status: 404, code: "not_found" });
    await waitFor(() => expect(cached()).toEqual([paint]));
  });

  it("keeps a malformed response out of the cache", async () => {
    handlers.set(`DELETE ${taskUrl(tile.id)}`, () => ok({ id: tile.id }));
    const { result, cached } = await setupLoaded();
    const error = await start(() => result.current.remove.mutateAsync(tile.id));
    expect(error).toMatchObject({ code: "bad_response" });
    expect(cached()).toEqual([tile, paint]);
  });

  it("never sends a request for a pending row", async () => {
    const { result } = await setupLoaded();
    const error = await start(() => result.current.remove.mutateAsync("pending-7"));
    expect(error).toEqual(new Error("The task is not saved yet"));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(0);
  });
});

describe("useSetCompleted with useTaskViews", () => {
  // Distinct keys, so the read order is defined (open first, then by position).
  const a = view("A", { position: "a0", subtasks: [] });
  const b = view("B", { position: "a1" });
  const sub1 = {
    id: crypto.randomUUID(),
    title: "s1",
    description: null,
    estimate: null,
    completed: false,
    position: "a0",
  };
  const sub2 = { ...sub1, id: crypto.randomUUID(), title: "s2", position: "a1" };
  const parent = view("Bathroom", { position: "a2", subtasks: [sub1, sub2] });
  const done = <T extends { completed: boolean }>(row: T, completed = true): T => ({
    ...row,
    completed,
  });
  const completionUrl = (id: string) => `/api/tasks/${id}/completion`;
  const onError = vi.fn<(error: unknown, variables: SetCompletedVariables) => void>();

  beforeEach(() => {
    serverTasks = [a, b, parent];
    handlers.set(`GET ${TASKS_URL}`, () => ok(serverTasks));
    onError.mockReset();
  });

  /** Each PUT to a row's completion URL waits for the next gate opened for it. */
  function completionGates(id: string) {
    const gates: ReturnType<typeof gate>[] = [];
    const bodies: unknown[] = [];
    handlers.set(`PUT ${completionUrl(id)}`, (body) => {
      bodies.push(body);
      const next = gate();
      gates.push(next);
      return next.promise;
    });
    return { gates, bodies };
  }

  async function harness() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({
        shown: useTaskViews(LIST),
        complete: useSetCompleted(LIST, { onError }),
        update: useUpdateTask(LIST),
        create: useCreateTask(LIST),
      }),
      { wrapper },
    );
    const cached = () => client.getQueryData<TaskView[]>(queryKeys.tasks(LIST));
    await waitFor(() => expect(cached()).toEqual(serverTasks));
    const toggle = (id: string, completed: boolean, title = "x") =>
      act(() => result.current.complete.mutate({ id, completed, title }));
    const shown = () => result.current.shown.views?.map((task) => [task.title, task.completed]);
    return { client, result, cached, toggle, shown };
  }

  it("is undefined until the list loads, then the server's rows in read order", async () => {
    serverTasks = [done(b), a];
    const pending = gate();
    handlers.set(`GET ${TASKS_URL}`, () => pending.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTaskViews(LIST), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.views).toBeUndefined();
    pending.open(ok(serverTasks));
    await waitFor(() => expect(result.current.views).toEqual([a, done(b)]));
    expect(result.current.query.data).toEqual([done(b), a]);
  });

  it("shows a completion at once without writing the cache, then the server's answer", async () => {
    const { gates, bodies } = completionGates(a.id);
    const { cached, toggle, shown } = await harness();

    toggle(a.id, true);
    await waitFor(() =>
      expect(shown()).toEqual([
        ["B", false],
        ["Bathroom", false],
        ["A", true],
      ]),
    );
    expect(cached()).toEqual([a, b, parent]);
    await waitFor(() => expect(bodies).toEqual([{ completed: true }]));

    serverTasks = [b, parent, done(a)];
    gates[0]!.open(ok(done(a)));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(cached()).toEqual([b, parent, done(a)]);
    expect(shown()).toEqual([
      ["B", false],
      ["Bathroom", false],
      ["A", true],
    ]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("shows complete → reopen as reopened throughout when the first answer is late; the reopen is sent after it (review R2)", async () => {
    const { gates, bodies } = completionGates(a.id);
    const { toggle, shown } = await harness();

    toggle(a.id, true);
    toggle(a.id, false);
    await waitFor(() => expect(shown()?.[0]).toEqual(["A", false]));
    await waitFor(() => expect(bodies).toHaveLength(1));

    gates[0]!.open(ok(done(a)));
    await waitFor(() => expect(bodies).toEqual([{ completed: true }, { completed: false }]));
    expect(shown()?.[0]).toEqual(["A", false]);

    gates[1]!.open(ok(a));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(shown()).toEqual([
      ["A", false],
      ["B", false],
      ["Bathroom", false],
    ]);
  });

  it("drops a failed first toggle and still sends and shows the queued reopen", async () => {
    const { gates, bodies } = completionGates(b.id);
    const { toggle, shown } = await harness();

    toggle(b.id, true, "B");
    toggle(b.id, false, "B");
    await waitFor(() => expect(bodies).toHaveLength(1));
    gates[0]!.open(fail(500, "internal", "Something went wrong"));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![1]).toEqual({ id: b.id, completed: true, title: "B" });
    expect(shown()?.[1]).toEqual(["B", false]);

    await waitFor(() => expect(bodies).toHaveLength(2));
    gates[1]!.open(ok(b));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(shown()?.[1]).toEqual(["B", false]);
  });

  it("shows the first answer when the second toggle fails", async () => {
    const { gates, bodies } = completionGates(b.id);
    const { toggle, shown } = await harness();

    toggle(b.id, true);
    toggle(b.id, false);
    await waitFor(() => expect(bodies).toHaveLength(1));
    serverTasks = [a, parent, done(b)];
    gates[0]!.open(ok(done(b)));
    await waitFor(() => expect(bodies).toHaveLength(2));
    // The pending reopen keys B before its first sibling, so it shows first.
    expect(shown()?.[0]).toEqual(["B", false]);

    gates[1]!.open(fail(500, "internal", "Something went wrong"));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(shown()).toEqual([
        ["A", false],
        ["Bathroom", false],
        ["B", true],
      ]),
    );
  });

  it("replays a parent completion and its subtask's toggle in order, as the server will hold them", async () => {
    const parentPuts = completionGates(parent.id);
    const subPuts = completionGates(sub2.id);
    const { result, toggle } = await harness();
    const rows = () =>
      result.current.shown.views
        ?.find((task) => task.id === parent.id)
        ?.subtasks.map((subtask) => [subtask.title, subtask.completed]);

    toggle(parent.id, true);
    toggle(sub2.id, false);
    await waitFor(() =>
      expect(rows()).toEqual([
        ["s2", false],
        ["s1", true],
      ]),
    );
    expect(subPuts.bodies).toEqual([]);

    const completed = { ...done(parent), subtasks: [done(sub1), done(sub2)] };
    await waitFor(() => expect(parentPuts.gates).toHaveLength(1));
    parentPuts.gates[0]!.open(ok(completed));
    await waitFor(() => expect(subPuts.bodies).toEqual([{ completed: false }]));
    expect(rows()).toEqual([
      ["s2", false],
      ["s1", true],
    ]);

    const answer = { ...completed, subtasks: [{ ...sub2, position: "Zz" }, done(sub1)] };
    serverTasks = [a, b, answer];
    subPuts.gates[0]!.open(ok(answer));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(rows()).toEqual([
      ["s2", false],
      ["s1", true],
    ]);
    expect(result.current.shown.views?.at(-1)?.completed).toBe(true);
  });

  it("keeps a pending completion over an unrelated edit's answer, and sends it only after that answer", async () => {
    const edit = gate();
    handlers.set(`PATCH ${taskUrl(a.id)}`, () => edit.promise);
    const { gates, bodies } = completionGates(a.id);
    const { result, toggle, shown } = await harness();

    let editing!: Promise<unknown>;
    act(() => {
      editing = result.current.update.mutateAsync({ id: a.id, input: { title: "A2" } });
    });
    toggle(a.id, true);
    await waitFor(() => expect(shown()?.at(-1)).toEqual(["A", true]));
    expect(bodies).toEqual([]);

    edit.open(ok({ ...a, title: "A2" }));
    await editing;
    await waitFor(() => expect(shown()?.at(-1)).toEqual(["A2", true]));
    await waitFor(() => expect(bodies).toHaveLength(1));

    serverTasks = [b, parent, done({ ...a, title: "A2" })];
    gates[0]!.open(ok(done({ ...a, title: "A2" })));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(shown()?.at(-1)).toEqual(["A2", true]);
  });

  it("goes back after a refusal while an add is pending, keeps the add's row and leaves the refetch to it", async () => {
    const { gates } = completionGates(a.id);
    const post = gate();
    handlers.set(`POST ${TASKS_URL}`, () => post.promise);
    const { result, cached, toggle, shown } = await harness();

    toggle(a.id, true, "A");
    await waitFor(() => expect(gates).toHaveLength(1));
    let adding!: Promise<unknown>;
    act(() => {
      adding = result.current.create.mutateAsync(input);
    });
    await waitFor(() => expect(cached()).toHaveLength(4));

    gates[0]!.open(fail(409, "conflict", "Please try again"));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(shown()?.[0]).toEqual(["A", false]));
    expect(shown()?.map(([title]) => title)).toEqual(["A", "B", "Bathroom", "Seal the bath"]);
    expect(calls("GET", TASKS_URL)).toHaveLength(1);

    serverTasks = [a, b, parent, sealed];
    post.open(ok(sealed));
    await adding;
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
  });

  it("does not let a list refetch that started before the answer land on top of it", async () => {
    const { gates } = completionGates(a.id);
    const { client, cached, toggle, shown } = await harness();

    toggle(a.id, true);
    await waitFor(() => expect(gates).toHaveLength(1));
    const stale = gate();
    handlers.set(`GET ${TASKS_URL}`, () => stale.promise);
    act(() => void client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));

    handlers.set(`GET ${TASKS_URL}`, () => ok([b, parent, done(a)]));
    gates[0]!.open(ok(done(a)));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(3));
    stale.open(ok([a, b, parent]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await waitFor(() => expect(cached()).toEqual([b, parent, done(a)]));
    expect(shown()?.at(-1)).toEqual(["A", true]);
  });

  it("reports a 404 to onError and refetches, so the row disappears", async () => {
    handlers.set(`PUT ${completionUrl(a.id)}`, () => fail(404, "not_found", "Task not found"));
    const { toggle, shown } = await harness();
    serverTasks = [b, parent];

    toggle(a.id, true, "A");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![0]).toMatchObject({ status: 404 });
    await waitFor(() =>
      expect(shown()).toEqual([
        ["B", false],
        ["Bathroom", false],
      ]),
    );
  });

  it("works without an onError and never sends a request for a pending row", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useSetCompleted(LIST), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current
        .mutateAsync({ id: "pending-1", completed: true, title: "x" })
        .catch((error: unknown) => error);
    });
    expect(await outcome).toEqual(new Error("The task is not saved yet"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useFutureExpenses", () => {
  const EXPENSES_URL = `/api/lists/${LIST}/future-expenses`;
  const total = { minGrosze: 150_000, maxGrosze: 270_000 };
  const expensesCalls = () => calls("GET", EXPENSES_URL).length;

  beforeEach(() => {
    handlers.set(`GET ${EXPENSES_URL}`, () => ok({ total, unestimated: [] }));
  });

  function harness() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({
        expenses: useFutureExpenses(LIST),
        tasks: useTasks(LIST),
        create: useCreateTask(LIST),
        update: useUpdateTask(LIST),
        remove: useDeleteTask(LIST),
        complete: useSetCompleted(LIST),
      }),
      { wrapper },
    );
    return { result };
  }

  it("formats the server's total at the edge, one amount for an exact price", async () => {
    const { result } = harness();
    await waitFor(() => expect(result.current.expenses.isSuccess).toBe(true));
    expect(result.current.expenses.data).toBe(formatPlnRange(150_000, 270_000));
    expect(calls("GET", EXPENSES_URL)[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);

    handlers.set(`GET ${EXPENSES_URL}`, () =>
      ok({ total: { minGrosze: 80_000, maxGrosze: 80_000 } }),
    );
    await act(() => result.current.expenses.refetch());
    await waitFor(() => expect(result.current.expenses.data).toBe(formatPlnRange(80_000, 80_000)));
  });

  it("is null when nothing counts", async () => {
    handlers.set(`GET ${EXPENSES_URL}`, () => ok({ total: null }));
    const { result } = harness();
    await waitFor(() => expect(result.current.expenses.isSuccess).toBe(true));
    expect(result.current.expenses.data).toBeNull();
  });

  it("rejects a malformed total with bad_response", async () => {
    handlers.set(`GET ${EXPENSES_URL}`, () => ok({ total: { minGrosze: 2, maxGrosze: 1 } }));
    const { result } = harness();
    await waitFor(() => expect(result.current.expenses.isError).toBe(true));
    expect(result.current.expenses.error).toMatchObject({ status: 200, code: "bad_response" });
  });

  it("refetches when each task mutation settles, also while another one is still queued", async () => {
    const first = gate();
    const second = gate();
    const gates = [first, second];
    handlers.set(`POST ${TASKS_URL}`, () => (gates.shift() ?? first).promise);
    handlers.set(`PATCH ${taskUrl(tile.id)}`, () => ok(tile));
    handlers.set(`DELETE ${taskUrl(paint.id)}`, () => ok(null));
    handlers.set(`PUT ${taskUrl(tile.id)}/completion`, () => ok({ ...tile, completed: true }));
    const { result } = harness();
    await waitFor(() => expect(result.current.expenses.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.tasks.isSuccess).toBe(true));
    expect(expensesCalls()).toBe(1);

    const one = start(() => result.current.create.mutateAsync(input));
    const two = start(() => result.current.create.mutateAsync({ ...input, title: "Grout" }));
    first.open(ok(sealed));
    await one;
    // The task list waits for the last change; the total, with no optimistic state, does not.
    await waitFor(() => expect(expensesCalls()).toBe(2));
    expect(calls("GET", TASKS_URL)).toHaveLength(1);
    second.open(ok(view("Grout")));
    await two;
    await waitFor(() => expect(expensesCalls()).toBe(3));

    await start(() => result.current.update.mutateAsync({ id: tile.id, input: { title: "x" } }));
    await waitFor(() => expect(expensesCalls()).toBe(4));
    await start(() => result.current.remove.mutateAsync(paint.id));
    await waitFor(() => expect(expensesCalls()).toBe(5));
    await start(() =>
      result.current.complete.mutateAsync({ id: tile.id, completed: true, title: "x" }),
    );
    await waitFor(() => expect(expensesCalls()).toBe(6));
  });

  it("refetches after a refused change too", async () => {
    handlers.set(`PUT ${taskUrl(tile.id)}/completion`, () => fail(500, "internal_error", "Oops"));
    const { result } = harness();
    await waitFor(() => expect(result.current.expenses.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.tasks.isSuccess).toBe(true));

    const outcome = await start(() =>
      result.current.complete.mutateAsync({ id: tile.id, completed: true, title: "x" }),
    );
    expect(outcome).toMatchObject({ status: 500 });
    await waitFor(() => expect(expensesCalls()).toBe(2));
  });
});
