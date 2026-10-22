import { tokenPx } from "../../lib/token-px";

/**
 * Shared look of everything that opens over the page (menu, popover, tooltip, dialog): the raised
 * tone and a 1px control-coloured edge instead of a shadow (K2, tokens rule 1), radius-surface
 * (R02 code `.menu` 12px, T8). No open or close animation (K2).
 */
export const overlaySurfaceClass =
  "rounded-surface border border-control bg-raised font-base text-body leading-body text-primary";

/**
 * Where menus, popovers and tooltips sit. Radix takes numbers, so the distances are read from the
 * tokens when the overlay renders (D3, D4): `space-inline` between trigger and panel, and
 * `space-page-gutter` kept free at the screen edges (16px on phones, 24px from 640px).
 */
export function overlayPlacement() {
  return {
    sideOffset: tokenPx("--space-inline"),
    collisionPadding: tokenPx("--space-page-gutter"),
  };
}
