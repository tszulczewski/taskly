import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { FormField, Input, QuickAdd, type QuickAddProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, never, offline } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import { polishTaskText, taskMessages, validateTask } from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Quick add",
  component: QuickAdd,
  decorators: [withDocFrame],
  args: {
    validate: validateTask,
    onSubmit: fn(answer({ ok: true })) as QuickAddProps["onSubmit"],
  },
  argTypes: {
    validate: { control: false },
    onSubmit: { control: false },
    onCancel: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof QuickAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

const empty = { description: "", min: "", max: "" };

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Hang the curtain rods{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({ title: "Hang the curtain rods", ...empty });
    // Confirmed: the field is empty again and keeps focus for the next task.
    await waitFor(() => expect(canvas.getByLabelText("New task")).toHaveValue(""));
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
  },
};

export const WithDetails: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Details" }));
    await userEvent.type(canvas.getByLabelText("New task"), "Paint the bathroom ceiling");
    await userEvent.type(canvas.getByLabelText(/^Description/), "Two coats of white matt.");
    await userEvent.type(canvas.getByLabelText("Min"), "1 200");
    await userEvent.type(canvas.getByLabelText("Max"), "1 500,50");
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: "Paint the bathroom ceiling",
      description: "Two coats of white matt.",
      min: "1 200",
      max: "1 500,50",
    });
  },
};

export const MissingTitle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
    await expect(canvas.getByText(taskMessages.title)).toBeVisible();
  },
};

export const MinOverMax: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Tile the floor");
    await userEvent.click(canvas.getByRole("button", { name: "Details" }));
    await userEvent.type(canvas.getByLabelText("Min"), "2 500");
    await userEvent.type(canvas.getByLabelText("Max"), "2 000");
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(canvas.getByLabelText("Max")).toHaveFocus();
    await expect(canvas.getByText(taskMessages.minOverMax)).toBeVisible();
  },
};

export const ErrorInClosedDetails: Story = {
  args: { onSubmit: answer({ ok: false, fieldErrors: { max: taskMessages.minOverMax } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the tap{Enter}");
    // A server error on a hidden field opens Details by itself, so it is never hidden.
    await waitFor(() => expect(canvas.getByLabelText("Max")).toHaveFocus());
    await expect(canvas.getByText(taskMessages.minOverMax)).toBeVisible();
  },
};

export const Pending: Story = {
  args: { onSubmit: fn(never) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Seal the bath{Enter}");
    await expect(canvas.getByRole("button", { name: "Adding…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await userEvent.type(canvas.getByLabelText("New task"), "{Enter}");
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
  },
};

export const AddFailed: Story = {
  args: { onSubmit: answer({ ok: false, formError: taskMessages.addFailed }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Seal the bath{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.addFailed);
    await expect(canvas.getByLabelText("New task")).toHaveValue("Seal the bath");
  },
};

export const Offline: Story = {
  args: { onSubmit: offline },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Seal the bath{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
  },
};

export const Subtask: Story = {
  args: { onCancel: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New subtask"), "Buy silicone{Escape}");
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <QuickAdd {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Details" }));
    await userEvent.type(canvas.getByLabelText("Min"), "45 000");
    await userEvent.type(canvas.getByLabelText("Max"), "62 500,50");
  },
};

export const Polish: Story = {
  args: { text: polishTaskText },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Szczegóły" }));
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <QuickAdd validate={validateTask} onSubmit={answer({ ok: true })} />,
        why: "Only the title is needed; description and estimate wait under Details (A03).",
      }}
      bad={{
        node: (
          <div className="flex w-full flex-col gap-group">
            <FormField label="Title">{(control) => <Input {...control} />}</FormField>
            <FormField label="Room">{(control) => <Input {...control} />}</FormField>
            <FormField label="Min">{(control) => <Input {...control} suffix="zł" />}</FormField>
            <FormField label="Max">{(control) => <Input {...control} suffix="zł" />}</FormField>
          </div>
        ),
        why: "Many required fields before a task exists is the “million details” the owners rejected (A03).",
      }}
    />
  ),
};
