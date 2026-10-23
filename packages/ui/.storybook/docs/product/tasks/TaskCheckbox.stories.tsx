import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Surface, TaskCheckbox, TaskList, type TaskListProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer } from "../../../blocks/fake-api";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { forDisplay, setCompleted } from "../../../blocks/TaskScreen";
import {
  polishProgressTasks,
  polishTaskText,
  progressTasks,
  validateTask,
} from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Task checkbox",
  component: TaskCheckbox,
  decorators: [withDocFrame],
  args: {
    label: "Complete “Seal the bath”",
    completed: false,
    onCompletedChange: fn(),
  },
  argTypes: { onCompletedChange: { control: false } },
} satisfies Meta<typeof TaskCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", { name: "Complete “Seal the bath”" });
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await expect(args.onCompletedChange).toHaveBeenCalledWith(true);
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Task checkbox"
        cells={[
          {
            state: "Open",
            node: (
              <TaskCheckbox
                label="Complete “Seal the bath”"
                completed={false}
                onCompletedChange={fn()}
              />
            ),
          },
          {
            state: "Completed",
            node: (
              <TaskCheckbox label="Complete “Seal the bath”" completed onCompletedChange={fn()} />
            ),
          },
          {
            state: "Disabled (row saving)",
            node: (
              <TaskCheckbox
                label="Complete “Seal the bath”"
                completed={false}
                onCompletedChange={fn()}
                disabled
              />
            ),
          },
        ]}
      />
    </Stack>
  ),
};

/** The list with completion turned on, as `TaskScreen` wires it (no server). */
function ListWithCompletion({ tasks, text }: Pick<TaskListProps, "tasks" | "text">) {
  const [list, setList] = useState(tasks);
  return (
    <TaskList
      status="ready"
      tasks={forDisplay(list)}
      validate={validateTask}
      onRetry={fn()}
      onEdit={fn(answer({ ok: true }))}
      onAddSubtask={fn(answer({ ok: true }))}
      onDelete={fn(async () => true)}
      onToggleComplete={(id, completed) => setList((all) => setCompleted(all, id, completed))}
      text={text}
    />
  );
}

/** After the arrow, before the title (R02.1); completing moves the row, focus stays on the box. */
export const InTheList: Story = {
  render: () => <ListWithCompletion tasks={progressTasks} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole("checkbox", { name: "Complete “Hang the curtain rods”" });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(box).toHaveFocus();
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <ListWithCompletion tasks={progressTasks} />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => <ListWithCompletion tasks={polishProgressTasks} text={polishTaskText} />,
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <Surface className="flex items-center gap-group px-inset">
            <TaskCheckbox label="Complete “Seal the bath”" completed onCompletedChange={fn()} />
            <span className="text-muted line-through">Seal the bath</span>
          </Surface>
        ),
        why: "The box is checked in the accent colour and the title is muted and struck through; the row stays in the list.",
      }}
      bad={{
        node: (
          <Surface className="flex items-center gap-group px-inset">
            <span className="font-strong text-action-primary">Done</span>
            <span>Seal the bath</span>
          </Surface>
        ),
        why: "A coloured word with no control: it cannot be reopened, and colour alone says nothing (WCAG 1.4.1).",
      }}
    />
  ),
};
