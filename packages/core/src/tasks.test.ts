import { schema } from "@taskly/db";
import { DrizzleQueryError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { requireRole } from "./access";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { taskViewSchema } from "./schemas";
import {
  createTask,
  deleteTask,
  listTasks,
  requireTaskRole,
  setTaskCompleted,
  setTaskPlace,
  updateTask,
} from "./tasks";
import type { Db } from "./types";

vi.mock("./access", () => ({ requireRole: vi.fn() }));
const mockedRequireRole = vi.mocked(requireRole);

const userId = "u1";
const listId = "6f1c1d0e-8a39-4c52-9a4e-0d3f6b2a7e11";
const taskId = "0b7e3c52-5d1a-4f0e-8c6b-2a9d4e1f3c77";
const ids = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  a1: "33333333-3333-4333-8333-333333333333",
  a2: "44444444-4444-4444-8444-444444444444",
  b1: "55555555-5555-4555-8555-555555555555",
};

type Logged = { sql: string; params: unknown[] } | string;

const PLACES_SELECT =
  'select "task_places"."task_id", "places"."id", "places"."name", "places"."color" from "task_places" inner join "places" on "places"."id" = "task_places"."place_id" inner join "tasks" on "tasks"."id" = "task_places"."task_id" where ';
const PLACES_ORDER = ' order by "places"."position" COLLATE "C", "places"."id" asc';
/** Rows for the next places reads (`[taskId, placeId, name, color]`); none by default. */
let placeReplies: unknown[][][] = [];
type Reply = unknown[][] | unknown;

/**
 * A real drizzle `Db` over a fake pg client: no network, but the SQL text and params drizzle sends
 * are recorded, and a failing query is wrapped in a DrizzleQueryError as in production. Each
 * non-transaction query takes the next reply: rows (in array mode, columns in select order) or
 * a value to throw. `requireRole` is mocked and logged as "requireRole <action>".
 */
function fakeDb(...replies: Reply[]) {
  const log: Logged[] = [];
  const placeLog: { sql: string; params: unknown[] }[] = [];
  const client = {
    query: vi.fn(async (config: { text: string }, params: unknown[] = []) => {
      if (/^(begin|commit|rollback)$/.test(config.text)) {
        log.push(config.text);
        return { rows: [] };
      }
      // The places read of every view: logged apart, so the tests of the task SQL stay readable.
      if (config.text.startsWith(PLACES_SELECT)) {
        placeLog.push({ sql: config.text, params });
        return { rows: placeReplies.shift() ?? [] };
      }
      log.push({ sql: config.text, params });
      if (replies.length === 0) throw new Error(`unexpected query: ${config.text}`);
      const reply = replies.shift();
      if (!Array.isArray(reply)) throw reply;
      return { rows: reply };
    }),
  };
  const db = drizzle({ client: client as unknown as Pool, schema }) as unknown as Db;
  return { db, log, placeLog };
}

/** A pg error as node-postgres raises it, with row values in its detail. */
function pgError(code: string) {
  return Object.assign(new Error(`pg says ${code}`), {
    code,
    detail: "Failing row contains (secret title)",
  });
}

beforeEach(() => {
  mockedRequireRole.mockReset();
  placeReplies = [];
});

function grantRole(log: Logged[], role: "owner" | "editor" | "viewer" = "editor") {
  mockedRequireRole.mockImplementation(async (_tx, _user, _list, action) => {
    log.push(`requireRole ${action}`);
    return role;
  });
}

const lockList = {
  sql: 'select "id" from "lists" where "lists"."id" = $1 for no key update',
  params: [listId],
};
const lastTopLevel = {
  sql: 'select "position" from "tasks" where ("tasks"."list_id" = $1 and "tasks"."parent_id" is null) order by "tasks"."position" COLLATE "C" desc limit $2',
  params: [listId, 1],
};
const insertSql =
  'insert into "tasks" ("id", "list_id", "parent_id", "title", "description", "status", "position", "estimate_min_grosze", "estimate_max_grosze", "cost_grosze", "important", "urgent", "created_at") values (default, $1, $2, $3, $4, default, $5, $6, $7, default, default, default, default) returning "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze", "status", "position", "important", "urgent"';

// requireTaskRole's queries, also the start of updateTask and deleteTask.
const readListId = {
  sql: 'select "list_id" from "tasks" where "tasks"."id" = $1',
  params: [taskId],
};
const lockTask = {
  sql: 'select "id", "list_id", "parent_id", "title", "description", "status", "position", "estimate_min_grosze", "estimate_max_grosze", "cost_grosze", "important", "urgent", "created_at" from "tasks" where "tasks"."id" = $1 for update',
  params: [taskId],
};
const createdAt = "2026-10-29T10:00:00.000Z";
const taskRow = [
  taskId,
  listId,
  null,
  "Tiles",
  null,
  "todo",
  "a0",
  100,
  200,
  null,
  false,
  false,
  createdAt,
];
/** The same id as a subtask of ids.a. */
const subtaskRow = [
  taskId,
  listId,
  ids.a,
  "Plaster",
  null,
  "todo",
  "a0",
  300,
  400,
  null,
  false,
  false,
  createdAt,
];
/** `topLevelView`'s query for the top-level task `id`. */
const viewQueryOf = (id: string) => ({
  sql: 'select "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze", "status", "position", "important", "urgent" from "tasks" where ("tasks"."id" = $1 or "tasks"."parent_id" = $2) order by ("tasks"."status" = \'done\'), "tasks"."position" COLLATE "C", "tasks"."id" asc',
  params: [id, id],
});

