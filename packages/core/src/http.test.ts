import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";
import { hasCsrfHeader, mapError } from "./http";

describe("mapError", () => {
  it("maps domain errors to statuses", () => {
    expect(mapError(new UnauthorizedError()).status).toBe(401);
    expect(mapError(new ForbiddenError()).status).toBe(403);
    expect(mapError(new NotFoundError("List")).status).toBe(404);
    expect(mapError(new ConflictError()).status).toBe(409);
  });
  it("maps Zod errors to 400 with field errors", () => {
    const r = z.object({ name: z.string().min(2) }).safeParse({ name: "a" });
    const m = mapError(r.error);
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
