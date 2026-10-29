import { signInInput, signUpInput } from "@taskly/core";
import { describe, expect, it } from "vitest";
import { firstFieldErrors, type FormSchema } from "./form-errors";

describe("firstFieldErrors", () => {
  it("returns nothing for valid values", () => {
    expect(firstFieldErrors(signInInput, { email: "anna@example.com", password: "x" })).toEqual({});
  });

  it("maps the shared schema's messages to their fields", () => {
    expect(
      firstFieldErrors(signUpInput, {
        name: "a".repeat(101),
        email: "anna",
        password: "p".repeat(129),
      }),
    ).toEqual({
      name: "Use at most 100 characters.",
      email: "Enter a valid email address.",
      password: "Use at most 128 characters.",
    });
  });

  it("keeps the first message per field and ignores issues outside the form", () => {
    const schema: FormSchema = {
      safeParse: () => ({
        success: false,
        error: {
          issues: [
            { path: ["email"], message: "first" },
            { path: ["email"], message: "second" },
            { path: [], message: "whole form" },
            { path: ["toString"], message: "prototype key" },
            { path: [Symbol("email")], message: "symbol" },
          ],
        },
      }),
    };
    expect(firstFieldErrors(schema, { email: "" })).toEqual({ email: "first" });
  });
});
