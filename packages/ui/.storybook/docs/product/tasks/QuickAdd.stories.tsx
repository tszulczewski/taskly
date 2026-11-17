import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { type DraftPlaces, FormField, Input, QuickAdd, type QuickAddProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, never, offline } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";
import {
  diningRoom,
  kitchen,
  livingRoom,
  placeNameRule,
  predefinedPlaces,
} from "../../../blocks/place-data";
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

const empty = { amount: "", upTo: "", description: "" };
const upTo = /^up to/;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Hang the curtain rods{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { title: "Hang the curtain rods", ...empty },
      [],
    );
    // Confirmed: the field is empty again and keeps focus for the next task.
    await waitFor(() => expect(canvas.getByLabelText("New task")).toHaveValue(""));
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
  },
};

export const WithEstimate: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Paint the bathroom ceiling");
    await userEvent.type(canvas.getByLabelText("Amount"), "1 200");
    await userEvent.type(canvas.getByLabelText(upTo), "1 500,50");
    const toggle = canvas.getByRole("button", { name: "Description" });
    await userEvent.click(toggle);
    await userEvent.type(canvas.getByLabelText(/^Description/), "Two coats of white matt.");
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      {
        title: "Paint the bathroom ceiling",
        amount: "1 200",
        upTo: "1 500,50",
        description: "Two coats of white matt.",
      },
      [],
    );
    // Ready for the next task: the description is closed again.
    await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "false"));
  },
};

export const ExactPrice: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Buy a ceiling lamp");
    await userEvent.type(canvas.getByLabelText("Amount"), "500{Enter}");
    // One amount is an exact price; the app stores it as min = max (R18).
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { ...empty, title: "Buy a ceiling lamp", amount: "500" },
      [],
    );
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

export const UpToBelowAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Tile the floor");
    await userEvent.type(canvas.getByLabelText("Amount"), "2 500");
    await userEvent.type(canvas.getByLabelText(upTo), "2 000");
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(canvas.getByLabelText(upTo)).toHaveFocus();
    await expect(canvas.getByText(taskMessages.upToBelowAmount)).toBeVisible();
  },
};

export const DescriptionTooLong: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Description" });
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the tap");
    await userEvent.click(toggle);
    await userEvent.click(canvas.getByLabelText(/^Description/));
    await userEvent.paste("x".repeat(2001));
    await userEvent.click(toggle);
    await userEvent.type(canvas.getByLabelText("New task"), "{Enter}");
    // The browser's own check opens the closed description and moves focus into it (decision F9).
    await waitFor(() => expect(canvas.getByLabelText(/^Description/)).toHaveFocus());
    await expect(canvas.getByText(taskMessages.descriptionTooLong)).toBeVisible();
  },
};

