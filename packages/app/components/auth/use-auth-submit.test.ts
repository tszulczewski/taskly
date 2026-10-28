// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSubmit } from "./use-auth-submit";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

describe("useAuthSubmit", () => {
  it("lets an error that is not an ApiError reach the form's generic message", async () => {
    const bug = new Error("bug");
    const { result } = renderHook(() => useAuthSubmit<"email", string>(() => Promise.reject(bug)));
    await expect(result.current("anna@example.com")).rejects.toBe(bug);
  });
});