describe("createTask", () => {
  it("authorizes write, locks the list row, appends after the last top-level task and returns its view", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [["a0"]],
      [[taskId, null, "Tiles", "Grey ones", 150000, 200000, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await createTask(db, userId, listId, {
      title: "  Tiles ",
      description: " Grey ones ",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
    });

    expect(view).toEqual({
      id: taskId,
      title: "Tiles",
      description: "Grey ones",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    expect(taskViewSchema.parse(view)).toEqual(view);
    expect(mockedRequireRole).toHaveBeenCalledWith(expect.anything(), userId, listId, "write");
    expect(log).toEqual([
      "begin",
      "requireRole write",
      lockList,
      lastTopLevel,
      { sql: insertSql, params: [listId, null, "Tiles", "Grey ones", "a1", 150000, 200000] },
      "commit",
    ]);
  });

  it("gives the first task of a list the first key and stores no estimate or description by default", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [],
      [[taskId, null, "Paint", null, null, null, "todo", "a0", false, false]],
    );
    grantRole(log);

    await expect(createTask(db, userId, listId, { title: "Paint" })).resolves.toEqual({
      id: taskId,
      title: "Paint",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    expect(log[4]).toEqual({
      sql: insertSql,
      params: [listId, null, "Paint", null, "a0", null, null],
    });
  });

  it("stores an exact price as min = max", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [],
      [[taskId, null, "Rod", null, 5000, 5000, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await createTask(db, userId, listId, {
      title: "Rod",
      estimate: { minGrosze: 5000, maxGrosze: 5000 },
    });

    expect(view.estimate).toEqual({ minGrosze: 5000, maxGrosze: 5000 });
    expect(log[4]).toEqual({
      sql: insertSql,
      params: [listId, null, "Rod", null, "a0", 5000, 5000],
    });
  });

  it("never writes keys outside the parsed input (listId comes from the argument)", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [],
      [[taskId, null, "Rod", null, null, null, "todo", "a0", false, false]],
    );
    grantRole(log);

    await createTask(db, userId, listId, {
      title: "Rod",
      listId: "99999999-9999-4999-8999-999999999999",
      position: "zzz",
      costGrosze: 1,
    });

    expect(log[4]).toEqual({
      sql: insertSql,
      params: [listId, null, "Rod", null, "a0", null, null],
    });
  });

  it("rejects invalid input before opening a transaction", async () => {
    const { db, log } = fakeDb();
    await expect(createTask(db, userId, listId, { title: " " })).rejects.toBeInstanceOf(ZodError);
    await expect(
      createTask(db, userId, listId, {
        title: "x",
        estimate: { minGrosze: 2, maxGrosze: 1 },
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createTask(db, userId, listId, { title: "x", parentId: "not-a-uuid" }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(log).toEqual([]);
    expect(mockedRequireRole).not.toHaveBeenCalled();
  });

  describe("with a parentId", () => {
    const newId = "66666666-6666-4666-8666-666666666666";
    const lockParent = {
      sql: 'select "parent_id", "status" from "tasks" where ("tasks"."id" = $1 and "tasks"."list_id" = $2) for key share',
      params: [ids.a, listId],
    };
    const lastSubtask = {
      sql: 'select "position" from "tasks" where ("tasks"."list_id" = $1 and "tasks"."parent_id" = $2) order by "tasks"."position" COLLATE "C" desc limit $3',
      params: [listId, ids.a, 1],
    };

    it("locks the list, then the parent FOR KEY SHARE, appends after the last subtask and returns the parent's view", async () => {
      const { db, log } = fakeDb(
        [[listId]],
        [[null, "todo"]],
        [["a0"]],
        [[newId, ids.a, "Paint", "White", 50000, 50000, "todo", "a1", false, false]],
        [
          [ids.a1, ids.a, "Plaster", null, 30000, 40000, "done", "a0", false, false],
          [ids.a, null, "Bathroom", "Walls", 100000, 200000, "todo", "a0", false, false],
          [newId, ids.a, "Paint", "White", 50000, 50000, "todo", "a1", false, false],
        ],
      );
      grantRole(log);

      const view = await createTask(db, userId, listId, {
        title: "Paint",
        description: "White",
        estimate: { minGrosze: 50000, maxGrosze: 50000 },
        parentId: ids.a,
      });

      expect(view).toEqual({
        id: ids.a,
        title: "Bathroom",
        description: "Walls",
        estimate: { minGrosze: 80000, maxGrosze: 90000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 0,
        subtasks: [
          {
            id: ids.a1,
            title: "Plaster",
            description: null,
            estimate: { minGrosze: 30000, maxGrosze: 40000 },
            completed: true,
            important: false,
            urgent: false,
            places: [],
            position: "a0",
          },
          {
            id: newId,
            title: "Paint",
            description: "White",
            estimate: { minGrosze: 50000, maxGrosze: 50000 },
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: "a1",
          },
        ],
      });
      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(log).toEqual([
        "begin",
        "requireRole write",
        lockList,
        lockParent,
        lastSubtask,
        { sql: insertSql, params: [listId, ids.a, "Paint", "White", "a1", 50000, 50000] },
        viewQueryOf(ids.a),
        "commit",
      ]);
    });

    it("gives the first subtask the first key", async () => {
      const { db, log } = fakeDb(
        [[listId]],
        [[null, "todo"]],
        [],
        [[newId, ids.a, "Paint", null, null, null]],
        [
          [ids.a, null, "Bathroom", null, 100000, 200000, "todo", "a0", false, false],
          [newId, ids.a, "Paint", null, null, null],
        ],
      );
      grantRole(log);

      const view = await createTask(db, userId, listId, { title: "Paint", parentId: ids.a });

      expect(log[5]).toEqual({
        sql: insertSql,
        params: [listId, ids.a, "Paint", null, "a0", null, null],
      });
      // The parent's own figure is hidden by its subtask, not changed (no write to the parent).
      expect(view).toEqual(expect.objectContaining({ estimate: null, unestimatedSubtasks: 1 }));
      expect(log.filter((entry) => typeof entry !== "string" && /^update/.test(entry.sql))).toEqual(
        [],
      );
    });

    it("reports a parent that is missing or in another list as a missing task", async () => {
      const { db, log } = fakeDb([[listId]], []);
      grantRole(log);

      const error: unknown = await createTask(db, userId, listId, {
        title: "x",
        parentId: ids.a,
      }).catch((e: unknown) => e);

      expect(error).toEqual(new NotFoundError("Task"));
      expect((error as NotFoundError).resource).toBe("Task");
      expect(log).toEqual(["begin", "requireRole write", lockList, lockParent, "rollback"]);
    });

    it("refuses a subtask under a subtask", async () => {
      const { db, log } = fakeDb([[listId]], [[ids.b, "todo"]]);
      grantRole(log);

      await expect(createTask(db, userId, listId, { title: "x", parentId: ids.a })).rejects.toEqual(
        new ConflictError("Subtasks cannot have subtasks"),
      );
      expect(log).toEqual(["begin", "requireRole write", lockList, lockParent, "rollback"]);
    });

    it("refuses a subtask under a completed task and writes nothing (Q3)", async () => {
      const { db, log } = fakeDb([[listId]], [[null, "done"]]);
      grantRole(log);

      await expect(createTask(db, userId, listId, { title: "x", parentId: ids.a })).rejects.toEqual(
        new ConflictError("Task is completed"),
      );
      expect(log).toEqual(["begin", "requireRole write", lockList, lockParent, "rollback"]);
    });
  });

  it.each([new ForbiddenError(), new NotFoundError("List")])(
    "writes nothing when authorization fails with %s",
    async (error) => {
      const { db, log } = fakeDb();
      mockedRequireRole.mockRejectedValue(error);
      await expect(createTask(db, userId, listId, { title: "x" })).rejects.toBe(error);
      expect(log).toEqual(["begin", "rollback"]);
    },
  );

  describe("translates constraint violations after the rollback", () => {
    it.each([
      ["23503", NotFoundError, "Task not found"],
      ["23505", ConflictError, "Please try again"],
      ["23514", ConflictError, "Invalid estimate"],
    ] as const)("%s raised by the insert (wrapped by drizzle)", async (code, Type, message) => {
      const { db, log } = fakeDb([[listId]], [], pgError(code));
      grantRole(log);

      const error: unknown = await createTask(db, userId, listId, { title: "secret title" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(Type);
      expect(error).toEqual(expect.objectContaining({ message }));
      // Neither pg's message and detail nor drizzle's SQL params reach the new error.
      expect((error as Error).cause).toBeUndefined();
      expect(JSON.stringify(error)).not.toContain("secret");
      expect(log.at(-1)).toBe("rollback");
    });

    it.each([
      ["23503", NotFoundError, "Task not found"],
      ["23505", ConflictError, "Please try again"],
      ["23514", ConflictError, "Invalid estimate"],
    ] as const)("%s raised unwrapped", async (code, Type, message) => {
      const { db, log } = fakeDb();
      mockedRequireRole.mockRejectedValue(pgError(code));

      const error: unknown = await createTask(db, userId, listId, { title: "x" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(Type);
      expect((error as Error).message).toBe(message);
      expect(log).toEqual(["begin", "rollback"]);
    });

    it("passes any other database error through unchanged", async () => {
      const deadlock = pgError("40P01");
      const { db, log } = fakeDb([[listId]], deadlock);
      grantRole(log);

      const error: unknown = await createTask(db, userId, listId, { title: "x" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(DrizzleQueryError);
      expect((error as DrizzleQueryError).cause).toBe(deadlock);
    });

    it("passes a drizzle error without a cause through unchanged", async () => {
      const wrapped = new DrizzleQueryError("select 1", []);
      const { db } = fakeDb();
      mockedRequireRole.mockRejectedValue(wrapped);
      await expect(createTask(db, userId, listId, { title: "x" })).rejects.toBe(wrapped);
    });

    it.each([
      ["an error without a code", new Error("boom")],
      ["a thrown string", "boom"],
      ["null", null],
      ["an unknown code", { code: 23505 }],
    ])("passes %s through unchanged", async (_name, thrown) => {
      const { db } = fakeDb();
      mockedRequireRole.mockRejectedValue(thrown);
      await expect(createTask(db, userId, listId, { title: "x" })).rejects.toBe(thrown);
    });
  });
});

describe("listTasks", () => {
  const listQuery = {
    sql: 'select "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze", "status", "position", "important", "urgent" from "tasks" where "tasks"."list_id" = $1 order by ("tasks"."status" = \'done\'), "tasks"."position" COLLATE "C", "tasks"."id" asc',
    params: [listId],
  };

  it("authorizes read and returns top-level tasks in order, each with its subtasks and rolled-up estimate", async () => {
    const { db, log } = fakeDb([
      [ids.a, null, "Bathroom", "Walls", 100000, 200000, "todo", "a0", false, false],
      [ids.a1, ids.a, "Plaster", null, 30000, 40000, "todo", "a0", false, false],
      [ids.b, null, "Kitchen", null, 70000, 70000, "todo", "a0", false, false],
      [ids.a2, ids.a, "Paint", "White", null, null, "todo", "a0", false, false],
      [ids.b1, ids.b, "Rail", null, 5000, 5000, "todo", "a0", false, false],
    ]);
    grantRole(log, "viewer");

    const views = await listTasks(db, userId, listId);

    expect(views).toEqual([
      {
        id: ids.a,
        title: "Bathroom",
        description: "Walls",
        estimate: { minGrosze: 30000, maxGrosze: 40000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 1,
        subtasks: [
          {
            id: ids.a1,
            title: "Plaster",
            description: null,
            estimate: { minGrosze: 30000, maxGrosze: 40000 },
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: "a0",
          },
          {
            id: ids.a2,
            title: "Paint",
            description: "White",
            estimate: null,
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: "a0",
          },
        ],
      },
      {
        id: ids.b,
        title: "Kitchen",
        description: null,
        estimate: { minGrosze: 5000, maxGrosze: 5000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 0,
        subtasks: [
          {
            id: ids.b1,
            title: "Rail",
            description: null,
            estimate: { minGrosze: 5000, maxGrosze: 5000 },
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: "a0",
          },
        ],
      },
    ]);
    expect(views.map((v) => taskViewSchema.parse(v))).toEqual(views);
    expect(log).toEqual(["begin", "requireRole read", listQuery, "commit"]);
  });

  it("maps a done row to completed: true and orders open rows before completed ones", async () => {
    const { db, log } = fakeDb([
      [ids.a, null, "Bathroom", null, null, null, "todo", "a0", false, false],
      [ids.a1, ids.a, "Plaster", null, null, null, "done", "a1", false, false],
      [ids.b, null, "Kitchen", null, null, null, "done", "a1", false, false],
    ]);
    grantRole(log, "viewer");

    const views = await listTasks(db, userId, listId);

    expect(views.map((v) => [v.id, v.completed, v.position])).toEqual([
      [ids.a, false, "a0"],
      [ids.b, true, "a1"],
    ]);
    expect(views[0]!.subtasks.map((v) => [v.id, v.completed, v.position])).toEqual([
      [ids.a1, true, "a1"],
    ]);
    expect(log[2]).toEqual(listQuery);
    expect((log[2] as { sql: string }).sql).toContain(
      'order by ("tasks"."status" = \'done\'), "tasks"."position" COLLATE "C"',
    );
  });

  it("returns a task's own estimate when it has no subtasks", async () => {
    const { db, log } = fakeDb([
      [ids.a, null, "Rod", null, 5000, 5000, "todo", "a0", false, false],
      [ids.b, null, "Shelf", null, null, null, "todo", "a0", false, false],
    ]);
    grantRole(log);

    await expect(listTasks(db, userId, listId)).resolves.toEqual([
      {
        id: ids.a,
        title: "Rod",
        description: null,
        estimate: { minGrosze: 5000, maxGrosze: 5000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 0,
        subtasks: [],
      },
      {
        id: ids.b,
        title: "Shelf",
        description: null,
        estimate: null,
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 0,
        subtasks: [],
      },
    ]);
  });

  it("treats a half-stored estimate as none (the pair CHECK forbids it)", async () => {
    const { db, log } = fakeDb([[ids.a, null, "Odd", null, 100, null, "todo", "a0", false, false]]);
    grantRole(log);
    const [view] = await listTasks(db, userId, listId);
    expect(view?.estimate).toBeNull();
  });

  it("returns an empty array for an empty list", async () => {
    const { db, log } = fakeDb([]);
    grantRole(log);
    await expect(listTasks(db, userId, listId)).resolves.toEqual([]);
  });

  it.each([new ForbiddenError(), new NotFoundError("List")])(
    "reads nothing when authorization fails with %s",
    async (error) => {
      const { db, log } = fakeDb();
      mockedRequireRole.mockRejectedValue(error);
      await expect(listTasks(db, userId, listId)).rejects.toBe(error);
      expect(log).toEqual(["begin", "rollback"]);
    },
  );
});

describe("requireTaskRole", () => {
  const run = (db: Db, id: string, action: "read" | "write" | "manage" = "write") =>
    db.transaction((tx) => requireTaskRole(tx, userId, id, action));

  it("reads the list unlocked, authorizes on it, then returns the task locked FOR UPDATE", async () => {
    const { db, log } = fakeDb([[listId]], [taskRow]);
    grantRole(log);

    await expect(run(db, taskId, "manage")).resolves.toEqual({
      id: taskId,
      listId,
      parentId: null,
      title: "Tiles",
      description: null,
      status: "todo",
      position: "a0",
      estimateMinGrosze: 100,
      estimateMaxGrosze: 200,
      costGrosze: null,
      important: false,
      urgent: false,
      createdAt: new Date(createdAt),
    });
    expect(mockedRequireRole).toHaveBeenCalledWith(expect.anything(), userId, listId, "manage");
    expect(log).toEqual(["begin", readListId, "requireRole manage", lockTask, "commit"]);
  });

  it("rejects a malformed id without querying", async () => {
    const { db, log } = fakeDb();
    const error: unknown = await run(db, "not-a-uuid").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).resource).toBe("Task");
    expect(log).toEqual(["begin", "rollback"]);
  });

  it("rejects an unknown id before authorizing", async () => {
    const { db, log } = fakeDb([]);
    grantRole(log);
    await expect(run(db, taskId)).rejects.toEqual(new NotFoundError("Task"));
    expect(mockedRequireRole).not.toHaveBeenCalled();
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("reports a task in someone else's list as a missing task, not a missing list", async () => {
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(new NotFoundError("List"));
    const error: unknown = await run(db, taskId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).resource).toBe("Task");
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("passes ForbiddenError through without locking the task", async () => {
    const forbidden = new ForbiddenError();
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(forbidden);
    await expect(run(db, taskId)).rejects.toBe(forbidden);
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("rejects a task deleted between the read and the lock", async () => {
    const { db, log } = fakeDb([[listId]], []);
    grantRole(log);
    await expect(run(db, taskId)).rejects.toEqual(new NotFoundError("Task"));
    expect(log).toEqual(["begin", readListId, "requireRole write", lockTask, "rollback"]);
  });
});

describe("updateTask", () => {
  const viewQuery = viewQueryOf(taskId);
  const subtaskCheck = {
    sql: 'select "id" from "tasks" where ("tasks"."list_id" = $1 and "tasks"."parent_id" = $2) limit $3',
    params: [listId, taskId, 1],
  };
  const update = (set: string, params: unknown[]) => ({
    sql: `update "tasks" set ${set} where "tasks"."id" = $${params.length + 1}`,
    params: [...params, taskId],
  });

  it("authorizes write on the task, writes every field given and returns the task's view", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [],
      [[taskId, null, "Tiles", "Grey ones", 150000, 200000, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, {
      title: " Tiles ",
      description: " Grey ones ",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
    });

    expect(view).toEqual({
      id: taskId,
      title: "Tiles",
      description: "Grey ones",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    expect(taskViewSchema.parse(view)).toEqual(view);
    expect(mockedRequireRole).toHaveBeenCalledWith(expect.anything(), userId, listId, "write");
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      subtaskCheck,
      update(
        '"title" = $1, "description" = $2, "estimate_min_grosze" = $3, "estimate_max_grosze" = $4',
        ["Tiles", "Grey ones", 150000, 200000],
      ),
      viewQuery,
      "commit",
    ]);
  });

  it("writes only the marker it is sent, with no subtask check, and returns the stored other one (#18 AC3)", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Tiles", null, 100, 200, "todo", "a0", true, false]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { urgent: false });

    expect(view).toEqual(expect.objectContaining({ important: true, urgent: false }));
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      update('"urgent" = $1', [false]),
      viewQuery,
      "commit",
    ]);
  });

  it("writes both markers of a completed task when both are sent (#18 AC2)", async () => {
    const doneTask = taskRow.map((value, i) => (i === 5 ? "done" : value));
    const { db, log } = fakeDb(
      [[listId]],
      [doneTask],
      [],
      [[taskId, null, "Tiles", null, 100, 200, "done", "a0", true, true]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { important: true, urgent: true });

    expect(view).toEqual(
      expect.objectContaining({ completed: true, important: true, urgent: true }),
    );
    expect(log[4]).toEqual(update('"important" = $1, "urgent" = $2', [true, true]));
  });

  it("marks a subtask alone and returns its parent with the parent's own markers (#18 AC4)", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [subtaskRow],
      [],
      [
        [ids.a, null, "Bathroom", null, null, null, "todo", "a0", false, false],
        [taskId, ids.a, "Plaster", null, 300, 400, "todo", "a0", true, false],
      ],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { important: true });

    expect(log[4]).toEqual(update('"important" = $1', [true]));
    expect(log[5]).toEqual(viewQueryOf(ids.a));
    expect(view).toEqual(
      expect.objectContaining({
        id: ids.a,
        important: false,
        urgent: false,
        places: [],
        subtasks: [expect.objectContaining({ id: taskId, important: true, urgent: false })],
      }),
    );
  });

  it("writes only the title when only the title is given, keeping the stored fields", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Paint", "Kept", 100, 200, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { title: "Paint" });

    expect(log[4]).toEqual(update('"title" = $1', ["Paint"]));
    expect(view).toEqual(
      expect.objectContaining({
        description: "Kept",
        estimate: { minGrosze: 100, maxGrosze: 200 },
      }),
    );
  });

  it("writes only the description when only the description is given", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Tiles", "New", 100, 200, "todo", "a0", false, false]],
    );
    grantRole(log);
    await updateTask(db, userId, taskId, { description: "New" });
    expect(log[4]).toEqual(update('"description" = $1', ["New"]));
  });

  it("writes both estimate columns when only the estimate is given", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [],
      [[taskId, null, "Tiles", null, 5000, 5000, "todo", "a0", false, false]],
    );
    grantRole(log);
    await updateTask(db, userId, taskId, { estimate: { minGrosze: 5000, maxGrosze: 5000 } });
    expect(log[4]).toEqual(subtaskCheck);
    expect(log[5]).toEqual(
      update('"estimate_min_grosze" = $1, "estimate_max_grosze" = $2', [5000, 5000]),
    );
  });

  it('clears the estimate with null and the description with ""', async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [],
      [[taskId, null, "Tiles", null, null, null, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { description: "", estimate: null });

    expect(log[4]).toEqual(subtaskCheck);
    expect(log[5]).toEqual(
      update('"description" = $1, "estimate_min_grosze" = $2, "estimate_max_grosze" = $3', [
        null,
        null,
        null,
      ]),
    );
    expect(view).toEqual(expect.objectContaining({ description: null, estimate: null }));
  });

  it("never writes keys outside the parsed input", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Rod", null, null, null, "todo", "a0", false, false]],
    );
    grantRole(log);

    await updateTask(db, userId, taskId, {
      title: "Rod",
      listId: "99999999-9999-4999-8999-999999999999",
      parentId: ids.a,
      position: "zzz",
      status: "done",
      costGrosze: 1,
    });

    expect(log[4]).toEqual(update('"title" = $1', ["Rod"]));
  });

  it("returns the task with its subtasks and rolled-up estimate, whatever order the rows come in", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [
        [ids.a1, taskId, "Plaster", null, 30000, 40000, "todo", "a0", false, false],
        [taskId, null, "Bathroom", "Walls", 100000, 200000, "todo", "a0", false, false],
        [ids.a2, taskId, "Paint", null, null, null, "todo", "a0", false, false],
      ],
    );
    grantRole(log);

    await expect(updateTask(db, userId, taskId, { title: "Bathroom" })).resolves.toEqual({
      id: taskId,
      title: "Bathroom",
      description: "Walls",
      estimate: { minGrosze: 30000, maxGrosze: 40000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 1,
      subtasks: [
        {
          id: ids.a1,
          title: "Plaster",
          description: null,
          estimate: { minGrosze: 30000, maxGrosze: 40000 },
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: "a0",
        },
        {
          id: ids.a2,
          title: "Paint",
          description: null,
          estimate: null,
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: "a0",
        },
      ],
    });
  });

  it.each([
    ["a new estimate", { estimate: { minGrosze: 5000, maxGrosze: 5000 } }],
    ["a cleared estimate", { estimate: null }],
    ["a title and an estimate", { title: "secret title", estimate: null }],
  ])(
    "refuses %s on a task with subtasks, after locking it, and writes nothing",
    async (_name, input) => {
      const { db, log } = fakeDb([[listId]], [taskRow], [[ids.a1]]);
      grantRole(log);

      await expect(updateTask(db, userId, taskId, input)).rejects.toEqual(
        new ConflictError("A task with subtasks takes its estimate from them"),
      );
      expect(log).toEqual([
        "begin",
        readListId,
        "requireRole write",
        lockTask,
        subtaskCheck,
        "rollback",
      ]);
    },
  );

  it("does not look for subtasks when the estimate is not changed", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [
        [taskId, null, "Bathroom", null, 100, 200, "todo", "a0", false, false],
        [ids.a1, taskId, "Plaster", null, 30000, 40000, "todo", "a0", false, false],
      ],
    );
    grantRole(log);

    await updateTask(db, userId, taskId, { title: "Bathroom", description: null });

    expect(log).not.toContainEqual(subtaskCheck);
  });

  it("updates a subtask's estimate without a subtask check and returns its parent's view", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [subtaskRow],
      [],
      [
        [ids.a, null, "Bathroom", "Walls", 100000, 200000, "todo", "a0", false, false],
        [taskId, ids.a, "Plaster", null, 5000, 6000, "todo", "a0", false, false],
        [ids.a2, ids.a, "Paint", null, 1000, 1000, "todo", "a0", false, false],
      ],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, {
      estimate: { minGrosze: 5000, maxGrosze: 6000 },
    });

    expect(view).toEqual({
      id: ids.a,
      title: "Bathroom",
      description: "Walls",
      estimate: { minGrosze: 6000, maxGrosze: 7000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 0,
      subtasks: [
        {
          id: taskId,
          title: "Plaster",
          description: null,
          estimate: { minGrosze: 5000, maxGrosze: 6000 },
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: "a0",
        },
        {
          id: ids.a2,
          title: "Paint",
          description: null,
          estimate: { minGrosze: 1000, maxGrosze: 1000 },
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: "a0",
        },
      ],
    });
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      update('"estimate_min_grosze" = $1, "estimate_max_grosze" = $2', [5000, 6000]),
      viewQueryOf(ids.a),
      "commit",
    ]);
  });

  it.each([
    ["no field", {}],
    ["only undefined fields", { title: undefined, description: undefined }],
    ["a blank title", { title: " " }],
    ["min above max", { estimate: { minGrosze: 2, maxGrosze: 1 } }],
    ["a description over the limit", { description: "x".repeat(2001) }],
    ["no object", null],
  ])("rejects %s before opening a transaction", async (_name, input) => {
    const { db, log } = fakeDb();
    await expect(updateTask(db, userId, taskId, input)).rejects.toBeInstanceOf(ZodError);
    expect(log).toEqual([]);
    expect(mockedRequireRole).not.toHaveBeenCalled();
  });

  it("writes nothing for a viewer", async () => {
    const forbidden = new ForbiddenError();
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(forbidden);
    await expect(updateTask(db, userId, taskId, { title: "x" })).rejects.toBe(forbidden);
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("writes nothing for an unknown task", async () => {
    const { db, log } = fakeDb([]);
    grantRole(log);
    await expect(updateTask(db, userId, taskId, { title: "x" })).rejects.toEqual(
      new NotFoundError("Task"),
    );
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("translates a check violation raised by the update", async () => {
    const { db, log } = fakeDb([[listId]], [taskRow], pgError("23514"));
    grantRole(log);

    const error: unknown = await updateTask(db, userId, taskId, { title: "secret title" }).catch(
      (e: unknown) => e,
    );

    expect(error).toEqual(new ConflictError("Invalid estimate"));
    expect(JSON.stringify(error)).not.toContain("secret");
    expect(log.at(-1)).toBe("rollback");
  });
});

describe("deleteTask", () => {
  const deleteQuery = { sql: 'delete from "tasks" where "tasks"."id" = $1', params: [taskId] };

  it("authorizes write on the task, deletes it and returns null for a top-level task", async () => {
    const { db, log } = fakeDb([[listId]], [taskRow], []);
    grantRole(log);

    await expect(deleteTask(db, userId, taskId)).resolves.toBeNull();
    expect(mockedRequireRole).toHaveBeenCalledWith(expect.anything(), userId, listId, "write");
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      deleteQuery,
      "commit",
    ]);
  });

  it("deletes a subtask and returns its parent's view with the remaining subtasks", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [subtaskRow],
      [],
      [
        [ids.a, null, "Bathroom", null, 100000, 200000, "todo", "a0", false, false],
        [ids.a2, ids.a, "Paint", null, null, null, "todo", "a0", false, false],
      ],
    );
    grantRole(log);

    await expect(deleteTask(db, userId, taskId)).resolves.toEqual({
      id: ids.a,
      title: "Bathroom",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
      unestimatedSubtasks: 1,
      subtasks: [
        {
          id: ids.a2,
          title: "Paint",
          description: null,
          estimate: null,
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: "a0",
        },
      ],
    });
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      deleteQuery,
      viewQueryOf(ids.a),
      "commit",
    ]);
  });

  it("gives the parent its own figure back when its last subtask is deleted", async () => {
    const { db } = fakeDb(
      [[listId]],
      [subtaskRow],
      [],
      [[ids.a, null, "Bathroom", null, 100000, 200000, "todo", "a0", false, false]],
    );
    grantRole([]);

    const view = await deleteTask(db, userId, taskId);

    expect(view).toEqual(
      expect.objectContaining({
        id: ids.a,
        estimate: { minGrosze: 100000, maxGrosze: 200000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: "a0",
        unestimatedSubtasks: 0,
        subtasks: [],
      }),
    );
    expect(taskViewSchema.parse(view)).toEqual(view);
  });

  it("deletes nothing for a viewer", async () => {
    const forbidden = new ForbiddenError();
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(forbidden);
    await expect(deleteTask(db, userId, taskId)).rejects.toBe(forbidden);
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it.each([
    ["an unknown task", [[]]],
    ["a task deleted before its lock", [[[listId]], []]],
  ])("reports %s as not found and deletes nothing", async (_name, replies) => {
    const { db, log } = fakeDb(...replies);
    grantRole(log);
    await expect(deleteTask(db, userId, taskId)).rejects.toEqual(new NotFoundError("Task"));
    expect(log).not.toContainEqual(deleteQuery);
    expect(log.at(-1)).toBe("rollback");
  });

  it("translates a constraint violation raised by the delete", async () => {
    const { db, log } = fakeDb([[listId]], [taskRow], pgError("23503"));
    grantRole(log);
    await expect(deleteTask(db, userId, taskId)).rejects.toEqual(new NotFoundError("Task"));
    expect(log.at(-1)).toBe("rollback");
  });
});

describe("setTaskCompleted", () => {
  const lockTaskList = { ...lockList, params: [listId] };
  const start = ["begin", readListId, "requireRole write", lockTaskList, lockTask];
  const viewRow = (status: "todo" | "done", position = "a0") => [
    taskId,
    null,
    "Tiles",
    null,
    100,
    200,
    status,
    position,
    false,
    false,
  ];
  const completeTree = {
    sql: 'update "tasks" set "status" = $1 where ("tasks"."id" = $2 or "tasks"."parent_id" = $3)',
    params: ["done", taskId, taskId],
  };
  const firstSibling = (parent: string | null) => ({
    sql:
      parent === null
        ? 'select "position" from "tasks" where ("tasks"."list_id" = $1 and "tasks"."parent_id" is null and "tasks"."id" <> $2) order by "tasks"."position" COLLATE "C" limit $3'
        : 'select "position" from "tasks" where ("tasks"."list_id" = $1 and "tasks"."parent_id" = $2 and "tasks"."id" <> $3) order by "tasks"."position" COLLATE "C" limit $4',
    params: parent === null ? [listId, taskId, 1] : [listId, parent, taskId, 1],
  });
  const reopenRow = (position: string) => ({
    sql: 'update "tasks" set "status" = $1, "position" = $2 where "tasks"."id" = $3',
    params: ["todo", position, taskId],
  });
  const doneRow = taskRow.map((value, i) => (i === 5 ? "done" : value));

  it("authorizes write, locks the list then the task, completes it with its subtasks and returns its view", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [[listId]],
      [taskRow],
      [],
      [viewRow("done"), [ids.a1, taskId, "Plaster", null, 30, 40, "done", "a0", false, false]],
    );
    grantRole(log);

    const view = await setTaskCompleted(db, userId, taskId, { completed: true });

    expect(view).toEqual(
      expect.objectContaining({
        id: taskId,
        completed: true,
        important: false,
        urgent: false,
        places: [],
        // A completed subtask still counts in its task's sum (R14).
        estimate: { minGrosze: 30, maxGrosze: 40 },
        subtasks: [expect.objectContaining({ id: ids.a1, completed: true })],
      }),
    );
    expect(log).toEqual([...start, completeTree, viewQueryOf(taskId), "commit"]);
  });

  it("completes a subtask alone and returns its parent's view (R11)", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [[listId]],
      [subtaskRow],
      [],
      [
        [ids.a, null, "Bathroom", null, null, null, "todo", "a0", false, false],
        [taskId, ids.a, "Plaster", null, 300, 400, "done", "a0", false, false],
      ],
    );
    grantRole(log);

    const view = await setTaskCompleted(db, userId, taskId, { completed: true });

    expect(view).toEqual(expect.objectContaining({ id: ids.a, completed: false }));
    expect(log).toEqual([...start, completeTree, viewQueryOf(ids.a), "commit"]);
  });

  it("reopens a task before its first sibling and writes only that row", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [[listId]],
      [doneRow],
      [["a0"]],
      [],
      [viewRow("todo", "Zz")],
    );
    grantRole(log);

    const view = await setTaskCompleted(db, userId, taskId, { completed: false });

    expect(view).toEqual(expect.objectContaining({ completed: false, position: "Zz" }));
    expect(log).toEqual([
      ...start,
      firstSibling(null),
      reopenRow("Zz"),
      viewQueryOf(taskId),
      "commit",
    ]);
  });

  it("reopens a subtask among its own siblings, and keeps the key of an only child", async () => {
    const doneSubtask = subtaskRow.map((value, i) => (i === 5 ? "done" : value));
    const { db, log } = fakeDb(
      [[listId]],
      [[listId]],
      [doneSubtask],
      [],
      [],
      [
        [ids.a, null, "Bathroom", null, null, null, "done", "a0", false, false],
        [taskId, ids.a, "Plaster", null, 300, 400, "todo", "a0", false, false],
      ],
    );
    grantRole(log);

    const view = await setTaskCompleted(db, userId, taskId, { completed: false });

    // The task stays completed (Q2).
    expect(view).toEqual(expect.objectContaining({ id: ids.a, completed: true }));
    expect(log).toEqual([
      ...start,
      firstSibling(ids.a),
      reopenRow("a0"),
      viewQueryOf(ids.a),
      "commit",
    ]);
  });

  it.each([
    { stored: taskRow, completed: false },
    { stored: doneRow, completed: true },
  ])(
    "writes nothing when the row is already in that state (completed: $completed)",
    async ({ stored, completed }) => {
      const status = completed ? "done" : "todo";
      const { db, log } = fakeDb([[listId]], [[listId]], [stored], [viewRow(status)]);
      grantRole(log);

      const view = await setTaskCompleted(db, userId, taskId, { completed });

      expect(view.completed).toBe(completed);
      expect(log).toEqual([...start, viewQueryOf(taskId), "commit"]);
    },
  );

  it.each([{}, { completed: "yes" }, { completed: true, position: "a0" }, null])(
    "rejects %j before opening a transaction",
    async (input) => {
      const { db, log } = fakeDb();
      await expect(setTaskCompleted(db, userId, taskId, input)).rejects.toBeInstanceOf(ZodError);
      expect(log).toEqual([]);
    },
  );

  it("reports an unknown task as missing and locks nothing", async () => {
    const { db, log } = fakeDb([]);
    grantRole(log);
    await expect(setTaskCompleted(db, userId, taskId, { completed: true })).rejects.toEqual(
      new NotFoundError("Task"),
    );
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("reports another user's task as missing and writes nothing", async () => {
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(new NotFoundError("List"));
    await expect(setTaskCompleted(db, userId, taskId, { completed: true })).rejects.toEqual(
      new NotFoundError("Task"),
    );
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });

  it("passes ForbiddenError through for a viewer and writes nothing", async () => {
    const forbidden = new ForbiddenError();
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(forbidden);
    await expect(setTaskCompleted(db, userId, taskId, { completed: true })).rejects.toBe(forbidden);
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });
});

