import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Markers, PlaceTag } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { bathroom, bedroom, hall, kitchen, livingRoom } from "../../../blocks/place-data";

/** The meta line of a row: places, then markers (Luki 6). */
function MetaLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">{children}</span>
  );
}

const meta = {
  title: "Product/Tasks/Markers",
  component: Markers,
  decorators: [withDocFrame],
  render: (args) => (
    <MetaLine>
      <Markers {...args} />
    </MetaLine>
  ),
  args: { important: true, urgent: true },
} satisfies Meta<typeof Markers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Important")).toBeVisible();
    await expect(canvas.getByText("Urgent")).toBeVisible();
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Markers"
        cells={[
          {
            state: "Important",
            node: (
              <MetaLine>
                <Markers important />
              </MetaLine>
            ),
          },
          {
            state: "Urgent",
            node: (
              <MetaLine>
                <Markers urgent />
              </MetaLine>
            ),
          },
          {
            state: "Both",
            node: (
              <MetaLine>
                <Markers important urgent />
              </MetaLine>
            ),
          },
          {
            state: "Neither: nothing",
            node: (
              <MetaLine>
                <Markers />
              </MetaLine>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

/** After the places, before the subtask count (Luki 6). */
export const InTheMetaLine: Story = {
  render: () => (
    <MetaLine>
      <PlaceTag place={bathroom} />
      <PlaceTag place={kitchen} />
      <Markers important urgent />
      <span>3 subtasks</span>
    </MetaLine>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <MetaLine>
        {[bathroom, kitchen, hall, bedroom, livingRoom].map((place) => (
          <PlaceTag key={place.id} place={place} />
        ))}
        <Markers important urgent />
      </MetaLine>
    </Narrow>
  ),
};

export const Polish: Story = { args: { importantText: "Ważne", urgentText: "Pilne" } };

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <MetaLine>
            <PlaceTag place={bathroom} />
            <Markers important urgent />
          </MetaLine>
        ),
        why: "Two quiet words beside the places; the order of the list still leads.",
      }}
      bad={{
        node: (
          <span className="flex items-center gap-group">
            <span className="rounded-control border border-control px-control-x text-meta font-strong text-danger">
              URGENT!
            </span>
          </span>
        ),
        why: "A red badge shouts and uses colour as the signal; markers are words in muted text (Luki 4).",
      }}
    />
  ),
};
