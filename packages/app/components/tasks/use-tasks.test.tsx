// @vitest-environment jsdom
import type { CreateTaskInput, TaskView } from "@taskly/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  isPendingTaskId,
  useCreateTask,
  useDeleteTask,
  useTasks,
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

describe("isPendingTaskId", () => {
  it("tells temporary ids from server ids", () => {
    expect(isPendingTaskId("pending-1")).toBe(true);
    expect(isPendingTaskId(tile.id)).toBe(false);
  });
});

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
    expect(temporary).toEqual({ ...sealed, id: temporary?.id });
    expect(sent).toEqual(input);
    expect(result.current.create.context).toEqual({
      previous: [tile, paint],
      tempId: temporary?.id,
    });

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

  it("removes only its own pending row when it fails while another add is in flight", async () => {
    const first = gate();
    const second = gate();
    const gates = [first, second];
    handlers.set(`POST ${TASKS_URL}`, () => (gates.shift() ?? first).promise);
    const { result, cached } = await setupLoaded();

    const one = start(() => result.current.create.mutateAsync(input));
    await waitFor(() => expect(cached()).toHaveLength(3));
    const firstTempId = cached()?.[2]?.id;
    const two = start(() => result.current.create.mutateAsync({ ...input, title: "Grout" }));
    await waitFor(() => expect(cached()).toHaveLength(4));

    second.open(fail(409, "conflict", "Please try again"));
    await two;
    expect(cached()?.map((task) => task.id)).toEqual([tile.id, paint.id, firstTempId]);
    first.open(ok(sealed));
    await one;
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
    await waitFor(() =>
      expect(result.current.create.context).toHaveProperty("previous", undefined),
    );

    handlers.set(`POST ${TASKS_URL}`, () => fail(409, "conflict", "Please try again"));
    expect(await start(() => result.current.create.mutateAsync(input))).toBeInstanceOf(ApiError);
    expect(cached()).toBeUndefined();
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
    const subtask = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
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
    // Another save still running, so this one's settle does not refetch over the stale answer.
    const first = start(() =>
      result.current.update.mutateAsync({ id: tile.id, input: { title: "x" } }),
    );
    const stale = gate();
    handlers.set(`GET ${TASKS_URL}`, () => stale.promise);
    act(() => void client.refetchQueries({ queryKey: queryKeys.tasks(LIST) }));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));

    await start(() =>
      result.current.update.mutateAsync({ id: paint.id, input: { title: renamed.title } }),
    );
    stale.open(ok([tile, paint]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cached()).toEqual([tile, renamed]);

    handlers.set(`GET ${TASKS_URL}`, () => ok([tile, renamed]));
    other.open(ok(tile));
    await first;
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
    const subtask = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
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
