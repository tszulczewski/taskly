import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { ErrorState } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Error state",
  component: ErrorState,
  decorators: [withDocFrame],
  args: {
    title: "Could not load your tasks.",
    children: "Check your connection. Nothing you entered was lost.",
    onRetry: fn(),
    retrying: false,
  },
  argTypes: { title: { control: "text" }, children: { control: "text" } },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not load your tasks.");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Failed"
        cells={[
          {
            state: "waiting for the user",
            node: <ErrorState title="Could not load your tasks." onRetry={() => {}} />,
          },
        ]}
      />
      <StateRow
        title="Retrying"
        cells={[
          {
            state: "the retry is running",
            node: <ErrorState title="Could not load your tasks." onRetry={() => {}} retrying />,
          },
        ]}
      />
    </Stack>
  ),
};

function RetryFlow() {
  const [retrying, setRetrying] = useState(false);
  return (
    <ErrorState
      title="Could not load your tasks."
      retrying={retrying}
      onRetry={() => setRetrying(true)}
    />
  );
}

export const RetryShowsProgress: Story = {
  render: () => <RetryFlow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(canvas.getByRole("button", { name: "Trying again…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <ErrorState
        title="Could not load the future expenses for your renovation."
        onRetry={() => {}}
      >
        The server did not answer in time. Your tasks are safe; try again in a moment.
      </ErrorState>
    </Narrow>
  ),
};

export const Polish: Story = {
  args: {
    title: "Nie udało się wczytać zadań.",
    children: "Sprawdź połączenie. Nic z tego, co wpisałeś, nie zginęło.",
    retryLabel: "Spróbuj ponownie",
    retryingLabel: "Ponawianie…",
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <ErrorState title="Could not load your tasks." onRetry={() => {}}>
            Check your connection.
          </ErrorState>
        ),
        why: "Says what failed, what to check and offers one way out.",
      }}
      bad={{
        node: <ErrorState title="Error 503: upstream timeout." onRetry={() => {}} />,
        why: "A code and technical words mean nothing to the user (A05).",
      }}
    />
  ),
};
