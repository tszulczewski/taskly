import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { curtainRods, sealBath, taskMessages } from "../../blocks/task-data";

/** Capturing tasks one after another (spec E01, Quick add and After an add; R02.9, A03). */
const meta = {
  title: "Patterns/Quick capture",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: [curtainRods, sealBath], delay: 300 },
  argTypes: { initialTasks: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const capture = async (canvas: Canvas, title: string) => {
  await userEvent.type(canvas.getByLabelText("New task"), `${title}{Enter}`);
  await waitFor(() => expect(canvas.getByLabelText("New task")).toHaveValue(""));
};

export const Ready: Story = {};

export const SeveralInARow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await capture(canvas, "Buy curtain hooks");
    await capture(canvas, "Mount the bathroom mirror");
    await capture(canvas, "Fix the squeaky stair");
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
    const rows = within(canvas.getByRole("list", { name: "Tasks" })).getAllByRole("listitem");
    // Appended at the end, in the order they were captured.
    await expect(rows.at(-1)).toHaveTextContent("Fix the squeaky stair");
  },
};

export const WithEstimate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Amount"), "250");
    await userEvent.type(canvas.getByLabelText(/^up to/), "400");
    await capture(canvas, "Install the extractor fan");
    await expect(canvas.getByText("250–400 zł")).toBeVisible();
  },
};

export const Refused: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Buy curtain hooks{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.addFailed);
    await expect(canvas.getByLabelText("New task")).toHaveValue("Buy curtain hooks");
  },
};
