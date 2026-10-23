import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { DragHandle } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { OrderDemo } from "../../../blocks/OrderDemo";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import {
  curtainRods,
  paintCeiling,
  polishTaskText,
  polishTasks,
  sealBath,
  someTasks,
} from "../../../blocks/task-data";

const meta = {
  title: "Product/Tasks/Drag handle",
  component: DragHandle,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  args: { label: `Move “${sealBath.title}”` },
  argTypes: { disabled: { control: "boolean" } },
} satisfies Meta<typeof DragHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

const titles = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole("list", { name: "Tasks" }))
    .getAllByRole("listitem")
    .map((row) => row.querySelector("[data-slot='task-title']")?.textContent);

export const Playground: Story = {};

/** The handle in its row: Space picks the row up, arrows move it, Space drops it. */
export const InTheList: Story = {
  render: () => <OrderDemo initialTasks={someTasks} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: `Move “${curtainRods.title}”` }).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(titles(canvasElement).slice(0, 2)).toEqual([curtainRods.title, paintCeiling.title]),
    );
    await expect(canvas.getByRole("button", { name: `Move “${curtainRods.title}”` })).toHaveFocus();
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const States: Story = {
  render: (args) => (
    <Stack>
      <StateRow
        title="Drag handle"
        cells={[
          { state: "Default (hover: raised tone)", node: <DragHandle {...args} /> },
          { state: "Pending row: disabled", node: <DragHandle {...args} disabled /> },
        ]}
      />
    </Stack>
  ),
};

/** Below 640px there is no handle: a long press on the row, or Move up / Move down (G2). */
export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <OrderDemo initialTasks={someTasks} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    // Hidden from everyone, not only from sight: the menu offers the same moves (G2).
    await expect(
      within(canvasElement).queryByRole("button", { name: `Move “${sealBath.title}”` }),
    ).toBeNull();
  },
};

export const Polish: Story = {
  render: () => <OrderDemo initialTasks={polishTasks} text={polishTaskText} />,
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <div className="w-full">
            <OrderDemo initialTasks={[sealBath, curtainRods]} />
          </div>
        ),
        why: "One grip at the start of the row, named with the task; Move up and Move down wait in “…”.",
      }}
      bad={{
        node: (
          <div className="flex items-center gap-group">
            <span className="font-strong">{sealBath.title}</span>
            <button type="button" aria-label="Up" className="text-muted">
              ▲
            </button>
            <button type="button" aria-label="Down" className="text-muted">
              ▼
            </button>
          </div>
        ),
        why: "Arrow buttons on every row crowd the list and add two Tab stops per row; icons stand only for known gestures (Luki 7).",
      }}
    />
  ),
};
