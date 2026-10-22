// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceColorPicker } from "./place-color-picker";
import { PlacePicker, type PlacePickerProps } from "./place-picker";
import { PlaceTag } from "./place-tag";
import { freePlaceColors, placeColorIsAutomatic, type Place, type PlaceColor } from "./types";

afterEach(cleanup);

// Radix measures the hidden input of a radio inside a form; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const bathroom: Place = { id: "bathroom", name: "Bathroom", color: 1 };
const kitchen: Place = { id: "kitchen", name: "Kitchen", color: 2 };
const sixPlaces: Place[] = [
  bathroom,
  kitchen,
  { id: "hall", name: "Hall", color: 3 },
  { id: "bedroom", name: "Bedroom", color: 4 },
  { id: "pantry", name: "Pantry", color: 5 },
  { id: "balcony", name: "Balcony", color: 6 },
];
const tenPlaces: Place[] = [
  ...sixPlaces,
  { id: "attic", name: "Attic", color: 7 },
  { id: "garage", name: "Garage", color: 8 },
  { id: "study", name: "Study", color: 9 },
  { id: "garden", name: "Garden", color: 10 },
];

const ok = async () => ({ ok: true as const });
const noErrors = () => undefined;
const click = async (name: string | RegExp, role = "button") => {
  await act(async () => {
    fireEvent.click(screen.getByRole(role, { name }));
  });
};
const type = (name: string, value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });

function renderPicker(props: Partial<PlacePickerProps> = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onCreate: vi.fn(ok),
    onUpdate: vi.fn(ok),
    onDelete: vi.fn(async () => true),
  };
  const result = render(
    <PlacePicker
      taskTitle="Seal the bath"
      places={[bathroom, kitchen]}
      selectedIds={["bathroom"]}
      validateName={noErrors}
      atLimit={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...result };
}

describe("place types", () => {
  it("lists the colours no other place uses", () => {
    expect(freePlaceColors(sixPlaces)).toEqual([7, 8, 9, 10]);
    expect(freePlaceColors(sixPlaces, "kitchen")).toEqual([2, 7, 8, 9, 10]);
  });

  it("gives the first six places their colours without asking", () => {
    expect(placeColorIsAutomatic(sixPlaces.slice(0, 5))).toBe(true);
    expect(placeColorIsAutomatic(sixPlaces)).toBe(false);
  });
});

describe("PlaceTag", () => {
  it("shows the name beside a coloured dot", () => {
    render(<PlaceTag place={kitchen} className="extra" />);
    const tag = screen.getByText("Kitchen");
    expect(tag.className).toContain("extra");
    expect(tag.querySelector("[aria-hidden]")?.className).toContain("bg-place-2");
  });
});

