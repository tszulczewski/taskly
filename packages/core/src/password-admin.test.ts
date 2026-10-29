import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./errors";
import { createPasswordUser, setPassword } from "./password-admin";

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
      findUserByEmail: vi.fn(
        async (email: string): Promise<{ user: { id: string; email: string } } | null> => {
          calls.push(`findUserByEmail:${inTransaction}`);
          return { user: { id: "u1", email } };
        },
      ),
      findCredentialAccount: vi.fn(async (): Promise<{ id: string } | null> => {
        calls.push(`findCredentialAccount:${inTransaction}`);
        return { id: "a1" };
      }),
      updatePassword: vi.fn(async () => {
        calls.push(`updatePassword:${inTransaction}`);
      }),
      deleteUserSessions: vi.fn(async () => {
        calls.push(`deleteUserSessions:${inTransaction}`);
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

describe("setPassword", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("hashes first, then replaces the password and revokes sessions in one transaction", async () => {
    await expect(setPassword("Ada@Example.TEST", "new-correct-horse")).resolves.toBeUndefined();

    expect(calls).toEqual([
      "hash:false",
      "begin",
      "findUserByEmail:true",
      "findCredentialAccount:true",
      "updatePassword:true",
      "deleteUserSessions:true",
      "end",
    ]);
    expect(runWithTransaction).toHaveBeenCalledWith(ctx.adapter, expect.any(Function));
    expect(ctx.password.hash).toHaveBeenCalledWith("new-correct-horse");
    expect(ctx.internalAdapter.findUserByEmail).toHaveBeenCalledWith("ada@example.test");
    expect(ctx.internalAdapter.findCredentialAccount).toHaveBeenCalledWith("u1");
    expect(ctx.internalAdapter.updatePassword).toHaveBeenCalledWith(
      "u1",
      "hashed:new-correct-horse",
    );
    expect(ctx.internalAdapter.deleteUserSessions).toHaveBeenCalledWith("u1");
  });

  it.each([
    ["short password", "x".repeat(9)],
    ["long password", "x".repeat(129)],
  ])("rejects a %s before hashing or opening the transaction", async (_label, newPassword) => {
    await expect(setPassword("ada@example.test", newPassword)).rejects.toThrow();
    expect(ctx.password.hash).not.toHaveBeenCalled();
    expect(runWithTransaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an unknown email without writing", async () => {
    ctx.internalAdapter.findUserByEmail.mockResolvedValueOnce(null);

    await expect(setPassword("nobody@example.test", "new-correct-horse")).rejects.toThrow(
      new NotFoundError("User"),
    );
    expect(ctx.internalAdapter.updatePassword).not.toHaveBeenCalled();
    expect(ctx.internalAdapter.deleteUserSessions).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a user without a credential account, without writing", async () => {
    ctx.internalAdapter.findCredentialAccount.mockResolvedValueOnce(null);

    await expect(setPassword("ada@example.test", "new-correct-horse")).rejects.toThrow(
      new NotFoundError("Credential account"),
    );
    expect(ctx.internalAdapter.updatePassword).not.toHaveBeenCalled();
    expect(ctx.internalAdapter.deleteUserSessions).not.toHaveBeenCalled();
  });

  it("propagates a failed password update without revoking sessions", async () => {
    const failure = new Error("update failed");
    ctx.internalAdapter.updatePassword.mockRejectedValueOnce(failure);

    await expect(setPassword("ada@example.test", "new-correct-horse")).rejects.toBe(failure);
    expect(ctx.internalAdapter.deleteUserSessions).not.toHaveBeenCalled();
    expect(calls.at(-1)).toBe("end");
  });

  it("propagates a failed session revocation from inside the transaction", async () => {
    const failure = new Error("delete failed");
    ctx.internalAdapter.deleteUserSessions.mockRejectedValueOnce(failure);

    await expect(setPassword("ada@example.test", "new-correct-horse")).rejects.toBe(failure);
    expect(calls).toEqual([
      "hash:false",
      "begin",
      "findUserByEmail:true",
      "findCredentialAccount:true",
      "updatePassword:true",
      "end",
    ]);
  });
});
