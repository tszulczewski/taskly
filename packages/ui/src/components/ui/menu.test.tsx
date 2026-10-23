// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./menu";

afterEach(cleanup);

describe("Menu", () => {
  it("opens from its trigger and runs an item", () => {
    const onDelete = vi.fn();
    const onImportant = vi.fn();
    render(
      <Menu>
        <MenuTrigger>More actions</MenuTrigger>
        <MenuContent className="extra">
          <MenuItem>Add subtask</MenuItem>
          <MenuCheckboxItem checked onCheckedChange={onImportant}>
            Important
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={false}>Urgent</MenuCheckboxItem>
          <MenuSeparator className="sep" />
          <MenuItem tone="danger" onSelect={onDelete}>
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "More actions" }), { key: "Enter" });
    expect(screen.getByRole("menu").className).toContain("extra");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Important" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByRole("separator").className).toContain("sep");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Important" }));
    expect(onImportant).toHaveBeenCalledWith(false);
    fireEvent.keyDown(screen.getByRole("button", { name: "More actions" }), { key: "Enter" });
    const del = screen.getByRole("menuitem", { name: "Delete" });
    expect(del.className).toContain("text-danger");
    expect(screen.getByRole("menuitem", { name: "Add subtask" }).className).not.toContain(
      "text-danger",
    );
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
