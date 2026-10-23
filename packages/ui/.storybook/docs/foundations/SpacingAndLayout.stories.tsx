import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayoutWidths, PageColumn, SpacingLevels, SpacingRelations } from "../../blocks/Specimens";
import { TokenTable } from "../../blocks/TokenTable";

const meta = {
  title: "Foundations/Spacing and layout",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Levels: Story = { render: () => <SpacingLevels /> };
export const Relations: Story = { render: () => <SpacingRelations /> };
export const Widths: Story = { render: () => <LayoutWidths /> };
export const Column320: Story = {
  render: () => <PageColumn />,
  globals: { viewport: { value: "phone320", isRotated: false } },
};
export const Column768: Story = {
  render: () => <PageColumn />,
  globals: { viewport: { value: "tablet768", isRotated: false } },
};
export const Column1440: Story = {
  render: () => <PageColumn />,
  globals: { viewport: { value: "desktop1440", isRotated: false } },
};
export const Tokens: Story = {
  render: () => (
    <TokenTable
      names={[
        "space-inline",
        "space-group",
        "space-between-groups",
        "space-inset",
        "space-section",
        "space-page-gutter",
        "space-page-top",
        "layout-content-max-width",
        "task-row-min-height",
        "task-row-padding-y",
        "task-row-indent",
        "touch-target-min",
      ]}
    />
  ),
};
