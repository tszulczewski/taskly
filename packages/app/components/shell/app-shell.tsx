"use client";

import { AppShell as AppShellView } from "@taskly/ui";
import type { ReactNode } from "react";
import { AUTH_MESSAGES } from "../../lib/api-client";
import { useSignOut, useSignOutOtherDevices } from "../auth/use-sign-out";
import { useTheme } from "./use-theme";

/** Every signed-in page: the design-system shell wired to the theme and to both sign-outs. */
export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const onSignOut = useSignOut();
  const onSignOutOtherDevices = useSignOutOtherDevices();
  return (
    <AppShellView
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={onSignOut}
      onSignOutOtherDevices={onSignOutOtherDevices}
      text={{
        signOutFailed: AUTH_MESSAGES.signOutFailed,
        signOutOtherDevicesFailed: AUTH_MESSAGES.signOutOtherDevicesFailed,
      }}
    >
      {children}
    </AppShellView>
  );
}
