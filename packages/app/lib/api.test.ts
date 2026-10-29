import {
  createTaskInput,
  deleteTaskResponseSchema,
  ForbiddenError,
  MAX_ESTIMATE_GROSZE,
  type ResponseSchema,
  taskListResponseSchema,
  type TaskView,
  taskViewSchema,
  UnauthorizedError,
} from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser }));

const { apiHandler, requireUser } = await import("./api");

const post = (headers: Record<string, string> = {}) =>
  new Request("http://x/api", { method: "POST", headers });

describe("apiHandler", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("wraps results in the success envelope", async () => {
    const res = await apiHandler(async () => ({ a: 1 }))(new Request("http://x/api"), {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });

  it("rejects mutating requests without the CSRF header", async () => {
    const fn = vi.fn();
    const res = await apiHandler(fn)(post(), {});
    expect(res.status).toBe(403);
    expect(fn).not.toHaveBeenCalled();
  });

  it("accepts mutating requests with the CSRF header", async () => {
    const res = await apiHandler(async () => "ok")(post({ "x-requested-with": "taskly" }), {});
    expect(await res.json()).toEqual({ ok: true, data: "ok" });
  });

  it("maps domain errors to statuses without logging", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new ForbiddenError();
    })(new Request("http://x/api"), {});
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs and hides unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new Error("db password leaked");
    })(new Request("http://x/api"), {});
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
    expect(spy).toHaveBeenCalledOnce();
  });
});

// A marker that must never appear in a response body or a log line when the output is invalid.
const SECRET = "Row title 7f3a";
const ID = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";
const SUB_ID = "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a";
const task: TaskView = {
  id: ID,
  title: SECRET,
  description: "Behind the sink",
  estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
  unestimatedSubtasks: 0,
  subtasks: [],
};
const parent: TaskView = {
  ...task,
  estimate: { minGrosze: MAX_ESTIMATE_GROSZE, maxGrosze: MAX_ESTIMATE_GROSZE + 1 },
  unestimatedSubtasks: 1,
  subtasks: [
    {
      id: SUB_ID,
      title: "Plaster",
      description: null,
      estimate: { minGrosze: MAX_ESTIMATE_GROSZE, maxGrosze: MAX_ESTIMATE_GROSZE + 1 },
    },
    {
      id: "9c8d6f1c-2d3e-4b5a-8e9f-0a1b2c3d4e5f",
      title: "Paint",
      description: null,
      estimate: null,
    },
  ],
};
const without = (key: keyof TaskView) =>
  Object.fromEntries(Object.entries(task).filter(([k]) => k !== key));

const GENERIC_500 = {
  ok: false,
  error: { code: "internal_error", message: "Something went wrong" },
};

// The query string is in the request but must not reach the log line.
function respond(schema: ResponseSchema<unknown>, value: unknown) {
  const req = new Request("http://x/api/lists/l1/tasks?q=1");
  return apiHandler(async () => value, { response: schema })(req, {});
}

describe("apiHandler with a response schema", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([
    ["a task", taskViewSchema, task],
    ["a parent with subtasks and a sum above the input cap", taskViewSchema, parent],
    ["a list", taskListResponseSchema, [task, parent]],
    ["an empty list", taskListResponseSchema, []],
    ["null after deleting a top-level task", deleteTaskResponseSchema, null],
    ["the parent after deleting a subtask", deleteTaskResponseSchema, parent],
  ] as const)("sends %s unchanged", async (_, schema, value) => {
    const res = await respond(schema, value);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: value });
  });

  it("accepts additive unknown fields and sends the parsed value without them", async () => {
    const res = await respond(taskViewSchema, {
      ...task,
      position: "a0",
      subtasks: [{ ...parent.subtasks[1], listId: "l1" }],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      data: { ...task, subtasks: [parent.subtasks[1]] },
    });
  });

  it.each([
    ["no unestimatedSubtasks", taskViewSchema, without("unestimatedSubtasks")],
    ["no subtasks", taskViewSchema, without("subtasks")],
    ["no estimate key", taskViewSchema, without("estimate")],
    ["no description key", taskViewSchema, without("description")],
    ["a non-uuid id", taskViewSchema, { ...task, id: "42" }],
    ["a numeric title", taskViewSchema, { ...task, title: 42, description: SECRET }],
    ["unestimatedSubtasks as a string", taskViewSchema, { ...task, unestimatedSubtasks: "0" }],
    ["a negative unestimatedSubtasks", taskViewSchema, { ...task, unestimatedSubtasks: -1 }],
    ["fractional grosze", taskViewSchema, { ...task, estimate: { minGrosze: 1.5, maxGrosze: 2 } }],
    ["min above max", taskViewSchema, { ...task, estimate: { minGrosze: 3, maxGrosze: 2 } }],
    [
      "a subtask missing its estimate",
      taskViewSchema,
      { ...task, subtasks: [{ id: ID, title: "P", description: null }] },
    ],
    ["one bad row in a list", taskListResponseSchema, [task, without("unestimatedSubtasks")]],
    ["an object instead of a list", taskListResponseSchema, task],
    ["undefined from delete", deleteTaskResponseSchema, undefined],
  ] as const)(
    "turns %s into a generic 500 and logs only a fixed line",
    async (_, schema, value) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await respond(schema, value);
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(JSON.parse(text)).toEqual(GENERIC_500);
      expect(text).not.toContain(SECRET);
      expect(spy.mock.calls).toEqual([
        ["Response failed its output contract: GET /api/lists/l1/tasks"],
      ]);
    },
  );

  it("still maps an input ZodError to 400 with field errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const req = new Request("http://x/api/lists/l1/tasks", {
      method: "POST",
      headers: { "x-requested-with": "taskly" },
      body: JSON.stringify({ title: "" }),
    });
    const res = await apiHandler(
      async (r) => {
        createTaskInput.parse(await r.json());
        return task;
      },
      { response: taskViewSchema },
    )(req, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: { code: "validation_error", fieldErrors: { title: ["Enter a title."] } },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs a thrown error as before and never checks it against the schema", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const safeParse = vi.fn();
    const boom = new Error("boom");
    const res = await apiHandler(
      async () => {
        throw boom;
      },
      { response: { safeParse } },
    )(new Request("http://x/api"), {});
    expect(res.status).toBe(500);
    expect(safeParse).not.toHaveBeenCalled();
    expect(spy.mock.calls).toEqual([["Unhandled API error", boom]]);
  });

  it("types the handler's result from the schema", () => {
    apiHandler(async () => task, { response: taskViewSchema });
    apiHandler(async () => null, { response: deleteTaskResponseSchema });
    // @ts-expect-error -- a result that does not match the schema's type is a compile error
    apiHandler(async () => ({ title: 1 }), { response: taskViewSchema });
  });

  it("sends invalid data unchanged when no schema is given", async () => {
    const res = await apiHandler(async () => without("subtasks"))(new Request("http://x/api"), {});
    expect(await res.json()).toEqual({ ok: true, data: without("subtasks") });
  });
});

describe("requireUser", () => {
  it("returns the signed-in user", async () => {
    getSessionUser.mockResolvedValueOnce({ id: "u1" });
    expect(await requireUser(new Request("http://x/"))).toEqual({ id: "u1" });
  });

  it("throws UnauthorizedError without a session", async () => {
    getSessionUser.mockResolvedValueOnce(null);
    await expect(requireUser(new Request("http://x/"))).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
