import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Link, TextAction } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Text action and link",
  component: TextAction,
  subcomponents: { Link },
  decorators: [withDocFrame],
  args: { children: "Add estimate", tone: "action", disabled: false, onClick: fn() },
  argTypes: {
    tone: { control: "inline-radio", options: ["action", "muted"] },
    children: { control: "text" },
  },
} satisfies Meta<typeof TextAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const action = within(canvasElement).getByRole("button", { name: "Add estimate" });
    await userEvent.click(action);
    action.blur();
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Text action"
        cells={[
          { state: "tone action", node: <TextAction>Add estimate</TextAction> },
          { state: "tone muted", node: <TextAction tone="muted">Add a description</TextAction> },
        ]}
      />
      <StateRow
        title="Link"
        cells={[
          {
            state: "in a sentence",
            node: (
              <p className="text-body">
                No account yet? <Link href="#sign-up">Create an account</Link>
              </p>
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
      {(["action", "muted"] as const).map((tone) => {
        const label = tone === "action" ? "Add estimate" : "Add a description";
        return (
          <StateRow
            key={tone}
            title={`Text action, tone ${tone}`}
            cells={[
              { state: "default", node: <TextAction tone={tone}>{label}</TextAction> },
              {
                state: "hover",
                node: (
                  <TextAction tone={tone} data-preview-state="hover">
                    {label}
                  </TextAction>
                ),
              },
              {
                state: "focus (keyboard)",
                node: (
                  <TextAction tone={tone} data-preview-state="focus-visible">
                    {label}
                  </TextAction>
                ),
              },
              {
                state: "pressed",
                node: (
                  <TextAction tone={tone} data-preview-state="active">
                    {label}
                  </TextAction>
                ),
              },
              {
                state: "disabled",
                node: (
                  <TextAction tone={tone} disabled>
                    {label}
                  </TextAction>
                ),
              },
            ]}
          />
        );
      })}
      <StateRow
        title="Link"
        cells={[
          { state: "default", node: <Link href="#sign-in">Sign in</Link> },
          {
            state: "focus (keyboard)",
            node: (
              <Link href="#sign-in" data-preview-state="focus-visible">
                Sign in
              </Link>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const LinkNavigates: Story = {
  render: () => (
    <p className="text-body">
      Sign-up is closed. <Link href="#sign-in">Go to sign in</Link>
    </p>
  ),
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "Go to sign in" });
    await expect(link).toHaveAttribute("href", "#sign-in");
    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};

export const LongTextNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <TextAction>3 tasks without an estimate are not counted in the total</TextAction>
      <p className="text-body">
        Registration is closed on this installation.{" "}
        <Link href="#sign-in">Go back to the sign-in page</Link>
      </p>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-group">
      <TextAction>Dodaj szacunek</TextAction>
      <TextAction tone="muted">Dodaj opis</TextAction>
      <p className="text-body">
        Nie masz konta? <Link href="#sign-up">Załóż konto</Link>
      </p>
    </div>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <Stack>
      <DoDont
        good={{
          node: <TextAction>Add estimate</TextAction>,
          why: "An action inside a row is a button that reads as text: it does something here.",
        }}
        bad={{
          node: <Link href="#estimate">Add estimate</Link>,
          why: "A link that does not go anywhere breaks the user's expectation and the back button.",
        }}
      />
      <DoDont
        good={{
          node: <TextAction tone="muted">Add a description</TextAction>,
          why: "An empty value is a quiet prompt to click, not a framed button (R01.4).",
        }}
        bad={{
          node: <p className="text-body text-muted">No description</p>,
          why: "Plain text says what is missing but gives no way to fix it.",
        }}
      />
    </Stack>
  ),
};
