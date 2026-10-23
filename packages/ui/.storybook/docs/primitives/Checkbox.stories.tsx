import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Checkbox, Label } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  decorators: [withDocFrame],
  args: { "aria-label": "Paint the bathroom ceiling", disabled: false, onCheckedChange: fn() },
  argTypes: { checked: { control: "boolean" } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", { name: "Paint the bathroom ceiling" });
    await userEvent.click(box);
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(true);
    // Keyboard: Space toggles (WAI-ARIA APG, checkbox); Enter does not.
    await userEvent.keyboard(" ");
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(false);
    await expect(box).toHaveAttribute("aria-checked", "false");
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center">
      <Checkbox id="task-ceiling" />
      <Label htmlFor="task-ceiling">Paint the bathroom ceiling</Label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Paint the bathroom ceiling"));
    await expect(
      canvas.getByRole("checkbox", { name: "Paint the bathroom ceiling" }),
    ).toBeChecked();
  },
};

const cells = (checked: boolean) => [
  { state: "default", node: <Checkbox aria-label="Default" checked={checked} /> },
  {
    state: "hover",
    node: <Checkbox aria-label="Hover" checked={checked} data-preview-state="hover" />,
  },
  {
    state: "focus (keyboard)",
    node: <Checkbox aria-label="Focus" checked={checked} data-preview-state="focus-visible" />,
  },
  {
    state: "pressed",
    node: <Checkbox aria-label="Pressed" checked={checked} data-preview-state="active" />,
  },
  { state: "disabled", node: <Checkbox aria-label="Disabled" checked={checked} disabled /> },
];

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow title="Not checked (open task)" cells={cells(false)} />
      <StateRow title="Checked (completed task)" cells={cells(true)} />
    </Stack>
  ),
};

export const LongLabelNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <div className="flex items-start">
        <Checkbox id="long-task" />
        <Label htmlFor="long-task" className="pt-row-y">
          Remove the old tiles, level the wall and prepare it for the new tiles in the shower
        </Label>
      </div>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Checkbox id="polish-1" defaultChecked />
        <Label htmlFor="polish-1">Zeskrobać starą farbę</Label>
      </div>
      <div className="flex items-center">
        <Checkbox id="polish-2" />
        <Label htmlFor="polish-2">Pomalować sufit w łazience</Label>
      </div>
    </div>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <div className="flex items-center">
            <Checkbox id="do-check" defaultChecked />
            <Label htmlFor="do-check">Buy primer</Label>
          </div>
        ),
        why: "Clicking the words toggles the box too, so the target is the whole line.",
      }}
      bad={{
        node: (
          <div className="flex items-center gap-between-groups">
            <Checkbox aria-label="Buy primer" defaultChecked />
            <span className="text-body">Buy primer</span>
          </div>
        ),
        why: "Text that is not a label is not clickable and is not tied to the box.",
      }}
    />
  ),
};
