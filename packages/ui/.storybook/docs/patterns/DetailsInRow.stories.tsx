import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Surface, TaskRow, type TaskRowProps } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { answer } from "../../blocks/fake-api";
import { paintCeiling, pantry, validateTask } from "../../blocks/task-data";

/** Details open in place, in the row (Q2, Luki 6; arrow decision 2026-10-22). */
const meta = {
  title: "Patterns/Details in row",
  component: TaskRow,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  render: (args) => (
    <Surface asChild>
      <ul aria-label="Tasks">
        <TaskRow {...args} />
      </ul>
    </Surface>
  ),
  args: {
    task: paintCeiling,
    validate: validateTask,
    onEdit: fn(answer({ ok: true })) as TaskRowProps["onEdit"],
    onAddSubtask: fn(answer({ ok: true })) as TaskRowProps["onAddSubtask"],
    onRequestDelete: fn(),
  },
  argTypes: { task: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The app's message when the server answers 404: deleted elsewhere, or no access (spec E01). */
const gone = "This task was deleted. The list has been refreshed.";

export const Collapsed: Story = {};

export const Opened: Story = {
  play: async ({ canvasElement }) => {
    const arrow = within(canvasElement).getByRole("button", { name: paintCeiling.title });
    await userEvent.click(arrow);
    await expect(arrow).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Enter}");
    await expect(arrow).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Enter}");
  },
};

export const SubtaskOpened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: paintCeiling.title }));
    await userEvent.click(canvas.getByRole("button", { name: "Buy paint and rollers" }));
    await expect(
      canvas.getByText("10 l of ceiling white, two rollers, masking tape."),
    ).toBeVisible();
  },
};

export const NotFoundOrNoAccess: Story = {
  args: { task: pantry, onEdit: answer({ ok: false, formError: gone }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${pantry.title}”` }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Edit" }),
    );
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(gone);
  },
};
