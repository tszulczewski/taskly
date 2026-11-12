import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type TaskView,
  updateTaskInput,
} from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const updateTask = vi.fn();
const deleteTask = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, updateTask, deleteTask }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { PATCH, DELETE } = await import("./route");

const TASK = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";
const URL_ = `http://x/api/tasks/${TASK}`;
// A row value that must never appear in a response body or log line when the output is invalid.
const SECRET = "Grout behind the bath";
const parent: TaskView = {
  id: TASK,
  title: SECRET,
  description: "North wall",
  estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
  completed: false,
  important: false,
  urgent: false,
  position: "a0",
  unestimatedSubtasks: 1,
  subtasks: [
    {
      completed: false,
      important: false,
      urgent: false,
      position: "a0",
      id: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a",
      title: "Plaster",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    },
    {
      completed: false,
      important: false,
      urgent: false,
      position: "a0",
      id: "9c8d6f1c-2d3e-4b5a-8e9f-0a1b2c3d4e5f",
      title: "Paint",
      description: null,
      estimate: null,
    },
  ],
};
const ctx = { params: Promise.resolve({ taskId: TASK }) };
const CSRF = { "x-requested-with": "taskly" };

const patch = (body: string, headers: Record<string, string> = CSRF) =>
  PATCH(new Request(URL_, { method: "PATCH", headers, body }), ctx);
const del = (headers: Record<string, string> = CSRF) =>
  DELETE(new Request(URL_, { method: "DELETE", headers }), ctx);

const domainErrors = [
  [new ForbiddenError(), 403, "forbidden", "Forbidden"],
  [new NotFoundError("Task"), 404, "not_found", "Task not found"],
  [new ConflictError("Invalid estimate"), 409, "conflict", "Invalid estimate"],
] as const;

beforeEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("PATCH /api/tasks/[taskId]", () => {
  it("updates the task from the body as sent and returns its view", async () => {
    updateTask.mockResolvedValue(parent);
    const body = { title: "Bathroom", estimate: null, parentId: TASK };
    const res = await patch(JSON.stringify(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: parent });
    expect(updateTask).toHaveBeenCalledExactlyOnceWith(db, "u1", TASK, body);
  });

  it("rejects a request without the CSRF header before reading the session", async () => {
    const res = await patch(JSON.stringify({ title: "x" }), {});
    expect(res.status).toBe(403);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await patch(JSON.stringify({ title: "x" }))).status).toBe(401);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("checks the session before the body: a malformed body without a session is 401", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await patch("title=x")).status).toBe(401);
  });

  it("answers 400 for a body that is not JSON and never calls core", async () => {
    const res = await patch("title=x");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "validation_error" } });
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("answers 400 with the schema's field errors", async () => {
    updateTask.mockImplementation(async (_db, _user, _task, input: unknown) => {
      throw updateTaskInput.safeParse(input).error;
    });
    const res = await patch(JSON.stringify({ estimate: { minGrosze: 2, maxGrosze: 1 } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: {
        code: "validation_error",
        fieldErrors: { "estimate.maxGrosze": [expect.any(String)] },
      },
    });
  });

  it.each(domainErrors)("maps %s from core", async (thrown, status, code, message) => {
    updateTask.mockRejectedValue(thrown);
    const res = await patch(JSON.stringify({ title: "x" }));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error: { code, message } });
  });

  it("turns malformed service output into the generic 500 without row values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    updateTask.mockResolvedValue({ ...parent, subtasks: undefined });
    const res = await patch(JSON.stringify({ title: SECRET }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(SECRET);
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: PATCH /api/tasks/${TASK}`,
    );
  });
});

describe("DELETE /api/tasks/[taskId]", () => {
  it("deletes a top-level task and answers null", async () => {
    deleteTask.mockResolvedValue(null);
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: null });
    expect(deleteTask).toHaveBeenCalledExactlyOnceWith(db, "u1", TASK);
  });

  it("returns the parent's view after deleting a subtask", async () => {
    deleteTask.mockResolvedValue(parent);
    expect(await (await del()).json()).toEqual({ ok: true, data: parent });
  });

  it("rejects a request without the CSRF header before reading the session", async () => {
    const res = await del({});
    expect(res.status).toBe(403);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it.each(domainErrors)("maps %s from core", async (thrown, status, code, message) => {
    deleteTask.mockRejectedValue(thrown);
    const res = await del();
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error: { code, message } });
  });

  it("turns malformed service output into the generic 500 without row values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteTask.mockResolvedValue({ ...parent, id: "not-a-uuid" });
    const res = await del();
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(SECRET);
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: DELETE /api/tasks/${TASK}`,
    );
  });
});
