import { describe, expect, it } from "vitest";
import * as isomorphic from "./index";
import * as server from "./server";

describe("entry points", () => {
  it("exports isomorphic helpers from the root entry", () => {
    expect(isomorphic.can).toBeTypeOf("function");
    expect(isomorphic.mapError).toBeTypeOf("function");
    expect(isomorphic.formatPln).toBeTypeOf("function");
    // The sign-up and sign-in forms import these from the client-safe entry.
    expect(isomorphic.signUpInput).toBeDefined();
    expect(isomorphic.signInInput).toBeDefined();
    // The task forms parse amounts and validate tasks in the browser (spec E01).
    expect(isomorphic.parsePlnToGrosze).toBeTypeOf("function");
    expect(isomorphic.estimateFromAmounts).toBeTypeOf("function");
    expect(isomorphic.rollUpEstimate).toBeTypeOf("function");
    expect(isomorphic.createTaskInput).toBeDefined();
    expect(isomorphic.taskListResponseSchema).toBeDefined();
    // The pure rule is isomorphic; its service is server-only (spec E03, review R1).
    expect(isomorphic.futureExpenses).toBeTypeOf("function");
    expect(isomorphic.futureExpensesResponseSchema).toBeDefined();
    // The `/` page shows the default list's name, also when the list could not be opened.
    expect(isomorphic.DEFAULT_LIST_NAME).toBe("My renovation");
  });

  it("exports services from the server entry and keeps the root exports", () => {
    expect(server.getAuth).toBeTypeOf("function");
    expect(server.createTask).toBeTypeOf("function");
    expect(server.futureExpensesService).toBeTypeOf("function");
    expect(server.ensureDefaultList).toBeTypeOf("function");
    expect(server.getEnv).toBeTypeOf("function");
    expect(server.createPasswordUser).toBeTypeOf("function");
    expect(server.setPassword).toBeTypeOf("function");
    expect(server.can).toBe(isomorphic.can);
  });
});
