// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaceColorPicker } from "./place-color-picker";
import { PlacePicker, type PlacePickerProps } from "./place-picker";
import { PlaceTag } from "./place-tag";
import type { Place, PlaceColor } from "./types";

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
      status="ready"
      onRetry={vi.fn()}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...result };
}

describe("PlaceTag", () => {
  it("shows the name beside a coloured dot", () => {
    render(<PlaceTag place={kitchen} className="extra" />);
    const tag = screen.getByText("Kitchen");
    expect(tag.className).toContain("extra");
    expect(tag.querySelector("[aria-hidden]")?.className).toContain("bg-place-2");
  });
});

describe("PlaceColorPicker", () => {
  it("names every colour and lets any of them be chosen, even one in use (D26)", () => {
    const onValueChange = vi.fn();
    render(
      <PlaceColorPicker
        value={2}
        onValueChange={onValueChange}
        label="Colour"
        text={{ colorNames: { ...defaultNames(), 7: "Olive green" } }}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Colour" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(radios.every((radio) => !(radio as HTMLButtonElement).disabled)).toBe(true);
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

  it("creates a place by name only, never asking for a colour, then clears the name", async () => {
    const { onCreate } = renderPicker({ places: sixPlaces });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    type("New place", "Hall 2");
    await click("Create");
    expect(onCreate).toHaveBeenCalledWith({ name: "Hall 2" });
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

  it("explains the limit instead of New place", () => {
    renderPicker({ atLimit: true });
    expect(
      screen.getByText("You can have up to 20 places. Delete one to add another."),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "New place" })).toBeNull();
    // Shown from the start, it takes no focus.
    expect(document.activeElement).toBe(document.body);
  });

  it("focuses the limit message when the create that reached it removed the form", () => {
    const props = {
      taskTitle: "Seal the bath",
      places: [bathroom, kitchen],
      selectedIds: [],
      onToggle: vi.fn(),
      onCreate: ok,
      onUpdate: ok,
      onDelete: async () => true,
      validateName: noErrors,
      status: "ready" as const,
      onRetry: vi.fn(),
    };
    const { rerender } = render(<PlacePicker {...props} atLimit={false} />);
    screen.getByRole("textbox", { name: "New place" }).focus();
    rerender(<PlacePicker {...props} atLimit />);
    const limit = screen.getByText("You can have up to 20 places. Delete one to add another.");
    expect(document.activeElement).toBe(limit);
    // Reached while the owner was elsewhere in the picker, it leaves their focus alone.
    rerender(<PlacePicker {...props} atLimit={false} />);
    const box = screen.getByRole("checkbox", { name: "Kitchen" });
    box.focus();
    rerender(<PlacePicker {...props} atLimit />);
    expect(document.activeElement).toBe(box);
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
    // Blue is Bathroom's colour; colours repeat, so it can be chosen (D26).
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));
    type("Name", "Kitchen and dining");
    await click("Save");
    expect(onUpdate).toHaveBeenCalledWith("kitchen", { name: "Kitchen and dining", color: 1 });
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    // The form is gone, so focus goes back to the place's own "Edit", never the page.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Kitchen" }));
    await click("Edit Hall");
    await click("Cancel");
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Hall" }));
  });

  it("keeps the form open when a rename is refused", async () => {
    const onUpdate = vi.fn(async () => ({
      ok: false as const,
      fieldErrors: { name: "A place with this name exists." },
    }));
    renderPicker({ onUpdate });
    await click("Edit places");
    await click("Edit Bathroom");
    type("Name", "New bathroom");
    await click("Save");
    expect(screen.getByText("A place with this name exists.")).toBeTruthy();
  });

  it("preserves a newer colour when a stale form renames, even after refreshed props arrive", async () => {
    let stored = { ...kitchen };
    const onUpdate = vi.fn(async (_id: string, changes: Partial<Place>) => {
      stored = { ...stored, ...changes };
      return { ok: true as const };
    });
    const picker = (place: Place) => (
      <PlacePicker
        taskTitle="Seal the bath"
        places={[place]}
        selectedIds={[]}
        status="ready"
        onRetry={vi.fn()}
        onToggle={vi.fn()}
        onCreate={ok}
        onUpdate={onUpdate}
        onDelete={async () => true}
        validateName={noErrors}
        atLimit={false}
      />
    );
    const { rerender } = render(picker(stored));
    await click("Edit places");
    await click("Edit Kitchen");
    stored = { ...stored, color: 4 };
    rerender(picker(stored));
    type("Name", "Dining");
    await click("Save");
    expect(onUpdate).toHaveBeenCalledWith("kitchen", { name: "Dining" });
    expect(stored).toEqual({ id: "kitchen", name: "Dining", color: 4 });
  });

  it("sends only colour when recolouring a stale form, preserving a newer name", async () => {
    const { onUpdate } = renderPicker();
    await click("Edit places");
    await click("Edit Bathroom");
    await click("Green", "radio");
    await click("Save");
    expect(onUpdate).toHaveBeenCalledWith("bathroom", { color: 4 });
  });

  it("closes an unchanged edit without writing its stale values", async () => {
    const { onUpdate } = renderPicker();
    await click("Edit places");
    await click("Edit Kitchen");
    await click("Save");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Kitchen" }));
  });

  it("asks before deleting a place and can cancel", async () => {
    const { onDelete } = renderPicker();
    await click("Edit places");
    await click("Edit Bathroom");
    await click("Delete place");
    expect(screen.getByText("Delete “Bathroom”? It is removed from every task.")).toBeTruthy();
    // Only the question's Cancel: the form's Save and Cancel are hidden while it asks.
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    await click("Cancel");
    expect(screen.queryByText(/It is removed from every task/)).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete place" }));
    await click("Delete place");
    await click("Delete place");
    expect(onDelete).toHaveBeenCalledWith("bathroom");
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
  });

  it.each([
    { deleted: "Bathroom", places: [bathroom, kitchen], focus: "Edit Kitchen" },
    { deleted: "Kitchen", places: [bathroom, kitchen], focus: "Edit Bathroom" },
    { deleted: "Bathroom", places: [bathroom], focus: "Back to choosing" },
  ])("after deleting $deleted, focuses $focus", async ({ deleted, places, focus }) => {
    const { rerender } = renderPicker({ places });
    await click("Edit places");
    await click(`Edit ${deleted}`);
    await click("Delete place");
    await click("Delete place");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: focus }));
    // The app then drops the place; focus stays where it went.
    rerender(
      <PlacePicker
        taskTitle="Seal the bath"
        places={places.filter((place) => place.name !== deleted)}
        selectedIds={[]}
        onToggle={vi.fn()}
        onCreate={ok}
        onUpdate={ok}
        onDelete={async () => true}
        validateName={noErrors}
        atLimit={false}
        status="ready"
        onRetry={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: focus }));
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

describe("PlacePicker while the places load or fail (spec E02, F2, P-1)", () => {
  const hasNoReadyParts = () => {
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("No places yet.")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "New place" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit places" })).toBeNull();
  };

  it("shows the title and a skeleton of three rows, read out as loading", () => {
    const { container } = renderPicker({ status: "loading", places: [] });
    expect(screen.getByText("Places for “Seal the bath”")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(screen.getByRole("status").textContent).toBe("Loading your places…");
    expect(container.querySelector('[data-slot="place-picker"]')?.getAttribute("aria-busy")).toBe(
      "true",
    );
    hasNoReadyParts();
  });

  it("shows the failure with Try again, and Trying again… while retrying", async () => {
    const onRetry = vi.fn();
    const { rerender, container } = renderPicker({ status: "error", places: [], onRetry });
    expect(screen.getByRole("alert").textContent).toContain("Could not load your places.");
    expect(container.querySelector('[data-slot="place-picker"]')?.hasAttribute("aria-busy")).toBe(
      false,
    );
    hasNoReadyParts();
    await click("Try again");
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <PlacePicker
        taskTitle="Seal the bath"
        places={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        onCreate={ok}
        onUpdate={ok}
        onDelete={async () => true}
        validateName={noErrors}
        atLimit={false}
        status="error"
        onRetry={onRetry}
        retrying
      />,
    );
    expect(screen.getByRole("button", { name: "Trying again…" })).toBeTruthy();
  });

  const pickerWith = (status: PlacePickerProps["status"], places: Place[]) => (
    <PlacePicker
      taskTitle="Seal the bath"
      places={places}
      selectedIds={[]}
      onToggle={vi.fn()}
      onCreate={ok}
      onUpdate={ok}
      onDelete={async () => true}
      validateName={noErrors}
      atLimit={false}
      status={status}
      onRetry={vi.fn()}
    />
  );

  it("moves focus to the first place once a retry brings them", async () => {
    const { rerender } = render(pickerWith("error", []));
    screen.getByRole("button", { name: "Try again" }).focus();
    await click("Try again");
    rerender(pickerWith("ready", [bathroom, kitchen]));
    expect(document.activeElement).toBe(screen.getByRole("checkbox", { name: "Bathroom" }));
  });

  it("moves focus to New place when the retry brings no places", async () => {
    const { rerender } = render(pickerWith("error", []));
    await click("Try again");
    rerender(pickerWith("loading", []));
    rerender(pickerWith("ready", []));
    expect(screen.getByText("No places yet.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "New place" }));
  });

  it("leaves focus alone when the places arrive without a retry", () => {
    const { rerender } = render(pickerWith("loading", []));
    rerender(pickerWith("ready", [bathroom]));
    expect(document.activeElement).toBe(document.body);
  });
});
