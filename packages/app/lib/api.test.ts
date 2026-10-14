import { ForbiddenError, UnauthorizedError } from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser }));

const { apiHandler, requireUser } = await import("./api");

const post = (headers: Record<string, string> = {}) =>
  new Request("http://x/api", { method: "POST", headers });

describe("apiHandler", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("wraps results in the success envelope", async () => {
    const res = await apiHandler(async () => ({ a: 1 }))(new Request("http://x/api"), {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });

  it("rejects mutating requests without the CSRF header", async () => {
    const fn = vi.fn();
    const res = await apiHandler(fn)(post(), {});
    expect(res.status).toBe(403);
    expect(fn).not.toHaveBeenCalled();
  });

  it("accepts mutating requests with the CSRF header", async () => {
    const res = await apiHandler(async () => "ok")(post({ "x-requested-with": "taskly" }), {});
    expect(await res.json()).toEqual({ ok: true, data: "ok" });
  });

  it("maps domain errors to statuses without logging", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new ForbiddenError();
    })(new Request("http://x/api"), {});
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs and hides unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new Error("db password leaked");
    })(new Request("http://x/api"), {});
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("requireUser", () => {
  it("returns the signed-in user", async () => {
    getSessionUser.mockResolvedValueOnce({ id: "u1" });
    expect(await requireUser(new Request("http://x/"))).toEqual({ id: "u1" });
  });

  it("throws UnauthorizedError without a session", async () => {
    getSessionUser.mockResolvedValueOnce(null);
    await expect(requireUser(new Request("http://x/"))).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
