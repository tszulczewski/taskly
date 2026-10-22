// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("opens from its trigger, focuses Cancel and confirms", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<button type="button">Delete</button>}
        title="Delete “Paint the ceiling” and its 3 subtasks?"
        description="This cannot be undone."
        confirmLabel="Delete task"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Delete “Paint the ceiling” and its 3 subtasks?",
    });
    expect(dialog.textContent).toContain("This cannot be undone.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Delete task" }).dataset.variant).toBe("danger");
  });

  it("uses the primary button when nothing is lost", () => {
    render(
      <ConfirmDialog
        open
        title="Complete “Paint the ceiling” and its 2 open subtasks?"
        confirmLabel="Complete task"
        confirmVariant="primary"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Complete task" }).dataset.variant).toBe("primary");
  });

  it("cannot be closed while pending and shows the pending label", () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete “Seal the bath”?"
        confirmLabel="Delete task"
        pendingLabel="Deleting…"
        onConfirm={() => {}}
        pending
      />,
    );
    expect(screen.getByRole("button", { name: "Deleting…" }).getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows an error, keeps the confirm label while pending without a pending label, and closes", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete “Seal the bath”?"
        confirmLabel="Delete task"
        cancelLabel="Anuluj"
        onConfirm={() => {}}
        error="Could not delete the task. Try again."
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe("Could not delete the task. Try again.");
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Delete task"
        onConfirm={() => {}}
        pending
      />,
    );
    expect(screen.getByRole("button", { name: "Delete task" })).toBeTruthy();
  });

  it("works uncontrolled without onOpenChange", () => {
    render(
      <ConfirmDialog defaultOpen title="Delete?" confirmLabel="Delete task" onConfirm={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("lets the app decide where focus goes on close", async () => {
    const onCloseAutoFocus = vi.fn((event: Event) => event.preventDefault());
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Delete “Seal the bath”?"
        confirmLabel="Delete task"
        onConfirm={() => {}}
        onCloseAutoFocus={onCloseAutoFocus}
      />,
    );
    rerender(
      <ConfirmDialog
        open={false}
        title="Delete “Seal the bath”?"
        confirmLabel="Delete task"
        onConfirm={() => {}}
        onCloseAutoFocus={onCloseAutoFocus}
      />,
    );
    // Radix moves focus after the content unmounts, on the next task.
    await vi.waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledOnce());
  });
});