describe("PlaceColorPicker", () => {
  it("names every colour and disables the ones another place uses", () => {
    const onValueChange = vi.fn();
    render(
      <PlaceColorPicker
        value={2}
        onValueChange={onValueChange}
        places={sixPlaces}
        placeId="kitchen"
        label="Colour"
        text={{ colorNames: { ...defaultNames(), 7: "Olive green" } }}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Colour" });
    expect(within(group).getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByRole("radio", { name: "Blue, used by Bathroom" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("radio", { name: "Ochre" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Olive green" }));
    expect(onValueChange).toHaveBeenCalledWith(7);
  });
});

function defaultNames(): Record<PlaceColor, string> {
  return {
    1: "Blue",
    2: "Ochre",
    3: "Terracotta",
    4: "Green",
    5: "Violet",
    6: "Pink",
    7: "Olive",
    8: "Plum",
    9: "Teal",
    10: "Slate",
  };
}

describe("PlacePicker", () => {
  it("adds the task to a place or takes it out", () => {
    const { onToggle } = renderPicker();
    expect(screen.getByText("Places for “Seal the bath”")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Places for “Seal the bath”" });
    const bath = within(list).getByRole("checkbox", { name: "Bathroom" });
    expect(bath.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(bath);
    expect(onToggle).toHaveBeenCalledWith("bathroom", false);
    fireEvent.click(within(list).getByRole("checkbox", { name: "Kitchen" }));
    expect(onToggle).toHaveBeenCalledWith("kitchen", true);
  });

  it("says there are no places yet and offers only New place", () => {
    renderPicker({ places: [], selectedIds: [] });
    expect(screen.getByText("No places yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit places" })).toBeNull();
  });

  it("creates a place with the next colour without asking, then clears the name", async () => {
    const { onCreate } = renderPicker();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    type("New place", "Hall");
    await click("Create");
    expect(onCreate).toHaveBeenCalledWith({ name: "Hall", color: 3 });
    expect((screen.getByRole("textbox", { name: "New place" }) as HTMLInputElement).value).toBe("");
  });

  it("checks the name and shows a refused create", async () => {
    const onCreate = vi.fn(async () => ({ ok: false as const, formError: "Could not create." }));
    renderPicker({
      onCreate,
      validateName: (name) => (name.trim() === "" ? "Enter a name." : undefined),
    });
    await click("Create");
    expect(screen.getByText("Enter a name.")).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
    type("New place", "Hall");
    await click("Create");
    expect(screen.getByText("Could not create.")).toBeTruthy();
  });

  it("asks for a colour from the seventh place, the first free one chosen", async () => {
    const { onCreate, rerender } = renderPicker({ places: sixPlaces });
    expect(screen.getByRole("radio", { name: "Olive" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Teal" }));
    type("New place", "Attic");
    await click("Create");
    expect(onCreate).toHaveBeenCalledWith({ name: "Attic", color: 9 });
    // Teal was taken meanwhile: the choice falls back to the first free colour.
    rerender(
      <PlacePicker
        taskTitle="Seal the bath"
        places={[...sixPlaces, { id: "attic", name: "Attic", color: 9 }]}
        selectedIds={[]}
        validateName={noErrors}
        atLimit={false}
        onToggle={vi.fn()}
        onCreate={onCreate}
        onUpdate={vi.fn(ok)}
        onDelete={vi.fn(async () => true)}
      />,
    );
    expect(screen.getByRole("radio", { name: "Olive" }).getAttribute("aria-checked")).toBe("true");
  });

  it("explains the limit instead of New place", () => {
    renderPicker({ atLimit: true });
    expect(
      screen.getByText("You can have up to 10 places. Delete one to add another."),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "New place" })).toBeNull();
    cleanup();
    renderPicker({ places: tenPlaces });
    expect(screen.queryByRole("textbox", { name: "New place" })).toBeNull();
  });

  it("switches to Edit places and back, moving focus each time", async () => {
    renderPicker();
    await click("Edit places");
    const back = screen.getByRole("button", { name: "Back to choosing" });
    expect(document.activeElement).toBe(back);
    expect(screen.getByRole("list", { name: "Edit places" })).toBeTruthy();
    await click("Back to choosing");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit places" }));
  });

  it("renames and recolours a place, or cancels", async () => {
    const { onUpdate } = renderPicker({ places: sixPlaces });
    await click("Edit places");
    await click("Edit Kitchen");
    const name = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
    expect(name.value).toBe("Kitchen");
    expect(document.activeElement).toBe(name);
    expect(screen.getByRole("radio", { name: "Ochre" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Plum" }));
    type("Name", "Kitchen and dining");
    await click("Save");
    expect(onUpdate).toHaveBeenCalledWith("kitchen", { name: "Kitchen and dining", color: 8 });
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    await click("Edit Hall");
    await click("Cancel");
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
  });

  it("keeps the form open when a rename is refused", async () => {
    const onUpdate = vi.fn(async () => ({
      ok: false as const,
      fieldErrors: { name: "A place with this name exists." },
    }));
    renderPicker({ onUpdate });
    await click("Edit places");
    await click("Edit Bathroom");
    await click("Save");
    expect(screen.getByText("A place with this name exists.")).toBeTruthy();
  });

  it("asks before deleting a place and can cancel", async () => {
    const { onDelete } = renderPicker();
    await click("Edit places");
    await click("Edit Bathroom");
    await click("Delete place");
    const question = screen.getByText("Delete “Bathroom”? It is removed from every task.");
    await act(async () => {
      fireEvent.click(within(question.parentElement!).getByRole("button", { name: "Cancel" }));
    });
    expect(screen.queryByText(/It is removed from every task/)).toBeNull();
    await click("Delete place");
    await click("Delete place");
    expect(onDelete).toHaveBeenCalledWith("bathroom");
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
  });

  it("shows a failed delete, whether refused or thrown", async () => {
    const onDelete = vi.fn(async () => false);
    renderPicker({ onDelete });
    await click("Edit places");
    await click("Edit Bathroom");
    await click("Delete place");
    await click("Delete place");
    expect(screen.getByRole("alert").textContent).toBe("Could not delete the place. Try again.");
    onDelete.mockRejectedValueOnce(new Error("offline"));
    await click("Delete place");
    expect(screen.getByRole("alert").textContent).toBe("Could not delete the place. Try again.");
  });
});
