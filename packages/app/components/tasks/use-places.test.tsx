// @vitest-environment jsdom
import type { PlaceView, TaskView } from "@taskly/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { isPendingTaskId } from "./task-items";
import { useCreatePlace, useDeletePlace, useUpdatePlace } from "./use-places";
import {
  type TogglePlaceVariables,
  useCreateTask,
  usePlaces,
  useTaskViews,
  useTogglePlace,
  useUpdateTask,
} from "./use-tasks";

const LIST = crypto.randomUUID();
const TASKS_URL = `/api/lists/${LIST}/tasks`;
const PLACES_URL = "/api/places";
const placeUrl = (id: string) => `/api/places/${id}`;
const tickUrl = (taskId: string, placeId: string) => `/api/tasks/${taskId}/places/${placeId}`;

const salon: PlaceView = { id: crypto.randomUUID(), name: "Salon", color: 1 };
const kuchnia: PlaceView = { id: crypto.randomUUID(), name: "Kuchnia", color: 4 };
const garaz: PlaceView = { id: crypto.randomUUID(), name: "Garaż", color: 5 };

function view(title: string, extra: Partial<TaskView> = {}): TaskView {
  return {
    id: crypto.randomUUID(),
    title,
    description: null,
    estimate: null,
    completed: false,
    important: false,
    urgent: false,
    places: [],
    position: "a0",
    unestimatedSubtasks: 0,
    subtasks: [],
    ...extra,
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ok = (data: unknown) => json({ ok: true, data });
const fail = (status: number, code: string, message: string) =>
  json({ ok: false, error: { code, message } }, status);

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
let serverPlaces: PlaceView[];
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const key = `${init.method ?? "GET"} ${url}`;
  const handler = handlers.get(key);
  if (!handler) throw new Error(`Unexpected ${key}`);
  return handler(init.body === undefined ? undefined : JSON.parse(String(init.body)));
});
const calls = (method: string, url: string) =>
  fetchMock.mock.calls.filter(([u, init]) => (init?.method ?? "GET") === method && u === url);

const a = view("A", { position: "a0", places: [kuchnia] });
const b = view("B", { position: "a1" });

