import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = new Headers({ cookie: "session=abc" });
const getSessionUser = vi.fn();
// Like Next's redirect(): throws, so nothing after it runs.
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("@taskly/core/server", () => ({ getSessionUser }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => requestHeaders) }));
vi.mock("next/navigation", () => ({ redirect }));

const { redirectIfSignedIn, requireSessionUser } = await import("./session");

const user = { id: "u1", name: "Ala" };

describe("page session guards", () => {
  beforeEach(() => {
    getSessionUser.mockReset();
    redirect.mockClear();
  });

  describe("requireSessionUser", () => {
    it("returns the user from a non-renewing read", async () => {
      getSessionUser.mockResolvedValueOnce(user);
      expect(await requireSessionUser()).toBe(user);
      expect(getSessionUser).toHaveBeenCalledWith(requestHeaders, { disableRefresh: true });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("redirects to /sign-in without a session", async () => {
      getSessionUser.mockResolvedValueOnce(null);
      await expect(requireSessionUser()).rejects.toThrow("NEXT_REDIRECT /sign-in");
      expect(getSessionUser).toHaveBeenCalledWith(requestHeaders, { disableRefresh: true });
      expect(redirect).toHaveBeenCalledWith("/sign-in");
    });
  });

  describe("redirectIfSignedIn", () => {
    it("redirects a signed-in visitor to /", async () => {
      getSessionUser.mockResolvedValueOnce(user);
      await expect(redirectIfSignedIn()).rejects.toThrow(/^NEXT_REDIRECT \/$/);
      expect(getSessionUser).toHaveBeenCalledWith(requestHeaders, { disableRefresh: true });
      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("returns nothing without a session", async () => {
      getSessionUser.mockResolvedValueOnce(null);
      expect(await redirectIfSignedIn()).toBeUndefined();
      expect(getSessionUser).toHaveBeenCalledWith(requestHeaders, { disableRefresh: true });
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
