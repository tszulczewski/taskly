import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  UnestimatedTasks,
  type UnestimatedItem,
  type UnestimatedTasksProps,
} from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, never } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import {
  longTask,
  polishExpensesText,
  taskMessages,
  validateEstimate,
} from "../../../blocks/task-data";

const seal: UnestimatedItem = { id: "seal", title: "Seal the bath" };
const tap: UnestimatedItem = { id: "tap", title: "Fix the dripping kitchen tap" };
const mirror: UnestimatedItem = { id: "mirror", title: "Mount the bathroom mirror" };
/** Subtasks without an estimate, named with their task (D27). */
const tiles: UnestimatedItem = { id: "tiles", title: "Tiles", taskTitle: "Bathroom tiles" };
const grout: UnestimatedItem = { id: "grout", title: "Grout", taskTitle: "Bathroom tiles" };

/** An item leaves the list once the server has its estimate, as in the app. */
function Demo(props: UnestimatedTasksProps) {
  const [items, setItems] = useState(props.items);
  return (
    <UnestimatedTasks
      {...props}
      items={items}
      onAddEstimate={async (id, values) => {
        const result = await props.onAddEstimate(id, values);
        if (result.ok) setItems((list) => list.filter((item) => item.id !== id));
        return result;
      }}
    />
  );
}

const meta = {
  title: "Product/Expenses/Unestimated tasks",
  component: UnestimatedTasks,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  render: (args) => <Demo {...args} />,
  args: {
    items: [seal, tap, mirror],
    validate: validateEstimate,
    onAddEstimate: fn(answer({ ok: true })) as UnestimatedTasksProps["onAddEstimate"],
  },
  argTypes: {
    items: { control: "object" },
    validate: { control: false },
    onAddEstimate: { control: false },
    onEmptied: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof UnestimatedTasks>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const open = (canvas: Canvas) =>
  userEvent.click(canvas.getByRole("button", { name: "3 tasks without an estimate" }));

export const Collapsed: Story = {};

export const Opened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await expect(
      canvas.getByText("They are not counted in future expenses until they have an estimate."),
    ).toBeVisible();
  },
};

export const AddingEstimate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await expect(canvas.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  },
};

export const FieldErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "300");
    await userEvent.type(canvas.getByRole("textbox", { name: /^up to/ }), "200{Enter}");
    await expect(await canvas.findByText(taskMessages.upToBelowAmount)).toBeVisible();
  },
};

export const Saving: Story = {
  args: { onAddEstimate: fn(never) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: /^up to/ }), "200{Enter}");
    await expect(canvas.getByRole("button", { name: "Saving…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const Saved: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    // One amount is enough: an exact price (R18).
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "150{Enter}");
    await expect(args.onAddEstimate).toHaveBeenCalledWith("seal", { amount: "150", upTo: "" });
    // The item has left the list; focus moves to the next one.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Add estimate for “Fix the dripping kitchen tap”" }),
      ).toHaveFocus(),
    );
  },
};

export const SaveFailed: Story = {
  args: { onAddEstimate: fn(answer({ ok: false, formError: taskMessages.estimateFailed })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: /^up to/ }), "200{Enter}");
    await expect(await canvas.findByText(taskMessages.estimateFailed)).toBeVisible();
  },
};

export const OneTask: Story = { args: { items: [seal] } };

/**
 * A task with subtasks is never listed itself: its amounts come from them (R12). Its subtasks
 * without an estimate are, named with the task, each with its own "Add estimate" (D27).
 */
export const Subtasks: Story = {
  args: { items: [seal, tiles, grout] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "1 task and 2 subtasks without an estimate" }),
    );
    await expect(canvas.getByText("Tiles").closest("li")).toHaveTextContent(
      "Tiles · Bathroom tilesAdd estimate",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Add estimate for “Tiles” in “Bathroom tiles”" }),
    );
    await expect(
      canvas.getByRole("group", { name: "Estimate for “Tiles” in “Bathroom tiles”" }),
    ).toBeVisible();
    await userEvent.type(canvas.getByRole("textbox", { name: "Amount" }), "600{Enter}");
    await expect(args.onAddEstimate).toHaveBeenCalledWith("tiles", { amount: "600", upTo: "" });
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Add estimate for “Grout” in “Bathroom tiles”" }),
      ).toHaveFocus(),
    );
    await expect(
      canvas.getByRole("button", { name: "1 task and 1 subtask without an estimate" }),
    ).toBeVisible();
  },
};

export const LongTitle: Story = {
  args: {
    items: [
      { id: longTask.id, title: longTask.title },
      { id: "long-sub", title: "Buy the grout", taskTitle: longTask.title },
      seal,
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "2 tasks and 1 subtask without an estimate",
      }),
    );
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { items: [{ id: longTask.id, title: longTask.title }, seal, tap] },
  render: (args) => (
    <Narrow>
      <Demo {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
  },
};

export const Polish: Story = {
  args: {
    items: [
      { id: "pl-wanna", title: "Uszczelnić wannę silikonem sanitarnym" },
      { id: "pl-kran", title: "Naprawić cieknący kran w kuchni" },
      { id: "pl-plytki", title: "Płytki", taskTitle: "Płytki w łazience" },
    ],
    text: polishExpensesText,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "2 zadania i 1 podzadanie bez szacunku" }),
    );
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Dodaj szacunek dla „Uszczelnić wannę silikonem sanitarnym”",
      }),
    );
  },
};

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: <Demo {...args} />,
        why: "Collapsed under the total, with the count; open, it says why and lets the owner add the amounts in place (Luki 9, decision I4).",
      }}
      bad={{
        node: <p className="text-muted">These count as zero until they have an estimate.</p>,
        why: "“Count as zero” suggests they are free; the rule is that they are left out (R10). And nothing says which tasks or subtasks.",
      }}
    />
  ),
};
