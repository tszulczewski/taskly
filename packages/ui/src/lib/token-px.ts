/**
 * Reads a length token from the root element in pixels, for library props that take numbers
 * instead of CSS (Radix `sideOffset`, `collisionPadding`). tokens.css writes lengths in rem or px.
 * Returns 0 without a document (server render); overlays are only positioned in the browser.
 */
export function tokenPx(name: `--${string}`): number {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return 0;
  return value.endsWith("rem")
    ? amount * Number.parseFloat(getComputedStyle(root).fontSize)
    : amount;
}
