import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { progressTasks, taskMessages } from "../../blocks/task-data";

/** Completing and reopening on the task list (E03-S01, decisions I1–I4). One story per state. */
const meta = {
  title: "Patterns/Complete and reopen",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: progressTasks, expenses: "ready", delay: 300 },
  argTypes: {
    initialTasks: { control: false },
    initialPlaces: { control: false },
    text: { control: false },
    placeText: { control: false },
    expensesText: { control: false },
  },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const titles = (canvas: Canvas, list = "Tasks") =>
  within(canvas.getByRole("list", { name: list }))
    .getAllByRole("listitem")
    .filter((row) => row.parentElement?.getAttribute("aria-label") === list)
    .map((row) => row.querySelector("[data-slot='task-title']")?.textContent);
const box = (canvas: Canvas, title: string) =>
  canvas.getByRole("checkbox", { name: `Complete “${title}”` });
const total = (canvas: Canvas) =>
  within(
    canvas.getByText("Future expenses").closest("[data-slot='future-expenses']") as HTMLElement,
  ).getByRole("status");

export const InProgress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(total(canvas)).toHaveTextContent("1 380–1 750 zł");
    await expect(titles(canvas).slice(-2)).toEqual([
      "Finish the pantry shelves",
      "Box in the pipes in the bathroom",
    ]);
  },
};

export const Completed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(box(canvas, "Hang the curtain rods"));
    await expect(box(canvas, "Hang the curtain rods")).toBeChecked();
    await expect(box(canvas, "Hang the curtain rods")).toHaveFocus();
    await expect(titles(canvas)[3]).toBe("Hang the curtain rods");
    await expect(total(canvas)).toHaveTextContent("1 200–1 500 zł");
  },
};

export const AskBeforeSubtasks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(box(canvas, "Paint the bathroom ceiling"));
    const dialog = await body.findByRole("alertdialog", {
      name: "Complete “Paint the bathroom ceiling” and its 2 open subtasks?",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Complete task" }));
    await waitFor(() => expect(box(canvas, "Paint the bathroom ceiling")).toHaveFocus());
    await expect(box(canvas, "Paint the bathroom ceiling")).toBeChecked();
    await expect(total(canvas)).toHaveTextContent("180–250 zł");
  },
};

export const CancelledQuestion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(box(canvas, "Paint the bathroom ceiling"));
    await within(canvasElement.ownerDocument.body).findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(box(canvas, "Paint the bathroom ceiling")).toHaveFocus());
    await expect(box(canvas, "Paint the bathroom ceiling")).not.toBeChecked();
  },
};

export const SubtaskCompleted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Paint the bathroom ceiling" }));
    await userEvent.click(box(canvas, "Buy paint and rollers"));
    const subtasks = "Subtasks of “Paint the bathroom ceiling”";
    // Completed subtasks follow the open ones in plan order, not completion order.
    await expect(titles(canvas, subtasks)).toEqual([
      "Mask the lamp and the sockets",
      "Buy paint and rollers",
      "Fill the cracks above the window",
    ]);
    // A subtask's estimate never counts (R06): the total stays.
    await expect(total(canvas)).toHaveTextContent("1 380–1 750 zł");
  },
};

export const Reopened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(box(canvas, "Finish the pantry shelves"));
    await expect(box(canvas, "Finish the pantry shelves")).not.toBeChecked();
    await expect(titles(canvas)[0]).toBe("Finish the pantry shelves");
    await expect(total(canvas)).toHaveTextContent("2 280–3 150 zł");
  },
};

export const ReopenedKeepsSubtasks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(box(canvas, "Box in the pipes in the bathroom"));
    await userEvent.click(canvas.getByRole("button", { name: "Box in the pipes in the bathroom" }));
    await expect(box(canvas, "Cut the plasterboard")).toBeChecked();
    await expect(box(canvas, "Paint the boxing")).toBeChecked();
  },
};

export const ChangeFailed: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(box(canvas, "Hang the curtain rods"));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      taskMessages.changeFailed("Hang the curtain rods"),
    );
    await expect(box(canvas, "Hang the curtain rods")).not.toBeChecked();
    await expect(total(canvas)).toHaveTextContent("1 380–1 750 zł");
  },
};

export const EstimateAdded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "2 tasks without an estimate" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Min" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: "Max" }), "200{Enter}");
    await waitFor(() => expect(total(canvas)).toHaveTextContent("1 530–1 950 zł"));
    await expect(
      canvas.getByRole("button", { name: "Add estimate for “Fix the dripping kitchen tap”" }),
    ).toHaveFocus();
  },
};
