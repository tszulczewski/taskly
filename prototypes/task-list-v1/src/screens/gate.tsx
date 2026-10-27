import type { ReactNode } from "react";
import { Button, Surface } from "@taskly/ui";

export interface GateAction {
  label: string;
  onClick: () => void;
}

/**
 * An access gate as the review page shows it (s04.1, s01.9, s02.10, s03.2). In the app these are
 * redirects made by the server before any data loads; a redirect here would trap the review
 * engine's "← Back" between two screens, so the screen says what the app does and offers it as a
 * button. This is review chrome, marked "Prototype", not a product screen.
 */
export function Gate({
  state,
  title,
  children,
  actions,
}: {
  state: string;
  title: string;
  children: ReactNode;
  actions: GateAction[];
}) {
  return (
    <div className="flex flex-col items-center bg-page px-page-gutter pt-page-top pb-section text-body text-primary">
      <Surface padding="inset" className="flex w-full max-w-auth-card flex-col gap-group">
        <p className="text-meta text-muted">
          <span className="font-strong">Prototype</span> · access gate {state}
        </p>
        <h2 className="text-heading font-strong">{title}</h2>
        <p className="max-w-measure">{children}</p>
        <div className="flex flex-wrap gap-group">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant={index === 0 ? "primary" : "secondary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Surface>
    </div>
  );
}
