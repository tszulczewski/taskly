"use client";

import { useLayoutEffect, useState } from "react";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../components/ui/menu";
import { ThemeToggle, type Theme, type ThemeToggleText } from "./theme-toggle";

export interface AppHeaderText extends ThemeToggleText {
  appName: string;
  signOut: string;
  signOutThisDevice: string;
  signOutOtherDevices: string;
  signOutFailed: string;
  signOutOtherDevicesFailed: string;
}

const defaultText: Omit<AppHeaderText, keyof ThemeToggleText> = {
  appName: "Taskly",
  signOut: "Sign out",
  signOutThisDevice: "Sign out of this device",
  signOutOtherDevices: "Sign out of other devices",
  signOutFailed: "Could not sign out. Try again.",
  signOutOtherDevicesFailed: "Could not sign out other devices. Try again.",
};

type Failure = "signOutFailed" | "signOutOtherDevicesFailed";

/**
 * How "Sign out of other devices" ended: `done` (the other sessions are gone, this one stays),
 * `failed` (some may still be valid), or `sessionEnded` (this session was already gone, so the app
 * goes to `/sign-in` as after a sign-out).
 */
export type SignOutOtherDevicesResult = "done" | "failed" | "sessionEnded";

export interface AppHeaderProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  /**
   * Signs out; resolves true when the server confirmed. The app then clears the cache and goes to
   * `/sign-in`, so the button stays busy until the page changes (is hidden or unmounted).
   */
  onSignOut: () => Promise<boolean>;
  /**
   * Ends every other session of this user and keeps this one (threat T-06). On `done` the page
   * stays and nothing is said (design system: success → nothing); on `sessionEnded` the button stays
   * busy until the page changes, as after `onSignOut`.
   */
  onSignOutOtherDevices: () => Promise<SignOutOtherDevicesResult>;
  text?: Partial<AppHeaderText>;
}

/**
 * The top bar: the app name, the theme switch and the "Sign out" menu (sign-in spec, AppHeader;
 * #78). One menu, not a second button, keeps the bar in one row at 320px (E10). A failed sign-out
 * stays on the page and says so; it never claims the user is signed out (spec, Edge cases).
 */
export function AppHeader({
  theme,
  onThemeChange,
  onSignOut,
  onSignOutOtherDevices,
  text,
}: AppHeaderProps) {
  const t = { ...defaultText, ...text };
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  // With Cache Components the page is hidden (React Activity), not unmounted, after sign-out, and
  // this same header comes back after the next sign-in. Hiding is the page change that ends the
  // busy state, so the header returns ready to sign out again, without an old message.
  useLayoutEffect(
    () => () => {
      setPending(false);
      setOpen(false);
      setFailure(null);
    },
    [],
  );

  const run = async (action: () => Promise<SignOutOtherDevicesResult>, onFail: Failure) => {
    setPending(true);
    setFailure(null);
    const result = await action().catch(() => "failed" as const);
    // Leaving for /sign-in: busy until the page changes.
    if (result === "sessionEnded") return;
    setPending(false);
    if (result === "failed") setFailure(onFail);
  };

  const signOutThisDevice = async (): Promise<SignOutOtherDevicesResult> =>
    (await onSignOut()) ? "sessionEnded" : "failed";

  return (
    <header data-slot="app-header" className="bg-page">
      <div className="border-b border-divider">
        <div className="mx-auto flex max-w-content items-center justify-between gap-group px-page-gutter py-inline">
          <p className="font-strong">{t.appName}</p>
          <div className="flex items-center gap-group">
            <ThemeToggle value={theme} onValueChange={onThemeChange} text={t} />
            {/* While busy the trigger keeps focus but opens nothing (Button `loading`). */}
            <Menu open={open} onOpenChange={(next) => setOpen(next && !pending)}>
              <MenuTrigger asChild>
                <Button variant="ghost" loading={pending}>
                  {t.signOut}
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => run(signOutThisDevice, "signOutFailed")}>
                  {t.signOutThisDevice}
                </MenuItem>
                <MenuItem onSelect={() => run(onSignOutOtherDevices, "signOutOtherDevicesFailed")}>
                  {t.signOutOtherDevices}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </div>
      {failure ? (
        <div className="mx-auto max-w-content px-page-gutter pt-group">
          <Alert title={t[failure]} />
        </div>
      ) : null}
    </header>
  );
}
