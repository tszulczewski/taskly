import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default theme. Without these names it would treat
 * `text-meta` (size) and `text-muted` (colour) as the same group and drop one of them.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "page",
        "list",
        "raised",
        "raised-hover",
        "action",
        "action-hover",
        "scrim",
        "primary",
        "muted",
        "on-action",
        "danger",
        "divider",
        "control",
        "focus",
        ...Array.from({ length: 10 }, (_, i) => `place-${i + 1}`),
      ],
      text: ["meta", "body", "heading", "input-mobile"],
      spacing: [
        "inline",
        "group",
        "between-groups",
        "inset",
        "section",
        "page-gutter",
        "page-top",
        "row-y",
        "row-indent",
        "row",
        "touch",
        "checkbox",
        "dot",
        "icon",
        "control",
        "control-x",
        "field-x",
        "field-y",
      ],
      radius: ["control", "surface", "checkbox"],
      "font-weight": ["regular", "strong"],
      leading: ["body", "heading"],
    },
  },
});

/** Joins class names and lets a later token utility replace an earlier one of the same kind. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
