"use client";

import { useState } from "react";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { ThemeToggle, type Theme, type ThemeToggleText } from "./theme-toggle";

export interface AppHeaderText extends ThemeToggleText {
  appName: string;
  signOut: string;
  signOutFailed: string;
}

const defaultText: Omit<AppHeaderText, keyof ThemeToggleText> = {
  appName: "Taskly",
  signOut: "Sign out",
  signOutFailed: "Could not sign out. Try again.",
};

export interface AppHeaderProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  /**
   * Signs out; resolves true when the server confirmed. The app then clears the cache and goes to
   * `/sign-in`, so the button stays busy until the page changes.
   */
  onSignOut: () => Promise<boolean>;
  text?: Partial<AppHeaderText>;
}

/**
 * The top bar: the app name, the theme switch and "Sign out" (sign-in spec, AppHeader). A failed
 * sign-out stays on the page and says so; it never claims the user is signed out (spec, Edge cases).
 */
export function AppHeader({ theme, onThemeChange, onSignOut, text }: AppHeaderProps) {
  const t = { ...defaultText, ...text };
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setPending(true);
    setFailed(false);
    const ok = await onSignOut().catch(() => false);
    if (!ok) {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <header data-slot="app-header" className="bg-page">
      <div className="border-b border-divider">
        <div className="mx-auto flex max-w-content items-center justify-between gap-group px-page-gutter py-inline">
          <p className="font-strong">{t.appName}</p>
          <div className="flex items-center gap-group">
            <ThemeToggle value={theme} onValueChange={onThemeChange} text={t} />
            <Button variant="ghost" loading={pending} onClick={signOut}>
              {t.signOut}
            </Button>
          </div>
        </div>
      </div>
      {failed ? (
        <div className="mx-auto max-w-content px-page-gutter pt-group">
          <Alert title={t.signOutFailed} />
        </div>
      ) : null}
    </header>
  );
}
