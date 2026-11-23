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

type Action = () => Promise<boolean>;

/** The shell on a page that Cache Components hide on navigation (React Activity). */
const shell = (onSignOut: Action, visible = true, onSignOutOtherDevices: Action = vi.fn()) => (
  <Activity mode={visible ? "visible" : "hidden"}>
    <AppShell
      theme="dark"
      onThemeChange={vi.fn()}
      onSignOut={onSignOut}
      onSignOutOtherDevices={onSignOutOtherDevices}
    >
      <h1>Tasks</h1>
    </AppShell>
  </Activity>
);

const renderShell = (onSignOut: Action, onSignOutOtherDevices?: Action) =>
  render(shell(onSignOut, true, onSignOutOtherDevices));

const trigger = () => screen.getByRole("button", { name: "Sign out" });
const openMenu = () => fireEvent.keyDown(trigger(), { key: "Enter" });
const choose = async (item: string) => {
  openMenu();
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: item }));
  });
};
const signOut = () => choose("Sign out of this device");
const signOutOtherDevices = () => choose("Sign out of other devices");

describe("AppShell", () => {
  it("puts the page in the main landmark under the header", () => {
    renderShell(vi.fn());
    expect(screen.getByRole("banner").textContent).toContain("Taskly");
    expect(screen.getByRole("main").textContent).toBe("Tasks");
  });

  it("offers both sign-outs in the Sign out menu", () => {
    renderShell(vi.fn());
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    openMenu();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Sign out of this device",
      "Sign out of other devices",
    ]);
  });

  it("stays busy after a confirmed sign-out and opens no menu meanwhile", async () => {
    renderShell(async () => true);
    await signOut();
    expect(trigger().getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
    openMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("is ready to sign out again when its page comes back after a confirmed sign-out", async () => {
    const onSignOut = vi.fn(async () => true);
    const { rerender } = renderShell(onSignOut);
    await signOut();
    rerender(shell(onSignOut, false));
    rerender(shell(onSignOut, true));
    expect(trigger().getAttribute("aria-busy")).toBeNull();
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
    expect(trigger().getAttribute("aria-busy")).toBeNull();
    await signOut();
    expect(onSignOut).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("says when other devices are signed out and stays ready", async () => {
    const onSignOut = vi.fn();
    const onSignOutOtherDevices = vi.fn(async () => true);
    renderShell(onSignOut, onSignOutOtherDevices);
    expect(screen.getByRole("status").textContent).toBe("");
    await signOutOtherDevices();
    expect(onSignOutOtherDevices).toHaveBeenCalledOnce();
    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Other devices are signed out. This one stays signed in.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(trigger().getAttribute("aria-busy")).toBeNull();
  });

  it("says when signing out other devices failed, and a retry replaces the message", async () => {
    const onSignOutOtherDevices = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(true);
    renderShell(vi.fn(), onSignOutOtherDevices);
    await signOutOtherDevices();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not sign out other devices. Try again.",
    );
    expect(screen.getByRole("status").textContent).toBe("");
    expect(trigger().getAttribute("aria-busy")).toBeNull();
    await signOutOtherDevices();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Other devices are signed out.");
  });

  it("is busy while other devices are signed out, then drops the message when its page is hidden", async () => {
    let finish: (ok: boolean) => void = () => {};
    const onSignOutOtherDevices = vi.fn(
      () => new Promise<boolean>((resolve) => (finish = resolve)),
    );
    const onSignOut = vi.fn();
    const { rerender } = renderShell(onSignOut, onSignOutOtherDevices);
    await signOutOtherDevices();
    expect(trigger().getAttribute("aria-busy")).toBe("true");
    await act(async () => finish(true));
    expect(screen.getByRole("status").textContent).not.toBe("");
    rerender(shell(onSignOut, false, onSignOutOtherDevices));
    rerender(shell(onSignOut, true, onSignOutOtherDevices));
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
