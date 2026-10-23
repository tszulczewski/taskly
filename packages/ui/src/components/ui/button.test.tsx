// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("is a secondary type=button by default and calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.dataset.variant).toBe("secondary");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders each variant and the icon size", () => {
    render(
      <>
        <Button variant="primary" type="submit">
          Sign in
        </Button>
        <Button variant="danger">Delete task</Button>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <Plus />
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Sign in" }).className).toContain("bg-action");
    expect(screen.getByRole("button", { name: "Delete task" }).className).toContain("text-danger");
    expect(screen.getByRole("button", { name: "More actions" }).className).toContain("size-touch");
  });

  it("while loading shows a spinner, stays focusable and ignores clicks", () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form ref={(form) => form?.addEventListener("submit", onSubmit)}>
        <Button variant="primary" type="submit" loading onClick={onClick}>
          Signing in…
        </Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Signing in…" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("passes an explicit aria-disabled through when not loading", () => {
    render(<Button aria-disabled="true">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });

  it("works without an onClick handler", () => {
    render(<Button>Try again</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  });
});
