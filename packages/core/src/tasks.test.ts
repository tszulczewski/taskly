import { schema } from "@taskly/db";
import { DrizzleQueryError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { requireRole } from "./access";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { taskViewSchema } from "./schemas";
import { createTask, deleteTask, listTasks, requireTaskRole, updateTask } from "./tasks";
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
type Reply = unknown[][] | unknown;

/**
 * A real drizzle `Db` over a fake pg client: no network, but the SQL text and params drizzle sends
 * are recorded, and a failing query is wrapped in a DrizzleQueryError as in production. Each
 * non-transaction query takes the next reply: rows (in array mode, columns in select order) or
 * a value to throw. `requireRole` is mocked and logged as "requireRole <action>".
 */
function fakeDb(...replies: Reply[]) {
  const log: Logged[] = [];
  const client = {
    query: vi.fn(async (config: { text: string }, params: unknown[] = []) => {
      if (/^(begin|commit|rollback)$/.test(config.text)) {
        log.push(config.text);
        return { rows: [] };
      }
      log.push({ sql: config.text, params });
      if (replies.length === 0) throw new Error(`unexpected query: ${config.text}`);
      const reply = replies.shift();
      if (!Array.isArray(reply)) throw reply;
      return { rows: reply };
    }),
  };
  const db = drizzle({ client: client as unknown as Pool, schema }) as unknown as Db;
  return { db, log };
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
  'insert into "tasks" ("id", "list_id", "parent_id", "title", "description", "status", "position", "estimate_min_grosze", "estimate_max_grosze", "cost_grosze", "created_at") values (default, $1, default, $2, $3, default, $4, $5, $6, default, default) returning "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze"';

// requireTaskRole's queries, also the start of updateTask and deleteTask.
const readListId = {
  sql: 'select "list_id" from "tasks" where "tasks"."id" = $1',
  params: [taskId],
};
const lockTask = {
  sql: 'select "id", "list_id", "parent_id", "title", "description", "status", "position", "estimate_min_grosze", "estimate_max_grosze", "cost_grosze", "created_at" from "tasks" where "tasks"."id" = $1 for update',
  params: [taskId],
};
const createdAt = "2026-10-29T10:00:00.000Z";
const taskRow = [taskId, listId, null, "Tiles", null, "todo", "a0", 100, 200, null, createdAt];

describe("createTask", () => {
  it("authorizes write, locks the list row, appends after the last top-level task and returns its view", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [["a0"]],
      [[taskId, null, "Tiles", "Grey ones", 150000, 200000]],
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
      { sql: insertSql, params: [listId, "Tiles", "Grey ones", "a1", 150000, 200000] },
      "commit",
    ]);
  });

  it("gives the first task of a list the first key and stores no estimate or description by default", async () => {
    const { db, log } = fakeDb([[listId]], [], [[taskId, null, "Paint", null, null, null]]);
    grantRole(log);

    await expect(createTask(db, userId, listId, { title: "Paint" })).resolves.toEqual({
      id: taskId,
      title: "Paint",
      description: null,
      estimate: null,
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    expect(log[4]).toEqual({ sql: insertSql, params: [listId, "Paint", null, "a0", null, null] });
  });

  it("stores an exact price as min = max", async () => {
    const { db, log } = fakeDb([[listId]], [], [[taskId, null, "Rod", null, 5000, 5000]]);
    grantRole(log);

    const view = await createTask(db, userId, listId, {
      title: "Rod",
      estimate: { minGrosze: 5000, maxGrosze: 5000 },
    });

    expect(view.estimate).toEqual({ minGrosze: 5000, maxGrosze: 5000 });
    expect(log[4]).toEqual({ sql: insertSql, params: [listId, "Rod", null, "a0", 5000, 5000] });
  });

  it("never writes keys outside the parsed input (listId comes from the argument)", async () => {
    const { db, log } = fakeDb([[listId]], [], [[taskId, null, "Rod", null, null, null]]);
    grantRole(log);

    await createTask(db, userId, listId, {
      title: "Rod",
      listId: "99999999-9999-4999-8999-999999999999",
      parentId: ids.a,
      position: "zzz",
      costGrosze: 1,
    });

    expect(log[4]).toEqual({ sql: insertSql, params: [listId, "Rod", null, "a0", null, null] });
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
    expect(log).toEqual([]);
    expect(mockedRequireRole).not.toHaveBeenCalled();
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
    sql: 'select "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze" from "tasks" where "tasks"."list_id" = $1 order by "tasks"."position" COLLATE "C", "tasks"."id" asc',
    params: [listId],
  };

  it("authorizes read and returns top-level tasks in order, each with its subtasks and rolled-up estimate", async () => {
    const { db, log } = fakeDb([
      [ids.a, null, "Bathroom", "Walls", 100000, 200000],
      [ids.a1, ids.a, "Plaster", null, 30000, 40000],
      [ids.b, null, "Kitchen", null, 70000, 70000],
      [ids.a2, ids.a, "Paint", "White", null, null],
      [ids.b1, ids.b, "Rail", null, 5000, 5000],
    ]);
    grantRole(log, "viewer");

    const views = await listTasks(db, userId, listId);

    expect(views).toEqual([
      {
        id: ids.a,
        title: "Bathroom",
        description: "Walls",
        estimate: { minGrosze: 30000, maxGrosze: 40000 },
        unestimatedSubtasks: 1,
        subtasks: [
          {
            id: ids.a1,
            title: "Plaster",
            description: null,
            estimate: { minGrosze: 30000, maxGrosze: 40000 },
          },
          { id: ids.a2, title: "Paint", description: "White", estimate: null },
        ],
      },
      {
        id: ids.b,
        title: "Kitchen",
        description: null,
        estimate: { minGrosze: 5000, maxGrosze: 5000 },
        unestimatedSubtasks: 0,
        subtasks: [
          {
            id: ids.b1,
            title: "Rail",
            description: null,
            estimate: { minGrosze: 5000, maxGrosze: 5000 },
          },
        ],
      },
    ]);
    expect(views.map((v) => taskViewSchema.parse(v))).toEqual(views);
    expect(log).toEqual(["begin", "requireRole read", listQuery, "commit"]);
  });

  it("returns a task's own estimate when it has no subtasks", async () => {
    const { db, log } = fakeDb([
      [ids.a, null, "Rod", null, 5000, 5000],
      [ids.b, null, "Shelf", null, null, null],
    ]);
    grantRole(log);

    await expect(listTasks(db, userId, listId)).resolves.toEqual([
      {
        id: ids.a,
        title: "Rod",
        description: null,
        estimate: { minGrosze: 5000, maxGrosze: 5000 },
        unestimatedSubtasks: 0,
        subtasks: [],
      },
      {
        id: ids.b,
        title: "Shelf",
        description: null,
        estimate: null,
        unestimatedSubtasks: 0,
        subtasks: [],
      },
    ]);
  });

  it("treats a half-stored estimate as none (the pair CHECK forbids it)", async () => {
    const { db, log } = fakeDb([[ids.a, null, "Odd", null, 100, null]]);
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
  const viewQuery = {
    sql: 'select "id", "parent_id", "title", "description", "estimate_min_grosze", "estimate_max_grosze" from "tasks" where ("tasks"."id" = $1 or "tasks"."parent_id" = $2) order by "tasks"."position" COLLATE "C", "tasks"."id" asc',
    params: [taskId, taskId],
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
      [[taskId, null, "Tiles", "Grey ones", 150000, 200000]],
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
      update(
        '"title" = $1, "description" = $2, "estimate_min_grosze" = $3, "estimate_max_grosze" = $4',
        ["Tiles", "Grey ones", 150000, 200000],
      ),
      viewQuery,
      "commit",
    ]);
  });

  it("writes only the title when only the title is given, keeping the stored fields", async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Paint", "Kept", 100, 200]],
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
      [[taskId, null, "Tiles", "New", 100, 200]],
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
      [[taskId, null, "Tiles", null, 5000, 5000]],
    );
    grantRole(log);
    await updateTask(db, userId, taskId, { estimate: { minGrosze: 5000, maxGrosze: 5000 } });
    expect(log[4]).toEqual(
      update('"estimate_min_grosze" = $1, "estimate_max_grosze" = $2', [5000, 5000]),
    );
  });

  it('clears the estimate with null and the description with ""', async () => {
    const { db, log } = fakeDb(
      [[listId]],
      [taskRow],
      [],
      [[taskId, null, "Tiles", null, null, null]],
    );
    grantRole(log);

    const view = await updateTask(db, userId, taskId, { description: "", estimate: null });

    expect(log[4]).toEqual(
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
      [[taskId, null, "Rod", null, null, null]],
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
        [ids.a1, taskId, "Plaster", null, 30000, 40000],
        [taskId, null, "Bathroom", "Walls", 100000, 200000],
        [ids.a2, taskId, "Paint", null, null, null],
      ],
    );
    grantRole(log);

    await expect(updateTask(db, userId, taskId, { title: "Bathroom" })).resolves.toEqual({
      id: taskId,
      title: "Bathroom",
      description: "Walls",
      estimate: { minGrosze: 30000, maxGrosze: 40000 },
      unestimatedSubtasks: 1,
      subtasks: [
        {
          id: ids.a1,
          title: "Plaster",
          description: null,
          estimate: { minGrosze: 30000, maxGrosze: 40000 },
        },
        { id: ids.a2, title: "Paint", description: null, estimate: null },
      ],
    });
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
