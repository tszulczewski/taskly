import { getDb, schema } from "@taskly/db";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getAuth } from "./auth";
import { createPasswordUser } from "./password-admin";

const url = process.env.DATABASE_URL;
const run = `pwadmin${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const baseUrl = "http://localhost:3000";

describe.skipIf(!url)("createPasswordUser (real PostgreSQL)", () => {
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
});
