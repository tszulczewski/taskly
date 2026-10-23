import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MotionDemo } from "../../blocks/Specimens";
import { TokenTable } from "../../blocks/TokenTable";

const meta = {
  title: "Foundations/Motion",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Demo: Story = {
  render: () => <MotionDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Show details" });
    await userEvent.click(toggle);
    await expect(canvas.getByRole("button", { name: "Hide details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  },
};
export const Tokens: Story = {
  render: () => (
    <TokenTable names={["motion-duration-quick", "motion-duration-base", "motion-easing"]} />
  ),
};
