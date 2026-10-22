import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { EstimateRange } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { curtainRods, longTask, wholeBathroom } from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Estimate range",
  component: EstimateRange,
  decorators: [withDocFrame],
  args: { value: curtainRods.estimate },
  argTypes: { value: { control: "text" } },
} satisfies Meta<typeof EstimateRange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const NoEstimate: Story = {
  args: { value: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("No estimate")).toHaveClass("text-muted");
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Estimate range"
        cells={[
          { state: "Range", node: <EstimateRange value={curtainRods.estimate} /> },
          { state: "Short range", node: <EstimateRange value={longTask.estimate} /> },
          { state: "Long amounts, grosze", node: <EstimateRange value={wholeBathroom.estimate} /> },
          { state: "No estimate", node: <EstimateRange value={null} /> },
        ]}
      />
    </Stack>
  ),
};

export const Column: Story = {
  render: () => (
    <div className="flex max-w-measure flex-col items-end gap-inline">
      <EstimateRange value={curtainRods.estimate} />
      <EstimateRange value={longTask.estimate} />
      <EstimateRange value={wholeBathroom.estimate} />
      <EstimateRange value={null} />
    </div>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <EstimateRange value={wholeBathroom.estimate} />
    </Narrow>
  ),
};

export const Polish: Story = { args: { value: null, emptyText: "Bez szacunku" } };

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <EstimateRange value="1 200–1 500 zł" />,
        why: "One range in PLN, digits of equal width, so amounts line up in the column.",
      }}
      bad={{
        node: <span>Est. 1200 zł – 1500 zł</span>,
        why: "A label, the currency twice and no grouping make amounts hard to compare (tokens rule 5).",
      }}
    />
  ),
};
