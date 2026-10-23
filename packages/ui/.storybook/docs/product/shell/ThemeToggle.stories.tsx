import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useGlobals } from "storybook/preview-api";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ThemeToggle, type Theme } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { Narrow, Stack, StateRow } from "../../../blocks/Primitives";

const meta = {
  title: "Product/App shell/Theme toggle",
  component: ThemeToggle,
  decorators: [withDocFrame],
  args: { value: "dark", onValueChange: () => {} },
  argTypes: { onValueChange: { control: false } },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledToggle({ onValueChange }: { onValueChange: (theme: Theme) => void }) {
  const [value, setValue] = useState<Theme>("dark");
  return (
    <ThemeToggle
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
}

export const Playground: Story = {
  args: { onValueChange: fn() },
  render: (args) => <ControlledToggle onValueChange={args.onValueChange} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Light" }));
    await expect(canvas.getByRole("radio", { name: "Light" })).toBeChecked();
    await expect(args.onValueChange).toHaveBeenCalledWith("light");
    // Arrow keys move and select inside the group (WAI-ARIA APG, radio group).
    await userEvent.keyboard("{ArrowLeft>}");
    await waitFor(() => expect(canvas.getByRole("radio", { name: "Dark" })).toBeChecked());
    await userEvent.keyboard("{/ArrowLeft}");
  },
};

/** In the app the switch sets `data-theme` on the root; here it drives Storybook's theme (rule 9). */
export const DrivesTheTheme: Story = {
  render: function Render() {
    const [globals, updateGlobals] = useGlobals();
    const theme: Theme = globals.theme === "light" ? "light" : "dark";
    return <ThemeToggle value={theme} onValueChange={(next) => updateGlobals({ theme: next })} />;
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Selected position"
        cells={[
          { state: "dark", node: <ThemeToggle value="dark" onValueChange={() => {}} /> },
          { state: "light", node: <ThemeToggle value="light" onValueChange={() => {}} /> },
        ]}
      />
    </Stack>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <ThemeToggle {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    // Only icons show below 640px; the words stay the segments' accessible names.
    await expect(within(canvasElement).getByRole("radio", { name: "Dark" })).toBeVisible();
  },
};

export const Polish: Story = {
  args: { text: { label: "Motyw", dark: "Ciemny", light: "Jasny" } },
};
