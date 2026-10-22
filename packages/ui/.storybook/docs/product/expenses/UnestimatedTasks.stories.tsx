import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  UnestimatedTasks,
  type UnestimatedTask,
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

const seal: UnestimatedTask = { id: "seal", title: "Seal the bath" };
const tap: UnestimatedTask = { id: "tap", title: "Fix the dripping kitchen tap" };
const mirror: UnestimatedTask = { id: "mirror", title: "Mount the bathroom mirror" };

/** A task leaves the list once the server has its estimate, as in the app. */
function Demo(props: UnestimatedTasksProps) {
  const [tasks, setTasks] = useState(props.tasks);
  return (
    <UnestimatedTasks
      {...props}
      tasks={tasks}
      onAddEstimate={async (id, values) => {
        const result = await props.onAddEstimate(id, values);
        if (result.ok) setTasks((list) => list.filter((task) => task.id !== id));
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
    tasks: [seal, tap, mirror],
    validate: validateEstimate,
    onAddEstimate: fn(answer({ ok: true })) as UnestimatedTasksProps["onAddEstimate"],
  },
  argTypes: {
    tasks: { control: "object" },
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
    await expect(canvas.getByRole("textbox", { name: "Min" })).toHaveFocus();
  },
};

export const FieldErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Min" }), "300");
    await userEvent.type(canvas.getByRole("textbox", { name: "Max" }), "200{Enter}");
    await expect(await canvas.findByText(taskMessages.minOverMax)).toBeVisible();
  },
};

export const Saving: Story = {
  args: { onAddEstimate: fn(never) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await open(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Min" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: "Max" }), "200{Enter}");
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
    await userEvent.type(canvas.getByRole("textbox", { name: "Min" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: "Max" }), "200{Enter}");
    await expect(args.onAddEstimate).toHaveBeenCalledWith("seal", { min: "150", max: "200" });
    // The task has left the list; focus moves to the next one.
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
    await userEvent.type(canvas.getByRole("textbox", { name: "Min" }), "150");
    await userEvent.type(canvas.getByRole("textbox", { name: "Max" }), "200{Enter}");
    await expect(await canvas.findByText(taskMessages.estimateFailed)).toBeVisible();
  },
};

export const OneTask: Story = { args: { tasks: [seal] } };

export const LongTitle: Story = {
  args: { tasks: [{ id: longTask.id, title: longTask.title }, seal] },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "2 tasks without an estimate" }),
    );
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { tasks: [{ id: longTask.id, title: longTask.title }, seal, tap] },
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
    tasks: [
      { id: "pl-wanna", title: "Uszczelnić wannę silikonem sanitarnym" },
      { id: "pl-kran", title: "Naprawić cieknący kran w kuchni" },
    ],
    text: polishExpensesText,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "2 zadania bez szacunku" }));
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
        why: "“Count as zero” suggests they are free; the rule is that they are left out (R10). And nothing says which tasks.",
      }}
    />
  ),
};
