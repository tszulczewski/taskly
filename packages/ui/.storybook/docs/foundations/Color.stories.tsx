import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorRoleTable, ContrastTable, PlaceDots } from "../../blocks/ColorBlocks";
import { actionRoles, lineRoles, surfaceRoles, textRoles } from "../../blocks/color-roles";

const meta = {
  title: "Foundations/Color",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Surfaces: Story = { render: () => <ColorRoleTable roles={surfaceRoles} /> };
export const Lines: Story = { render: () => <ColorRoleTable roles={lineRoles} /> };
export const Text: Story = { render: () => <ColorRoleTable roles={textRoles} /> };
export const Action: Story = { render: () => <ColorRoleTable roles={actionRoles} /> };
export const PlacesDark: Story = { render: () => <PlaceDots theme="dark" /> };
export const PlacesLight: Story = { render: () => <PlaceDots theme="light" /> };
export const Contrast: Story = { render: () => <ContrastTable /> };
