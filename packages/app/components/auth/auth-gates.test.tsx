import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const env = { ALLOW_SIGN_UP: false };
const redirectIfSignedIn = vi.fn(async () => {
  calls.push("session");
});
const connection = vi.fn(async () => {
  calls.push("connection");
});
const getEnv = vi.fn(() => {
  calls.push("env");
  return env;
});

vi.mock("../../lib/session", () => ({ redirectIfSignedIn }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@taskly/core/server", () => ({ getEnv }));
vi.mock("./sign-in-form", () => ({
  SignInForm: ({ signUpOpen }: { signUpOpen: boolean }) => (
    <form aria-label="Sign in" data-sign-up-open={String(signUpOpen)} />
  ),
}));
vi.mock("./sign-up-form", () => ({ SignUpForm: () => <form aria-label="Sign up" /> }));

const { SignInGate, SignUpGate } = await import("./auth-gates");

const render = async (gate: () => Promise<ReactElement>) => renderToStaticMarkup(await gate());

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
});

describe.each([
  ["SignInGate", SignInGate],
  ["SignUpGate", SignUpGate],
])("%s", (_, gate) => {
  it("checks the session, then waits for the request before reading the flag", async () => {
    await render(gate);
    expect(calls).toEqual(["session", "connection", "env"]);
  });

  it("reads nothing more once a signed-in visitor is redirected", async () => {
    redirectIfSignedIn.mockRejectedValueOnce(new Error("NEXT_REDIRECT /"));
    await expect(gate()).rejects.toThrow("NEXT_REDIRECT /");
    expect(connection).not.toHaveBeenCalled();
    expect(getEnv).not.toHaveBeenCalled();
  });
});

describe("SignInGate", () => {
  it.each([true, false])("passes ALLOW_SIGN_UP=%s to the form", async (open) => {
    env.ALLOW_SIGN_UP = open;
    expect(await render(SignInGate)).toBe(
      `<form aria-label="Sign in" data-sign-up-open="${open}"></form>`,
    );
  });
});

describe("SignUpGate", () => {
  it("shows the form while sign-up is open", async () => {
    env.ALLOW_SIGN_UP = true;
    expect(await render(SignUpGate)).toBe('<form aria-label="Sign up"></form>');
  });

  it("shows the closed message and the way to sign in otherwise", async () => {
    env.ALLOW_SIGN_UP = false;
    const html = await render(SignUpGate);
    expect(html).not.toContain("<form");
    expect(html).toContain("Sign-up is closed. Ask the owner of this Taskly.");
    expect(html).toMatch(/<a [^>]*href="\/sign-in"[^>]*>Sign in<\/a>/);
  });
});
