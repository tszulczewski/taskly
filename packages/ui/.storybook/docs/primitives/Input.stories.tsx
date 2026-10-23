import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FormField, Input } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Input",
  component: Input,
  decorators: [withDocFrame],
  args: {
    "aria-label": "Task title",
    placeholder: "e.g. Paint the bathroom ceiling",
    disabled: false,
  },
  argTypes: { suffix: { control: "text" } },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Task title" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.type(input, "Tile the shower wall");
    await expect(input).toHaveValue("Tile the shower wall");
  },
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Input"
        cells={[
          {
            state: "text",
            node: <Input aria-label="Task title" placeholder="e.g. Paint the bathroom ceiling" />,
          },
          { state: "email", node: <Input aria-label="Email" type="email" autoComplete="email" /> },
          {
            state: "with suffix",
            node: (
              <Input
                aria-label="Minimum, zł"
                inputMode="decimal"
                suffix="zł"
                defaultValue="1 200"
              />
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Input"
        cells={[
          {
            state: "empty",
            node: <Input aria-label="Empty" placeholder="e.g. Paint the bathroom ceiling" />,
          },
          {
            state: "filled",
            node: <Input aria-label="Filled" defaultValue="Paint the bathroom ceiling" />,
          },
          {
            state: "focus (keyboard)",
            node: (
              <Input
                aria-label="Focused"
                defaultValue="Paint the"
                data-preview-state="focus-visible"
              />
            ),
          },
          {
            state: "error",
            node: <Input aria-label="Invalid" aria-invalid defaultValue="900" suffix="zł" />,
          },
          {
            state: "disabled",
            node: (
              <Input aria-label="Disabled" disabled defaultValue="Paint the bathroom ceiling" />
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const AmountKeepsUnit: Story = {
  render: () => (
    <FormField label="Maximum, zł" optional>
      {(field) => <Input {...field} inputMode="decimal" suffix="zł" />}
    </FormField>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: /Maximum/ });
    await expect(input).toHaveAttribute("inputmode", "decimal");
    await expect(input).toHaveAccessibleDescription("zł");
    await userEvent.type(input, "1500");
    await expect(input).toHaveValue("1500");
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <Input
        aria-label="Long title"
        defaultValue="Remove the old tiles, level the wall and prepare it for new tiles in the shower"
      />
      <Input aria-label="Amount" inputMode="decimal" suffix="zł" defaultValue="12 500" />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <div className="flex flex-col gap-group">
      <Input aria-label="Tytuł zadania" placeholder="np. Pomalować sufit w łazience" />
      <Input aria-label="Minimum, zł" inputMode="decimal" suffix="zł" defaultValue="1 200" />
    </div>
  ),
};

export const DoAndDont: Story = {
  // The "don't" example is a field named only by its placeholder; it is labelled here with
  // aria-label so the page stays accessible, but sighted users see no label (what it warns about).
  render: () => (
    <DoDont
      good={{
        node: (
          <FormField label="Title">
            {(field) => <Input {...field} placeholder="e.g. Paint the bathroom ceiling" />}
          </FormField>
        ),
        why: "The label stays visible; the placeholder is only an example.",
      }}
      bad={{
        node: <Input aria-label="Title" placeholder="Title" />,
        why: "A placeholder as the name disappears on the first keystroke.",
      }}
    />
  ),
};
