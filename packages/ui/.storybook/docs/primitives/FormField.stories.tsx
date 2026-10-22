import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Button, FormField, Input, Label, PasswordInput } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Form field",
  component: FormField,
  subcomponents: { Label },
  decorators: [withDocFrame],
  args: {
    label: "Email",
    hint: undefined,
    error: undefined,
    optional: false,
    children: (field) => <Input {...field} type="email" autoComplete="email" />,
  },
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
    children: { control: false },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <FormField label="Email">{(field) => <Input {...field} type="email" />}</FormField>
      <FormField label="Password" hint="At least 10 characters">
        {(field) => <PasswordInput {...field} />}
      </FormField>
      <FormField label="Minimum, zł" optional>
        {(field) => <Input {...field} inputMode="decimal" suffix="zł" />}
      </FormField>
      <FormField label="Maximum, zł" optional error="Maximum must be at least the minimum.">
        {(field) => <Input {...field} inputMode="decimal" suffix="zł" defaultValue="900" />}
      </FormField>
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <FormField label="Name (default)">{(field) => <Input {...field} />}</FormField>
      <FormField label="Name (focus)">
        {(field) => <Input {...field} defaultValue="Anna" data-preview-state="focus-visible" />}
      </FormField>
      <FormField label="Name (error)" error="Enter your name.">
        {(field) => <Input {...field} />}
      </FormField>
      <FormField label="Name (disabled)" hint="Available after you sign in">
        {(field) => <Input {...field} disabled defaultValue="Anna" />}
      </FormField>
    </Stack>
  ),
};

function ValidateOnBlur() {
  const [error, setError] = useState<string>();
  return (
    <form
      className="flex flex-col gap-between-groups"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <FormField label="Title" error={error}>
        {(field) => (
          <Input
            {...field}
            onBlur={(event) => setError(event.target.value.trim() ? undefined : "Enter a title.")}
          />
        )}
      </FormField>
      <Button variant="primary" type="submit">
        Add
      </Button>
    </form>
  );
}

export const ErrorAfterLeavingField: Story = {
  render: () => <ValidateOnBlur />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Title");
    await userEvent.click(input);
    await userEvent.tab();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription("Enter a title.");
    await userEvent.type(input, "Paint the hallway");
    await userEvent.tab();
    await expect(input).not.toHaveAttribute("aria-invalid");
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <FormField
        label="Estimated cost of materials and labour, zł"
        optional
        hint="Tasks without an estimate are not counted in the total."
        error="The maximum must be at least the minimum. Change one of the amounts."
      >
        {(field) => <Input {...field} inputMode="decimal" suffix="zł" defaultValue="900" />}
      </FormField>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <Stack>
      <FormField label="Hasło" hint="Co najmniej 10 znaków">
        {(field) => <PasswordInput {...field} toggleLabel="Pokaż hasło" />}
      </FormField>
      <FormField
        label="Maksimum, zł"
        optional
        optionalText="(opcjonalnie)"
        error="Maksimum musi być co najmniej równe minimum."
      >
        {(field) => <Input {...field} inputMode="decimal" suffix="zł" defaultValue="900" />}
      </FormField>
    </Stack>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <Stack>
      <DoDont
        good={{
          node: (
            <FormField label="Description" optional>
              {(field) => <Input {...field} />}
            </FormField>
          ),
          why: "Only the exception is marked, in words (K5).",
        }}
        bad={{
          node: <FormField label="Title *">{(field) => <Input {...field} />}</FormField>,
          why: "An asterisk needs a legend and screen readers read it as “star”.",
        }}
      />
      <DoDont
        good={{
          node: (
            <FormField label="Maximum, zł" optional error="Maximum must be at least the minimum.">
              {(field) => <Input {...field} suffix="zł" defaultValue="900" />}
            </FormField>
          ),
          why: "The error says what is wrong and what to do, next to the field.",
        }}
        bad={{
          node: (
            <FormField label="Maximum, zł" optional error="Invalid value.">
              {(field) => <Input {...field} suffix="zł" defaultValue="900" />}
            </FormField>
          ),
          why: "“Invalid value” does not tell the user how to fix it.",
        }}
      />
    </Stack>
  ),
};
