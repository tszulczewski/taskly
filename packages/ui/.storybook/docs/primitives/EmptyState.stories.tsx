import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button, EmptyState, Surface, TextAction } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Empty state",
  component: EmptyState,
  decorators: [withDocFrame],
  args: { title: "No tasks yet.", children: "Add the first thing you need to do." },
  argTypes: {
    title: { control: "text" },
    children: { control: "text" },
    action: { control: false },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Surface>
      <EmptyState {...args} />
    </Surface>
  ),
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Words only: the next step is already on screen (quick add above)"
        cells={[
          {
            state: "task list",
            wide: true,
            node: (
              <Surface>
                <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>
              </Surface>
            ),
          },
        ]}
      />
      <StateRow
        title="With an action: the next step is elsewhere"
        cells={[
          {
            state: "tasks without an estimate",
            wide: true,
            node: (
              <Surface>
                <EmptyState
                  title="Every task has an estimate."
                  action={<TextAction>Show all tasks</TextAction>}
                >
                  The total includes all open tasks.
                </EmptyState>
              </Surface>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <StateRow
      title="An empty state is static; its action has its own states"
      cells={[
        {
          state: "shown",
          wide: true,
          node: (
            <Surface>
              <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>
            </Surface>
          ),
        },
      ]}
    />
  ),
};

const onAddPlace = fn();

export const ActionRuns: Story = {
  args: { action: undefined },
  render: (args) => (
    <Surface>
      <EmptyState
        {...args}
        title="No places yet."
        action={<Button onClick={onAddPlace}>Add a place</Button>}
      >
        Places group tasks by room.
      </EmptyState>
    </Surface>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Add a place" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(onAddPlace).toHaveBeenCalledOnce();
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <Surface>
        <EmptyState title="No tasks in this place yet.">
          Add a task from the list and choose this place for it, or add a new task here.
        </EmptyState>
      </Surface>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <Surface>
      <EmptyState title="Nie masz jeszcze zadań.">Dodaj pierwszą rzecz do zrobienia.</EmptyState>
    </Surface>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>,
        why: "Says plainly why it is empty and what to do next.",
      }}
      bad={{
        node: <EmptyState title="Nothing to see here!">Your journey starts now.</EmptyState>,
        why: "A cheerful slogan says neither why it is empty nor what to do (A02, Luki 5).",
      }}
    />
  ),
};
