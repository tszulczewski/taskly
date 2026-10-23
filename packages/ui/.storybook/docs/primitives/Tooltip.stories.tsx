import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ellipsis, GripVertical, Plus } from "lucide-react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Button, Menu, MenuContent, MenuItem, MenuTrigger, Tooltip } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" }, docs: { story: { inline: false, height: "160px" } } },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const more = (
  <Button variant="ghost" size="icon" aria-label="More actions">
    <Ellipsis aria-hidden="true" />
  </Button>
);

export const Playground: Story = {
  args: { children: more, side: "top" },
  render: (args) => (
    <div className="flex justify-center pt-section">
      <Tooltip {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole("button", { name: "More actions" });
    // Keyboard focus shows it; the button is still named once (no aria-describedby).
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[data-slot="tooltip"]')).toHaveTextContent(
        "More actions",
      ),
    );
    await expect(button).not.toHaveAttribute("aria-describedby");
    await userEvent.keyboard("{Escape}");
  },
};

export const IconButtons: Story = {
  args: { children: more },
  render: () => (
    <div className="flex gap-group pt-section">
      <Tooltip>
        <Button variant="ghost" size="icon" aria-label="Drag to reorder">
          <GripVertical aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip>
        <Button variant="ghost" size="icon" aria-label="Add subtask">
          <Plus aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip>{more}</Tooltip>
    </div>
  ),
};

export const States: Story = {
  args: { children: more },
  render: () => (
    <div className="flex flex-col gap-inline pt-section">
      <Tooltip side="bottom">{more}</Tooltip>
      <span className="text-meta text-muted">
        hidden until hover or keyboard focus; the play function focuses the button to show it
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[data-slot="tooltip"]')).not.toBeNull(),
    );
  },
};

export const Narrow320: Story = {
  args: { children: more },
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <div className="flex justify-end pt-section">
        <Tooltip>
          <Button variant="ghost" size="icon" aria-label="Przeciągnij, aby zmienić kolejność">
            <GripVertical aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </Narrow>
  ),
  play: async () => {
    await userEvent.tab();
  },
};

export const Polish: Story = {
  args: { children: more },
  render: () => (
    <div className="flex justify-center pt-section">
      <Tooltip>
        <Button variant="ghost" size="icon" aria-label="Więcej działań">
          <Ellipsis aria-hidden="true" />
        </Button>
      </Tooltip>
    </div>
  ),
  play: async () => {
    await userEvent.tab();
  },
};

/** A menu button: the label sits on `MenuTrigger` too, because the tooltip reads its direct child. */
export const WithMenu: Story = {
  args: { children: more },
  render: () => (
    <div className="flex justify-center pt-section">
      <Menu modal={false}>
        <Tooltip>
          <MenuTrigger asChild aria-label="More actions for “Seal the bath”">
            <Button variant="ghost" size="icon" aria-label="More actions for “Seal the bath”">
              <Ellipsis aria-hidden="true" />
            </Button>
          </MenuTrigger>
        </Tooltip>
        <MenuContent>
          <MenuItem>Edit</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole("button", { name: "More actions for “Seal the bath”" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[data-slot="tooltip"]')).toHaveTextContent(
        "More actions for “Seal the bath”",
      ),
    );
    await expect(button).not.toHaveAttribute("aria-describedby");
    // It is still the menu button: Enter opens the menu, Escape closes it and returns focus.
    await userEvent.keyboard("{Enter}");
    await expect(await body.findByRole("menuitem", { name: "Edit" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.keyboard("{Escape}");
  },
};

export const DoAndDont: Story = {
  args: { children: more },
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: <Tooltip>{more}</Tooltip>,
        why: "The tooltip repeats the button's name for sighted mouse users; nothing new is hidden in it.",
      }}
      bad={{
        node: (
          <Button variant="primary" disabled>
            Add
          </Button>
        ),
        why: "Don't explain why a button is disabled in a tooltip: touch and keyboard users never see it (P4).",
      }}
    />
  ),
};
