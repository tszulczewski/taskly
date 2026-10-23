import type { Meta, StoryObj } from "@storybook/react-vite";
import { Moon, Sun } from "lucide-react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Label, RadioGroup, RadioGroupItem, RadioGroupSegment } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const colours = [
  { value: "blue", label: "Blue" },
  { value: "ochre", label: "Ochre" },
  { value: "terracotta", label: "Terracotta" },
];

function ColourList({ idPrefix = "colour" }: { idPrefix?: string }) {
  return (
    <RadioGroup aria-label="Colour of the place" defaultValue="blue">
      {colours.map((c) => (
        <div key={c.value} className="flex items-center">
          <RadioGroupItem value={c.value} id={`${idPrefix}-${c.value}`} />
          <Label htmlFor={`${idPrefix}-${c.value}`}>{c.label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function ThemeSwitch({ dark = "Dark", light = "Light", label = "Theme" }) {
  return (
    <RadioGroup aria-label={label} variant="segmented" defaultValue="dark">
      <RadioGroupSegment value="dark">
        <Moon aria-hidden="true" />
        {dark}
      </RadioGroupSegment>
      <RadioGroupSegment value="light">
        <Sun aria-hidden="true" />
        {light}
      </RadioGroupSegment>
    </RadioGroup>
  );
}

const meta = {
  title: "Primitives/Radio group",
  component: RadioGroup,
  subcomponents: { RadioGroupItem, RadioGroupSegment },
  decorators: [withDocFrame],
  args: { variant: "list", onValueChange: fn() },
  argTypes: { variant: { control: "inline-radio", options: ["list", "segmented"] } },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <RadioGroup {...args} aria-label="Colour of the place" defaultValue="blue">
      {colours.map((c) =>
        args.variant === "segmented" ? (
          <RadioGroupSegment key={c.value} value={c.value}>
            {c.label}
          </RadioGroupSegment>
        ) : (
          <div key={c.value} className="flex items-center">
            <RadioGroupItem value={c.value} id={`play-${c.value}`} />
            <Label htmlFor={`play-${c.value}`}>{c.label}</Label>
          </div>
        ),
      )}
    </RadioGroup>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Ochre" }));
    await expect(args.onValueChange).toHaveBeenLastCalledWith("ochre");
    // Keyboard: arrows move the selection inside the group (WAI-ARIA APG, radio group).
    await userEvent.keyboard("{ArrowDown>}");
    await waitFor(() => expect(canvas.getByLabelText("Terracotta")).toBeChecked());
    await userEvent.keyboard("{/ArrowDown}");
  },
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="list"
        cells={[{ state: "one option per line", node: <ColourList idPrefix="variants" /> }]}
      />
      <StateRow title="segmented" cells={[{ state: "theme switch (P4)", node: <ThemeSwitch /> }]} />
    </Stack>
  ),
};

export const ThemeSwitchKeyboard: Story = {
  render: () => <ThemeSwitch />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "Dark" })).toHaveFocus();
    // Radix moves focus in a timeout and selects only while the arrow key is still down, as it is
    // for a person; userEvent releases at once unless the key is held (`>`).
    await userEvent.keyboard("{ArrowRight>}");
    await waitFor(() => expect(canvas.getByRole("radio", { name: "Light" })).toBeChecked());
    await userEvent.keyboard("{/ArrowRight}");
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      {[false, true].map((checked) => (
        <StateRow
          key={String(checked)}
          title={checked ? "Item, selected" : "Item, not selected"}
          cells={[
            { state: "default", preview: undefined },
            { state: "hover", preview: "hover" },
            { state: "focus (keyboard)", preview: "focus-visible" },
            { state: "pressed", preview: "active" },
            { state: "disabled", preview: "disabled" },
          ].map(({ state, preview }) => ({
            state,
            node: (
              <RadioGroup aria-label={state} value={checked ? "a" : "b"}>
                <RadioGroupItem
                  value="a"
                  aria-label={state}
                  data-preview-state={preview === "disabled" ? undefined : preview}
                  disabled={preview === "disabled"}
                />
              </RadioGroup>
            ),
          }))}
        />
      ))}
      <StateRow
        title="Segment"
        cells={[
          { state: "selected", node: <ThemeSwitch /> },
          {
            state: "hover (Light)",
            node: (
              <RadioGroup aria-label="Theme, hover" variant="segmented" value="dark">
                <RadioGroupSegment value="dark">Dark</RadioGroupSegment>
                <RadioGroupSegment value="light" data-preview-state="hover">
                  Light
                </RadioGroupSegment>
              </RadioGroup>
            ),
          },
          {
            state: "focus (keyboard)",
            node: (
              <RadioGroup aria-label="Theme, focus" variant="segmented" value="dark">
                <RadioGroupSegment value="dark" data-preview-state="focus-visible">
                  Dark
                </RadioGroupSegment>
                <RadioGroupSegment value="light">Light</RadioGroupSegment>
              </RadioGroup>
            ),
          },
          {
            state: "disabled",
            node: (
              <RadioGroup aria-label="Theme, disabled" variant="segmented" value="dark" disabled>
                <RadioGroupSegment value="dark">Dark</RadioGroupSegment>
                <RadioGroupSegment value="light">Light</RadioGroupSegment>
              </RadioGroup>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <ThemeSwitch dark="Ciemny" light="Jasny" label="Motyw" />
      <ColourList idPrefix="narrow" />
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => <ThemeSwitch dark="Ciemny" light="Jasny" label="Motyw" />,
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <ThemeSwitch />,
        why: "Two short, equal options that are both visible: one press switches.",
      }}
      bad={{
        node: (
          <RadioGroup aria-label="Theme" variant="segmented" defaultValue="dark">
            <RadioGroupSegment value="dark">Dark</RadioGroupSegment>
            <RadioGroupSegment value="light">Light</RadioGroupSegment>
            <RadioGroupSegment value="system">Same as system</RadioGroupSegment>
          </RadioGroup>
        ),
        why: "A third “same as system” option was ruled out: the switch has exactly two positions (Q1, Luki 2).",
      }}
    />
  ),
};
