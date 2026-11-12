import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { PlacePickerDemo } from "../../../blocks/PlacePickerDemo";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import {
  bedroom,
  diningRoom,
  hall,
  longPlace,
  placeMessages,
  polishPlaceText,
  predefinedPlaces,
  twentyPlaces,
} from "../../../blocks/place-data";

/**
 * The picker with a simulated server (P1); in the app it opens from a row's "…" (decision G3). The
 * owner starts with the eight predefined places (D26).
 */
const meta = {
  title: "Product/Places/Place picker",
  component: PlacePickerDemo,
  decorators: [withDocFrame],
  args: { initialPlaces: predefinedPlaces, initialSelected: [bedroom.id] },
  argTypes: {
    initialPlaces: { control: false },
    initialSelected: { control: false },
    server: { control: "inline-radio", options: ["ok", "fail", "slow"] },
    load: { control: "inline-radio", options: ["ready", "loading", "error"] },
    text: { control: false },
  },
} satisfies Meta<typeof PlacePickerDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const openEditPlaces = (canvas: Canvas) =>
  userEvent.click(canvas.getByRole("button", { name: "Edit places" }));

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: "Salon" }));
    await expect(canvas.getByRole("checkbox", { name: "Salon" })).toBeChecked();
    // A new place has only a name; the app gives it a colour (D26).
    await expect(canvas.queryByRole("radiogroup")).toBeNull();
    await userEvent.type(canvas.getByLabelText("New place"), "Jadalnia{Enter}");
    await expect(await canvas.findByRole("checkbox", { name: "Jadalnia" })).toBeChecked();
    await expect(canvas.getByLabelText("New place")).toHaveValue("");
    await expect(canvas.getByLabelText("New place")).toHaveFocus();

    // Every action that removes the focused control hands focus to a control nearby (WCAG 2.4.3).
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Kuchnia" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Kuchnia" })).toHaveFocus());
    await userEvent.click(canvas.getByRole("button", { name: "Edit Garaż" }));
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    await expect(canvas.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    // Garaż is gone; the next place, Ogródek, has the focus.
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit Ogródek" })).toHaveFocus());
    await expect(canvas.queryByRole("button", { name: "Edit Garaż" })).toBeNull();
  },
};

/** Before the places have answered: the title and three skeleton rows, nothing to choose yet (F2). */
export const Loading: Story = {
  args: { load: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading your places…");
    await expect(canvas.queryByText("No places yet.")).toBeNull();
    await expect(canvas.queryByLabelText("New place")).toBeNull();
    // The popover is raised too: the placeholder bars need a distinct existing surface tone.
    const panel = canvasElement.querySelector<HTMLElement>(".bg-raised")!;
    const bars = canvasElement.querySelectorAll<HTMLElement>('[data-slot="skeleton"]');
    await expect(bars).toHaveLength(3);
    for (const bar of bars) {
      await expect(getComputedStyle(bar).backgroundColor).not.toBe(
        getComputedStyle(panel).backgroundColor,
      );
      await expect(bar.getBoundingClientRect().width).toBeGreaterThan(0);
      await expect(bar.getBoundingClientRect().height).toBeGreaterThan(0);
    }
  },
};

/**
 * The places failed to load: the failure and "Try again", never "No places yet." or New place
 * (F2, P-1). Focus stays on the button while it tries, then moves to the first place.
 */
export const LoadFailed: Story = {
  args: { load: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load your places.");
    await expect(canvas.queryByText("No places yet.")).toBeNull();
    await expect(canvas.queryByLabelText("New place")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(canvas.getByRole("button", { name: "Trying again…" })).toHaveFocus();
    await waitFor(() => expect(canvas.getByRole("checkbox", { name: "Salon" })).toHaveFocus());
  },
};

export const NoPlacesYet: Story = { args: { initialPlaces: [], initialSelected: [] } };

/** The owner's own places after the predefined eight; from the eleventh the colours repeat (D26). */
export const OwnPlaces: Story = {
  args: { initialPlaces: [...predefinedPlaces, hall, diningRoom], initialSelected: [hall.id] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New place"), "Spiżarnia{Enter}");
    await expect(await canvas.findByRole("checkbox", { name: "Spiżarnia" })).toBeChecked();
    await expect(canvas.queryByRole("radiogroup")).toBeNull();
  },
};

export const AtLimit: Story = {
  args: { initialPlaces: twentyPlaces },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("You can have up to 20 places. Delete one to add another."),
    ).toBeVisible();
    await expect(canvas.queryByLabelText("New place")).toBeNull();
  },
};

/** The twentieth place replaces the form with the limit message, which takes the focus (D26). */
export const ReachingTheLimit: Story = {
  args: { initialPlaces: twentyPlaces.slice(0, 19) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New place"), "Garderoba{Enter}");
    const limit = await canvas.findByText(
      "You can have up to 20 places. Delete one to add another.",
    );
    await expect(limit).toHaveFocus();
    await expect(canvas.getByRole("checkbox", { name: "Garderoba" })).toBeChecked();
  },
};

export const NameErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await expect(canvas.getByText(placeMessages.name)).toBeVisible();
    await expect(canvas.getByLabelText("New place")).toHaveFocus();
    // Unique ignoring case: "kuchnia" is "Kuchnia" (D26).
    await userEvent.type(canvas.getByLabelText("New place"), "kuchnia{Enter}");
    await expect(canvas.getByText(placeMessages.taken)).toBeVisible();
  },
};

export const Creating: Story = {
  args: { server: "slow" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New place"), "Jadalnia{Enter}");
    await expect(canvas.getByRole("button", { name: "Creating…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const CreateFailed: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New place"), "Jadalnia{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(placeMessages.createFailed);
    await expect(canvas.getByLabelText("New place")).toHaveValue("Jadalnia");
  },
};

export const EditPlaces: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await expect(canvas.getByRole("button", { name: "Back to choosing" })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Edit Kuchnia" })).toBeVisible();
  },
};

/** Any colour can be chosen, also one another place has (D26). */
export const EditPlace: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Kuchnia" }));
    await expect(canvas.getByLabelText("Name")).toHaveFocus();
    await expect(canvas.getByRole("radio", { name: "Green" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Blue" })).toBeEnabled();
  },
};

export const ConfirmDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Garaż" }));
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    await expect(canvas.getByText("Delete “Garaż”? It is removed from every task.")).toBeVisible();
    // One Cancel: the form's Save and Cancel are hidden while the question asks.
    await expect(canvas.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    await expect(canvas.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(canvas.getByRole("button", { name: "Delete place" })).toHaveFocus();
  },
};

export const DeleteFailed: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Garaż" }));
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not delete the place. Try again.",
    );
  },
};

export const LongNames: Story = {
  args: {
    taskTitle:
      "Replace the cracked tile behind the kitchen sink and regrout the whole splashback in a darker colour",
    initialPlaces: [...predefinedPlaces, longPlace],
    initialSelected: [longPlace.id],
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <PlacePickerDemo {...args} />
    </Narrow>
  ),
};

export const Polish: Story = {
  args: {
    taskTitle: "Powiesić karnisze w sypialni",
    text: polishPlaceText,
  },
};

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: <PlacePickerDemo {...args} />,
        why: "Tick as many places as apply, and create a missing one in the same panel.",
      }}
      bad={{
        node: (
          <label className="flex flex-col items-start gap-inline">
            Place
            <select className="rounded-control border border-control bg-list px-field-x py-field-y">
              <option>Sypialnia</option>
              <option>Kuchnia</option>
            </select>
          </label>
        ),
        why: "A single select allows only one place, but a task can be in several (D09).",
      }}
    />
  ),
};
