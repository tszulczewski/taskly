import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { signUpBeforeHook } from "./sign-up-hook";

const BASE_URL = "http://localhost:3000";

// The real Better Auth router over an in-memory adapter: hook order, body forwarding and
// `disableSignUp` are the library's behavior, not a mock's.
function setup(allowSignUp: boolean) {
  const db: Record<"user" | "account" | "session" | "verification", Record<string, unknown>[]> = {
    user: [],
    account: [],
    session: [],
    verification: [],
  };
  const auth = betterAuth({
    secret: "s".repeat(32),
    baseURL: BASE_URL,
    database: memoryAdapter(db),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    hooks: { before: signUpBeforeHook },
    logger: { disabled: true },
    telemetry: { enabled: false },
  });
  async function post(path: string, body: unknown) {
    const res = await auth.handler(
      new Request(`${BASE_URL}/api/auth${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE_URL },
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }
  return { db, post };
}

const valid = { name: "Ann", email: "ann@example.com", password: "a".repeat(10) };

describe("sign-up hook", () => {
  it("stores a valid sign-up with the name trimmed and library fields kept", async () => {
    const { db, post } = setup(true);
    const res = await post("/sign-up/email", {
      ...valid,
      name: "  Ann Smith  ",
      image: "https://example.com/a.png",
    });
    expect(res.status).toBe(200);
    expect(db.user).toHaveLength(1);
    expect(db.user[0]).toMatchObject({
      name: "Ann Smith",
      email: "ann@example.com",
      image: "https://example.com/a.png",
    });
    expect(db.account).toHaveLength(1);
  });

  it.each([
    ["an empty name", { ...valid, name: "" }],
    ["a whitespace-only name", { ...valid, name: "   " }],
    ["a 101-character name", { ...valid, name: "n".repeat(101) }],
    ["an invalid email", { ...valid, email: "not-an-email" }],
    ["a 9-character password", { ...valid, password: "a".repeat(9) }],
    ["a 129-character password", { ...valid, password: "a".repeat(129) }],
    ["a missing body", null],
  ])("rejects %s with a generic 400 and saves nothing", async (_case, body) => {
    const { db, post } = setup(true);
    const res = await post("/sign-up/email", body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: "INVALID_SIGN_UP_INPUT",
      message: "Invalid sign-up details",
    });
    expect(db.user).toHaveLength(0);
    expect(db.account).toHaveLength(0);
  });

  it("still lets Better Auth reject invalid library-owned fields", async () => {
    const { db, post } = setup(true);
    const res = await post("/sign-up/email", { ...valid, rememberMe: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.code).not.toBe("INVALID_SIGN_UP_INPUT");
    expect(db.user).toHaveLength(0);
  });

  it("keeps closed sign-up closed for a valid request", async () => {
    const { db, post } = setup(false);
    const res = await post("/sign-up/email", valid);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
    expect(db.user).toHaveLength(0);
  });

  it("rejects invalid input before the closed-sign-up check", async () => {
    const { post } = setup(false);
    const res = await post("/sign-up/email", { ...valid, name: " " });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGN_UP_INPUT");
  });

  it("leaves other paths untouched", async () => {
    const { post } = setup(true);
    const res = await post("/sign-in/email", { email: "ann@example.com", password: "x" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });
});