beforeEach(() => {
  serverTasks = [a, b];
  serverPlaces = [salon, kuchnia, garaz];
  handlers = new Map<string, Handler>([
    [`GET ${TASKS_URL}`, () => ok(serverTasks)],
    [`GET ${PLACES_URL}`, () => ok(serverPlaces)],
  ]);
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const onError = vi.fn<(error: unknown, variables: TogglePlaceVariables) => void>();

async function harness({ placesLoaded = true } = {}) {
  onError.mockReset();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  if (!placesLoaded) handlers.set(`GET ${PLACES_URL}`, () => new Promise<Response>(() => {}));
  const { result } = renderHook(
    () => ({
      shown: useTaskViews(LIST),
      tick: useTogglePlace(LIST, { onError }),
      create: useCreateTask(LIST),
      update: useUpdateTask(LIST),
      createPlace: useCreatePlace(),
      updatePlace: useUpdatePlace(LIST),
      deletePlace: useDeletePlace(LIST),
    }),
    { wrapper },
  );
  const cachedTasks = () => client.getQueryData<TaskView[]>(queryKeys.tasks(LIST));
  const cachedPlaces = () => client.getQueryData<PlaceView[]>(queryKeys.places());
  await waitFor(() => expect(cachedTasks()).toEqual(serverTasks));
  if (placesLoaded) await waitFor(() => expect(cachedPlaces()).toEqual(serverPlaces));
  const tick = (id: string, placeId: string, assigned: boolean) =>
    act(() => result.current.tick.mutate({ id, placeId, assigned, title: "x" }));
  const placesOf = (id: string) =>
    result.current.shown.views
      ?.flatMap((task) => [task, ...task.subtasks])
      .find((row) => row.id === id)
      ?.places.map((place) => place.name);
  return { client, result, cachedTasks, cachedPlaces, tick, placesOf };
}

/** Each request on `key` waits for the next gate opened for it. */
function hold(key: string) {
  const gates: ReturnType<typeof gate>[] = [];
  handlers.set(key, () => {
    const next = gate();
    gates.push(next);
    return next.promise;
  });
  return gates;
}

describe("usePlaces", () => {
  it("loads the user's places once and keeps them for the session", async () => {
    const { result, client } = await harness();
    expect(client.getQueryData(queryKeys.places())).toEqual([salon, kuchnia, garaz]);
    renderHook(() => usePlaces(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    expect(result.current.shown.views).toBeDefined();
    expect(calls("GET", PLACES_URL)).toHaveLength(1);
  });
});

describe("useTogglePlace with useTaskViews", () => {
  it("shows a tick at once without writing the cache, PUTs it, then keeps the server's answer", async () => {
    const gates = hold(`PUT ${tickUrl(b.id, salon.id)}`);
    const { cachedTasks, tick, placesOf } = await harness();

    tick(b.id, salon.id, true);
    await waitFor(() => expect(placesOf(b.id)).toEqual(["Salon"]));
    expect(cachedTasks()).toEqual([a, b]);
    await waitFor(() => expect(gates).toHaveLength(1));

    const ticked = { ...b, places: [salon] };
    serverTasks = [a, ticked];
    gates[0]!.open(ok(ticked));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(cachedTasks()).toEqual([a, ticked]);
    expect(placesOf(b.id)).toEqual(["Salon"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("unticks with DELETE, and a failure puts the place back and reports it", async () => {
    handlers.set(`DELETE ${tickUrl(a.id, kuchnia.id)}`, () => fail(500, "internal", "Oops"));
    const { tick, placesOf } = await harness();

    tick(a.id, kuchnia.id, false);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(ApiError);
    expect(onError.mock.calls[0]![1]).toMatchObject({ id: a.id, placeId: kuchnia.id });
    expect(placesOf(a.id)).toEqual(["Kuchnia"]);
    // A failure that is not about the place leaves the places alone.
    expect(calls("GET", PLACES_URL)).toHaveLength(1);
  });

  it("refetches the places when the answer is a 404 about the place", async () => {
    handlers.set(`PUT ${tickUrl(b.id, garaz.id)}`, () => fail(404, "not_found", "Place not found"));
    const { tick, placesOf } = await harness();

    serverPlaces = [salon, kuchnia];
    tick(b.id, garaz.id, true);
    await waitFor(() => expect(calls("GET", PLACES_URL)).toHaveLength(2));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(placesOf(b.id)).toEqual([]);
  });

  it("sends a tick only after a delayed edit's answer, and the place never shows unticked", async () => {
    const edits = hold(`PATCH /api/tasks/${b.id}`);
    const ticks = hold(`PUT ${tickUrl(b.id, salon.id)}`);
    const { result, tick, placesOf } = await harness();

    act(() => void result.current.update.mutateAsync({ id: b.id, input: { title: "B2" } }));
    tick(b.id, salon.id, true);
    await waitFor(() => expect(edits).toHaveLength(1));
    expect(ticks).toHaveLength(0);
    expect(placesOf(b.id)).toEqual(["Salon"]);

    edits[0]!.open(ok({ ...b, title: "B2" }));
    await waitFor(() => expect(ticks).toHaveLength(1));
    expect(placesOf(b.id)).toEqual(["Salon"]);

    serverTasks = [a, { ...b, title: "B2", places: [salon] }];
    ticks[0]!.open(ok(serverTasks[1]));
    await waitFor(() => expect(calls("GET", TASKS_URL)).toHaveLength(2));
    expect(placesOf(b.id)).toEqual(["Salon"]);
  });
});

describe("useCreatePlace", () => {
  it("adds the server's place to the cache, after the others", async () => {
    const jadalnia = { id: crypto.randomUUID(), name: "Jadalnia", color: 9 };
    handlers.set(`POST ${PLACES_URL}`, (body) => {
      expect(body).toEqual({ name: "Jadalnia" });
      return ok(jadalnia);
    });
    const { result, cachedPlaces } = await harness();

    await act(() => result.current.createPlace.mutateAsync("Jadalnia"));
    expect(cachedPlaces()).toEqual([salon, kuchnia, garaz, jadalnia]);
  });

  it("leaves places that never loaded unloaded", async () => {
    handlers.set(`POST ${PLACES_URL}`, () => ok(salon));
    const { result, cachedPlaces } = await harness({ placesLoaded: false });

    await act(() => result.current.createPlace.mutateAsync("Salon"));
    expect(cachedPlaces()).toBeUndefined();
  });
});

describe("useUpdatePlace", () => {
  it("patches the places and every row holding it, without refetching the tasks (AC6, P2)", async () => {
    const renamed = { ...kuchnia, name: "Aneks", color: 9 };
    handlers.set(`PATCH ${placeUrl(kuchnia.id)}`, (body) => {
      expect(body).toEqual({ name: "Aneks", color: 9 });
      return ok(renamed);
    });
    const { result, cachedPlaces, placesOf } = await harness();

    await act(() =>
      result.current.updatePlace.mutateAsync({ placeId: kuchnia.id, name: "Aneks", color: 9 }),
    );
    expect(cachedPlaces()).toEqual([salon, renamed, garaz]);
    await waitFor(() => expect(placesOf(a.id)).toEqual(["Aneks"]));
    expect(calls("GET", TASKS_URL)).toHaveLength(1);
  });

  it("keeps a quick add still saving while it patches the rows (P2)", async () => {
    const adds = hold(`POST ${TASKS_URL}`);
    handlers.set(`PATCH ${placeUrl(kuchnia.id)}`, () => ok({ ...kuchnia, name: "Aneks" }));
    const { result, placesOf } = await harness();

    act(
      () =>
        void result.current.create
          .mutateAsync({ title: "New", description: null, estimate: null, parentId: null })
          .catch(() => undefined),
    );
    await waitFor(() => expect(adds).toHaveLength(1));
    await act(() =>
      result.current.updatePlace.mutateAsync({ placeId: kuchnia.id, name: "Aneks", color: 4 }),
    );
    await waitFor(() => expect(placesOf(a.id)).toEqual(["Aneks"]));
    expect(result.current.shown.views!.some((row) => isPendingTaskId(row.id))).toBe(true);
  });

  it("refetches the places after a 404 (deleted in another tab), and rejects", async () => {
    handlers.set(`PATCH ${placeUrl(garaz.id)}`, () => fail(404, "not_found", "Place not found"));
    const { result } = await harness();

    await expect(
      act(() => result.current.updatePlace.mutateAsync({ placeId: garaz.id, name: "G", color: 5 })),
    ).rejects.toBeInstanceOf(ApiError);
    await waitFor(() => expect(calls("GET", PLACES_URL)).toHaveLength(2));
  });

  it("rejects a 409 without refetching the places", async () => {
    handlers.set(`PATCH ${placeUrl(garaz.id)}`, () =>
      fail(409, "conflict", "A place with this name already exists."),
    );
    const { result } = await harness();

    await expect(
      act(() =>
        result.current.updatePlace.mutateAsync({ placeId: garaz.id, name: "Salon", color: 5 }),
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls("GET", PLACES_URL)).toHaveLength(1);
  });
});

describe("useDeletePlace", () => {
  it("removes the place from the places and from every row, without refetching the tasks (AC7)", async () => {
    handlers.set(`DELETE ${placeUrl(kuchnia.id)}`, () => ok(null));
    const { result, cachedPlaces, placesOf } = await harness();

    await act(() => result.current.deletePlace.mutateAsync(kuchnia.id));
    expect(cachedPlaces()).toEqual([salon, garaz]);
    await waitFor(() => expect(placesOf(a.id)).toEqual([]));
    expect(calls("GET", TASKS_URL)).toHaveLength(1);
  });

  it("treats a place already gone (404) as deleted", async () => {
    handlers.set(`DELETE ${placeUrl(kuchnia.id)}`, () => fail(404, "not_found", "Place not found"));
    const { result, cachedPlaces } = await harness();

    await act(() => result.current.deletePlace.mutateAsync(kuchnia.id));
    expect(cachedPlaces()).toEqual([salon, garaz]);
  });

  it("rejects any other failure and keeps the place", async () => {
    handlers.set(`DELETE ${placeUrl(kuchnia.id)}`, () => fail(500, "internal", "Oops"));
    const { result, cachedPlaces } = await harness();

    await expect(
      act(() => result.current.deletePlace.mutateAsync(kuchnia.id)),
    ).rejects.toBeInstanceOf(ApiError);
    expect(cachedPlaces()).toEqual([salon, kuchnia, garaz]);
  });

  it("skips a queued tick of the deleted place, whose 404 answer then refetches the places (P9)", async () => {
    const edits = hold(`PATCH /api/tasks/${b.id}`);
    handlers.set(`PUT ${tickUrl(b.id, garaz.id)}`, () => fail(404, "not_found", "Place not found"));
    handlers.set(`DELETE ${placeUrl(garaz.id)}`, () => ok(null));
    const { result, tick, placesOf } = await harness();

    act(() => void result.current.update.mutateAsync({ id: b.id, input: { title: "B2" } }));
    tick(b.id, garaz.id, true);
    await waitFor(() => expect(placesOf(b.id)).toEqual(["Garaż"]));

    serverPlaces = [salon, kuchnia];
    await act(() => result.current.deletePlace.mutateAsync(garaz.id));
    await waitFor(() => expect(placesOf(b.id)).toEqual([]));

    edits[0]!.open(ok({ ...b, title: "B2" }));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(calls("GET", PLACES_URL)).toHaveLength(2));
    expect(placesOf(b.id)).toEqual([]);
  });
});
