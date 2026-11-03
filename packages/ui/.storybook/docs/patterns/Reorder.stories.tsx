import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withDocFrame } from "../../blocks/DocFrame";
import { TaskScreen } from "../../blocks/TaskScreen";
import { organizedPlaces } from "../../blocks/place-data";
import { organizedTasks, taskMessages } from "../../blocks/task-data";

/** The reorder pattern on the task list (E02-S01, decisions G1–G2). Every state is its own story. */
const meta = {
  title: "Patterns/Reorder",
  component: TaskScreen,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { initialTasks: organizedTasks, initialPlaces: organizedPlaces },
  argTypes: {
    initialTasks: { control: false },
    initialPlaces: { control: false },
    text: { control: false },
    placeText: { control: false },
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
const handle = (canvas: Canvas, title: string) =>
  canvas.getByRole("button", { name: `Move “${title}”` });
const menuItem = (canvasElement: HTMLElement, name: string) =>
  userEvent.click(within(canvasElement.ownerDocument.body).getByRole("menuitem", { name }));

export const Ready: Story = {};

export const PickedUp: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    handle(canvas, "Hang the curtain rods").focus();
    await userEvent.keyboard(" ");
    await expect(canvasElement.querySelector("[data-dragging]")).not.toBeNull();
    // Put it back, so the next story's keys are not taken by this drag.
    await userEvent.keyboard("{Escape}");
  },
};

export const MovedWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    handle(canvas, "Hang the curtain rods").focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(titles(canvas).slice(0, 3)).toEqual([
        "Seal the bath",
        "Hang the curtain rods",
        "Paint the bathroom ceiling",
      ]),
    );
  },
};

export const Cancelled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = titles(canvas);
    handle(canvas, "Hang the curtain rods").focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvasElement.querySelector("[data-dragging]")).toBeNull());
    await expect(titles(canvas)).toEqual(before);
  },
};

export const MovedFromMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "More actions for “Finish the pantry shelves”" }),
    );
    await menuItem(canvasElement, "Move up");
    await expect(titles(canvas).slice(-2)).toEqual([
      "Finish the pantry shelves",
      "Replace the light switches",
    ]);
  },
};

export const SubtasksInTheirTask: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Paint the bathroom ceiling" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "More actions for “Mask the lamp and the sockets”" }),
    );
    await menuItem(canvasElement, "Move up");
    await expect(titles(canvas, "Subtasks of “Paint the bathroom ceiling”")).toEqual([
      "Fill the cracks above the window",
      "Mask the lamp and the sockets",
      "Buy paint and rollers",
    ]);
  },
};

export const MoveFailed: Story = {
  args: { server: "fail", delay: 300 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = titles(canvas);
    await userEvent.click(
      canvas.getByRole("button", { name: "More actions for “Hang the curtain rods”" }),
    );
    await menuItem(canvasElement, "Move down");
    // At once in the new place, then back with the reason in the row.
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      taskMessages.moveFailed("Hang the curtain rods"),
    );
    await expect(titles(canvas)).toEqual(before);
  },
};

/** Below 640px: no handle; a long press on the row or Move up / Move down (decision G2). */
export const Phone: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Move “Seal the bath”" })).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "More actions for “Seal the bath”" }),
    ).toBeVisible();
  },
};
