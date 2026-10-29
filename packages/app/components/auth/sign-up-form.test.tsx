// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const fetchMock = vi.fn<(path: string, init: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  fetchMock.mockReset();
});

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

const fill = (values: { name: string; email: string; password: string }) => {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: values.password } });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Creat(e|ing) account/ }));
  });
};

const valid = { name: "  Anna  ", email: "anna@example.com", password: "long enough pw" };

describe("SignUpForm (app)", () => {
  it.each([
    [{ ...valid, name: "   " }, "Enter your name."],
    [{ ...valid, name: "a".repeat(101) }, "Use at most 100 characters."],
    [{ ...valid, email: "anna" }, "Enter a valid email address."],
    [{ ...valid, password: "too short" }, "Use at least 10 characters."],
    [{ ...valid, password: "p".repeat(129) }, "Use at most 128 characters."],
  ])("shows the shared schema's message under the field (%#)", async (values, message) => {
    render(<SignUpForm />);
    fill(values);
    await submit();
    expect(screen.getByText(message)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the account with the trimmed name and lands on /", async () => {
    fetchMock.mockResolvedValue(json(200, { token: "t" }));
    render(<SignUpForm />);
    fill(valid);
    await submit();
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/auth/sign-up/email");
    expect(JSON.parse(String(init.body))).toStrictEqual({
      name: "Anna",
      email: "anna@example.com",
      password: "long enough pw",
    });
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Creating account…" }).getAttribute("aria-busy"),
    ).toBe("true");
  });

  it.each([
    [json(422, { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }), "Could not create the account."],
    [json(400, { code: "INVALID_SIGN_UP_INPUT" }), "Check your details and try again."],
    [json(400, { code: "PASSWORD_TOO_LONG" }), "Check your details and try again."],
    [
      json(400, { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" }),
      "Sign-up is closed. Ask the owner of this Taskly.",
    ],
    [json(500), "Something went wrong. Try again."],
  ])("shows the mapped message above the form (%#)", async (response, message) => {
    fetchMock.mockResolvedValue(response);
    render(<SignUpForm />);
    fill(valid);
    await submit();
    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
  });

  it("links back to sign-in", () => {
    render(<SignUpForm />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });
});
