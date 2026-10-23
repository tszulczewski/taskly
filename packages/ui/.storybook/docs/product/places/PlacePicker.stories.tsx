import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { PlacePickerDemo } from "../../../blocks/PlacePickerDemo";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import {
  bedroom,
  longPlace,
  placeMessages,
  polishPlaceText,
  polishPlaces,
  sixPlaces,
  somePlaces,
  tenPlaces,
} from "../../../blocks/place-data";

/** The picker with a simulated server (P1); in the app it opens from a row's "…" (decision G3). */
const meta = {
  title: "Product/Places/Place picker",
  component: PlacePickerDemo,
  decorators: [withDocFrame],
  args: { initialPlaces: somePlaces, initialSelected: [bedroom.id] },
  argTypes: {
    initialPlaces: { control: false },
    initialSelected: { control: false },
    server: { control: "inline-radio", options: ["ok", "fail", "slow"] },
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
    await userEvent.click(canvas.getByRole("checkbox", { name: "Hall" }));
    await expect(canvas.getByRole("checkbox", { name: "Hall" })).toBeChecked();
    // The first six places get their colour without asking (decision G4).
    await expect(canvas.queryByRole("radiogroup")).toBeNull();
    await userEvent.type(canvas.getByLabelText("New place"), "Balcony{Enter}");
    await expect(await canvas.findByRole("checkbox", { name: "Balcony" })).toBeChecked();
    await expect(canvas.getByLabelText("New place")).toHaveValue("");
    await expect(canvas.getByLabelText("New place")).toHaveFocus();
  },
};

export const NoPlacesYet: Story = { args: { initialPlaces: [], initialSelected: [] } };

/** From the seventh place the owner picks a free colour; the first free one is chosen. */
export const SeventhPlace: Story = {
  args: { initialPlaces: sixPlaces, initialSelected: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "Olive" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Blue, used by Bathroom" })).toBeDisabled();
  },
};

export const AtLimit: Story = {
  args: { initialPlaces: tenPlaces },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("You can have up to 10 places. Delete one to add another."),
    ).toBeVisible();
    await expect(canvas.queryByLabelText("New place")).toBeNull();
  },
};

export const NameErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await expect(canvas.getByText(placeMessages.name)).toBeVisible();
    await expect(canvas.getByLabelText("New place")).toHaveFocus();
    await userEvent.type(canvas.getByLabelText("New place"), "kitchen{Enter}");
    await expect(canvas.getByText(placeMessages.taken)).toBeVisible();
  },
};

export const Creating: Story = {
  args: { server: "slow" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New place"), "Balcony{Enter}");
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
    await userEvent.type(canvas.getByLabelText("New place"), "Balcony{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(placeMessages.createFailed);
    await expect(canvas.getByLabelText("New place")).toHaveValue("Balcony");
  },
};

export const EditPlaces: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await expect(canvas.getByRole("button", { name: "Back to choosing" })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Edit Kitchen" })).toBeVisible();
  },
};

export const EditPlace: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Kitchen" }));
    await expect(canvas.getByLabelText("Name")).toHaveFocus();
    await expect(canvas.getByRole("radio", { name: "Ochre" })).toBeChecked();
  },
};

export const ConfirmDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Hall" }));
    await userEvent.click(canvas.getByRole("button", { name: "Delete place" }));
    await expect(canvas.getByText("Delete “Hall”? It is removed from every task.")).toBeVisible();
  },
};

export const DeleteFailed: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openEditPlaces(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Hall" }));
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
    initialPlaces: [...somePlaces, longPlace],
    initialSelected: [longPlace.id],
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { initialPlaces: sixPlaces, initialSelected: [] },
  render: (args) => (
    <Narrow>
      <PlacePickerDemo {...args} />
    </Narrow>
  ),
};

export const Polish: Story = {
  args: {
    taskTitle: "Powiesić karnisze w sypialni",
    initialPlaces: polishPlaces,
    initialSelected: ["pl-sypialnia"],
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
              <option>Bedroom</option>
              <option>Kitchen</option>
            </select>
          </label>
        ),
        why: "A single select allows only one place, but a task can be in several (D09).",
      }}
    />
  ),
};
