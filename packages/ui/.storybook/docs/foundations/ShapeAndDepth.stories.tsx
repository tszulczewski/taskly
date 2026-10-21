import type { Meta, StoryObj } from "@storybook/react-vite";
import { Depth, Radii } from "../../blocks/Specimens";
import { TokenTable } from "../../blocks/TokenTable";

const meta = {
  title: "Foundations/Shape and depth",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Radius: Story = { render: () => <Radii /> };
export const DepthDark: Story = { render: () => <Depth theme="dark" /> };
export const DepthLight: Story = { render: () => <Depth theme="light" /> };
export const Tokens: Story = {
  render: () => (
    <TokenTable
      names={[
        "radius-control",
        "radius-surface",
        "checkbox-radius",
        "border-width",
        "place-dot-size",
        "checkbox-size",
      ]}
    />
  ),
};
