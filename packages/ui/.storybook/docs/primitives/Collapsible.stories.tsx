import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
  FormField,
  Input,
  TextAction,
  Textarea,
} from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

function QuickAddDetails({
  open,
  label = "Details",
  preview,
}: {
  open?: boolean;
  label?: string;
  preview?: string;
}) {
  return (
    <Collapsible defaultOpen={open} className="flex w-full flex-col gap-group">
      <CollapsibleTrigger asChild>
        <TextAction data-preview-state={preview}>
          <CollapsibleIndicator />
          {label}
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-between-groups">
          <FormField label="Description" optional>
            {(f) => <Textarea {...f} />}
          </FormField>
          <FormField label="Minimum, zł" optional>
            {(f) => <Input {...f} inputMode="decimal" suffix="zł" />}
          </FormField>
          <FormField label="Maximum, zł" optional>
            {(f) => <Input {...f} inputMode="decimal" suffix="zł" />}
          </FormField>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Unestimated() {
  return (
    <Collapsible className="flex flex-col gap-group">
      <CollapsibleTrigger asChild>
        <TextAction>
          <CollapsibleIndicator />3 tasks without an estimate
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col">
          {["Paint the bathroom ceiling", "Fit the shower screen", "Seal the bath"].map((t) => (
            <li
              key={t}
              className="flex items-center justify-between gap-between-groups border-b border-divider last:border-b-0"
            >
              <span>{t}</span>
              <TextAction>Add estimate</TextAction>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

const meta = {
  title: "Primitives/Collapsible",
  component: Collapsible,
  subcomponents: { CollapsibleTrigger, CollapsibleContent, CollapsibleIndicator },
  decorators: [withDocFrame],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => <QuickAddDetails />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Details" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByLabelText(/Description/)).toBeVisible();
    // Keyboard: Enter closes it again; focus stays on the trigger.
    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveFocus();
  },
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Form details (quick add)"
        cells={[{ state: "closed", node: <QuickAddDetails /> }]}
      />
      <StateRow
        title="Summary line (future expenses)"
        cells={[{ state: "closed", node: <Unestimated /> }]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <StateRow
      title="Trigger and content"
      cells={[
        { state: "closed", node: <QuickAddDetails label="Details (closed)" /> },
        { state: "hover", node: <QuickAddDetails label="Details (hover)" preview="hover" /> },
        {
          state: "focus (keyboard)",
          node: <QuickAddDetails label="Details (focus)" preview="focus-visible" />,
        },
        { state: "open", node: <QuickAddDetails label="Details (open)" open /> },
      ]}
    />
  ),
};

export const ManyItemsNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <QuickAddDetails open label="Details: description, minimum and maximum" />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <Collapsible className="flex flex-col gap-group">
      <CollapsibleTrigger asChild>
        <TextAction>
          <CollapsibleIndicator />3 zadania bez szacunku
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>Pomalować sufit w łazience</CollapsibleContent>
    </Collapsible>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <Unestimated />,
        why: "The collapsed line says what is inside and how many, so the user knows whether to open it.",
      }}
      bad={{
        node: (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <TextAction>
                <CollapsibleIndicator />
                More
              </TextAction>
            </CollapsibleTrigger>
            <CollapsibleContent>Paint the bathroom ceiling</CollapsibleContent>
          </Collapsible>
        ),
        why: "“More” hides what is behind it; the user has to open it to find out.",
      }}
    />
  ),
};
