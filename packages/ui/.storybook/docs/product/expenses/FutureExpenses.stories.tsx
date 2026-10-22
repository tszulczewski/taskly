import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { FutureExpenses, type FutureExpensesProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer } from "../../../blocks/fake-api";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import {
  futureExpenses,
  polishExpensesText,
  polishProgressTasks,
  progressTasks,
  validateEstimate,
} from "../../../blocks/task-data";

const progress = futureExpenses(progressTasks);
const polish = futureExpenses(polishProgressTasks);

const meta = {
  title: "Product/Expenses/Future expenses",
  component: FutureExpenses,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: {
    status: "ready",
    total: progress.total,
    unestimated: progress.unestimated,
    validate: validateEstimate,
    onAddEstimate: fn(answer({ ok: true })) as FutureExpensesProps["onAddEstimate"],
    onRetry: fn(),
  },
  argTypes: {
    unestimated: { control: "object" },
    validate: { control: false },
    onAddEstimate: { control: false },
    onRetry: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof FutureExpenses>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent("Future expenses1 380–1 750 zł");
    await expect(
      canvas.getByRole("button", { name: "2 tasks without an estimate" }),
    ).toHaveAttribute("aria-expanded", "false");
  },
};

export const AllEstimated: Story = { args: { unestimated: [] } };

export const NoEstimates: Story = { args: { total: null } };

export const Loading: Story = { args: { status: "loading" } };

export const LoadFailed: Story = {
  args: { status: "error" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load future expenses.");
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

export const LongAmounts: Story = {
  args: { total: "1\u00a0245\u00a0000,50–1\u00a0560\u00a0300\u00a0zł" },
};

export const States: Story = {
  render: (args) => (
    <Stack>
      <StateRow
        title="Future expenses"
        cells={[
          {
            state: "Range, some tasks without an estimate",
            node: <FutureExpenses {...args} />,
            wide: true,
          },
          {
            state: "Every open task estimated",
            node: <FutureExpenses {...args} unestimated={[]} />,
            wide: true,
          },
          {
            state: "No estimates yet",
            node: <FutureExpenses {...args} total={null} />,
            wide: true,
          },
          {
            state: "Loading (first load)",
            node: <FutureExpenses {...args} status="loading" />,
            wide: true,
          },
          { state: "Load failed", node: <FutureExpenses {...args} status="error" />, wide: true },
          {
            state: "Trying again",
            node: <FutureExpenses {...args} status="error" retrying />,
            wide: true,
          },
        ]}
      />
    </Stack>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { total: "1\u00a0245\u00a0000,50–1\u00a0560\u00a0300\u00a0zł" },
  render: (args) => (
    <Narrow>
      <FutureExpenses {...args} />
    </Narrow>
  ),
};

export const Polish: Story = {
  args: { total: polish.total, unestimated: polish.unestimated, text: polishExpensesText },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "1 zadanie bez szacunku" }),
    );
  },
};

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: <FutureExpenses {...args} />,
        why: "One line under the list's name; the tasks it leaves out are named right under it (P04, Luki 9).",
      }}
      bad={{
        node: (
          <div className="grid grid-cols-2 gap-group">
            {["ESTIMATED", "SPENT", "BUDGET LEFT", "TASKS DONE"].map((label) => (
              <div key={label} className="rounded-surface border border-control p-inset">
                <p className="text-meta text-muted">{label}</p>
                <p className="text-heading font-strong">—</p>
              </div>
            ))}
          </div>
        ),
        why: "Tiles with capital labels: a dashboard the owner rejected, and three of them do not exist in version 1 (R02.7, P12).",
      }}
    />
  ),
};
