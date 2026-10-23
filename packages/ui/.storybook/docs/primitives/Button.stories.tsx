import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ellipsis, Plus } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button, type ButtonVariant } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Button",
  component: Button,
  decorators: [withDocFrame],
  args: { children: "Save", variant: "secondary", loading: false, disabled: false, onClick: fn() },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "danger", "ghost"] },
    children: { control: "text" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Save" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
    // Keyboard: Tab reaches the button, Enter and Space activate it.
    button.blur();
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-group">
      <Button variant="primary">Add</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete task</Button>
      <Button variant="ghost">Sign out</Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-group">
      <Button variant="ghost" size="icon" aria-label="More actions">
        <Ellipsis aria-hidden="true" />
      </Button>
      <Button variant="secondary" size="icon" aria-label="Add subtask">
        <Plus aria-hidden="true" />
      </Button>
    </div>
  ),
};

const variants: { variant: ButtonVariant; label: string }[] = [
  { variant: "primary", label: "Sign in" },
  { variant: "secondary", label: "Cancel" },
  { variant: "danger", label: "Delete task" },
  { variant: "ghost", label: "Sign out" },
];

export const States: Story = {
  render: () => (
    <Stack>
      {variants.map(({ variant, label }) => (
        <StateRow
          key={variant}
          title={variant}
          cells={[
            { state: "default", node: <Button variant={variant}>{label}</Button> },
            {
              state: "hover",
              node: (
                <Button variant={variant} data-preview-state="hover">
                  {label}
                </Button>
              ),
            },
            {
              state: "focus (keyboard)",
              node: (
                <Button variant={variant} data-preview-state="focus-visible">
                  {label}
                </Button>
              ),
            },
            {
              state: "pressed",
              node: (
                <Button variant={variant} data-preview-state="active">
                  {label}
                </Button>
              ),
            },
            {
              state: "disabled",
              node: (
                <Button variant={variant} disabled>
                  {label}
                </Button>
              ),
            },
            {
              state: "loading",
              node: (
                <Button variant={variant} loading>
                  {variant === "primary" ? "Signing in…" : label}
                </Button>
              ),
            },
          ]}
        />
      ))}
    </Stack>
  ),
};

export const LoadingIgnoresClicks: Story = {
  args: { variant: "primary", loading: true, children: "Signing in…" },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Signing in…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const LongLabelNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <Button variant="danger">Delete “Paint the bathroom ceiling” and its 3 subtasks</Button>
      <Button variant="primary" className="w-full">
        Create account
      </Button>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-group">
      <Button variant="primary">Zaloguj się</Button>
      <Button variant="secondary">Anuluj</Button>
      <Button variant="danger">Usuń zadanie</Button>
      <Button variant="primary" loading>
        Logowanie…
      </Button>
    </div>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <Stack>
      <DoDont
        good={{
          node: (
            <div className="flex gap-group">
              <Button variant="primary">Save</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          ),
          why: "One primary action per form; the way out is secondary and easy to find.",
        }}
        bad={{
          node: (
            <div className="flex gap-group">
              <Button variant="primary">Save</Button>
              <Button variant="primary">Cancel</Button>
            </div>
          ),
          why: "Two primary buttons compete; the user has to read both to know which one moves on.",
        }}
      />
      <DoDont
        good={{
          node: <Button variant="danger">Delete task</Button>,
          why: "The button names what will happen: a verb and the object.",
        }}
        bad={{
          node: <Button variant="danger">OK</Button>,
          why: "“OK” does not say that something will be deleted.",
        }}
      />
      <DoDont
        good={{
          node: (
            <Button variant="primary" loading>
              Signing in…
            </Button>
          ),
          why: "While waiting, the button says so and ignores further clicks.",
        }}
        bad={{
          node: (
            <Button variant="primary" disabled>
              Sign in
            </Button>
          ),
          why: "A disabled button with no reason leaves the user guessing what is missing.",
        }}
      />
    </Stack>
  ),
};
