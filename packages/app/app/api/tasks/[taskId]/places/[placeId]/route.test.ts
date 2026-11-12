import { ForbiddenError, NotFoundError, type TaskView } from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const setTaskPlace = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, setTaskPlace }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { PUT, DELETE } = await import("./route");

const TASK = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";
const PLACE = "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a";
const URL_ = `http://x/api/tasks/${TASK}/places/${PLACE}`;
const CSRF = { "x-requested-with": "taskly" };
const ctx = { params: Promise.resolve({ taskId: TASK, placeId: PLACE }) };
const view: TaskView = {
  id: TASK,
  title: "Curtain rod",
  description: null,
  estimate: null,
  completed: false,
  important: false,
  urgent: false,
  places: [{ id: PLACE, name: "Salon", color: 1 }],
  position: "a0",
  unestimatedSubtasks: 0,
  subtasks: [],
};

const call = (handler: typeof PUT, method: string, headers: Record<string, string> = CSRF) =>
  handler(new Request(URL_, { method, headers }), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe.each([
  ["PUT", PUT, true],
  ["DELETE", DELETE, false],
] as const)("%s /api/tasks/[taskId]/places/[placeId]", (method, handler, assigned) => {
  it("sets the assignment through core, with no body, and returns the task view", async () => {
    setTaskPlace.mockResolvedValue(view);
    const res = await call(handler, method);
    expect(await res.json()).toEqual({ ok: true, data: view });
    expect(setTaskPlace).toHaveBeenCalledExactlyOnceWith(db, "u1", TASK, PLACE, { assigned });
  });

  it.each([
    [new ForbiddenError(), 403],
    [new NotFoundError("Place"), 404],
    [new NotFoundError("Task"), 404],
  ] as const)("maps %s from core", async (thrown, status) => {
    setTaskPlace.mockRejectedValue(thrown);
    expect((await call(handler, method)).status).toBe(status);
  });

  it("answers 401 without a session and 403 without the CSRF header, never calling core", async () => {
    getSessionUser.mockResolvedValueOnce(null);
    expect((await call(handler, method)).status).toBe(401);
    expect((await call(handler, method, {})).status).toBe(403);
    expect(setTaskPlace).not.toHaveBeenCalled();
  });
});
