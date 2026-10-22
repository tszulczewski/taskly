import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { PlaceColorPicker, type PlaceColor, type PlaceColorPickerProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { polishPlaceText, sixPlaces, somePlaces, tenPlaces } from "../../../blocks/place-data";

/** Holds the chosen colour, as the place form does. */
function Controlled(props: PlaceColorPickerProps) {
  const [value, setValue] = useState(props.value);
  return (
    <PlaceColorPicker
      {...props}
      value={value}
      onValueChange={(color: PlaceColor) => {
        setValue(color);
        props.onValueChange(color);
      }}
    />
  );
}

const meta = {
  title: "Product/Places/Place color picker",
  component: PlaceColorPicker,
  decorators: [withDocFrame],
  render: (args) => <Controlled {...args} />,
  args: { value: 7, places: sixPlaces, label: "Colour", onValueChange: fn() },
  argTypes: {
    value: { control: { type: "select" }, options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    places: { control: false },
    onValueChange: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof PlaceColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "Blue, used by Bathroom" })).toBeDisabled();
    await expect(canvas.getByRole("radio", { name: "Olive" })).toBeChecked();
    // Arrow keys move over the free colours only.
    canvas.getByRole("radio", { name: "Olive" }).focus();
    // Held down: Radix chooses on the focus that follows the key press.
    await userEvent.keyboard("{ArrowRight>}");
    await waitFor(() => expect(canvas.getByRole("radio", { name: "Plum" })).toBeChecked());
    await userEvent.keyboard("{/ArrowRight}");
    await expect(args.onValueChange).toHaveBeenLastCalledWith(8);
  },
};

/** Editing a place: its own colour stays available (decision G6). */
export const EditingAPlace: Story = { args: { value: 2, placeId: "kitchen" } };

export const States: Story = {
  render: (args) => (
    <Stack>
      <StateRow
        title="Place color picker"
        cells={[
          {
            state: "Seventh place: six colours used, the first free one chosen",
            node: <Controlled {...args} value={7} places={sixPlaces} />,
            wide: true,
          },
          {
            state: "Editing Kitchen: its own Ochre is free for it",
            node: <Controlled {...args} value={2} places={somePlaces} placeId="kitchen" />,
            wide: true,
          },
          {
            state: "Editing at the limit: only the place's own colour",
            node: <Controlled {...args} value={10} places={tenPlaces} placeId="kids" />,
            wide: true,
          },
        ]}
      />
    </Stack>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <Controlled {...args} />
    </Narrow>
  ),
};

export const Polish: Story = { args: { label: "Kolor", text: polishPlaceText } };

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: <Controlled {...args} />,
        why: "Ten set colours, each named in words; colours in use are shown but cannot be chosen.",
      }}
      bad={{
        node: (
          <label className="flex items-center gap-group">
            Colour <input type="color" />
          </label>
        ),
        why: "A free colour wheel gives colours that are hard to tell apart in small dots (Luki 3).",
      }}
    />
  ),
};
