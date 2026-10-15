import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole } from "./access";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createList, deleteList, listsForUser, renameList } from "./lists";
import type { Db } from "./types";

vi.mock("./access", () => ({ requireRole: vi.fn() }));

const userId = "u1";
const listId = "6f1c1d0e-8a39-4c52-9a4e-0d3f6b2a7e11";

const mockedRequireRole = vi.mocked(requireRole);

/** A Db whose transaction runs the callback against a recording `tx`. */
function fakeDb(kind: "project" | "shopping" = "project") {
  const calls: string[] = [];
  const values = vi.fn();
  const set = vi.fn();
  const tx = {
    select: vi.fn(() => ({ from: () => ({ where: async () => [{ kind }] }) })),
    insert: vi.fn(() => ({
      values: (v: unknown) => {
        values(v);
        calls.push("insert");
        return { returning: async () => [{ id: listId }] };
      },
    })),
    update: vi.fn(() => ({
      set: (v: unknown) => {
        set(v);
        return { where: async () => void calls.push("update") };
      },
    })),
    delete: vi.fn(() => ({ where: async () => void calls.push("delete") })),
  };
  const db = { transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  return { db: db as unknown as Db, tx, calls, values, set };
}

beforeEach(() => {
  mockedRequireRole.mockReset();
  mockedRequireRole.mockResolvedValue("owner");
});

describe("createList", () => {
  it("inserts the list and an owner membership in one transaction", async () => {
    const { db, values, calls } = fakeDb();
    await expect(createList(db, userId, { name: "  Bathroom " })).resolves.toEqual({ id: listId });
    expect(values).toHaveBeenNthCalledWith(1, { name: "Bathroom" });
    expect(values).toHaveBeenNthCalledWith(2, { listId, userId, role: "owner" });
    expect(calls).toEqual(["insert", "insert"]);
  });

  it("rejects invalid input before touching the database", async () => {
    const { db } = fakeDb();
    await expect(createList(db, userId, { name: " " })).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe("listsForUser", () => {
  it("returns the rows of the user's memberships", async () => {
    const rows = [{ id: listId, name: "Bathroom", kind: "project", role: "owner" }];
    const orderBy = vi.fn(async () => rows);
    const where = vi.fn(() => ({ orderBy }));
    const db = {
      select: () => ({ from: () => ({ innerJoin: () => ({ where }) }) }),
    } as unknown as Db;
    await expect(listsForUser(db, userId)).resolves.toBe(rows);
    expect(where).toHaveBeenCalledTimes(1);
  });
});

describe("renameList", () => {
  it("requires manage, then renames", async () => {
    const { db, tx, set, calls } = fakeDb();
    await renameList(db, userId, listId, { name: " Kitchen " });
    expect(mockedRequireRole).toHaveBeenCalledWith(tx, userId, listId, "manage");
    expect(set).toHaveBeenCalledWith({ name: "Kitchen" });
    expect(calls).toEqual(["update"]);
  });

  it.each([new ForbiddenError(), new NotFoundError("List")])(
    "does not write when authorization fails with %s",
    async (error) => {
      mockedRequireRole.mockRejectedValue(error);
      const { db, calls } = fakeDb();
      await expect(renameList(db, userId, listId, { name: "Kitchen" })).rejects.toBe(error);
      expect(calls).toEqual([]);
    },
  );

  it("refuses to rename the shopping list", async () => {
    const { db, calls } = fakeDb("shopping");
    await expect(renameList(db, userId, listId, { name: "x" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(calls).toEqual([]);
  });

  it("rejects invalid input before authorizing", async () => {
    const { db } = fakeDb();
    await expect(renameList(db, userId, listId, { name: "" })).rejects.toThrow();
    expect(mockedRequireRole).not.toHaveBeenCalled();
  });
});

describe("deleteList", () => {
  it("requires manage, then deletes", async () => {
    const { db, tx, calls } = fakeDb();
    await deleteList(db, userId, listId);
    expect(mockedRequireRole).toHaveBeenCalledWith(tx, userId, listId, "manage");
    expect(calls).toEqual(["delete"]);
  });

  it("refuses to delete the shopping list", async () => {
    const { db, calls } = fakeDb("shopping");
    await expect(deleteList(db, userId, listId)).rejects.toBeInstanceOf(ConflictError);
    expect(calls).toEqual([]);
  });

  it.each([new ForbiddenError(), new NotFoundError("List")])(
    "does not delete when authorization fails with %s",
    async (error) => {
      mockedRequireRole.mockRejectedValue(error);
      const { db, calls } = fakeDb();
      await expect(deleteList(db, userId, listId)).rejects.toBe(error);
      expect(calls).toEqual([]);
    },
  );
});
