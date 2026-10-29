// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const user = { id: "u1", name: "Ala" };
const requireSessionUser = vi.fn();
const openDefaultList = vi.fn();
const signOut = vi.fn(async () => true);
const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("../../lib/session", () => ({ requireSessionUser }));
vi.mock("../../lib/default-list", () => ({ openDefaultList }));
vi.mock("../auth/use-sign-out", () => ({ useSignOut: () => signOut }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
// The screen loads its tasks through TanStack Query; its own tests cover it.
vi.mock("./task-list-screen", () => ({
  TaskListScreen: ({ listId }: { listId: string }) => (
    <div data-slot="task-list-screen" data-list-id={listId} />
  ),
}));

const { TaskPage } = await import("./task-page");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  requireSessionUser.mockReset();
  openDefaultList.mockReset();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

async function renderPage() {
  render(await TaskPage());
  return screen.getByRole("main");
}

describe("TaskPage", () => {
  it("sends a visitor without a session to /sign-in before the list is opened", async () => {
    const redirect = new Error("NEXT_REDIRECT /sign-in");
    requireSessionUser.mockRejectedValueOnce(redirect);
    await expect(TaskPage()).rejects.toBe(redirect);
    expect(openDefaultList).not.toHaveBeenCalled();
  });

  it("opens the signed-in user's default list and gives the screen its id", async () => {
    requireSessionUser.mockResolvedValueOnce(user);
    openDefaultList.mockResolvedValueOnce("list-1");
    const main = await renderPage();
    expect(openDefaultList).toHaveBeenCalledWith("u1");
    expect(within(main).getByRole("heading", { level: 1 }).textContent).toBe("My renovation");
    const screenRoot = main.querySelector('[data-slot="task-list-screen"]');
    expect(screenRoot?.getAttribute("data-list-id")).toBe("list-1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("passes on an error the list helper rethrows (a Next redirect)", async () => {
    const redirect = new Error("NEXT_REDIRECT /sign-in");
    requireSessionUser.mockResolvedValueOnce(user);
    openDefaultList.mockRejectedValueOnce(redirect);
    await expect(TaskPage()).rejects.toBe(redirect);
  });

  describe("when the list could not be opened", () => {
    async function renderFailed() {
      requireSessionUser.mockResolvedValueOnce(user);
      openDefaultList.mockResolvedValueOnce(null);
      return renderPage();
    }

    it("keeps the heading and shows only the error state in the shell", async () => {
      const main = await renderFailed();
      expect(within(main).getByRole("heading", { level: 1 }).textContent).toBe("My renovation");
      const alert = within(main).getByRole("alert");
      expect(alert.textContent).toContain("Could not open your tasks.");
      expect(within(alert).getByRole("button", { name: "Try again" })).toBeDefined();
      expect(main.querySelector('[data-slot="task-list-screen"]')).toBeNull();
      expect(within(main).queryByRole("textbox")).toBeNull();
      expect(within(main).queryByRole("list")).toBeNull();
    });

    it("renders the page again on the server with Try again", async () => {
      await renderFailed();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      });
      expect(router.refresh).toHaveBeenCalledOnce();
      // The transition ends with the refresh, so the button is ready for another try.
      expect(
        screen.getByRole("button", { name: "Try again" }).getAttribute("aria-busy"),
      ).toBeNull();
    });

    it("still signs out", async () => {
      await renderFailed();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      });
      expect(signOut).toHaveBeenCalledOnce();
      expect(router.refresh).not.toHaveBeenCalled();
    });

    it("still switches the theme", async () => {
      await renderFailed();
      fireEvent.click(screen.getByRole("radio", { name: "Light" }));
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });
});
