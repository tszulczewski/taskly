import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Markers, PlaceTag, SubtaskProgress } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { bathroom, hall, kitchen } from "../../../blocks/place-data";
import { polishTaskText } from "../../../blocks/task-data";

/** The meta line of a row: places, markers, then the progress (Luki 6). */
function MetaLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">{children}</span>
  );
}

const meta = {
  title: "Product/Tasks/Subtask progress",
  component: SubtaskProgress,
  decorators: [withDocFrame],
  render: (args) => (
    <MetaLine>
      <SubtaskProgress {...args} />
    </MetaLine>
  ),
  args: { done: 1, total: 3 },
  argTypes: { text: { control: false }, label: { control: false } },
} satisfies Meta<typeof SubtaskProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1/3")).toHaveAttribute("aria-hidden", "true");
    await expect(canvas.getByText("1 of 3 subtasks completed")).toBeInTheDocument();
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Subtask progress"
        cells={[
          {
            state: "None done",
            node: (
              <MetaLine>
                <SubtaskProgress done={0} total={3} />
              </MetaLine>
            ),
          },
          {
            state: "Some done",
            node: (
              <MetaLine>
                <SubtaskProgress done={1} total={3} />
              </MetaLine>
            ),
          },
          {
            state: "All done (the task stays open, R11)",
            node: (
              <MetaLine>
                <SubtaskProgress done={3} total={3} />
              </MetaLine>
            ),
          },
          {
            state: "One subtask",
            node: (
              <MetaLine>
                <SubtaskProgress done={0} total={1} />
              </MetaLine>
            ),
          },
          {
            state: "Many",
            node: (
              <MetaLine>
                <SubtaskProgress done={12} total={30} />
              </MetaLine>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

/** Last in the meta line, after places and markers (Luki 6). */
export const InTheMetaLine: Story = {
  render: () => (
    <MetaLine>
      <PlaceTag place={bathroom} />
      <Markers important />
      <SubtaskProgress done={1} total={3} />
    </MetaLine>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <MetaLine>
        <PlaceTag place={bathroom} />
        <PlaceTag place={kitchen} />
        <PlaceTag place={hall} />
        <Markers important urgent />
        <SubtaskProgress done={2} total={5} />
      </MetaLine>
    </Narrow>
  ),
};

export const Polish: Story = {
  args: { done: 2, total: 5, label: polishTaskText.subtaskProgressLabel },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Ukończone podzadania: 2 z 5"),
    ).toBeInTheDocument();
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <MetaLine>
            <Markers important />
            <SubtaskProgress done={1} total={3} />
          </MetaLine>
        ),
        why: "Quiet “1/3” in the meta line; a screen reader hears “1 of 3 subtasks completed”.",
      }}
      bad={{
        node: (
          <span className="flex items-center gap-group text-meta">
            <span className="h-dot w-1/2 rounded-control bg-action-primary" />
            <span>33%</span>
          </span>
        ),
        why: "A progress bar in every row competes with the order of the list and repeats a dashboard (P04, P12).",
      }}
    />
  ),
};
