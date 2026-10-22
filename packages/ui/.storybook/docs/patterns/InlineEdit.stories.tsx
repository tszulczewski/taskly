import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { curtainRods, pantry, sealBath, taskMessages } from "../../blocks/task-data";

/** Editing a task where it stands (spec E01, Edit). */
const meta = {
  title: "Patterns/Inline edit",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: [curtainRods, pantry, sealBath], delay: 300 },
  argTypes: { initialTasks: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const edit = async (canvas: Canvas, body: Canvas, title: string) => {
  await userEvent.click(canvas.getByRole("button", { name: `More actions for “${title}”` }));
  await userEvent.click(body.getByRole("menuitem", { name: "Edit" }));
};

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await edit(canvas, within(canvasElement.ownerDocument.body), pantry.title);
    await expect(canvas.getByLabelText("Title")).toHaveFocus();
  },
};

export const Saved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await edit(canvas, within(canvasElement.ownerDocument.body), curtainRods.title);
    await userEvent.clear(canvas.getByLabelText("Max"));
    await userEvent.type(canvas.getByLabelText("Max"), "300{Enter}");
    await waitFor(() => expect(canvas.getByText("180–300 zł")).toBeVisible());
    await expect(
      canvas.getByRole("button", { name: `More actions for “${curtainRods.title}”` }),
    ).toHaveFocus();
  },
};

export const Cancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await edit(canvas, within(canvasElement.ownerDocument.body), sealBath.title);
    await userEvent.type(canvas.getByLabelText("Title"), " and the sink{Escape}");
    await expect(canvas.getByText(sealBath.title)).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: `More actions for “${sealBath.title}”` }),
    ).toHaveFocus();
  },
};

export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await edit(canvas, within(canvasElement.ownerDocument.body), pantry.title);
    await userEvent.clear(canvas.getByLabelText("Max"));
    await userEvent.type(canvas.getByLabelText("Max"), "500{Enter}");
    await expect(canvas.getByText(taskMessages.minOverMax)).toBeVisible();
  },
};

export const Refused: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await edit(canvas, within(canvasElement.ownerDocument.body), sealBath.title);
    await userEvent.type(canvas.getByLabelText("Title"), " and the sink{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.saveFailed);
    await expect(canvas.getByLabelText("Title")).toHaveValue(`${sealBath.title} and the sink`);
  },
};
