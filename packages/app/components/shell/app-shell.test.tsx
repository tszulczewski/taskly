// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { THEME_STORAGE_KEY } from "./use-theme";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const fetchMock = vi.fn<(path: string, init: RequestInit) => Promise<Response>>();
let client: QueryClient;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  client = new QueryClient();
  client.setQueryData(["tasks"], ["Plaster the wall"]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fetchMock.mockReset();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

const shell = () => (
  <QueryClientProvider client={client}>
    <AppShell>
      <h1>Your tasks</h1>
    </AppShell>
  </QueryClientProvider>
);

const signOut = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  });
};

describe("AppShell (app) sign-out", () => {
  it("renders the page in the main landmark", () => {
    render(shell());
    expect(screen.getByRole("main").textContent).toBe("Your tasks");
  });

  it("clears the cache and goes to /sign-in only after the server confirmed", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const clear = vi.spyOn(client, "clear");
    render(shell());
    await signOut();
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/auth/sign-out");
    expect(init.method).toBe("POST");
    expect(clear).toHaveBeenCalledOnce();
    expect(client.getQueryData(["tasks"])).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
      router.replace.mock.invocationCallOrder[0]!,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Sign out" }).getAttribute("aria-busy")).toBe("true");
  });

  it.each([
    ["the network fails", () => fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))],
    [
      "it is rate limited",
      () => fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 })),
    ],
  ])("stays on the page when %s, and a retry completes sign-out", async (_, fail) => {
    fail();
    const clear = vi.spyOn(client, "clear");
    render(shell());
    await signOut();
    expect(screen.getByRole("alert").textContent).toBe("Could not sign out. Try again.");
    expect(clear).not.toHaveBeenCalled();
    expect(client.getQueryData(["tasks"])).toEqual(["Plaster the wall"]);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button.getAttribute("aria-busy")).toBeNull();
    expect(button.getAttribute("aria-disabled")).toBeNull();

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await signOut();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(clear).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});

const checked = (name: string) =>
  screen.getByRole("radio", { name }).getAttribute("aria-checked") === "true";

describe("AppShell (app) theme", () => {
  it("renders the dark default on the server", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const html = renderToString(shell());
    expect(html).toMatch(/aria-checked="true"[^>]*value="dark"/);
  });

  it("starts dark and applies it to the root element", () => {
    render(shell());
    expect(checked("Dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("restores the stored theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(shell());
    expect(checked("Light")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applies and stores a new choice", () => {
    render(shell());
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(checked("Light")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("still switches when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(shell());
    expect(checked("Dark")).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
