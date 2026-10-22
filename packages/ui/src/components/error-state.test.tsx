// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

afterEach(cleanup);

describe("ErrorState", () => {
  it("announces the failure and retries", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState title="Could not load your tasks." onRetry={onRetry}>
        Check your connection.
      </ErrorState>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Could not load your tasks.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows that it is retrying", () => {
    render(
      <ErrorState
        title="Nie udało się wczytać zadań."
        onRetry={() => {}}
        retrying
        retryingLabel="Ponawianie…"
      />,
    );
    expect(screen.getByRole("button", { name: "Ponawianie…" }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });
});
