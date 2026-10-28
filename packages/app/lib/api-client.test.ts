import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_MESSAGES, ApiError, apiCall, authCall } from "./api-client";

function mockFetch(body: unknown, status = 200, raw = false) {
  const fetchMock = vi.fn(async () => ({
    status,
    json: async () => {
      if (raw) throw new Error("not json");
      return body;
    },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiCall", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns data and sends the CSRF header", async () => {
    const f = mockFetch({ ok: true, data: [1] });
    expect(await apiCall<number[]>("/api/x")).toEqual([1]);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({ "x-requested-with": "taskly" });
    expect(init.body).toBeUndefined();
  });

  it("serialises JSON bodies and merges headers", async () => {
    const f = mockFetch({ ok: true, data: null });
    await apiCall("/api/x", { method: "POST", body: { a: 1 }, headers: { "x-extra": "1" } });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ "content-type": "application/json", "x-extra": "1" });
  });

  it("throws ApiError with field errors from the envelope", async () => {
    mockFetch(
      {
        ok: false,
        error: { code: "validation_error", message: "Invalid", fieldErrors: { n: ["bad"] } },
      },
      400,
    );
    const error = await apiCall("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "validation_error",
      fieldErrors: { n: ["bad"] },
    });
  });

  it("throws bad_response for non-envelope or unparsable bodies", async () => {
    mockFetch("nope", 502);
    await expect(apiCall("/api/x")).rejects.toMatchObject({ code: "bad_response", status: 502 });
    mockFetch(null, 500, true);
    await expect(apiCall("/api/x")).rejects.toMatchObject({ code: "bad_response" });
    mockFetch(null, 200);
    await expect(apiCall("/api/x")).rejects.toMatchObject({ code: "bad_response" });
  });
});

describe("authCall", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubResponse(body: string | null, status = 200, headers: Record<string, string> = {}) {
    const fetchMock = vi.fn(async () => new Response(body, { status, headers }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const json = (value: unknown) => JSON.stringify(value);
  const failure = () => authCall("/api/auth/sign-out").catch((e: unknown) => e);

  it("POSTs the given JSON body with the CSRF header and resolves on success", async () => {
    const f = stubResponse(json({ token: "t", user: { id: "u" } }));
    await expect(
      authCall("/api/auth/sign-in/email", { email: "a@b.pl", password: "secret" }),
    ).resolves.toBeUndefined();
    const [path, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/auth/sign-in/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "x-requested-with": "taskly",
      "content-type": "application/json",
    });
    const sent = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sent).toEqual({ email: "a@b.pl", password: "secret" });
    expect(sent).not.toHaveProperty("rememberMe");
  });

  it("sends the sign-up body and an empty object for sign-out", async () => {
    const f = stubResponse(json({ success: true }));
    await authCall("/api/auth/sign-up/email", {
      name: "Ann",
      email: "a@b.pl",
      password: "x".repeat(10),
    });
    await authCall("/api/auth/sign-out");
    const bodies = (f.mock.calls as unknown as [string, RequestInit][]).map(([, i]) => i.body);
    expect(bodies).toEqual([
      json({ name: "Ann", email: "a@b.pl", password: "x".repeat(10) }),
      "{}",
    ]);
  });

  it.each([
    ["INVALID_EMAIL_OR_PASSWORD", 401, AUTH_MESSAGES.invalidCredentials],
    ["USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", 422, AUTH_MESSAGES.accountNotCreated],
    ["INVALID_SIGN_UP_INPUT", 400, AUTH_MESSAGES.checkDetails],
    ["PASSWORD_TOO_SHORT", 400, AUTH_MESSAGES.checkDetails],
    ["PASSWORD_TOO_LONG", 400, AUTH_MESSAGES.checkDetails],
    ["EMAIL_PASSWORD_SIGN_UP_DISABLED", 400, AUTH_MESSAGES.signUpClosed],
    ["FAILED_TO_CREATE_USER", 422, AUTH_MESSAGES.generic],
    ["constructor", 400, AUTH_MESSAGES.generic],
  ])("maps %s to its message, never the raw one", async (code, status, message) => {
    stubResponse(json({ code, message: "raw server text" }), status);
    expect(await failure()).toMatchObject({ status, code, message });
  });

  it("shows the exact texts from the spec", () => {
    expect(AUTH_MESSAGES).toMatchObject({
      invalidCredentials: "Email or password is incorrect.",
      accountNotCreated: "Could not create the account.",
      checkDetails: "Check your details and try again.",
      signOutFailed: "Could not sign out. Try again.",
      generic: "Something went wrong. Try again.",
    });
  });

  it.each([
    ["1", "Too many attempts. Try again in 1 second."],
    ["7", "Too many attempts. Try again in 7 seconds."],
    [undefined, AUTH_MESSAGES.rateLimitedNoWait],
    ["0", AUTH_MESSAGES.rateLimitedNoWait],
    ["-3", AUTH_MESSAGES.rateLimitedNoWait],
    ["abc", AUTH_MESSAGES.rateLimitedNoWait],
    ["2.5", AUTH_MESSAGES.rateLimitedNoWait],
  ])("maps a 429 with X-Retry-After %s by status", async (retryAfter, message) => {
    const headers: Record<string, string> =
      retryAfter === undefined ? {} : { "X-Retry-After": retryAfter };
    stubResponse(json({ message: "Too many requests. Please try again later." }), 429, headers);
    const error = await failure();
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "rate_limited", message });
  });

  it.each([
    ["a non-JSON body", "<html>Bad gateway</html>"],
    ["JSON without a code", json({ message: "nope" })],
    ["a non-string code", json({ code: 42 })],
    ["a JSON non-object", json("oops")],
    ["an empty body", null],
  ])("falls back to the generic message for %s", async (_label, body) => {
    stubResponse(body, 502);
    expect(await failure()).toMatchObject({
      status: 502,
      code: "bad_response",
      message: AUTH_MESSAGES.generic,
    });
  });

  it("turns a network error into an ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await failure();
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      code: "network_error",
      message: AUTH_MESSAGES.generic,
    });
  });
});
