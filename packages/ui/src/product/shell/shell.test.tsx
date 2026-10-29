// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "react";
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

/** The shell on a page that Cache Components hide on navigation (React Activity). */
const shell = (onSignOut: () => Promise<boolean>, visible = true) => (
  <Activity mode={visible ? "visible" : "hidden"}>
    <AppShell theme="dark" onThemeChange={vi.fn()} onSignOut={onSignOut}>
      <h1>Tasks</h1>
    </AppShell>
  </Activity>
);

const renderShell = (onSignOut: () => Promise<boolean>) => render(shell(onSignOut));

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

  it("is ready to sign out again when its page comes back after a confirmed sign-out", async () => {
    const onSignOut = vi.fn(async () => true);
    const { rerender } = renderShell(onSignOut);
    await signOut();
    rerender(shell(onSignOut, false));
    rerender(shell(onSignOut, true));
    expect(screen.getByRole("button", { name: "Sign out" }).getAttribute("aria-busy")).toBeNull();
    await signOut();
    expect(onSignOut).toHaveBeenCalledTimes(2);
  });

  it("drops an old failure message when its page is hidden and shown again", async () => {
    const onSignOut = vi.fn(async () => false);
    const { rerender } = renderShell(onSignOut);
    await signOut();
    expect(screen.getByRole("alert")).toBeTruthy();
    rerender(shell(onSignOut, false));
    rerender(shell(onSignOut, true));
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
