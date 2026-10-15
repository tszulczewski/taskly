import { describe, expect, it, vi } from "vitest";
import { getRole, requireRole } from "./access";
import { ForbiddenError, NotFoundError } from "./errors";
import type { Db } from "./types";

const listId = "6f1c1d0e-8a39-4c52-9a4e-0d3f6b2a7e11";

/** A Db whose membership query resolves to `rows` (or rejects with `error`). */
function dbWith(rows: Array<{ role: string }>, error?: Error) {
  const forShare = vi.fn(() => (error ? Promise.reject(error) : Promise.resolve(rows)));
  const select = vi.fn(() => ({
    from: () => ({ where: () => ({ limit: () => ({ for: forShare }) }) }),
  }));
  return { db: { select } as unknown as Db, select, forShare };
}

describe("getRole", () => {
  it("returns the member's role and locks the row FOR SHARE", async () => {
    const { db, forShare } = dbWith([{ role: "editor" }]);
    await expect(getRole(db, "u1", listId)).resolves.toBe("editor");
    expect(forShare).toHaveBeenCalledWith("share");
  });

  it("can lock the membership row FOR UPDATE", async () => {
    const { db, forShare } = dbWith([{ role: "owner" }]);
    await getRole(db, "u1", listId, "update");
    expect(forShare).toHaveBeenCalledWith("update");
  });

  it("returns null for a non-member", async () => {
    const { db } = dbWith([]);
    await expect(getRole(db, "u1", listId)).resolves.toBeNull();
  });

  it("returns null for a malformed list id without querying", async () => {
    const { db, select } = dbWith([{ role: "owner" }]);
    await expect(getRole(db, "u1", "not-a-uuid")).resolves.toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it.each([
    ["owner", "read"],
    ["owner", "write"],
    ["owner", "manage"],
    ["editor", "read"],
    ["editor", "write"],
    ["viewer", "read"],
  ] as const)("allows %s to %s and returns the role", async (role, action) => {
    const { db } = dbWith([{ role }]);
    await expect(requireRole(db, "u1", listId, action)).resolves.toBe(role);
  });

  it("locks FOR UPDATE for manage and FOR SHARE otherwise", async () => {
    const manage = dbWith([{ role: "owner" }]);
    await requireRole(manage.db, "u1", listId, "manage");
    expect(manage.forShare).toHaveBeenCalledWith("update");
    const write = dbWith([{ role: "editor" }]);
    await requireRole(write.db, "u1", listId, "write");
    expect(write.forShare).toHaveBeenCalledWith("share");
  });

  it.each([
    ["editor", "manage"],
    ["viewer", "write"],
    ["viewer", "manage"],
  ] as const)("forbids %s from %s", async (role, action) => {
    const { db } = dbWith([{ role }]);
    await expect(requireRole(db, "u1", listId, action)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError for a non-member", async () => {
    const { db } = dbWith([]);
    await expect(requireRole(db, "u1", listId, "read")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a malformed list id", async () => {
    const { db } = dbWith([]);
    await expect(requireRole(db, "u1", "nope", "read")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("fails closed: a database error propagates instead of allowing", async () => {
    const { db } = dbWith([], new Error("connection lost"));
    await expect(requireRole(db, "u1", listId, "read")).rejects.toThrow("connection lost");
  });
});
