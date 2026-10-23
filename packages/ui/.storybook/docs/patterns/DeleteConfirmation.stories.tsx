import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { curtainRods, paintCeiling, sealBath } from "../../blocks/task-data";

/** Asking before something is deleted for good (spec E01, Delete). */
const meta = {
  title: "Patterns/Delete confirmation",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: [paintCeiling, curtainRods, sealBath], delay: 300 },
  argTypes: { initialTasks: { control: false }, text: { control: false } },
} satisfies Meta<typeof TaskScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const askToDelete = async (canvas: Canvas, body: Canvas, title: string) => {
  await userEvent.click(canvas.getByRole("button", { name: `More actions for “${title}”` }));
  await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));
  return body.findByRole("alertdialog");
};

export const Asked: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await askToDelete(within(canvasElement), body, paintCeiling.title);
    await expect(dialog).toHaveAccessibleName(
      "Delete “Paint the bathroom ceiling” and its 3 subtasks?",
    );
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  },
};

export const Cancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await askToDelete(canvas, within(canvasElement.ownerDocument.body), sealBath.title);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: `More actions for “${sealBath.title}”` }),
      ).toHaveFocus(),
    );
  },
};

export const Deleted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await askToDelete(canvas, body, curtainRods.title);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(canvas.queryByText(curtainRods.title)).toBeNull());
    await waitFor(() => expect(canvas.getByRole("list", { name: "Tasks" })).toHaveFocus());
  },
};

export const Failed: Story = {
  args: { server: "fail" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await askToDelete(within(canvasElement), body, sealBath.title);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Could not delete the task. Try again.",
    );
  },
};
