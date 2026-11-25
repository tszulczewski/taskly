import { z } from "zod";
import { describe, expect, it } from "vitest";
import "./index";

describe("zod config", () => {
  it("turns off code generation when the isomorphic entry is imported", () => {
    expect(z.config().jitless).toBe(true);
  });
});
