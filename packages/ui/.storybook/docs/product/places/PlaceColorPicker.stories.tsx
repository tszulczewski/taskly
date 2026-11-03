import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { PlaceColorPicker, type PlaceColor, type PlaceColorPickerProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { polishPlaceText } from "../../../blocks/place-data";

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
  args: { value: 4, label: "Colour", onValueChange: fn() },
  argTypes: {
    value: { control: { type: "select" }, options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    onValueChange: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof PlaceColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    // Every colour can be chosen: from the eleventh place colours repeat (D26).
    await expect(canvas.getByRole("radio", { name: "Blue" })).toBeEnabled();
    await expect(canvas.getByRole("radio", { name: "Green" })).toBeChecked();
    canvas.getByRole("radio", { name: "Green" }).focus();
    // Held down: Radix chooses on the focus that follows the key press.
    await userEvent.keyboard("{ArrowRight>}");
    await waitFor(() => expect(canvas.getByRole("radio", { name: "Violet" })).toBeChecked());
    await userEvent.keyboard("{/ArrowRight}");
    await expect(args.onValueChange).toHaveBeenLastCalledWith(5);
  },
};

/** Editing a place: its own colour is chosen, and any other can be (decision G6, D26). */
export const EditingAPlace: Story = { args: { value: 3 } };

export const States: Story = {
  render: (args) => (
    <Stack>
      <StateRow
        title="Place color picker"
        cells={[
          {
            state: "Editing Kuchnia: its own Green chosen",
            node: <Controlled {...args} value={4} />,
            wide: true,
          },
          {
            state: "Editing Spiżarnia, the eleventh place: Blue again, as Salon",
            node: <Controlled {...args} value={1} />,
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
        why: "Ten set colours, each named in words; any can be chosen, since colours repeat from the eleventh place.",
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
