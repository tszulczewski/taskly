import type { Meta, StoryObj } from "@storybook/react-vite";
import { TokenTable } from "../../blocks/TokenTable";
import { Measure, TypePolish, TypeRoles } from "../../blocks/Specimens";

const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Roles: Story = { render: () => <TypeRoles /> };
export const Polish: Story = { render: () => <TypePolish /> };
export const LineLength: Story = { render: () => <Measure /> };
export const Tokens: Story = {
  render: () => (
    <TokenTable
      names={[
        "font-family-base",
        "font-size-meta",
        "font-size-body",
        "font-size-heading",
        "input-font-size-mobile",
        "font-weight-regular",
        "font-weight-strong",
        "line-height-body",
        "line-height-heading",
        "layout-text-measure",
      ]}
    />
  ),
};
