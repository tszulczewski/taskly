import { describe, expect, it } from "vitest";
import { z } from "zod";
import { signInInput, signUpInput } from "./schemas";

const valid = { name: "Ann", email: "ann@example.com", password: "a".repeat(10) };

function errors(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("signUpInput", () => {
  it.each([10, 128])("accepts a %i-character password", (n) => {
    expect(signUpInput.safeParse({ ...valid, password: "a".repeat(n) }).success).toBe(true);
  });

  it("rejects a 9-character password", () => {
    const result = signUpInput.safeParse({ ...valid, password: "a".repeat(9) });
    expect(errors(result)).toEqual({ password: ["Use at least 10 characters."] });
  });

  it("rejects a 129-character password", () => {
    const result = signUpInput.safeParse({ ...valid, password: "a".repeat(129) });
    expect(errors(result)).toEqual({ password: ["Use at most 128 characters."] });
  });

  it.each([1, 100])("accepts a %i-character name", (n) => {
    expect(signUpInput.parse({ ...valid, name: "n".repeat(n) }).name).toBe("n".repeat(n));
  });

  it("trims the name, and counts its length after trimming", () => {
    expect(signUpInput.parse({ ...valid, name: `  ${"n".repeat(100)}  ` }).name).toBe(
      "n".repeat(100),
    );
  });

  it.each(["", "   "])("rejects the empty name %j", (name) => {
    expect(errors(signUpInput.safeParse({ ...valid, name }))).toEqual({
      name: ["Enter your name."],
    });
  });

  it("rejects a 101-character name", () => {
    expect(errors(signUpInput.safeParse({ ...valid, name: "n".repeat(101) }))).toEqual({
      name: ["Use at most 100 characters."],
    });
  });

  it("rejects an invalid email", () => {
    expect(errors(signUpInput.safeParse({ ...valid, email: "ann@" }))).toEqual({
      email: ["Enter a valid email address."],
    });
  });
});

describe("signInInput", () => {
  it("accepts any non-empty password, without the sign-up length policy", () => {
    for (const password of ["a", "a".repeat(129)]) {
      expect(signInInput.safeParse({ email: "ann@example.com", password }).success).toBe(true);
    }
  });

  it("rejects an empty password and an invalid email", () => {
    expect(errors(signInInput.safeParse({ email: "ann", password: "" }))).toEqual({
      email: ["Enter a valid email address."],
      password: ["Enter your password."],
    });
  });
});
