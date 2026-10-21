import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemePair } from "../../blocks/Specimens";

const meta = {
  title: "Foundations/Themes",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SideBySide: Story = { render: () => <ThemePair /> };
