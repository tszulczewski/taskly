import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { TaskForm, type TaskFormProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, never } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import {
  longTask,
  paintCeiling,
  pantry,
  polishTaskText,
  polishTasks,
  taskMessages,
  validateTask,
} from "../../../blocks/task-data";
import type { TaskItem } from "../../../../src";

const valuesOf = (task: TaskItem) => ({
  title: task.title,
  amount: task.amount,
  upTo: task.upTo,
  description: task.description ?? "",
});
const upTo = /^up to/;

const meta = {
  title: "Product/Tasks/Task form",
  component: TaskForm,
  decorators: [withDocFrame],
  args: {
    initialValues: valuesOf(pantry),
    validate: validateTask,
    onSubmit: fn(answer({ ok: true })) as TaskFormProps["onSubmit"],
    onCancel: fn(),
    // Only the Playground takes focus, so the docs page does not jump to a later story.
    autoFocus: false,
  },
  argTypes: {
    validate: { control: false },
    onSubmit: { control: false },
    onCancel: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof TaskForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { autoFocus: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Title")).toHaveFocus();
    await userEvent.clear(canvas.getByLabelText(upTo));
    await userEvent.type(canvas.getByLabelText(upTo), "1 800{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...valuesOf(pantry), upTo: "1 800" });
  },
};

export const RemoveEstimate: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    // Clearing both amounts removes the estimate (spec E01, Edit).
    await userEvent.clear(canvas.getByLabelText("Amount"));
    await userEvent.clear(canvas.getByLabelText(upTo));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      ...valuesOf(pantry),
      amount: "",
      upTo: "",
    });
  },
};

export const ExactPrice: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    // One amount is an exact price, not an error (R18; it replaces "both amounts or neither").
    await userEvent.clear(canvas.getByLabelText(upTo));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ ...valuesOf(pantry), upTo: "" });
  },
};

export const UpToBelowAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText(upTo));
    await userEvent.type(canvas.getByLabelText(upTo), "500");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByLabelText(upTo)).toHaveFocus();
    await expect(canvas.getByText(taskMessages.upToBelowAmount)).toBeVisible();
  },
};

export const SumOfSubtasks: Story = {
  args: { initialValues: valuesOf(paintCeiling), summedEstimate: paintCeiling.estimate },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A task with subtasks takes its estimate from them: text, no amount fields (R12).
    await expect(canvas.queryByLabelText("Amount")).toBeNull();
    await expect(canvas.getByText("Change the amounts on the subtasks.")).toBeVisible();
  },
};

export const SumWithoutEstimates: Story = {
  args: { initialValues: valuesOf(paintCeiling), summedEstimate: null },
};

export const InvalidAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText("Amount"));
    await userEvent.type(canvas.getByLabelText("Amount"), "1e3");
    await userEvent.tab();
    await expect(canvas.getByText(taskMessages.amount)).toBeVisible();
  },
};

export const Saving: Story = {
  args: { onSubmit: fn(never) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Title"), " now{Enter}");
    await expect(canvas.getByRole("button", { name: "Saving…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeDisabled();
    // Escape does not cancel while saving: the result would be unknown.
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
  },
};

export const SaveFailed: Story = {
  args: { onSubmit: answer({ ok: false, formError: taskMessages.saveFailed }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Title"), " today{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.saveFailed);
    await expect(canvas.getByLabelText("Title")).toHaveValue(`${pantry.title} today`);
  },
};

export const Cancel: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Title"), "{Escape}");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).toHaveBeenCalledTimes(2);
  },
};

export const LongText: Story = { args: { initialValues: valuesOf(longTask) } };

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { initialValues: valuesOf(longTask) },
  render: (args) => (
    <Narrow>
      <TaskForm {...args} />
    </Narrow>
  ),
};

export const Polish: Story = {
  args: { initialValues: valuesOf(polishTasks[1] as TaskItem), text: polishTaskText },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <TaskForm
            initialValues={valuesOf(pantry)}
            validate={validateTask}
            onSubmit={answer({ ok: true })}
            onCancel={() => {}}
            autoFocus={false}
          />
        ),
        why: "Edit in place of the row, prefilled, so the list and the order stay in view (Q2).",
      }}
      bad={{
        node: (
          <p className="text-muted">
            A drawer or window over the list with the same fields and its own Save.
          </p>
        ),
        why: "Panels over the list were rejected: “too much separated windows and panels” (R02.6).",
      }}
    />
  ),
};
