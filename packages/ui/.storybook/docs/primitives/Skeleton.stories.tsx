import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Skeleton, Surface } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

function LoadingTasks({ rows = 3, label = "Loading tasks…" }: { rows?: number; label?: string }) {
  return (
    <Surface aria-busy="true" className="w-full">
      <span className="sr-only" role="status">
        {label}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex min-h-row flex-col justify-center gap-inline border-b border-divider px-inset last:border-b-0"
        >
          <Skeleton className={i % 2 ? "w-1/2" : "w-2/3"} />
          <Skeleton className="w-1/3" />
        </div>
      ))}
    </Surface>
  );
}

const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  decorators: [withDocFrame],
  args: { className: "w-1/2" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Text line (default height: one line)"
        cells={[{ state: "full row width", node: <Skeleton className="w-full" />, wide: true }]}
      />
      <StateRow
        title="Control (h-control)"
        cells={[
          {
            state: "a field still loading",
            node: <Skeleton className="h-control w-full" />,
            wide: true,
          },
        ]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <StateRow
      title="A skeleton has one state: shown, without motion (Luki 8)"
      cells={[{ state: "task list loading", node: <LoadingTasks />, wide: true }]}
    />
  ),
};

export const ListLoading: Story = {
  render: () => <LoadingTasks />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading tasks…");
    await expect(canvasElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    for (const bar of canvasElement.querySelectorAll('[data-slot="skeleton"]')) {
      await expect(bar).toHaveAttribute("aria-hidden", "true");
    }
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <LoadingTasks rows={5} />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => <LoadingTasks label="Wczytywanie zadań…" />,
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <LoadingTasks rows={2} />,
        why: "Bars in the shape of the rows that will appear, so nothing jumps when they load.",
      }}
      bad={{
        node: <Skeleton className="h-row w-full" />,
        why: "One big block says nothing about what is coming and shifts the layout.",
      }}
    />
  ),
};
