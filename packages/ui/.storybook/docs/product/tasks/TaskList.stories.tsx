import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { TaskList, type TaskListProps } from "../../../../src";
import { tokenPx } from "../../../../src/lib/token-px";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import { placeNameRule, somePlaces } from "../../../blocks/place-data";
import {
  longTask,
  manyTasks,
  organizedTasks,
  polishTaskText,
  polishTasks,
  progressTasks,
  sealBath,
  someTasks,
  validateTask,
  wholeBathroom,
} from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Task list",
  component: TaskList,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: {
    status: "ready",
    tasks: someTasks,
    validate: validateTask,
    onRetry: fn(),
    onEdit: fn(answer({ ok: true })) as TaskListProps["onEdit"],
    onAddSubtask: fn(answer({ ok: true })) as TaskListProps["onAddSubtask"],
    onDelete: fn(async () => true),
  },
  argTypes: {
    tasks: { control: "object" },
    validate: { control: false },
    onRetry: { control: false },
    onEdit: { control: false },
    onAddSubtask: { control: false },
    onDelete: { control: false },
    onMove: { control: false },
    onToggleMarker: { control: false },
    onToggleComplete: { control: false },
    places: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof TaskList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Loading: Story = {
  args: { status: "loading" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Loading tasks…");
    // A skeleton row is as high as a one-line row: a 44px target between 12px paddings (N8).
    const row = 2 * tokenPx("--task-row-padding-y") + tokenPx("--touch-target-min");
    const rows = canvasElement.querySelectorAll<HTMLElement>('[aria-busy="true"] > div');
    await expect(rows).toHaveLength(3);
    for (const [index, skeleton] of Array.from(rows).entries()) {
      // The first row has no top line; the others add the 1px divider.
      const line = index === 0 ? 0 : 1;
      await expect(skeleton.getBoundingClientRect().height).toBeCloseTo(row + line, 0);
    }
  },
};

export const LoadFailed: Story = {
  args: { status: "error" },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const Retrying: Story = { args: { status: "error", retrying: true } };

export const Empty: Story = { args: { tasks: [] } };

export const Partial: Story = {
  args: { tasks: [sealBath, { ...someTasks[1]!, description: null }, wholeBathroom] },
};

export const Many: Story = { args: { tasks: manyTasks } };

export const LongText: Story = { args: { tasks: [longTask, wholeBathroom, sealBath] } };

export const DeleteWithSubtasks: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", {
      name: "More actions for “Paint the bathroom ceiling”",
    });
    await userEvent.click(trigger);
    await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));
    const dialog = await body.findByRole("alertdialog", {
      name: "Delete “Paint the bathroom ceiling” and its 3 subtasks?",
    });
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};

export const DeleteConfirmed: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "More actions for “Seal the bath”" }));
    await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));
    await userEvent.click(await body.findByRole("button", { name: "Delete task" }));
    await expect(args.onDelete).toHaveBeenCalledWith("seal");
    // The row is gone (in the app), so focus goes to the list (decision F6).
    await waitFor(() => expect(canvas.getByRole("list", { name: "Tasks" })).toHaveFocus());
  },
};

/** E02: order, markers and places turned on (decisions G1–G3). */
export const Organized: Story = {
  args: {
    tasks: organizedTasks,
    onMove: fn(),
    onToggleMarker: fn(),
    places: {
      all: somePlaces,
      atLimit: false,
      validateName: placeNameRule(somePlaces),
      onToggle: fn(),
      onCreate: fn(answer({ ok: true })),
      onUpdate: fn(answer({ ok: true })),
      onDelete: fn(async () => true),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "More actions for “Hang the curtain rods”" }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Move up" }),
    );
    await expect(args.onMove).toHaveBeenCalledWith("rods", {
      afterId: "seal",
      beforeId: "paint",
    });
  },
};

/** E03: completion turned on; completed rows at the end (decision 2026-10-21). */
export const WithCompletion: Story = {
  args: { tasks: progressTasks, onToggleComplete: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: "Complete “Seal the bath”" }));
    await expect(args.onToggleComplete).toHaveBeenCalledWith("seal", true);
  },
};

export const CompleteWithOpenSubtasks: Story = {
  args: { tasks: progressTasks, onToggleComplete: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Complete “Paint the bathroom ceiling”" }),
    );
    const dialog = await body.findByRole("alertdialog", {
      name: "Complete “Paint the bathroom ceiling” and its 2 open subtasks?",
    });
    await expect(args.onToggleComplete).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete task" }));
    await expect(args.onToggleComplete).toHaveBeenCalledWith("paint", true);
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <TaskList {...args} />
    </Narrow>
  ),
};

export const Polish: Story = { args: { tasks: polishTasks, text: polishTaskText } };

export const PolishEmpty: Story = { args: { tasks: [], text: polishTaskText } };

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: (
          <div className="w-full">
            <TaskList {...args} tasks={[]} />
          </div>
        ),
        why: "Empty says why and what to do next, in words (spec E01, Luki 5).",
      }}
      bad={{
        node: (
          <div className="w-full">
            <TaskList {...args} status="loading" />
          </div>
        ),
        why: "A skeleton that never ends hides a failed load: replace it with the error and “Try again”.",
      }}
    />
  ),
};