export const ErrorInClosedDescription: Story = {
  args: {
    onSubmit: answer({
      ok: false,
      fieldErrors: { description: taskMessages.descriptionTooLong },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Fix the tap{Enter}");
    // A server error on the hidden description opens it by itself, so it is never hidden.
    await waitFor(() => expect(canvas.getByLabelText(/^Description/)).toHaveFocus());
    await expect(canvas.getByText(taskMessages.descriptionTooLong)).toBeVisible();
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

/** The owner's places for a draft (spec E02, #83); creating one answers with Jadalnia's id. */
const draftPlaces = (overrides: Partial<DraftPlaces> = {}): DraftPlaces => ({
  status: "ready",
  onRetry: fn(),
  all: predefinedPlaces,
  atLimit: false,
  validateName: placeNameRule(predefinedPlaces),
  onCreate: fn(async () => ({ ok: true as const, placeId: diningRoom.id })),
  onUpdate: fn(answer({ ok: true })),
  onDelete: fn(async () => true),
  ...overrides,
});
/** The popover is portalled: axe checks the whole page, and docs give it room (lesson 2026-10-22). */
const portalled = {
  a11y: { context: "body" },
  docs: { story: { inline: false, height: "520px" } },
};
const body = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

/** Places chosen before Add: two ticked, saved with the task, none chosen for the next (AC11, AC14). */
export const WithPlaces: Story = {
  args: { places: draftPlaces() },
  parameters: portalled,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("New task"), "Hang the curtain rods");
    const trigger = canvas.getByRole("button", { name: "Places…" });
    await userEvent.click(trigger);
    const panel = await body(canvasElement).findByRole("dialog", {
      name: "Places for the new task",
    });
    await userEvent.click(within(panel).getByRole("checkbox", { name: livingRoom.name }));
    await userEvent.click(within(panel).getByRole("checkbox", { name: kitchen.name }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    const chosen = canvas.getByRole("list", { name: "Chosen places" });
    await expect(within(chosen).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ title: "Hang the curtain rods", ...empty }, [
      livingRoom.id,
      kitchen.id,
    ]);
    await waitFor(() => expect(canvas.queryByRole("list", { name: "Chosen places" })).toBeNull());
    await expect(canvas.getByLabelText("New task")).toHaveFocus();
  },
};

/** The first load of the places has not answered: a skeleton, no New place (AC15). */
export const PlacesLoading: Story = {
  args: { places: draftPlaces({ status: "loading", all: [] }) },
  parameters: portalled,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Places…" }));
    const panel = await body(canvasElement).findByRole("dialog");
    await expect(within(panel).getByRole("status")).toHaveTextContent("Loading your places…");
    await expect(within(panel).queryByLabelText("New place")).toBeNull();
  },
};

/** The places failed to load: "Try again" in the picker; a task with no places still adds (AC15). */
export const PlacesLoadFailed: Story = {
  args: { places: draftPlaces({ status: "error", all: [] }) },
  parameters: portalled,
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Places…" }));
    const panel = await body(canvasElement).findByRole("dialog");
    await userEvent.click(within(panel).getByRole("button", { name: "Try again" }));
    await expect(args.places!.onRetry).toHaveBeenCalledOnce();
    await expect(within(panel).queryByText("No places yet.")).toBeNull();
  },
};

/**
 * A chosen place deleted while the draft is open (here from the picker's "Edit places"): it shows
 * as a deleted place with Remove, and Add asks to remove it, never saving fewer places (AC18).
 */
export const DeletedPlace: Story = {
  args: { places: draftPlaces() },
  parameters: portalled,
  render: function Render(args) {
    const [all, setAll] = useState(predefinedPlaces);
    const places: DraftPlaces = {
      ...args.places!,
      all,
      onDelete: async (placeId) => {
        setAll((list) => list.filter((place) => place.id !== placeId));
        return true;
      },
    };
    return <QuickAdd {...args} places={places} />;
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Places…" }));
    const panel = await body(canvasElement).findByRole("dialog");
    await userEvent.click(within(panel).getByRole("checkbox", { name: kitchen.name }));
    await userEvent.click(within(panel).getByRole("button", { name: "Edit places" }));
    await userEvent.click(within(panel).getByRole("button", { name: `Edit ${kitchen.name}` }));
    await userEvent.click(within(panel).getByRole("button", { name: "Delete place" }));
    await userEvent.click(within(panel).getByRole("button", { name: "Delete place" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByText("Deleted place")).toBeVisible());
    await userEvent.type(canvas.getByLabelText("New task"), "Fit the hob{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A place you chose was deleted. Remove it, then add again.",
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Remove the deleted place" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ title: "Fit the hob", ...empty }, []);
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
    await userEvent.type(canvas.getByLabelText("Amount"), "45 000");
    await userEvent.type(canvas.getByLabelText(upTo), "62 500,50");
  },
};

export const Polish: Story = {
  args: { text: polishTaskText },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Opis" }));
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <QuickAdd validate={validateTask} onSubmit={answer({ ok: true })} />,
        why: "Only the title is needed; the amounts sit beside it and the description waits behind its toggle (A03, C1).",
      }}
      bad={{
        node: (
          <div className="flex w-full flex-col gap-group">
            <FormField label="Title">{(control) => <Input {...control} />}</FormField>
            <FormField label="Room">{(control) => <Input {...control} />}</FormField>
            <FormField label="Amount">{(control) => <Input {...control} suffix="zł" />}</FormField>
            <FormField label="Description">{(control) => <Input {...control} />}</FormField>
          </div>
        ),
        why: "Many required fields before a task exists is the “million details” the owners rejected (A03).",
      }}
    />
  ),
};
