import {
  ConflictError,
  ForbiddenError,
  moveTaskInput,
  NotFoundError,
  type TaskView,
} from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const moveTask = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, moveTask }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { PUT } = await import("./route");

const TASK = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";
const URL_ = `http://x/api/tasks/${TASK}/position`;
const view: TaskView = {
  id: TASK,
  title: "Bathroom",
  description: null,
  estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
  completed: false,
  important: false,
  urgent: false,
  places: [],
  position: "a0",
  unestimatedSubtasks: 0,
  subtasks: [
    {
      id: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a",
      title: "Plaster",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    },
  ],
};
const ctx = { params: Promise.resolve({ taskId: TASK }) };
const CSRF = { "x-requested-with": "taskly" };

const put = (body: string, headers: Record<string, string> = CSRF) =>
  PUT(new Request(URL_, { method: "PUT", headers, body }), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("PUT /api/tasks/[taskId]/position", () => {
  it("passes the body as sent to core and returns the task view", async () => {
    moveTask.mockResolvedValue(view);
    const body = { afterId: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a", beforeId: null };
    const res = await put(JSON.stringify(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: view });
    expect(moveTask).toHaveBeenCalledExactlyOnceWith(db, "u1", TASK, body);
  });

  it("rejects a request without the CSRF header before reading the session", async () => {
    const res = await put(
      JSON.stringify({ afterId: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a", beforeId: null }),
      {},
    );
    expect(res.status).toBe(403);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(moveTask).not.toHaveBeenCalled();
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(
      (
        await put(
          JSON.stringify({ afterId: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a", beforeId: null }),
        )
      ).status,
    ).toBe(401);
    expect(moveTask).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON and never calls core", async () => {
    const res = await put("afterId=x");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "validation_error" } });
    expect(moveTask).not.toHaveBeenCalled();
  });

  it("answers 400 with the schema's field errors", async () => {
    moveTask.mockImplementation(async (_db, _user, _task, input: unknown) => {
      throw moveTaskInput.safeParse(input).error;
    });
    const res = await put(JSON.stringify({ afterId: "x", beforeId: null }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "validation_error", fieldErrors: { afterId: [expect.any(String)] } },
    });
  });

  it.each([
    [new ForbiddenError(), 403, "forbidden", "Forbidden"],
    [new NotFoundError("Task"), 404, "not_found", "Task not found"],
    [
      new ConflictError("The list changed. Try again."),
      409,
      "conflict",
      "The list changed. Try again.",
    ],
    [new ConflictError("Task is completed"), 409, "conflict", "Task is completed"],
  ] as const)("maps %s from core", async (thrown, status, code, message) => {
    moveTask.mockRejectedValue(thrown);
    const res = await put(
      JSON.stringify({ afterId: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a", beforeId: null }),
    );
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error: { code, message } });
  });

  it("turns malformed service output into the generic 500 without row values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    moveTask.mockResolvedValue({ ...view, subtasks: undefined });
    const res = await put(
      JSON.stringify({ afterId: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a", beforeId: null }),
    );
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("Bathroom");
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: PUT /api/tasks/${TASK}/position`,
    );
  });
});
