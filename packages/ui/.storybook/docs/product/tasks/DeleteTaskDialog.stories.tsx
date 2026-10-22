import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { DeleteTaskDialog, type DeleteTaskDialogProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { never } from "../../../blocks/fake-api";
import { DoDont } from "../../../blocks/Primitives";
import {
  curtainRods,
  longTask,
  paintCeiling,
  polishTaskText,
  polishTasks,
} from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Delete task dialog",
  component: DeleteTaskDialog,
  decorators: [withDocFrame],
  parameters: {
    a11y: { context: "body" },
    docs: { story: { inline: false, height: "360px" } },
  },
  args: {
    task: paintCeiling,
    onConfirm: fn(async () => true) as DeleteTaskDialogProps["onConfirm"],
    onClose: fn(),
  },
  argTypes: {
    task: { control: "object" },
    onConfirm: { control: false },
    onClose: { control: false },
    onCloseAutoFocus: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof DeleteTaskDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

export const WithSubtasks: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = body(canvasElement).getByRole("alertdialog", {
      name: "Delete “Paint the bathroom ceiling” and its 3 subtasks?",
    });
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await expect(args.onConfirm).toHaveBeenCalledWith(paintCeiling);
    await waitFor(() => expect(args.onClose).toHaveBeenCalledWith(true));
  },
};

export const WithoutSubtasks: Story = {
  args: { task: curtainRods },
  play: async ({ args, canvasElement }) => {
    await body(canvasElement).findByRole("alertdialog", {
      name: "Delete “Hang the curtain rods”?",
    });
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledWith(false);
  },
};

export const Deleting: Story = {
  args: { onConfirm: fn(never) },
  play: async ({ args, canvasElement }) => {
    const dialog = body(canvasElement).getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await expect(within(dialog).getByRole("button", { name: "Deleting…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const DeleteFailed: Story = {
  args: { onConfirm: fn(async () => false) },
  play: async ({ canvasElement }) => {
    const dialog = body(canvasElement).getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Could not delete the task. Try again.",
    );
  },
};

export const LongTitle: Story = { args: { task: longTask } };

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { task: longTask },
};

export const Polish: Story = { args: { task: polishTasks[0]!, text: polishTaskText } };

export const DoAndDont: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: <p>Delete “Paint the bathroom ceiling” and its 3 subtasks?</p>,
        why: "Names the task and says the subtasks go too; the button says “Delete task”.",
      }}
      bad={{
        node: <p>Are you sure? [OK]</p>,
        why: "Does not say what is lost, and “OK” does not name the action (spec E01, task rules).",
      }}
    />
  ),
};
