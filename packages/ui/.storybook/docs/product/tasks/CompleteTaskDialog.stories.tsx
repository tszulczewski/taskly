import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { CompleteTaskDialog } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont } from "../../../blocks/Primitives";
import {
  longTask,
  paintCeiling,
  polishProgressTasks,
  polishTaskText,
} from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Complete task dialog",
  component: CompleteTaskDialog,
  decorators: [withDocFrame],
  parameters: {
    a11y: { context: "body" },
    docs: { story: { inline: false, height: "360px" } },
  },
  args: { task: paintCeiling, openSubtasks: 2, onConfirm: fn(), onCancel: fn() },
  argTypes: {
    task: { control: "object" },
    onConfirm: { control: false },
    onCancel: { control: false },
    onCloseAutoFocus: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof CompleteTaskDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

export const OpenSubtasks: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = body(canvasElement).getByRole("alertdialog", {
      name: "Complete “Paint the bathroom ceiling” and its 2 open subtasks?",
    });
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete task" }));
    await expect(args.onConfirm).toHaveBeenCalledWith(paintCeiling);
  },
};

export const OneOpenSubtask: Story = {
  args: { openSubtasks: 1 },
  play: async ({ args, canvasElement }) => {
    await body(canvasElement).findByRole("alertdialog", {
      name: "Complete “Paint the bathroom ceiling” and its open subtask?",
    });
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

export const LongTitle: Story = { args: { task: longTask, openSubtasks: 3 } };

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { task: longTask, openSubtasks: 3 },
};

export const Polish: Story = {
  args: { task: polishProgressTasks[1]!, openSubtasks: 1, text: polishTaskText },
};

export const DoAndDont: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: (
          <div className="flex flex-col gap-inline">
            <p>Complete “Paint the bathroom ceiling” and its 2 open subtasks?</p>
            <p className="text-muted">Reopening the task later does not reopen its subtasks.</p>
          </div>
        ),
        why: "Says what else changes and that it is not undone by reopening; the button says “Complete task”.",
      }}
      bad={{
        node: <p>Are you sure? [Yes] [No]</p>,
        why: "Does not say that the subtasks are completed too, and “Yes” does not name the action.",
      }}
    />
  ),
};
