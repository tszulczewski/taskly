import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, userEvent, within } from "storybook/test";
import {
  Button,
  Checkbox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextAction,
} from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow } from "../../blocks/Primitives";

const places = ["Bathroom", "Kitchen", "Hallway"];

function PlacesPopover({
  open,
  title = "Places for this task",
  trigger = "Places",
  names = places,
}: {
  open?: boolean;
  title?: string;
  trigger?: string;
  names?: string[];
}) {
  const id = useId();
  return (
    <Popover defaultOpen={open} modal={false}>
      <PopoverTrigger asChild>
        <TextAction>{trigger}</TextAction>
      </PopoverTrigger>
      <PopoverContent aria-label={title}>
        <p className="font-strong">{title}</p>
        <div className="flex flex-col">
          {names.map((name, i) => (
            <div key={name} className="flex items-center">
              <Checkbox id={`${id}-${i}`} defaultChecked={i === 0} />
              <Label htmlFor={`${id}-${i}`}>{name}</Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const meta = {
  title: "Primitives/Popover",
  component: PopoverContent,
  subcomponents: { Popover, PopoverTrigger },
  decorators: [withDocFrame],
  parameters: {
    a11y: { context: "body" },
    docs: { story: { inline: false, height: "320px" } },
  },
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => <PlacesPopover />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("button", { name: "Places" });
    await userEvent.click(trigger);
    await expect(body.getByRole("dialog", { name: "Places for this task" })).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Escape closes and returns focus to the trigger (WAI-ARIA APG).
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const Open: Story = { render: () => <PlacesPopover open /> };

export const States: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-section">
      <div className="flex flex-col gap-inline">
        <PlacesPopover trigger="Places (closed)" />
        <span className="text-meta text-muted">closed; the trigger has its own states</span>
      </div>
      <div className="flex flex-col gap-inline">
        <PlacesPopover open trigger="Places (open)" />
        <span className="text-meta text-muted">open</span>
      </div>
    </div>
  ),
};

export const ManyItemsNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <PlacesPopover
        open
        names={[
          "Bathroom",
          "Kitchen",
          "Hallway",
          "Living room",
          "Children's bedroom upstairs",
          "Balcony",
        ]}
      />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <PlacesPopover
      open
      title="Miejsca tego zadania"
      trigger="Miejsca"
      names={["Łazienka", "Kuchnia", "Przedpokój"]}
    />
  ),
};

export const DoAndDont: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <DoDont
      good={{
        node: <PlacesPopover trigger="Places" />,
        why: "A few related choices next to the thing they change.",
      }}
      bad={{
        node: <Button>Open task settings</Button>,
        why: "A popover holding a whole form is a window over the content in disguise (Q2, A01.3).",
      }}
    />
  ),
};
