import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AppShell, EmptyState, Surface, type AppShellProps } from "../../../../src";
import { DoDont } from "../../../blocks/Primitives";

const meta = {
  title: "Product/App shell/App shell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: {
    theme: "dark",
    onThemeChange: fn(),
    onSignOut: fn(async () => true) as AppShellProps["onSignOut"],
    children: null,
  },
  argTypes: { children: { control: false }, onSignOut: { control: false } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = (
  <>
    <h1 className="text-heading font-strong">Bathroom</h1>
    <Surface>
      <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>
    </Surface>
  </>
);

export const Playground: Story = {
  render: (args) => <AppShell {...args}>{page}</AppShell>,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const signOut = canvas.getByRole("button", { name: "Sign out" });
    await userEvent.click(signOut);
    await expect(args.onSignOut).toHaveBeenCalledOnce();
    // Busy until the app navigates to /sign-in.
    await expect(signOut).toHaveAttribute("aria-busy", "true");
  },
};

export const SignOutFailed: Story = {
  args: { onSignOut: async () => false },
  render: (args) => <AppShell {...args}>{page}</AppShell>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not sign out. Try again.",
    );
    await expect(canvas.getByRole("button", { name: "Sign out" })).not.toHaveAttribute("aria-busy");
  },
};

export const Polish: Story = {
  args: {
    text: {
      signOut: "Wyloguj się",
      signOutFailed: "Nie udało się wylogować. Spróbuj ponownie.",
      label: "Motyw",
      dark: "Ciemny",
      light: "Jasny",
    },
  },
  render: (args) => <AppShell {...args}>{page}</AppShell>,
};

export const DoAndDont: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="bg-page p-inset">
      <DoDont
        good={{
          node: <p className="font-strong">Taskly</p>,
          why: "The bar holds the name, the theme switch and Sign out; nothing else competes with the list.",
        }}
        bad={{
          node: (
            <p className="font-strong">
              Taskly · Inbox · Workspace · Favorites · Reports · Shopping · Share
            </p>
          ),
          why: "Navigation to places version 1 does not have (P03, R01.5, A03).",
        }}
      />
    </div>
  ),
};
