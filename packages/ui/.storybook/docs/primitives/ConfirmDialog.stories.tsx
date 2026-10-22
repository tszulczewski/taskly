import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button, ConfirmDialog } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Confirm dialog",
  component: ConfirmDialog,
  decorators: [withDocFrame],
  parameters: {
    a11y: { context: "body" },
    docs: { story: { inline: false, height: "360px" } },
  },
  args: {
    title: "Delete “Paint the bathroom ceiling” and its 3 subtasks?",
    description: "This cannot be undone.",
    confirmLabel: "Delete task",
    pendingLabel: "Deleting…",
    onConfirm: fn(),
    onOpenChange: fn(),
    trigger: <Button variant="danger">Delete task</Button>,
  },
  argTypes: { trigger: { control: false }, error: { control: "text" } },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("button", { name: "Delete task" });
    await userEvent.click(trigger);
    const dialog = body.getByRole("alertdialog", { name: /Delete “Paint the bathroom ceiling”/ });
    // Focus starts on Cancel, the safe choice, and stays inside the dialog.
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    await expect(within(dialog).getByRole("button", { name: "Delete task" })).toHaveFocus();
    await userEvent.tab();
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    // Escape closes and returns focus to the trigger.
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(
      within(body.getByRole("alertdialog")).getByRole("button", { name: "Delete task" }),
    );
    await expect(args.onConfirm).toHaveBeenCalled();
  },
};

export const Open: Story = { args: { defaultOpen: true } };

export const WithoutSubtasks: Story = {
  args: { defaultOpen: true, title: "Delete “Seal the bath”?", description: undefined },
};

/** Completing a task with open subtasks (decision I2): nothing is lost, so not danger. */
export const PrimaryConfirm: Story = {
  args: {
    defaultOpen: true,
    title: "Complete “Paint the bathroom ceiling” and its 2 open subtasks?",
    description: "Reopening the task later does not reopen its subtasks.",
    confirmLabel: "Complete task",
    confirmVariant: "primary",
  },
};

export const Pending: Story = { args: { open: true, pending: true } };

export const Failed: Story = {
  args: { open: true, error: "Could not delete the task. Check your connection and try again." },
};

function DeleteFlow() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="danger">Delete task</Button>}
      title="Delete “Fit the shower screen”?"
      confirmLabel="Delete task"
      pendingLabel="Deleting…"
      pending={pending}
      onConfirm={() => {
        setPending(true);
        setTimeout(() => {
          setPending(false);
          setOpen(false);
        }, 300);
      }}
    />
  );
}

export const ClosesAfterServerConfirms: Story = {
  render: () => <DeleteFlow />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole("button", { name: "Delete task" }));
    await userEvent.click(
      within(body.getByRole("alertdialog")).getByRole("button", { name: "Delete task" }),
    );
    await expect(body.getByRole("button", { name: "Deleting…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await userEvent.keyboard("{Escape}");
    await expect(body.getByRole("alertdialog")).toBeVisible();
    await expect(await body.findByRole("button", { name: "Delete task" })).toBeVisible();
    await expect(body.queryByRole("alertdialog")).toBeNull();
  },
};

export const LongTitleNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: {
    defaultOpen: true,
    title:
      "Delete “Remove the old tiles, level the wall and prepare it for new tiles in the shower” and its 12 subtasks?",
  },
};

export const Polish: Story = {
  args: {
    defaultOpen: true,
    title: "Usunąć „Pomalować sufit w łazience” i 3 podzadania?",
    description: "Tego nie da się cofnąć.",
    confirmLabel: "Usuń zadanie",
    cancelLabel: "Anuluj",
    trigger: <Button variant="danger">Usuń zadanie</Button>,
  },
};

export const DoAndDont: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: (
          <div className="flex flex-col gap-group">
            <p className="font-strong">Delete “Paint the bathroom ceiling” and its 3 subtasks?</p>
            <div className="flex gap-group">
              <Button variant="danger">Delete task</Button>
              <Button>Cancel</Button>
            </div>
          </div>
        ),
        why: "The question names the task and what goes with it; the button says what it does.",
      }}
      bad={{
        node: (
          <div className="flex flex-col gap-group">
            <p className="font-strong">Are you sure?</p>
            <div className="flex gap-group">
              <Button variant="primary">OK</Button>
              <Button>No</Button>
            </div>
          </div>
        ),
        why: "“Are you sure?” and “OK” make the user remember what they clicked.",
      }}
    />
  ),
};