describe("places on the views", () => {
  const place = (id: string, name: string, color: number) => ({ id, name, color });

  it("reads the list's places in one query and puts each on its own row (D21)", async () => {
    placeReplies = [
      [
        [ids.a1, ids.b, "Kuchnia", 4],
        [ids.a, ids.a2, "Łazienka", 3],
        [ids.a, ids.b, "Kuchnia", 4],
      ],
    ];
    const { db, log, placeLog } = fakeDb([
      [ids.a, null, "Bathroom", null, null, null, "todo", "a0", false, false],
      [ids.a1, ids.a, "Plaster", null, null, null, "todo", "a0", false, false],
    ]);
    grantRole(log, "viewer");

    const [view] = await listTasks(db, userId, listId);

    expect(view!.places).toEqual([place(ids.a2, "Łazienka", 3), place(ids.b, "Kuchnia", 4)]);
    expect(view!.subtasks[0]!.places).toEqual([place(ids.b, "Kuchnia", 4)]);
    expect(placeLog).toEqual([
      { sql: `${PLACES_SELECT}"tasks"."list_id" = $1${PLACES_ORDER}`, params: [listId] },
    ]);
  });

  it("reads the places of a tree with its rows", async () => {
    placeReplies = [[[taskId, ids.b, "Salon", 1]]];
    const { db, log, placeLog } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Tiles", null, 100, 200, "todo", "a0", false, true]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { urgent: true });

    expect(view.places).toEqual([place(ids.b, "Salon", 1)]);
    expect(placeLog).toEqual([
      {
        sql: `${PLACES_SELECT}("tasks"."id" = $1 or "tasks"."parent_id" = $2)${PLACES_ORDER}`,
        params: [taskId, taskId],
      },
    ]);
  });
});

