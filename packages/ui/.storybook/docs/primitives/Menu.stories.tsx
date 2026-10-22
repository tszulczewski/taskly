import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  Button,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow } from "../../blocks/Primitives";

function RowMenu({
  open,
  onDelete,
  important = false,
  labels = {
    trigger: "More actions",
    add: "Add subtask",
    edit: "Edit",
    important: "Important",
    urgent: "Urgent",
    remove: "Delete",
  },
}: {
  open?: boolean;
  onDelete?: () => void;
  important?: boolean;
  labels?: Record<"trigger" | "add" | "edit" | "important" | "urgent" | "remove", string>;
}) {
  const [isImportant, setImportant] = useState(important);
  const [isUrgent, setUrgent] = useState(false);
  return (
    // Shown-open stories pin `open`: Radix closes a menu when its window loses focus, and on a
    // docs page only one story iframe has focus.
    <Menu {...(open ? { open: true } : {})} modal={false}>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.trigger}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem>{labels.add}</MenuItem>
        <MenuItem>{labels.edit}</MenuItem>
        <MenuSeparator />
        <MenuCheckboxItem checked={isImportant} onCheckedChange={setImportant}>
          {labels.important}
        </MenuCheckboxItem>
        <MenuCheckboxItem checked={isUrgent} onCheckedChange={setUrgent}>
          {labels.urgent}
        </MenuCheckboxItem>
        <MenuSeparator />
        <MenuItem tone="danger" onSelect={onDelete}>
          {labels.remove}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

const meta = {
  title: "Primitives/Menu",
  component: MenuItem,
  subcomponents: { Menu, MenuTrigger, MenuContent, MenuCheckboxItem, MenuSeparator },
  decorators: [withDocFrame],
  parameters: {
    // Menus render in a portal outside the story root; check the whole page.
    a11y: { context: "body" },
    docs: { story: { inline: false, height: "420px" } },
  },
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { onSelect: fn() },
  render: (args) => (
    <div className="flex justify-end">
      <RowMenu onDelete={() => args.onSelect?.(new Event("select"))} />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("button", { name: "More actions" });
    // Keyboard: Enter opens with focus on the first item; arrows move; Escape closes and returns focus.
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(body.getByRole("menuitem", { name: "Add subtask" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));
    await expect(args.onSelect).toHaveBeenCalledOnce();
  },
};

export const Open: Story = {
  render: () => (
    <div className="flex justify-end">
      <RowMenu open important />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <Menu open modal={false}>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <Ellipsis aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuItem>Default: Add subtask</MenuItem>
        <MenuItem data-highlighted="">Hover or arrow keys: Edit</MenuItem>
        <MenuItem data-preview-state="focus-visible">Keyboard focus: Edit</MenuItem>
        <MenuCheckboxItem checked>Checked: Important</MenuCheckboxItem>
        <MenuCheckboxItem checked={false}>Not checked: Urgent</MenuCheckboxItem>
        <MenuItem disabled>Disabled: Add subtask</MenuItem>
        <MenuSeparator />
        <MenuItem tone="danger">Danger: Delete</MenuItem>
      </MenuContent>
    </Menu>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <div className="flex justify-end">
        <RowMenu
          open
          labels={{
            trigger: "Więcej działań",
            add: "Dodaj podzadanie",
            edit: "Edytuj",
            important: "Ważne",
            urgent: "Pilne",
            remove: "Usuń zadanie wraz ze wszystkimi podzadaniami",
          }}
        />
      </div>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <div className="flex justify-end">
      <RowMenu
        open
        labels={{
          trigger: "Więcej działań",
          add: "Dodaj podzadanie",
          edit: "Edytuj",
          important: "Ważne",
          urgent: "Pilne",
          remove: "Usuń",
        }}
      />
    </div>
  ),
};

export const DoAndDont: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: (
          <div className="flex w-full items-center justify-between">
            <span className="font-strong">Paint the bathroom ceiling</span>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <Ellipsis aria-hidden="true" />
            </Button>
          </div>
        ),
        why: "One “…” per row keeps the title and amount readable (R02.1).",
      }}
      bad={{
        node: (
          <div className="flex w-full flex-wrap items-center gap-group">
            <span className="font-strong">Paint the bathroom ceiling</span>
            <Button>Add subtask</Button>
            <Button>Edit</Button>
            <Button variant="danger">Delete</Button>
          </div>
        ),
        why: "Three buttons in every row crowd out the content (A01.3).",
      }}
    />
  ),
};
