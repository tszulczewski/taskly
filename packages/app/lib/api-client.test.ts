import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiCall } from "./api-client";

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
