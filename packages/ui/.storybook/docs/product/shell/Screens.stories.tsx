import type { Meta, StoryObj } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";
import { expect, userEvent, within } from "storybook/test";
import { AppShell, EmptyState, Surface, type Theme } from "../../../../src";

/** Screen S4: the signed-in frame around every page (sign-in spec AppHeader, P01, R02.11). */
const meta = {
  title: "Product/App shell/Screens",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story hooks only work in the render function itself, so each story calls `useGlobals` there and
 * the theme switch drives Storybook's theme, as the app sets `data-theme` on the root (rule 9).
 */
function useTheme() {
  const [globals, updateGlobals] = useGlobals();
  const theme: Theme = globals.theme === "light" ? "light" : "dark";
  return [theme, (next: Theme) => updateGlobals({ theme: next })] as const;
}

function Shell({
  theme,
  onThemeChange,
  onSignOut = async () => true,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSignOut?: () => Promise<boolean>;
}) {
  return (
    <AppShell theme={theme} onThemeChange={onThemeChange} onSignOut={onSignOut}>
      <h1 className="text-heading font-strong">Bathroom</h1>
      <Surface>
        <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>
      </Surface>
    </AppShell>
  );
}

export const Desktop: Story = {
  globals: { viewport: { value: "desktop1440", isRotated: false } },
  render: function Render() {
    const [theme, setTheme] = useTheme();
    return <Shell theme={theme} onThemeChange={setTheme} />;
  },
};

export const Tablet: Story = {
  globals: { viewport: { value: "tablet768", isRotated: false } },
  render: function Render() {
    const [theme, setTheme] = useTheme();
    return <Shell theme={theme} onThemeChange={setTheme} />;
  },
};

export const Phone: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: function Render() {
    const [theme, setTheme] = useTheme();
    return <Shell theme={theme} onThemeChange={setTheme} />;
  },
};

export const SignOutFailedPhone: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: function Render() {
    const [theme, setTheme] = useTheme();
    return <Shell theme={theme} onThemeChange={setTheme} onSignOut={async () => false} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not sign out. Try again.",
    );
  },
};
