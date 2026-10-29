import { getDb, schema } from "@taskly/db";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getAuth, getSessionUser } from "./auth";
import { NotFoundError } from "./errors";
import { createPasswordUser, setPassword } from "./password-admin";

const url = process.env.DATABASE_URL;
const run = `pwadmin${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const baseUrl = "http://localhost:3000";

describe.skipIf(!url)("password admin (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 2 });
  const db = drizzle(pool, { schema });
  const usersByEmail = (address: string) =>
    db.select().from(schema.user).where(eq(schema.user.email, address));

  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "integration-secret-".padEnd(48, "x"));
    vi.stubEnv("BETTER_AUTH_URL", baseUrl);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-not-used");
    // Sign-up stays closed: createPasswordUser must not depend on it.
    vi.stubEnv("ALLOW_SIGN_UP", undefined);
  });

  afterAll(async () => {
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await getDb().$client.end();
    vi.unstubAllEnvs();
  });

  it("creates a user who can sign in while sign-up is closed", async () => {
    const created = await createPasswordUser({
      name: "  Ada Lovelace ",
      email: email("Signin").toUpperCase(),
      password,
    });
    expect(created).toStrictEqual({
      id: expect.any(String),
      email: email("signin"),
      name: "Ada Lovelace",
    });
    expect((await getAuth().$context).options.emailAndPassword?.disableSignUp).toBe(true);

    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, created.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ providerId: "credential", accountId: created.id });
    expect(accounts[0]?.password).not.toContain(password);

    const res = await getAuth().handler(
      new Request(`${baseUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: baseUrl,
          "x-forwarded-for": "198.51.100.71",
        },
        body: JSON.stringify({ email: email("signin"), password }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/better-auth\.session_token=/);
  });

  it("rejects invalid input and saves nothing", async () => {
    await expect(
      createPasswordUser({ name: "   ", email: email("invalid"), password }),
    ).rejects.toThrow();
    await expect(
      createPasswordUser({ name: "Short", email: email("invalid"), password: "short" }),
    ).rejects.toThrow();
    expect(await usersByEmail(email("invalid"))).toHaveLength(0);
  });

  it("rejects a duplicate email and keeps the first account", async () => {
    await createPasswordUser({ name: "First", email: email("dup"), password });
    await expect(
      createPasswordUser({ name: "Second", email: email("dup"), password }),
    ).rejects.toMatchObject({ cause: { code: "23505", constraint: "user_email_unique" } });
    const rows = await usersByEmail(email("dup"));
    expect(rows.map((r) => r.name)).toEqual(["First"]);
  });

  it("leaves no orphan user when the credential-account insert fails", async () => {
    const internal = (await getAuth().$context).internalAdapter;
    const realLinkAccount = internal.linkAccount;
    const createUser = vi.spyOn(internal, "createUser");
    const linkAccount = vi.spyOn(internal, "linkAccount");
    // A real database failure: the account points at a user that does not exist (FK violation).
    linkAccount.mockImplementationOnce((account) =>
      realLinkAccount({ ...account, userId: `${run}-missing` }),
    );

    try {
      await expect(
        createPasswordUser({ name: "Orphan", email: email("orphan"), password }),
      ).rejects.toMatchObject({ cause: { code: "23503" } });
      expect(createUser).toHaveBeenCalledTimes(1);
      const attempted = await createUser.mock.results[0]?.value;
      expect(attempted?.id).toEqual(expect.any(String));

      expect(await usersByEmail(email("orphan"))).toHaveLength(0);
      const accounts = await db
        .select()
        .from(schema.account)
        .where(inArray(schema.account.userId, [attempted.id, `${run}-missing`]));
      expect(accounts).toHaveLength(0);
    } finally {
      createUser.mockRestore();
      linkAccount.mockRestore();
    }
  });

  describe("setPassword", () => {
    const newPassword = "new-staple-battery-horse";
    // Sign-in allows 3 attempts per 10 s per client IP; give every request its own address.
    let nextIp = 100;

    const signIn = (address: string, secret: string) =>
      getAuth().handler(
        new Request(`${baseUrl}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: baseUrl,
            "x-forwarded-for": `198.51.100.${nextIp++}`,
          },
          body: JSON.stringify({ email: address, password: secret }),
        }),
      );

    const sessionCookie = async (address: string) => {
      const res = await signIn(address, password);
      expect(res.status).toBe(200);
      const cookie = res.headers.get("set-cookie")?.match(/better-auth\.session_token=[^;]+/)?.[0];
      expect(cookie).toBeDefined();
      return cookie as string;
    };

    const signedInUser = (cookie: string) =>
      getSessionUser(new Headers({ cookie }), { disableRefresh: true });

    /** The stored credential hash and session ids, which a failed reset must leave as they were. */
    const snapshot = async (userId: string) => {
      const accounts = await db
        .select({ password: schema.account.password })
        .from(schema.account)
        .where(eq(schema.account.userId, userId));
      const sessions = await db
        .select({ id: schema.session.id })
        .from(schema.session)
        .where(eq(schema.session.userId, userId));
      return {
        hashes: accounts.map((a) => a.password),
        sessionIds: sessions.map((r) => r.id).sort(),
      };
    };

    /** A password user with two signed-in sessions (two devices). */
    const userWithSessions = async (slug: string) => {
      const user = await createPasswordUser({ name: "Reset", email: email(slug), password });
      const cookies = [await sessionCookie(email(slug)), await sessionCookie(email(slug))];
      const before = await snapshot(user.id);
      expect(before.hashes).toHaveLength(1);
      expect(before.sessionIds).toHaveLength(2);
      return { user, cookies, before };
    };

    it("replaces the password and signs out every session", async () => {
      const { user, cookies, before } = await userWithSessions("reset");
      for (const cookie of cookies) expect((await signedInUser(cookie))?.id).toBe(user.id);

      await setPassword(email("Reset").toUpperCase(), newPassword);

      const after = await snapshot(user.id);
      expect(after.sessionIds).toEqual([]);
      expect(after.hashes).toHaveLength(1);
      expect(after.hashes[0]).not.toBe(before.hashes[0]);
      expect(after.hashes[0]).not.toContain(newPassword);
      for (const cookie of cookies) expect(await signedInUser(cookie)).toBeNull();
      expect((await signIn(email("reset"), password)).status).toBe(401);
      expect((await signIn(email("reset"), newPassword)).status).toBe(200);
    });

    it("throws NotFoundError for an unknown email", async () => {
      await expect(setPassword(email("nobody"), newPassword)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects a short password and changes nothing", async () => {
      const { user, before } = await userWithSessions("short");

      await expect(setPassword(email("short"), "too-short")).rejects.toThrow(
        "Use at least 10 characters.",
      );

      expect(await snapshot(user.id)).toEqual(before);
      expect((await signIn(email("short"), password)).status).toBe(200);
    });

    it("refuses a user without a credential account and keeps their sessions", async () => {
      const userId = `${run}-nocred`;
      await db
        .insert(schema.user)
        .values({ id: userId, name: "No password", email: email("nocred") });
      await db.insert(schema.session).values({
        id: `${run}-nocred-session`,
        token: `${run}-nocred-token`,
        userId,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(setPassword(email("nocred"), newPassword)).rejects.toThrow(
        new NotFoundError("Credential account"),
      );

      expect(await snapshot(userId)).toEqual({ hashes: [], sessionIds: [`${run}-nocred-session`] });
    });

    type DeleteUserSessions = (userId: string) => Promise<void>;
    it.each<{
      when: string;
      slug: string;
      inject: (real: DeleteUserSessions, userId: string) => Promise<void>;
    }>([
      {
        when: "session revocation fails",
        slug: "rollback-revoke",
        inject: () => Promise.reject(new Error("injected failure")),
      },
      {
        when: "the reset fails after both writes",
        slug: "rollback-late",
        inject: async (real, userId) => {
          await real(userId);
          throw new Error("injected failure");
        },
      },
    ])("rolls back the password and sessions when $when", async ({ slug, inject }) => {
      const { user, cookies, before } = await userWithSessions(slug);
      const address = email(slug);
      const internal = (await getAuth().$context).internalAdapter;
      const realDeleteUserSessions = internal.deleteUserSessions;
      const updatePassword = vi.spyOn(internal, "updatePassword");
      const deleteUserSessions = vi
        .spyOn(internal, "deleteUserSessions")
        .mockImplementationOnce((userId) => inject(realDeleteUserSessions, userId));

      try {
        await expect(setPassword(address, newPassword)).rejects.toThrow("injected failure");
        // The password write ran inside the transaction before the failure.
        expect(updatePassword).toHaveBeenCalledWith(user.id, expect.any(String));
        expect(deleteUserSessions).toHaveBeenCalledTimes(1);
      } finally {
        updatePassword.mockRestore();
        deleteUserSessions.mockRestore();
      }

      expect(await snapshot(user.id)).toEqual(before);
      for (const cookie of cookies) expect((await signedInUser(cookie))?.id).toBe(user.id);
      expect((await signIn(address, newPassword)).status).toBe(401);
      expect((await signIn(address, password)).status).toBe(200);
    });
  });
});
