// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

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

const json = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Sign(ing)? in/ }));
  });
};

describe("SignInForm (app)", () => {
  it("shows the shared schema's messages and sends nothing", async () => {
    render(<SignInForm signUpOpen={false} />);
    await submit();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in with email and password only, then goes to /", async () => {
    fetchMock.mockResolvedValue(json(200, { token: "t" }));
    render(<SignInForm signUpOpen={false} />);
    fill("anna@example.com", "correct horse");
    await submit();
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/auth/sign-in/email");
    expect(JSON.parse(String(init.body))).toStrictEqual({
      email: "anna@example.com",
      password: "correct horse",
    });
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(router.replace.mock.invocationCallOrder[0]).toBeLessThan(
      router.refresh.mock.invocationCallOrder[0]!,
    );
    expect(screen.getByRole("button", { name: "Signing in…" }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it("blocks a second submit while the first is running", async () => {
    let answer: (res: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    render(<SignInForm signUpOpen={false} />);
    fill("anna@example.com", "correct horse");
    await submit();
    const button = screen.getByRole("button", { name: "Signing in…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await act(async () => {
      fireEvent.submit(button.closest("form")!);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    await act(async () => answer(json(401, { code: "INVALID_EMAIL_OR_PASSWORD" })));
    expect(
      screen.getByRole("button", { name: "Sign in" }).getAttribute("aria-disabled"),
    ).toBeNull();
  });

  it.each([
    [
      "wrong credentials",
      json(401, { code: "INVALID_EMAIL_OR_PASSWORD" }),
      "Email or password is incorrect.",
    ],
    [
      "rate limited with a wait",
      json(429, null, { "x-retry-after": "7" }),
      "Too many attempts. Try again in 7 seconds.",
    ],
    [
      "rate limited without a wait",
      json(429, null),
      "Too many attempts. Wait a few seconds and try again.",
    ],
    [
      "an unknown error",
      json(500, { code: "INTERNAL", message: "db down" }),
      "Something went wrong. Try again.",
    ],
  ])("shows the message for %s above the form", async (_, response, message) => {
    fetchMock.mockResolvedValue(response);
    render(<SignInForm signUpOpen={false} />);
    fill("anna@example.com", "wrong password");
    await submit();
    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveProperty("value", "anna@example.com");
  });

  it("says something went wrong when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SignInForm signUpOpen={false} />);
    fill("anna@example.com", "correct horse");
    await submit();
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong. Try again.");
  });

  it("hides the password again when the form is submitted", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "INVALID_EMAIL_OR_PASSWORD" }));
    render(<SignInForm signUpOpen={false} />);
    fill("anna@example.com", "correct horse");
    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("text");
    await submit();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("password");
  });

  it("links to sign-up only while it is open", () => {
    const { rerender } = render(<SignInForm signUpOpen={false} />);
    expect(screen.queryByRole("link", { name: "Create an account" })).toBeNull();
    rerender(<SignInForm signUpOpen />);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(
      "/sign-up",
    );
  });
});
