// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthCard } from "./auth-card";
import { SignInForm } from "./sign-in-form";
import { SignUpClosed } from "./sign-up-closed";
import { SignUpForm } from "./sign-up-form";

afterEach(cleanup);

const noErrors = () => ({});

describe("AuthCard", () => {
  it("names the page with a heading inside the main landmark", () => {
    render(<AuthCard title="Sign in">form</AuthCard>);
    expect(screen.getByRole("main").textContent).toContain("Sign in");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sign in");
    expect(screen.getByText("Taskly")).toBeTruthy();
  });
});

describe("SignInForm", () => {
  it("links to sign-up only while it is open", () => {
    const { rerender } = render(<SignInForm validate={noErrors} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("link")).toBeNull();
    rerender(<SignInForm validate={noErrors} onSubmit={vi.fn()} signUpHref="/sign-up" />);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(
      "/sign-up",
    );
  });

  it("sends email and password and shows the server message", async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      formError: "Email or password is incorrect.",
    }));
    render(<SignInForm validate={noErrors} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong password" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    });
    expect(onSubmit).toHaveBeenCalledWith({
      email: "anna@example.com",
      password: "wrong password",
    });
    expect(screen.getByRole("alert").textContent).toContain("Email or password is incorrect.");
  });

  it("says it is signing in until the page changes", async () => {
    render(
      <SignInForm
        validate={noErrors}
        onSubmit={async () => ({ ok: true })}
        text={{ submit: "Zaloguj się", submitting: "Logowanie…" }}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
    });
    expect(screen.getByRole("button", { name: "Logowanie…" }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });
});

describe("SignUpForm", () => {
  it("asks for name, email and a password of at least 10 characters", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    render(<SignUpForm validate={noErrors} onSubmit={onSubmit} signInHref="/sign-in" />);
    expect(screen.getByText("At least 10 characters")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Anna" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: "Anna", email: "", password: "" });
    expect(screen.getByRole("button", { name: "Creating account…" })).toBeTruthy();
  });

  it("shows field errors from validation", async () => {
    render(
      <SignUpForm
        validate={() => ({ email: "Enter an email address." })}
        onSubmit={vi.fn()}
        signInHref="/sign-in"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows a server error above the form", async () => {
    render(
      <SignUpForm
        signInHref="/sign-in"
        validate={noErrors}
        onSubmit={async () => ({ ok: false, formError: "Could not create the account." })}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(screen.getByRole("alert").textContent).toContain("Could not create the account.");
  });
});

describe("SignUpClosed", () => {
  it("explains and links back to sign-in", () => {
    render(<SignUpClosed signInHref="/sign-in" />);
    expect(screen.getByText("Sign-up is closed. Ask the owner of this Taskly.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });
});
