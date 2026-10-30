import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import { apiResponseSchema, hasCsrfHeader, mapError } from "./http";

describe("mapError", () => {
  it("maps domain errors to statuses", () => {
    expect(mapError(new UnauthorizedError()).status).toBe(401);
    expect(mapError(new ForbiddenError()).status).toBe(403);
    expect(mapError(new NotFoundError("List")).status).toBe(404);
    expect(mapError(new ConflictError()).status).toBe(409);
    expect(mapError(new NotImplementedError("x")).status).toBe(501);
  });
  it("maps an unparseable request to 400 with its message and no field errors", () => {
    expect(mapError(new ValidationError("Invalid JSON body"))).toEqual({
      status: 400,
      body: { ok: false, error: { code: "validation_error", message: "Invalid JSON body" } },
    });
  });
  it("maps Zod errors to 400 with field errors", () => {
    const r = z.object({ name: z.string().min(2) }).safeParse({ name: "a" });
    const m = mapError(r.error);
    const root = mapError(z.string().safeParse(1).error);
    expect(root.body.error.fieldErrors?._).toHaveLength(1);
    expect(m.status).toBe(400);
    expect(m.body.error.fieldErrors?.name).toHaveLength(1);
  });
  it("hides details of unexpected errors", () => {
    const m = mapError(new Error("secret db password"));
    expect(m.status).toBe(500);
    expect(JSON.stringify(m.body)).not.toContain("secret");
  });
});

describe("hasCsrfHeader", () => {
  it("requires the header on mutating requests only", () => {
    expect(hasCsrfHeader(new Request("http://x/", { method: "GET" }))).toBe(true);
    expect(hasCsrfHeader(new Request("http://x/", { method: "POST" }))).toBe(false);
    expect(
      hasCsrfHeader(
        new Request("http://x/", { method: "POST", headers: { "x-requested-with": "taskly" } }),
      ),
    ).toBe(true);
  });
});

describe("apiResponseSchema", () => {
  it("accepts both envelopes, a success without data, and keeps the data untouched", () => {
    expect(apiResponseSchema.parse({ ok: true, data: { a: 1 } })).toEqual({
      ok: true,
      data: { a: 1 },
    });
    expect(apiResponseSchema.safeParse({ ok: true }).success).toBe(true);
    const failure = { ok: false, error: { code: "c", message: "m", fieldErrors: { t: ["x"] } } };
    expect(apiResponseSchema.parse(failure)).toEqual(failure);
  });
  it("rejects malformed envelopes", () => {
    for (const value of [
      null,
      { ok: 1 },
      { ok: false },
      { ok: false, error: { code: "c" } },
      { ok: false, error: { code: "c", message: "m", fieldErrors: { t: "x" } } },
    ])
      expect(apiResponseSchema.safeParse(value).success).toBe(false);
  });
});
