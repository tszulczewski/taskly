import {
  deleteTaskResponseSchema,
  MAX_ESTIMATE_GROSZE,
  type ResponseSchema,
  taskListResponseSchema,
  type TaskView,
  taskViewSchema,
} from "@taskly/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_MESSAGES, AUTH_TIMEOUT_MS, ApiError, apiCall, authCall } from "./api-client";

function mockFetch(body: unknown, status = 200, raw = false) {
  const fetchMock = vi.fn(
    async () => new Response(raw ? String(body) : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const task: TaskView = {
  id: "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f",
  title: "Tile the wall",
  description: null,
  estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
  unestimatedSubtasks: 0,
  subtasks: [],
};
const parent: TaskView = {
  ...task,
  estimate: { minGrosze: MAX_ESTIMATE_GROSZE, maxGrosze: MAX_ESTIMATE_GROSZE + 1 },
  unestimatedSubtasks: 1,
  subtasks: [
    {
      id: "0a1b2c3d-4e5f-4a7b-9c8d-6f1c2d3e4b5a",
      title: "Plaster",
      description: "Two coats",
      estimate: { minGrosze: MAX_ESTIMATE_GROSZE, maxGrosze: MAX_ESTIMATE_GROSZE + 1 },
    },
    {
      id: "9c8d6f1c-2d3e-4b5a-8e9f-0a1b2c3d4e5f",
      title: "Paint",
      description: null,
      estimate: null,
    },
  ],
};
const { unestimatedSubtasks: _u, ...noUnestimated } = task;
const ok = (data: unknown) => ({ ok: true, data });
const fail = (error: unknown) => ({ ok: false, error });
const badResponse = (status: number) => ({
  status,
  code: "bad_response",
  message: "Unexpected server response",
  fieldErrors: undefined,
});

describe("apiCall", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns data and sends the CSRF header", async () => {
    const f = mockFetch(ok([1]));
    expect(await apiCall<number[]>("/api/x")).toEqual([1]);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({ "x-requested-with": "taskly" });
    expect(init.body).toBeUndefined();
  });

  it("serialises JSON bodies and merges headers", async () => {
    const f = mockFetch(ok(null));
    await apiCall("/api/x", { method: "POST", body: { a: 1 }, headers: { "x-extra": "1" } });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ "content-type": "application/json", "x-extra": "1" });
  });

  it("returns undefined for a success envelope without data when no schema is given", async () => {
    mockFetch({ ok: true });
    expect(await apiCall("/api/x")).toBeUndefined();
  });

  it("throws ApiError with field errors from the envelope", async () => {
    mockFetch(
      fail({ code: "validation_error", message: "Invalid", fieldErrors: { n: ["bad"] } }),
      400,
    );
    const error = await apiCall("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Invalid",
      fieldErrors: { n: ["bad"] },
    });
  });

  it("throws ApiError without field errors from a plain error envelope", async () => {
    mockFetch(fail({ code: "conflict", message: "Please try again" }), 409);
    await expect(apiCall("/api/x", { response: taskViewSchema })).rejects.toMatchObject({
      status: 409,
      code: "conflict",
      message: "Please try again",
      fieldErrors: undefined,
    });
  });

  it("throws bad_response for non-envelope or unparsable bodies", async () => {
    mockFetch("nope", 502);
    await expect(apiCall("/api/x")).rejects.toMatchObject(badResponse(502));
    mockFetch("<html>Bad gateway</html>", 500, true);
    await expect(apiCall("/api/x")).rejects.toMatchObject(badResponse(500));
    mockFetch(null, 200);
    await expect(apiCall("/api/x")).rejects.toMatchObject(badResponse(200));
  });

  describe("with a response schema", () => {
    it.each([
      ["a task", taskViewSchema, task],
      ["a parent with subtasks and a sum above the input cap", taskViewSchema, parent],
      ["a list", taskListResponseSchema, [task, parent]],
      ["null after deleting a top-level task", deleteTaskResponseSchema, null],
      ["the parent after deleting a subtask", deleteTaskResponseSchema, parent],
    ] as const)("returns %s", async (_, schema, value) => {
      mockFetch(ok(value));
      expect(await apiCall("/api/x", { response: schema as ResponseSchema<unknown> })).toEqual(
        value,
      );
    });

    it("accepts additive unknown fields and returns the parsed value without them", async () => {
      mockFetch({ ...ok([{ ...task, position: "a0" }]), meta: 1 });
      const tasks: TaskView[] = await apiCall("/api/x", { response: taskListResponseSchema });
      expect(tasks).toEqual([task]);
    });

    it("does not pass the schema to fetch", async () => {
      const f = mockFetch(ok(task));
      await apiCall("/api/x", { method: "PATCH", body: {}, response: taskViewSchema });
      const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
      expect(init).not.toHaveProperty("response");
      expect(init.method).toBe("PATCH");
    });

    it.each([
      ["no unestimatedSubtasks", taskViewSchema, noUnestimated],
      ["no subtasks", taskViewSchema, { ...task, subtasks: undefined }],
      ["a numeric title", taskViewSchema, { ...task, title: 42 }],
      ["a string amount", taskViewSchema, { ...task, estimate: { minGrosze: "1", maxGrosze: 2 } }],
      ["min above max", taskViewSchema, { ...task, estimate: { minGrosze: 3, maxGrosze: 2 } }],
      ["a malformed subtask", taskViewSchema, { ...task, subtasks: [{ id: "x" }] }],
      ["one bad row in a list", taskListResponseSchema, [task, noUnestimated]],
      ["a missing data key", deleteTaskResponseSchema, undefined],
    ] as const)("rejects %s with bad_response", async (_, schema, value) => {
      mockFetch(ok(value));
      const error = await apiCall("/api/x", { response: schema as ResponseSchema<unknown> }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject(badResponse(200));
    });

    it("rejects a non-JSON body with bad_response", async () => {
      mockFetch("<html>Proxy error</html>", 200, true);
      await expect(apiCall("/api/x", { response: taskViewSchema })).rejects.toMatchObject(
        badResponse(200),
      );
    });
  });

  it.each([
    ["ok as a string", { ok: "true", data: task }, 200],
    ["no ok key", { data: task }, 200],
    ["an array", [task], 200],
    ["a success envelope on an error status", ok(task), 500],
    ["an error envelope on a success status", fail({ code: "conflict", message: "x" }), 200],
    ["an error that is not an object", fail("boom"), 500],
    ["an error without a code", fail({ message: "Row title" }), 500],
    ["a numeric code", fail({ code: 500, message: "x" }), 500],
    ["an error without a message", fail({ code: "conflict" }), 409],
    [
      "fieldErrors as a list",
      fail({ code: "validation_error", message: "x", fieldErrors: ["t"] }),
      400,
    ],
    [
      "a fieldErrors value that is not a list",
      fail({ code: "v", message: "x", fieldErrors: { t: "bad" } }),
      400,
    ],
    [
      "a fieldErrors message that is not a string",
      fail({ code: "v", message: "x", fieldErrors: { t: [1] } }),
      400,
    ],
  ] as const)("rejects an envelope with %s as bad_response", async (_, body, status) => {
    mockFetch(body, status);
    const error = await apiCall("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject(badResponse(status));
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

describe("authCall deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const signalOf = (f: ReturnType<typeof vi.fn>) =>
    (f.mock.calls[0] as unknown as [string, RequestInit])[1].signal!;

  // Like the browser's fetch: aborting the signal rejects the pending request or errors its body.
  const onAbort = (signal: AbortSignal | null | undefined, run: () => void) =>
    signal?.addEventListener("abort", run, { once: true });

  function stubHungHeaders() {
    const f = vi.fn(
      (_path: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          onAbort(init.signal, () => reject(new DOMException("aborted", "AbortError"))),
        ),
    );
    vi.stubGlobal("fetch", f);
    return f;
  }

  function stubHungBody(status: number) {
    const f = vi.fn(async (_path: string, init: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"code":'));
          onAbort(init.signal, () => controller.error(new DOMException("aborted", "AbortError")));
        },
      });
      return new Response(body, { status });
    });
    vi.stubGlobal("fetch", f);
    return f;
  }

  const settle = (call: Promise<void>) =>
    call.then(
      () => "resolved" as const,
      (e: unknown) => e,
    );

  it("aborts when the response headers never arrive", async () => {
    vi.useFakeTimers();
    const f = stubHungHeaders();
    let outcome: unknown;
    void settle(authCall("/api/auth/sign-out")).then((o) => (outcome = o));
    const signal = signalOf(f);
    expect(signal).toBeInstanceOf(AbortSignal);
    await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS - 1);
    expect(outcome).toBeUndefined();
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal.aborted).toBe(true);
    expect(outcome).toBeInstanceOf(ApiError);
    expect(outcome).toMatchObject({ status: 0, code: "timeout", message: AUTH_MESSAGES.generic });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts when an error response's body never finishes", async () => {
    vi.useFakeTimers();
    const f = stubHungBody(500);
    let outcome: unknown;
    void settle(authCall("/api/auth/sign-in/email", { email: "a@b.pl", password: "secret" })).then(
      (o) => (outcome = o),
    );
    await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(signalOf(f).aborted).toBe(true);
    expect(outcome).toMatchObject({ status: 0, code: "timeout", message: AUTH_MESSAGES.generic });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resolves on success without reading the body, then clears the timer and releases it", async () => {
    vi.useFakeTimers();
    const f = stubHungBody(200);
    await expect(authCall("/api/auth/sign-out")).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    expect(signalOf(f).aborted).toBe(true);
  });

  it("clears the timer when the call fails before the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD" }), { status: 401 }),
      ),
    );
    expect(await settle(authCall("/api/auth/sign-out"))).toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
    expect(vi.getTimerCount()).toBe(0);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    expect(await settle(authCall("/api/auth/sign-out"))).toMatchObject({ code: "network_error" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("can be retried after a timeout", async () => {
    vi.useFakeTimers();
    stubHungHeaders();
    const first = settle(authCall("/api/auth/sign-out"));
    await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
    expect(await first).toMatchObject({ code: "timeout" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    await expect(authCall("/api/auth/sign-out")).resolves.toBeUndefined();
  });
});
