import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FormField, Textarea } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  decorators: [withDocFrame],
  args: {
    "aria-label": "Description",
    placeholder: "e.g. Two coats, white matt paint",
    rows: 3,
    disabled: false,
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const textarea = within(canvasElement).getByRole("textbox", { name: "Description" });
    await userEvent.tab();
    await expect(textarea).toHaveFocus();
    await userEvent.type(textarea, "Two coats.{Enter}Buy a roller first.");
    await expect(textarea).toHaveValue("Two coats.\nBuy a roller first.");
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Textarea"
        cells={[
          {
            state: "empty",
            node: <Textarea aria-label="Empty" placeholder="e.g. Two coats, white matt paint" />,
          },
          {
            state: "filled",
            node: <Textarea aria-label="Filled" defaultValue="Two coats, white matt paint." />,
          },
          {
            state: "focus (keyboard)",
            node: (
              <Textarea
                aria-label="Focused"
                data-preview-state="focus-visible"
                defaultValue="Two coats"
              />
            ),
          },
          { state: "error", node: <Textarea aria-label="Invalid" aria-invalid defaultValue="" /> },
          {
            state: "disabled",
            node: (
              <Textarea
                aria-label="Disabled"
                disabled
                defaultValue="Two coats, white matt paint."
              />
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const Rows: Story = {
  render: () => (
    <div className="flex flex-col gap-group">
      <Textarea aria-label="Three rows (default)" />
      <Textarea aria-label="Six rows" rows={6} />
    </div>
  ),
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <FormField label="Description" optional>
        {(field) => (
          <Textarea
            {...field}
            rows={5}
            defaultValue="Remove the old silicone first. Prime the wall, wait a day, then paint two coats of white matt paint. The ceiling above the shower needs a moisture-resistant paint."
          />
        )}
      </FormField>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <FormField label="Opis" optional optionalText="(opcjonalnie)">
      {(field) => <Textarea {...field} placeholder="np. Dwie warstwy, biała matowa farba" />}
    </FormField>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <FormField label="Description" optional>
            {(field) => <Textarea {...field} />}
          </FormField>
        ),
        why: "Free text that can run to several sentences gets several lines.",
      }}
      bad={{
        node: <FormField label="Title">{(field) => <Textarea {...field} rows={3} />}</FormField>,
        why: "A title is one line; a tall box suggests the user should write more.",
      }}
    />
  ),
};
