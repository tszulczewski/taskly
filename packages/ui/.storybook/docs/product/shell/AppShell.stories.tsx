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
    onSignOutOtherDevices: fn(async () => true) as AppShellProps["onSignOutOtherDevices"],
    children: null,
  },
  argTypes: {
    children: { control: false },
    onSignOut: { control: false },
    onSignOutOtherDevices: { control: false },
  },
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

/** Opens the "Sign out" menu and picks an item; the menu renders in a portal, outside the canvas. */
async function choose(canvasElement: HTMLElement, item: string) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Sign out" }));
  const menu = within(canvasElement.ownerDocument.body);
  await userEvent.click(await menu.findByRole("menuitem", { name: item }));
}

export const Playground: Story = {
  render: (args) => <AppShell {...args}>{page}</AppShell>,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const signOut = canvas.getByRole("button", { name: "Sign out" });
    await choose(canvasElement, "Sign out of this device");
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
    await choose(canvasElement, "Sign out of this device");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not sign out. Try again.",
    );
    await expect(canvas.getByRole("button", { name: "Sign out" })).not.toHaveAttribute("aria-busy");
  },
};

export const SignedOutOtherDevices: Story = {
  render: (args) => <AppShell {...args}>{page}</AppShell>,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await choose(canvasElement, "Sign out of other devices");
    await expect(args.onSignOutOtherDevices).toHaveBeenCalledOnce();
    await expect(args.onSignOut).not.toHaveBeenCalled();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Other devices are signed out. This one stays signed in.",
    );
    await expect(canvas.getByRole("button", { name: "Sign out" })).not.toHaveAttribute("aria-busy");
  },
};

export const SignOutOtherDevicesFailed: Story = {
  args: { onSignOutOtherDevices: async () => false },
  render: (args) => <AppShell {...args}>{page}</AppShell>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await choose(canvasElement, "Sign out of other devices");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not sign out other devices. Try again.",
    );
  },
};

export const Polish: Story = {
  args: {
    text: {
      signOut: "Wyloguj się",
      signOutThisDevice: "Wyloguj na tym urządzeniu",
      signOutOtherDevices: "Wyloguj na innych urządzeniach",
      signOutFailed: "Nie udało się wylogować. Spróbuj ponownie.",
      signedOutOtherDevices: "Inne urządzenia są wylogowane. To zostaje zalogowane.",
      signOutOtherDevicesFailed: "Nie udało się wylogować innych urządzeń. Spróbuj ponownie.",
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
          why: "The bar holds the name, the theme switch and the Sign out menu; nothing else competes with the list.",
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
