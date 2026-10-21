import { useMemo } from "react";
import type { Theme } from "./tokens";

export type Rgb = readonly [number, number, number];

function parseRgb(value: string): Rgb | null {
  const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export interface Measured {
  /** Resolved custom property text, e.g. "1rem" or "#101513". */
  value: string;
  /** Present when the token resolves to a colour. */
  rgb: Rgb | null;
}

/**
 * Resolves tokens in the given theme by mounting a probe with data-theme, so both themes can be
 * measured side by side whatever theme the page itself uses.
 */
export function measureTokens(names: readonly string[], theme: Theme): Record<string, Measured> {
  const probe = document.createElement("div");
  probe.dataset.theme = theme;
  probe.setAttribute("aria-hidden", "true");
  probe.hidden = true;
  const swatch = document.createElement("span");
  probe.append(swatch);
  document.body.append(probe);
  const result: Record<string, Measured> = {};
  for (const name of names) {
    const value = getComputedStyle(probe).getPropertyValue(`--${name}`).trim();
    swatch.style.color = "";
    swatch.style.color = `var(--${name})`;
    const rgb = name.startsWith("color-") ? parseRgb(getComputedStyle(swatch).color) : null;
    result[name] = { value, rgb };
  }
  probe.remove();
  return result;
}

/** Measures synchronously: the probe is mounted and removed within the call. */
export function useMeasuredTokens(names: readonly string[], theme: Theme) {
  const key = names.join("|");
  return useMemo(() => measureTokens(key.split("|"), theme), [key, theme]);
}
