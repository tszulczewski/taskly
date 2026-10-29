import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { createQueryClient } from "./query-client";

const unauthorized = new ApiError(401, "unauthorized", "Unauthorized");

describe("createQueryClient", () => {
  it("keeps the project's query defaults", () => {
    const client = createQueryClient(vi.fn());
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it("calls onUnauthorized with the client when a query gets 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    await client
      .fetchQuery({ queryKey: ["x"], queryFn: () => Promise.reject(unauthorized) })
      .catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith(client);
  });

  it("calls onUnauthorized when a mutation gets 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    const mutation = client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(unauthorized) });
    await mutation.execute(undefined).catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith(client);
  });

  it.each([
    ["403", new ApiError(403, "forbidden", "Forbidden")],
    ["404", new ApiError(404, "not_found", "Not found")],
    ["a network error", new TypeError("Failed to fetch")],
  ])("does not treat %s as an expired session", async (_, error) => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    await client
      .fetchQuery({ queryKey: ["x"], queryFn: () => Promise.reject(error), retry: false })
      .catch(() => {});
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("retries a query once, but never a 4xx answer", () => {
    const retry = createQueryClient(vi.fn()).getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") throw new Error("retry must be a function");
    const serverError = new ApiError(500, "internal_error", "Something went wrong");
    expect(retry(0, serverError)).toBe(true);
    expect(retry(1, serverError)).toBe(false);
    expect(retry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(retry(0, new ApiError(200, "bad_response", "Unexpected server response"))).toBe(true);
    expect(retry(0, unauthorized)).toBe(false);
    expect(retry(0, new ApiError(404, "not_found", "Not found"))).toBe(false);
    expect(retry(0, new ApiError(499, "x", "x"))).toBe(false);
  });
});
