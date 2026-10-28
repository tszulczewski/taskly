import type { Meta, StoryObj } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { AppShell, type Theme } from "../../../../src";
import { TaskScreen, type TaskScreenProps } from "../../../blocks/TaskScreen";
import { polishPlaceText, polishPlaces, somePlaces, tenPlaces } from "../../../blocks/place-data";
import {
  doneTasks,
  manyTasks,
  organizedTasks,
  paintCeiling,
  polishExpensesText,
  polishOrganizedTasks,
  polishProgressTasks,
  polishTaskText,
  polishTasks,
  progressTasks,
  someTasks,
  taskMessages,
} from "../../../blocks/task-data";

/**
 * Screens S5 (the task list) and S6 (a task opened in place), spec E01, and S7 (order, markers,
 * places; backlog E02) and S8 (completion and future expenses; backlog E03). State map: docs page.
 */
const meta = {
  title: "Product/Tasks/Screens",
  parameters: { layout: "fullscreen", a11y: { context: "body" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop1440", isRotated: false } };
const tablet = { viewport: { value: "tablet768", isRotated: false } };
const phone = { viewport: { value: "phone320", isRotated: false } };

/** The theme switch drives Storybook's theme; story hooks only work in `render` itself. */
const screen = (props: TaskScreenProps) =>
  function Render() {
    const [globals, updateGlobals] = useGlobals();
    const theme: Theme = globals.theme === "light" ? "light" : "dark";
    return (
      <AppShell
        theme={theme}
        onThemeChange={(next) => updateGlobals({ theme: next })}
        onSignOut={async () => true}
      >
        <TaskScreen {...props} />
      </AppShell>
    );
  };

type Canvas = ReturnType<typeof within>;
const more = (canvas: Canvas, title: string) =>
  userEvent.click(canvas.getByRole("button", { name: `More actions for “${title}”` }));

export const ListDesktop: Story = { globals: desktop, render: screen({ initialTasks: someTasks }) };

export const ListTablet: Story = { globals: tablet, render: screen({ initialTasks: someTasks }) };

export const ListPhone: Story = { globals: phone, render: screen({ initialTasks: someTasks }) };

export const Loading: Story = {
  globals: phone,
  render: screen({ initialTasks: someTasks, initialStatus: "loading" }),
};

export const LoadFailed: Story = {
  globals: desktop,
  render: screen({ initialTasks: someTasks, initialStatus: "error" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(await canvas.findByRole("list", { name: "Tasks" })).toBeVisible();
  },
};

export const Empty: Story = {
  globals: phone,
  render: screen({ initialTasks: [], autoFocus: true }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("New task")).toHaveFocus();
  },
};

export const AddTask: Story = {
  globals: desktop,
  render: screen({ initialTasks: someTasks }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the dripping kitchen tap{Enter}");
    // At once: a pending row at the end; then the confirmed row, highlighted.
    await expect(await canvas.findByText("Saving…")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("Saving…")).toBeNull());
    await expect(canvas.getByText("Fix the dripping kitchen tap")).toBeVisible();
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
  },
};

export const AddFailed: Story = {
  globals: phone,
  render: screen({ initialTasks: someTasks, server: "fail" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the dripping kitchen tap{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(taskMessages.addFailed);
    await expect(canvas.queryByText("Saving…")).toBeNull();
    await expect(canvas.getByLabelText("New task")).toHaveValue("Fix the dripping kitchen tap");
  },
};

export const PendingAdd: Story = {
  globals: tablet,
  render: screen({ initialTasks: someTasks, server: "slow" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the dripping kitchen tap{Enter}");
    await expect(await canvas.findByText("Saving…")).toBeVisible();
  },
};

export const EditInPlace: Story = {
  globals: desktop,
  render: screen({ initialTasks: someTasks }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Hang the curtain rods");
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Edit" }),
    );
    await expect(canvas.getByLabelText("Title")).toHaveFocus();
  },
};

export const ConfirmDelete: Story = {
  globals: phone,
  render: screen({ initialTasks: someTasks }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await more(canvas, paintCeiling.title);
    await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));
    await expect(
      await body.findByRole("alertdialog", {
        name: "Delete “Paint the bathroom ceiling” and its 3 subtasks?",
      }),
    ).toBeVisible();
  },
};

export const ManyTasks: Story = { globals: desktop, render: screen({ initialTasks: manyTasks }) };

export const PolishPhone: Story = {
  globals: phone,
  render: screen({ initialTasks: polishTasks, heading: "Mój remont", text: polishTaskText }),
};

export const TaskOpenedDesktop: Story = {
  globals: desktop,
  render: screen({ initialTasks: someTasks }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: paintCeiling.title }));
    await expect(canvas.getByRole("button", { name: "Add subtask" })).toBeVisible();
  },
};

export const TaskOpenedPhone: Story = {
  globals: phone,
  render: screen({ initialTasks: someTasks }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: paintCeiling.title }));
    await userEvent.click(canvas.getByRole("button", { name: "Add subtask" }));
    await expect(canvas.getByLabelText("New subtask")).toHaveFocus();
  },
};

const organized = { initialTasks: organizedTasks, initialPlaces: somePlaces };
const body = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

export const OrganizedDesktop: Story = { globals: desktop, render: screen(organized) };

