import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  SortableGroup,
  Surface,
  TaskRow,
  defaultTaskText,
  type TaskRowProps,
} from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer } from "../../../blocks/fake-api";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { organizedPlaces, placeNameRule } from "../../../blocks/place-data";
import {
  curtainRods,
  organizedTasks,
  longTask,
  paintCeiling,
  pantry,
  polishProgressTasks,
  polishTaskText,
  polishTasks,
  progressTasks,
  sealBath,
  taskMessages,
  validateTask,
  wholeBathroom,
} from "../../../blocks/task-data";

/** A row always sits in the list's `<ul>` on one surface (R02.1). */
function InList(props: TaskRowProps) {
  return (
    <Surface asChild>
      <ul aria-label="Tasks">
        <TaskRow {...props} />
      </ul>
    </Surface>
  );
}

/** E02: in a sortable group, with markers and places turned on. */
const organized = {
  move: { up: fn(), down: null },
  onMove: fn(),
  onToggleMarker: fn(),
  places: {
    all: organizedPlaces,
    atLimit: false,
    validateName: placeNameRule(organizedPlaces),
    onToggle: fn(),
    onCreate: fn(answer({ ok: true })),
    onUpdate: fn(answer({ ok: true })),
    onDelete: fn(async () => true),
  },
} satisfies Partial<TaskRowProps>;

function InSortableList(props: TaskRowProps) {
  return (
    <SortableGroup
      items={[{ id: props.task.id, title: props.task.title }]}
      onMove={fn()}
      text={defaultTaskText}
    >
      <InList {...props} />
    </SortableGroup>
  );
}

const meta = {
  title: "Product/Tasks/Task row",
  component: TaskRow,
  decorators: [withDocFrame],
  parameters: { a11y: { context: "body" } },
  render: (args) => <InList {...args} />,
  args: {
    task: paintCeiling,
    validate: validateTask,
    onEdit: fn(answer({ ok: true })) as TaskRowProps["onEdit"],
    onAddSubtask: fn(answer({ ok: true })) as TaskRowProps["onAddSubtask"],
    onRequestDelete: fn(),
  },
  argTypes: {
    task: { control: "object" },
    validate: { control: false },
    onEdit: { control: false },
    onAddSubtask: { control: false },
    onRequestDelete: { control: false },
    move: { control: false },
    onMove: { control: false },
    onToggleMarker: { control: false },
    onToggleComplete: { control: false },
    places: { control: false },
    text: { control: false },
  },
} satisfies Meta<typeof TaskRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const subtaskArgs = { onAddSubtask: undefined };

/** E03: the checkbox and "1/3" (decisions I3, 2026-10-22). */
const completion = { onToggleComplete: fn() } satisfies Partial<TaskRowProps>;
const [, inProgress, , , pantryDone, pipesDone] = progressTasks as [
  TaskRowProps["task"],
  TaskRowProps["task"],
  TaskRowProps["task"],
  TaskRowProps["task"],
  TaskRowProps["task"],
  TaskRowProps["task"],
];

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(paintCeiling.description as string)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: paintCeiling.title }));
    await expect(canvas.getByText(paintCeiling.description as string)).toBeVisible();
    await expect(
      canvas.getByRole("list", { name: `Subtasks of “${paintCeiling.title}”` }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add subtask" })).toBeVisible();
  },
};

export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const title = within(canvasElement).getByRole("button", { name: paintCeiling.title });
    title.focus();
    await expect(title).toHaveFocus();
    // The focus layer reaches space-inline past the text on both sides (decision M3).
    const layer = getComputedStyle(title, "::after");
    const probe = canvasElement.appendChild(document.createElement("div"));
    probe.style.width = "var(--space-inline)";
    const reach = `-${getComputedStyle(probe).width}`;
    probe.remove();
    await expect(layer.left).toBe(reach);
    await expect(layer.right).toBe(reach);
    await expect(layer.outlineStyle).toBe("solid");
  },
};

export const NoEstimateNoDescription: Story = { args: { task: sealBath } };

export const Subtask: Story = {
  args: { task: (paintCeiling.subtasks ?? [])[1], ...subtaskArgs },
};

export const SubtaskWithoutDescription: Story = {
  args: { task: (paintCeiling.subtasks ?? [])[0], ...subtaskArgs },
  play: async ({ canvasElement }) => {
    // Nothing to open: no arrow, the title lines up with the others (decision F5).
    await expect(
      within(canvasElement).queryByRole("button", { name: "Fill the cracks above the window" }),
    ).toBeNull();
  },
};

