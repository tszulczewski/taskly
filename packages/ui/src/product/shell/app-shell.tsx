import type { ReactNode } from "react";
import { AppHeader, type AppHeaderProps } from "./app-header";

export interface AppShellProps extends AppHeaderProps {
  children: ReactNode;
}

/**
 * Every signed-in page: the top bar and one content column, at most `layout-content-max-width`
 * (980px) and centred (P01, R01.5). No side bar and no panels next to the column (Q2).
 */
export function AppShell({ children, ...header }: AppShellProps) {
  return (
    <div
      data-slot="app-shell"
      className="flex flex-col bg-page font-base text-body leading-body text-primary"
    >
      <AppHeader {...header} />
      <main className="mx-auto flex w-full max-w-content flex-col gap-section px-page-gutter pt-page-top pb-section">
        {children}
      </main>
    </div>
  );
}
