import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconSet } from "../../blocks/Specimens";
import { TokenTable } from "../../blocks/TokenTable";

const meta = {
  title: "Foundations/Icons",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Set: Story = { render: () => <IconSet /> };
export const Tokens: Story = {
  render: () => <TokenTable names={["icon-size", "icon-stroke-width", "touch-target-min"]} />,
};