export const Pending: Story = {
  args: { task: { ...curtainRods, id: "temp-1", pending: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saving…")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${curtainRods.title}”` }),
    );
    const menu = within(canvasElement.ownerDocument.body).getByRole("menu");
    for (const item of within(menu).getAllByRole("menuitem")) {
      await expect(item).toHaveAttribute("aria-disabled", "true");
    }
    await userEvent.keyboard("{Escape}");
  },
};

/** The first subtask is on its way: the task keeps its own figure and shows no count yet. */
export const PendingSubtask: Story = {
  args: {
    task: {
      ...curtainRods,
      subtasks: [
        { ...sealBath, id: "temp-2", title: "Buy the brackets", estimate: "60 zł", pending: true },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("1 subtask")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: curtainRods.title }));
    const subtasks = canvas.getByRole("list", { name: `Subtasks of “${curtainRods.title}”` });
    await expect(within(subtasks).getByText("Saving…")).toBeVisible();
  },
};

export const ChangeFailed: Story = {
  args: { task: { ...sealBath, error: taskMessages.rolledBack } },
};

export const SumStarted: Story = {
  args: {
    task: {
      ...paintCeiling,
      notice: taskMessages.sumStarted(paintCeiling.title),
    },
  },
};

export const Highlighted: Story = { args: { task: curtainRods, highlightId: curtainRods.id } };

export const Menu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${paintCeiling.title}”` }),
    );
    const menu = within(canvasElement.ownerDocument.body).getByRole("menu");
    await expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Add subtask", "Edit", "Delete"]);
  },
};

/** E02: places and markers in the meta line (Luki 6). */
export const PlacesAndMarkers: Story = {
  args: { task: organizedTasks[3]! },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Salon")).toBeVisible();
    await expect(canvas.getByText("Urgent")).toBeVisible();
  },
};

/** E02: every menu group, with Move down off at the bottom (decision G3). */
export const MenuWithOrderMarkersPlaces: Story = {
  args: { task: organizedTasks[0]!, ...organized },
  render: (args) => <InSortableList {...args} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: `More actions for “${organizedTasks[0]!.title}”`,
      }),
    );
    const menu = within(canvasElement.ownerDocument.body).getByRole("menu");
    await expect(
      Array.from(menu.querySelectorAll("[role^='menuitem']"), (item) => item.textContent),
    ).toEqual([
      "Add subtask",
      "Edit",
      "Places…",
      "Important",
      "Urgent",
      "Move up",
      "Move down",
      "Delete",
    ]);
    await expect(within(menu).getByRole("menuitemcheckbox", { name: "Important" })).toBeChecked();
    await expect(within(menu).getByRole("menuitem", { name: "Move down" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Move up" }));
    await expect(organized.move.up).toHaveBeenCalledOnce();
  },
};

/** E02: "Places…" opens the picker next to "…" (decision G3). */
export const PlacesPopover: Story = {
  args: { task: organizedTasks[2]!, ...organized },
  render: (args) => <InSortableList {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: `More actions for “${organizedTasks[2]!.title}”`,
      }),
    );
    await userEvent.click(body.getByRole("menuitem", { name: "Places…" }));
    const panel = await body.findByRole("dialog", {
      name: `Places for “${organizedTasks[2]!.title}”`,
    });
    await expect(within(panel).getByRole("checkbox", { name: "Sypialnia" })).toBeChecked();
  },
};

/** E02: picked up with the keyboard, lifted above the other rows. */
export const PickedUp: Story = {
  args: { task: curtainRods, ...organized },
  render: (args) => <InSortableList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: `Move “${curtainRods.title}”` }).focus();
    await userEvent.keyboard(" ");
    await expect(canvasElement.querySelector("[data-dragging]")).not.toBeNull();
    // Put it back, so the next story's keys are not taken by this drag.
    await userEvent.keyboard("{Escape}");
  },
};

export const Editing: Story = {
  args: { task: pantry },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${pantry.title}”` }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Edit" }),
    );
    await expect(canvas.getByLabelText("Title")).toHaveFocus();
    await expect(canvas.getByLabelText("Amount")).toHaveValue(pantry.amount);
  },
};

export const EditingSum: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${paintCeiling.title}”` }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Edit" }),
    );
    // Its estimate is the subtasks' sum, so the form shows it instead of the amounts (R12).
    await expect(canvas.queryByLabelText("Amount")).toBeNull();
    await expect(canvas.getByText(paintCeiling.estimate as string)).toBeVisible();
  },
};

export const AddingSubtask: Story = {
  args: { task: sealBath },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${sealBath.title}”` }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Add subtask" }),
    );
    await expect(canvas.getByLabelText("New subtask")).toHaveFocus();
    await userEvent.type(canvas.getByLabelText("New subtask"), "Buy sanitary silicone{Enter}");
    await expect(args.onAddSubtask).toHaveBeenCalledWith(sealBath.id, {
      title: "Buy sanitary silicone",
      amount: "",
      upTo: "",
      description: "",
    });
  },
};

