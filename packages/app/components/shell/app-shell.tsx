"use client";

import { AppShell as AppShellView } from "@taskly/ui";
import type { ReactNode } from "react";
import { AUTH_MESSAGES } from "../../lib/api-client";
import { useSignOut } from "../auth/use-sign-out";
import { useTheme } from "./use-theme";

/** Every signed-in page: the design-system shell wired to the theme and to sign-out. */
export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const onSignOut = useSignOut();
  return (
    <AppShellView
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={onSignOut}
      text={{ signOutFailed: AUTH_MESSAGES.signOutFailed }}
    >
      {children}
    </AppShellView>
  );
}
