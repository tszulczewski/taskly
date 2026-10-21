import type { ReactNode } from "react";
import type { Theme } from "./tokens";

interface DocFrameProps {
  children: ReactNode;
  /** Pin a theme for side-by-side comparisons; by default the frame follows the root theme. */
  theme?: Theme;
  label?: string;
}

/**
 * Paints a token surface behind documentation previews. Docs pages keep Storybook's own light
 * styling, so previews bring their own page background and text colour.
 */
export function DocFrame({ children, theme, label }: DocFrameProps) {
  return (
    <div
      data-theme={theme}
      className="bg-page text-primary font-base text-body rounded-surface p-inset"
    >
      {label ? <p className="text-meta text-muted mb-group">{label}</p> : null}
      {children}
    </div>
  );
}