export const Delete: Story = {
  args: { task: sealBath },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: `More actions for “${sealBath.title}”` }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Delete" }),
    );
    await expect(args.onRequestDelete).toHaveBeenCalledWith(
      sealBath,
      expect.any(HTMLButtonElement),
    );
  },
};

export const LongText: Story = {
  args: { task: longTask },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: longTask.title }));
  },
};

export const States: Story = {
  render: (args) => (
    <Stack>
      <StateRow
        title="Task row"
        cells={[
          { state: "Default: title, estimate, meta", node: <InList {...args} />, wide: true },
          { state: "No estimate", node: <InList {...args} task={sealBath} />, wide: true },
          {
            state: "Pending (not confirmed): muted title, “Saving…”, actions off",
            node: <InList {...args} task={{ ...curtainRods, pending: true }} />,
            wide: true,
          },
          {
            state: "Change failed and rolled back",
            node: <InList {...args} task={{ ...sealBath, error: taskMessages.rolledBack }} />,
            wide: true,
          },
          {
            state: "Subtask without description (no arrow)",
            node: <InList {...args} {...subtaskArgs} task={(paintCeiling.subtasks ?? [])[0]!} />,
            wide: true,
          },
          { state: "Long amounts", node: <InList {...args} task={wholeBathroom} />, wide: true },
          {
            state: "Places and markers (E02)",
            node: <InList {...args} task={organizedTasks[3]!} />,
            wide: true,
          },
          {
            state: "Movable (E02): handle from 640px",
            node: <InSortableList {...args} {...organized} task={sealBath} />,
            wide: true,
          },
          {
            state: "With completion (E03): checkbox, “1/3”",
            node: <InList {...args} {...completion} task={inProgress} />,
            wide: true,
          },
          {
            state: "Completed (E03): muted, struck through, no handle",
            node: <InSortableList {...args} {...organized} {...completion} task={pantryDone} />,
            wide: true,
          },
        ]}
      />
    </Stack>
  ),
};

export const WithCompletion: Story = {
  args: { ...completion, task: inProgress },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 of 3 subtasks completed")).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Complete “Paint the bathroom ceiling”" }),
    );
    await expect(args.onToggleComplete).toHaveBeenCalledWith(inProgress, true);
  },
};

export const Completed: Story = {
  args: { ...completion, ...organized, task: pantryDone },
  render: (args) => <InSortableList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("checkbox", { name: "Complete “Finish the pantry shelves”" }),
    ).toBeChecked();
    // A completed task cannot be dragged (decision 2026-10-21).
    await expect(
      canvas.queryByRole("button", { name: "Move “Finish the pantry shelves”" }),
    ).toBeNull();
  },
};

export const CompletedMenu: Story = {
  args: { ...completion, ...organized, task: pipesDone },
  render: (args) => <InSortableList {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "More actions for “Box in the pipes in the bathroom”",
      }),
    );
    await expect(body.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(body.queryByRole("menuitem", { name: "Add subtask" })).toBeNull();
    await expect(body.queryByRole("menuitem", { name: "Move up" })).toBeNull();
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: { task: longTask },
  render: (args) => (
    <Narrow>
      <InList {...args} />
    </Narrow>
  ),
};

export const PolishCompleted: Story = {
  args: { ...completion, task: polishProgressTasks[1]!, text: polishTaskText },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: polishProgressTasks[1]!.title }),
    );
  },
};

export const Polish: Story = {
  args: { task: polishTasks[0]!, text: polishTaskText },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: polishTasks[0]!.title }),
    );
  },
};

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{
        node: (
          <div className="w-full">
            <InList {...args} task={pantry} />
          </div>
        ),
        why: "One line per task: title, amount on the right, actions behind “…”; details open in place.",
      }}
      bad={{
        node: (
          <div className="flex w-full flex-col gap-group">
            <div className="rounded-surface border border-divider p-inset">
              <p className="font-strong">{pantry.title}</p>
              <p className="text-muted">{pantry.description}</p>
              <p>Edit · Add subtask · Delete</p>
            </div>
          </div>
        ),
        why: "A card per task with its description and every action shown is the overloaded card the owner rejected (A01.3, Luki 6).",
      }}
    />
  ),
};