export const OrganizedTablet: Story = { globals: tablet, render: screen(organized) };

export const OrganizedPhone: Story = { globals: phone, render: screen(organized) };

export const ReorderWithKeyboard: Story = {
  globals: desktop,
  render: screen(organized),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "Move “Finish the pantry shelves”" }).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Move “Finish the pantry shelves”" }),
      ).toHaveFocus(),
    );
  },
};

export const MoveFromMenuPhone: Story = {
  globals: phone,
  render: screen(organized),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Hang the curtain rods");
    await userEvent.click(body(canvasElement).getByRole("menuitem", { name: "Move up" }));
  },
};

export const MoveFailed: Story = {
  globals: tablet,
  render: screen({ ...organized, server: "fail", delay: 300 }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Seal the bath");
    await userEvent.click(body(canvasElement).getByRole("menuitem", { name: "Move down" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      taskMessages.moveFailed("Seal the bath"),
    );
  },
};

export const MarkUrgent: Story = {
  globals: desktop,
  render: screen(organized),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Hang the curtain rods");
    await userEvent.click(body(canvasElement).getByRole("menuitemcheckbox", { name: "Urgent" }));
    await expect(
      within(canvas.getByText("Hang the curtain rods").closest("li")!).getByText("Urgent"),
    ).toBeVisible();
  },
};

export const ChoosePlaces: Story = {
  globals: desktop,
  render: screen(organized),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Hang the curtain rods");
    await userEvent.click(body(canvasElement).getByRole("menuitem", { name: "Places…" }));
    const panel = await body(canvasElement).findByRole("dialog", {
      name: "Places for “Hang the curtain rods”",
    });
    await userEvent.click(within(panel).getByRole("checkbox", { name: "Hall" }));
    await expect(within(panel).getByRole("checkbox", { name: "Hall" })).toBeChecked();
  },
};

export const CreatePlacePhone: Story = {
  globals: phone,
  render: screen(organized),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Seal the bath");
    await userEvent.click(body(canvasElement).getByRole("menuitem", { name: "Places…" }));
    const panel = await body(canvasElement).findByRole("dialog", {
      name: "Places for “Seal the bath”",
    });
    await userEvent.type(within(panel).getByLabelText("New place"), "Balcony{Enter}");
    await expect(await within(panel).findByRole("checkbox", { name: "Balcony" })).toBeChecked();
  },
};

export const PlacesAtLimit: Story = {
  globals: tablet,
  render: screen({ ...organized, initialPlaces: tenPlaces }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await more(canvas, "Seal the bath");
    await userEvent.click(body(canvasElement).getByRole("menuitem", { name: "Places…" }));
    await expect(
      await body(canvasElement).findByText(
        "You can have up to 10 places. Delete one to add another.",
      ),
    ).toBeVisible();
  },
};

export const OrganizedPolishPhone: Story = {
  globals: phone,
  render: screen({
    initialTasks: polishOrganizedTasks,
    initialPlaces: polishPlaces,
    heading: "Mój remont",
    text: polishTaskText,
    placeText: polishPlaceText,
  }),
};

const progress = { initialTasks: progressTasks, expenses: "ready" } satisfies TaskScreenProps;

export const ProgressDesktop: Story = { globals: desktop, render: screen(progress) };

export const ProgressTablet: Story = { globals: tablet, render: screen(progress) };

export const ProgressPhone: Story = { globals: phone, render: screen(progress) };

export const ExpensesLoading: Story = {
  globals: phone,
  render: screen({ ...progress, expenses: "loading" }),
};

export const ExpensesFailed: Story = {
  globals: desktop,
  render: screen({ ...progress, expenses: "error" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(await canvas.findByText("Future expenses")).toBeVisible();
  },
};

export const CompleteTask: Story = {
  globals: desktop,
  render: screen(progress),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Complete “Hang the curtain rods”" }),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Complete “Hang the curtain rods”" }),
    ).toBeChecked();
  },
};

export const CompleteWithSubtasksPhone: Story = {
  globals: phone,
  render: screen(progress),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Complete “Paint the bathroom ceiling”" }),
    );
    await body(canvasElement).findByRole("alertdialog");
  },
};

export const AddEstimatePhone: Story = {
  globals: phone,
  render: screen(progress),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "2 tasks without an estimate" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add estimate for “Seal the bath”" }));
    const list = within(canvas.getByRole("list", { name: "2 tasks without an estimate" }));
    await expect(list.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  },
};

export const CompletionFailed: Story = {
  globals: tablet,
  render: screen({ ...progress, server: "fail", delay: 300 }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: "Complete “Seal the bath”" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      taskMessages.changeFailed("Seal the bath"),
    );
  },
};

export const AllDone: Story = {
  globals: tablet,
  render: screen({ ...progress, initialTasks: doneTasks }),
};

export const WithOrderAndPlaces: Story = {
  globals: desktop,
  render: screen({ ...organized, expenses: "ready" }),
};

export const ProgressPolishPhone: Story = {
  globals: phone,
  render: screen({
    initialTasks: polishProgressTasks,
    expenses: "ready",
    heading: "Mój remont",
    text: polishTaskText,
    expensesText: polishExpensesText,
  }),
};
