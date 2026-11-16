import {
  ConflictError,
  createTaskInput,
  ForbiddenError,
  NotFoundError,
  type TaskView,
} from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const listTasks = vi.fn();
const createTask = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, listTasks, createTask }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { GET, POST } = await import("./route");

const LIST = "5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d1c";
const URL_ = `http://x/api/lists/${LIST}/tasks`;
// A row value that must never appear in a response body or log line when the output is invalid.
const SECRET = "Grout behind the bath";
const task: TaskView = {
  completed: false,
  important: false,
  urgent: false,
  places: [],
  position: "a0",
  id: "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f",
  title: SECRET,
  description: null,
  estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
  unestimatedSubtasks: 0,
  subtasks: [],
};
const ctx = { params: Promise.resolve({ listId: LIST }) };
const CSRF = { "x-requested-with": "taskly" };

const get = () => GET(new Request(URL_), ctx);
const post = (body: string, headers: Record<string, string> = CSRF) =>
  POST(new Request(URL_, { method: "POST", headers, body }), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("GET /api/lists/[listId]/tasks", () => {
  it("lists the user's tasks of that list in the success envelope", async () => {
    listTasks.mockResolvedValue([task]);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: [task] });
    expect(listTasks).toHaveBeenCalledExactlyOnceWith(db, "u1", LIST);
    // Only the headers: no `disableRefresh`, so this read renews a session that is due (sign-in spec).
    expect(getSessionUser.mock.calls[0]).toEqual([expect.any(Headers)]);
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "unauthorized", message: "Unauthorized" },
    });
    expect(listTasks).not.toHaveBeenCalled();
  });

  it("answers 404 for a list the user is not a member of", async () => {
    listTasks.mockRejectedValue(new NotFoundError("List"));
    const res = await get();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "List not found" },
    });
  });

  it("turns malformed service output into the generic 500 without row values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    listTasks.mockResolvedValue([{ ...task, unestimatedSubtasks: undefined }]);
    const res = await get();
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      ok: false,
      error: { code: "internal_error", message: "Something went wrong" },
    });
    expect(body).not.toContain(SECRET);
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: GET /api/lists/${LIST}/tasks`,
    );
  });
});

describe("POST /api/lists/[listId]/tasks", () => {
  it("creates the task from the body as sent and returns it", async () => {
    createTask.mockResolvedValue(task);
    // Extra keys reach core unchanged: core's schema decides what is kept, the route never picks.
    const body = { title: "Tiles", estimate: { minGrosze: 1, maxGrosze: 2 }, position: "a0" };
    const res = await post(JSON.stringify(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: task });
    expect(createTask).toHaveBeenCalledExactlyOnceWith(db, "u1", LIST, body);
  });

  it("strips fields the response schema does not know", async () => {
    createTask.mockResolvedValue({ ...task, listId: LIST, position: "a0" });
    expect(await (await post("{}")).json()).toEqual({ ok: true, data: task });
  });

  it("rejects a request without the CSRF header before reading the session", async () => {
    const res = await post(JSON.stringify({ title: "Tiles" }), {});
    expect(res.status).toBe(403);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await post(JSON.stringify({ title: "Tiles" }))).status).toBe(401);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("checks the session before the body: a malformed body without a session is 401", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await post("{title:")).status).toBe(401);
  });

  it.each([
    ["malformed JSON", "{title:"],
    ["an empty body", ""],
  ])("answers 400 for %s and never calls core", async (_, body) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "validation_error", message: "Invalid JSON body" },
    });
    expect(createTask).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("answers 400 with the schema's field errors", async () => {
    createTask.mockImplementation(async (_db, _user, _list, input: unknown) => {
      throw createTaskInput.safeParse(input).error;
    });
    const res = await post(
      JSON.stringify({ title: " ", estimate: { minGrosze: 500, maxGrosze: 100 } }),
    );
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as {
      error: { code: string; fieldErrors: Record<string, string[]> };
    };
    expect(error.code).toBe("validation_error");
    expect(Object.keys(error.fieldErrors).sort()).toEqual(["estimate.maxGrosze", "title"]);
  });

  it.each([
    [new ForbiddenError(), 403, "forbidden", "Forbidden"],
    [new NotFoundError("List"), 404, "not_found", "List not found"],
    [new ConflictError("Please try again"), 409, "conflict", "Please try again"],
  ])("maps %s from core", async (thrown, status, code, message) => {
    createTask.mockRejectedValue(thrown);
    const res = await post(JSON.stringify({ title: "Tiles" }));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error: { code, message } });
  });

  it("turns malformed service output into the generic 500 without row values", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    createTask.mockResolvedValue({ ...task, estimate: { minGrosze: 2, maxGrosze: 1 } });
    const res = await post(JSON.stringify({ title: SECRET }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(SECRET);
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: POST /api/lists/${LIST}/tasks`,
    );
  });
});