describe("setTaskPlace", () => {
  const placeId = ids.b1;
  const lockPlace = {
    sql: 'select "id" from "places" where ("places"."id" = $1 and exists (select "user_id" from "list_members" where ("list_members"."list_id" = $2 and "list_members"."user_id" = "places"."user_id" and "list_members"."role" = $3))) for key share',
    params: [placeId, listId, "owner"],
  };
  const tree = [[taskId, null, "Tiles", null, 100, 200, "todo", "a0", false, false]];

  it("authorizes write, locks the task then the list owner's place, assigns it idempotently", async () => {
    placeReplies = [[[taskId, placeId, "Salon", 1]]];
    const { db, log } = fakeDb([[listId]], [taskRow], [[placeId]], [], tree);
    grantRole(log);

    const view = await setTaskPlace(db, userId, taskId, placeId, { assigned: true });

    expect(view.places).toEqual([{ id: placeId, name: "Salon", color: 1 }]);
    expect(log).toEqual([
      "begin",
      readListId,
      "requireRole write",
      lockTask,
      lockPlace,
      {
        sql: 'insert into "task_places" ("task_id", "place_id", "created_at") values ($1, $2, default) on conflict do nothing',
        params: [taskId, placeId],
      },
      viewQueryOf(taskId),
      "commit",
    ]);
  });

  it("removes only that assignment and returns the subtask's parent", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [subtaskRow],
      [[placeId]],
      [],
      [[ids.a, null, "Bathroom", null, null, null, "todo", "a0", false, false]],
    );
    grantRole(log);

    const view = await setTaskPlace(db, userId, taskId, placeId, { assigned: false });

    expect(view.id).toBe(ids.a);
    expect(log.slice(5)).toEqual([
      {
        sql: 'delete from "task_places" where ("task_places"."task_id" = $1 and "task_places"."place_id" = $2)',
        params: [taskId, placeId],
      },
      viewQueryOf(ids.a),
      "commit",
    ]);
  });

  it("answers 404 Place when the place is not the list owner's, unknown or deleted (Q3-1)", async () => {
    const { db, log } = fakeDb([[listId]], [taskRow], []);
    grantRole(log);

    await expect(setTaskPlace(db, userId, taskId, placeId, { assigned: true })).rejects.toEqual(
      new NotFoundError("Place"),
    );
    expect(log.at(-1)).toBe("rollback");
  });

  it("answers 404 Place for a malformed place id before any query (P3)", async () => {
    const { db, log } = fakeDb();
    await expect(
      setTaskPlace(db, userId, taskId, "not-a-uuid", { assigned: true }),
    ).rejects.toEqual(new NotFoundError("Place"));
    expect(log).toEqual([]);
  });

  it("refuses a viewer before reading the place", async () => {
    const { db, log } = fakeDb([[listId]]);
    mockedRequireRole.mockRejectedValue(new ForbiddenError());

    await expect(setTaskPlace(db, userId, taskId, placeId, { assigned: true })).rejects.toEqual(
      new ForbiddenError(),
    );
    expect(log).toEqual(["begin", readListId, "rollback"]);
  });
});
