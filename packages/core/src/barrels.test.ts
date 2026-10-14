import { describe, expect, it } from "vitest";
import * as isomorphic from "./index";
import * as server from "./server";

describe("entry points", () => {
  it("exports isomorphic helpers from the root entry", () => {
    expect(isomorphic.can).toBeTypeOf("function");
    expect(isomorphic.mapError).toBeTypeOf("function");
    expect(isomorphic.formatPln).toBeTypeOf("function");
  });

  it("exports services from the server entry and keeps the root exports", () => {
    expect(server.getAuth).toBeTypeOf("function");
    expect(server.createTask).toBeTypeOf("function");
    expect(server.getEnv).toBeTypeOf("function");
    expect(server.can).toBe(isomorphic.can);
  });
});
