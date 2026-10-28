import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPasswordUser } from "./password-admin";

const { calls, ctx, runWithTransaction } = vi.hoisted(() => {
  const calls: string[] = [];
  let inTransaction = false;
  const ctx = {
    adapter: { id: "adapter" },
    password: {
      hash: vi.fn(async (password: string) => {
        calls.push(`hash:${inTransaction}`);
        return `hashed:${password}`;
      }),
    },
    internalAdapter: {
      createUser: vi.fn(async (user: { name: string; email: string }) => {
        calls.push(`createUser:${inTransaction}`);
        return { id: "u1", emailVerified: false, image: null, ...user };
      }),
      linkAccount: vi.fn(async () => {
        calls.push(`linkAccount:${inTransaction}`);
        return { id: "a1" };
      }),
    },
  };
  const runWithTransaction = vi.fn(async (_adapter: unknown, fn: () => Promise<unknown>) => {
    calls.push("begin");
    inTransaction = true;
    try {
      return await fn();
    } finally {
      inTransaction = false;
      calls.push("end");
    }
  });
  return { calls, ctx, runWithTransaction };
});

vi.mock("./auth", () => ({ getAuth: () => ({ $context: Promise.resolve(ctx) }) }));
vi.mock("@better-auth/core/context", () => ({ runWithTransaction }));

const valid = { name: "  Ada Lovelace ", email: "Ada@Example.TEST", password: "correct-horse" };

describe("createPasswordUser", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("hashes first, then creates the user and credential account in one transaction", async () => {
    const user = await createPasswordUser(valid);

    expect(user).toStrictEqual({ id: "u1", email: "ada@example.test", name: "Ada Lovelace" });
    expect(calls).toEqual(["hash:false", "begin", "createUser:true", "linkAccount:true", "end"]);
    expect(runWithTransaction).toHaveBeenCalledWith(ctx.adapter, expect.any(Function));
    expect(ctx.password.hash).toHaveBeenCalledWith("correct-horse");
    expect(ctx.internalAdapter.createUser).toHaveBeenCalledWith(
      { name: "Ada Lovelace", email: "ada@example.test" },
      { method: "email-password" },
    );
    expect(ctx.internalAdapter.linkAccount).toHaveBeenCalledWith({
      userId: "u1",
      providerId: "credential",
      accountId: "u1",
      password: "hashed:correct-horse",
    });
  });

  it.each([
    ["blank name", { ...valid, name: "   " }],
    ["invalid email", { ...valid, email: "not-an-email" }],
    ["short password", { ...valid, password: "short" }],
    ["long password", { ...valid, password: "x".repeat(129) }],
  ])("rejects %s before hashing or writing", async (_label, input) => {
    await expect(createPasswordUser(input)).rejects.toThrow();
    expect(ctx.password.hash).not.toHaveBeenCalled();
    expect(runWithTransaction).not.toHaveBeenCalled();
    expect(ctx.internalAdapter.createUser).not.toHaveBeenCalled();
  });

  it("propagates a failed credential-account insert from inside the transaction", async () => {
    const failure = new Error("account insert failed");
    ctx.internalAdapter.linkAccount.mockRejectedValueOnce(failure);

    await expect(createPasswordUser(valid)).rejects.toBe(failure);
    expect(calls).toEqual(["hash:false", "begin", "createUser:true", "end"]);
  });

  it("propagates a failed user insert without linking an account", async () => {
    const failure = new Error("duplicate key");
    ctx.internalAdapter.createUser.mockRejectedValueOnce(failure);

    await expect(createPasswordUser(valid)).rejects.toBe(failure);
    expect(ctx.internalAdapter.linkAccount).not.toHaveBeenCalled();
  });
});
