import type { ReactNode } from "react";
import { Surface } from "../../components/ui/surface";

export interface AuthCardProps {
  /** The page heading: "Sign in" or "Create an account". */
  title: string;
  appName?: string;
  children: ReactNode;
}

/** The frame of the sign-in and sign-up pages: one centred card, one column (sign-in spec, UI/UX). */
export function AuthCard({ title, appName = "Taskly", children }: AuthCardProps) {
  return (
    <div
      data-slot="auth-card"
      className="flex flex-col items-center gap-section bg-page px-page-gutter pt-page-top pb-section font-base text-body leading-body text-primary"
    >
      <p className="font-strong">{appName}</p>
      <Surface asChild padding="inset">
        <main className="flex w-full max-w-measure flex-col gap-between-groups">
          <h1 className="text-heading font-strong">{title}</h1>
          {children}
        </main>
      </Surface>
    </div>
  );
}
