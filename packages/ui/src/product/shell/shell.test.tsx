// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { ThemeToggle } from "./theme-toggle";

afterEach(cleanup);

describe("ThemeToggle", () => {
  it("reports the chosen theme", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<ThemeToggle value="dark" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(onValueChange).toHaveBeenLastCalledWith("light");
    rerender(<ThemeToggle value="light" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(onValueChange).toHaveBeenLastCalledWith("dark");
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeTruthy();
  });
});

const renderShell = (onSignOut: () => Promise<boolean>) =>
  render(
    <AppShell theme="dark" onThemeChange={vi.fn()} onSignOut={onSignOut}>
      <h1>Tasks</h1>
    </AppShell>,
  );

const signOut = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  });
};

describe("AppShell", () => {
  it("puts the page in the main landmark under the header", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("banner").textContent).toContain("Taskly");
    expect(screen.getByRole("main").textContent).toBe("Tasks");
  });

  it("stays busy after a confirmed sign-out", async () => {
    renderShell(async () => true);
    await signOut();
    expect(screen.getByRole("button", { name: "Sign out" }).getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says when sign-out failed and allows a retry", async () => {
    const onSignOut = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error("offline"));
    renderShell(onSignOut);
    await signOut();
    expect(screen.getByRole("alert").textContent).toContain("Could not sign out. Try again.");
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button.getAttribute("aria-busy")).toBeNull();
    await signOut();
    expect(onSignOut).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
