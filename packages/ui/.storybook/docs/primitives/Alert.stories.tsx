import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Alert, Button, FormField, Input } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Alert",
  component: Alert,
  decorators: [withDocFrame],
  args: { title: "Could not sign out. Try again." },
  argTypes: {
    title: { control: "text" },
    children: { control: "text" },
    action: { control: false },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Title only (most alerts)"
        cells={[
          { state: "sign-out failure", node: <Alert title="Could not sign out. Try again." /> },
        ]}
      />
      <StateRow
        title="Title only"
        cells={[{ state: "failed sign-in", node: <Alert title="Wrong email or password." /> }]}
      />
      <StateRow
        title="Title, message and action"
        cells={[
          {
            state: "list failed to load",
            node: (
              <Alert title="Could not load your tasks." action={<Button>Try again</Button>}>
                Check your connection; nothing you entered was lost.
              </Alert>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="An alert is static; its action has the Button states"
        cells={[
          {
            state: "shown",
            node: <Alert title="Could not save the task." action={<Button>Try again</Button>} />,
          },
          {
            state: "action focused",
            node: (
              <Alert
                title="Could not save the task."
                action={<Button data-preview-state="focus-visible">Try again</Button>}
              />
            ),
          },
          {
            state: "action retrying",
            node: (
              <Alert
                title="Could not save the task."
                action={<Button loading>Trying again…</Button>}
              />
            ),
          },
        ]}
      />
    </Stack>
  ),
};

function SignOutFailure() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col items-start gap-group">
      <Button variant="ghost" onClick={() => setFailed(true)}>
        Sign out
      </Button>
      {failed ? <Alert title="Could not sign out. Try again." /> : null}
    </div>
  );
}

export const AnnouncedWhenShown: Story = {
  render: () => <SignOutFailure />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("alert")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not sign out. Try again.");
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <Alert
        title="Could not add “Remove the old tiles, level the wall and prepare it for new tiles”."
        action={<Button>Try again</Button>}
      >
        The server did not answer. Your text is still in the field, so you can try again without
        typing it.
      </Alert>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <Alert title="Nie udało się wczytać zadań." action={<Button>Spróbuj ponownie</Button>}>
      Sprawdź połączenie. Nic z tego, co wpisałeś, nie zginęło.
    </Alert>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <FormField label="Maximum, zł" optional error="Maximum must be at least the minimum.">
            {(f) => <Input {...f} suffix="zł" defaultValue="900" />}
          </FormField>
        ),
        why: "An error about one field sits at that field.",
      }}
      bad={{
        node: <Alert title="Maximum must be at least the minimum." />,
        why: "In an alert above the form, the user has to find which field is meant.",
      }}
    />
  ),
};
