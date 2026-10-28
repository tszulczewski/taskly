import type { ReactNode } from "react";

/**
 * Says on the screen what is simulated (prompt rule 4). It sits outside the product card, in the
 * muted meta text, so it does not read as part of the product.
 */
export function SimulationNote({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto max-w-auth-card px-page-gutter pb-section text-meta text-muted">
      <span className="font-strong">Prototype: </span>
      {children}
    </p>
  );
}
