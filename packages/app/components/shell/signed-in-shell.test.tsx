import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
vi.mock("../../lib/session", () => ({ requireSessionUser }));
vi.mock("./app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div data-slot="app-shell">{children}</div>,
}));

const { SignedInShell } = await import("./signed-in-shell");

// Counts renders of the page content, so the test sees whether anything behind the guard ran.
const renders = vi.fn();
function Content() {
  renders();
  return <h1>Your tasks</h1>;
}

beforeEach(() => vi.clearAllMocks());

describe("SignedInShell", () => {
  it("renders the content in the app shell for a signed-in user", async () => {
    requireSessionUser.mockResolvedValueOnce({ id: "u1", name: "Ala" });
    const element = await SignedInShell({ children: <Content /> });
    expect(renderToStaticMarkup(element)).toBe(
      '<div data-slot="app-shell"><h1>Your tasks</h1></div>',
    );
  });

  it("redirects a visitor without a session before the content renders", async () => {
    requireSessionUser.mockRejectedValueOnce(new Error("NEXT_REDIRECT /sign-in"));
    await expect(SignedInShell({ children: <Content /> })).rejects.toThrow(
      "NEXT_REDIRECT /sign-in",
    );
    expect(renders).not.toHaveBeenCalled();
  });
});
