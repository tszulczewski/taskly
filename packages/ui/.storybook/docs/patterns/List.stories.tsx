import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { manyTasks, sealBath, someTasks, wholeBathroom } from "../../blocks/task-data";

/** The list pattern on the task list (spec E01, States). Every state is its own story. */
const meta = {
  title: "Patterns/List",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: someTasks },
  argTypes: { initialTasks: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstLoad: Story = { args: { initialStatus: "loading" } };

export const LoadFailed: Story = {
  args: { initialStatus: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(canvas.getByRole("button", { name: "Trying again…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(await canvas.findByRole("list", { name: "Tasks" })).toBeVisible();
  },
};

export const Empty: Story = { args: { initialTasks: [] } };

export const Ready: Story = {};

export const PartialData: Story = { args: { initialTasks: [sealBath, wholeBathroom] } };

export const Many: Story = { args: { initialTasks: manyTasks } };
