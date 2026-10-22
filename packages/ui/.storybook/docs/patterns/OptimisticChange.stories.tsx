import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Surface, TaskRow } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { answer } from "../../blocks/fake-api";
import { TaskScreen } from "../../blocks/TaskScreen";
import { curtainRods, sealBath, taskMessages, validateTask } from "../../blocks/task-data";

/** Showing a change at once and undoing it if the server refuses (spec E01, Optimistic UI). */
const meta = {
  title: "Patterns/Optimistic change",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: [curtainRods, sealBath] },
  argTypes: { initialTasks: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const add = (canvasElement: HTMLElement) =>
  userEvent.type(within(canvasElement).getByLabelText("New task"), "Buy curtain hooks{Enter}");

export const Pending: Story = {
  args: { server: "slow" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await add(canvasElement);
    await expect(await canvas.findByText("Saving…")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "More actions for “Buy curtain hooks”" }),
    );
    for (const item of within(canvasElement.ownerDocument.body).getAllByRole("menuitem")) {
      await expect(item).toHaveAttribute("aria-disabled", "true");
    }
    await userEvent.keyboard("{Escape}");
  },
};

export const Confirmed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await add(canvasElement);
    await waitFor(() => expect(canvas.queryByText("Saving…")).toBeNull());
    await expect(canvas.getByText("Buy curtain hooks").closest(".row-highlight")).not.toBeNull();
  },
};

export const RolledBack: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await add(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.addFailed);
    await expect(canvas.queryByText("Saving…")).toBeNull();
  },
};

export const RowError: Story = {
  render: () => (
    <Surface asChild>
      <ul aria-label="Tasks">
        <TaskRow
          task={{ ...sealBath, error: taskMessages.rolledBack }}
          validate={validateTask}
          onEdit={answer({ ok: true })}
          onAddSubtask={answer({ ok: true })}
          onRequestDelete={() => {}}
        />
      </ul>
    </Surface>
  ),
};
