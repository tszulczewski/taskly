/** Purpose of every semantic colour token, from the "use / do not use" columns of tokeny.md. */
export interface ColorRole {
  token: string;
  use: string;
  avoid: string;
}

export const surfaceRoles: ColorRole[] = [
  {
    token: "color-surface-page",
    use: "Page background.",
    avoid: "Under list rows.",
  },
  {
    token: "color-surface-list",
    use: "The one continuous list surface; the future-expenses line.",
    avoid: "A card inside a card (A02) or separate panels (R02.6).",
  },
  {
    token: "color-surface-raised",
    use: "A hovered, expanded or dragged row; loading bars (Luki 8); the error alert (P3).",
    avoid: "The frame of a panel inside a panel.",
  },
  {
    token: "color-surface-raised-hover",
    use: "A highlighted menu item (pointer or arrow keys). Dark: one tone above the panel, as in R02. Light: white, because the darker step leaves danger text at 4.1:1 (D1).",
    avoid: "Rows on the list surface (they use color-surface-raised); the selected state.",
  },
  {
    token: "color-scrim",
    use: "Behind the confirm dialog, dimming the page (K2).",
    avoid: "Any surface people read text on.",
  },
];

export const lineRoles: ColorRole[] = [
  {
    token: "color-border-divider",
    use: "Line between rows; line under the top bar. Decorative only (T1).",
    avoid: "The only edge of a field or checkbox: its contrast is about 1.4:1.",
  },
  {
    token: "color-border-control",
    use: "Border of fields and of an unchecked checkbox.",
    avoid: "Line between rows.",
  },
  {
    token: "color-focus-ring",
    use: "Keyboard focus outline.",
    avoid: "Selected state.",
  },
];

export const textRoles: ColorRole[] = [
  {
    token: "color-text-primary",
    use: "Task title, amount of an open task, body text.",
    avoid: "Completed tasks.",
  },
  {
    token: "color-text-muted",
    use: "Second line of a row, “Important”, “Urgent”, “1/3”, the prompt in an empty field, completed tasks, helper text.",
    avoid: "Amount of an open task; the primary button.",
  },
  {
    token: "color-text-danger",
    use: "Validation message (e.g. min above max); text of the destructive button and of the error alert (P3).",
    avoid: "Cost overrun (R02.3), “Important”, “Urgent”.",
  },
];

export const actionRoles: ColorRole[] = [
  {
    token: "color-action-primary",
    use: "Primary button, checked checkbox, active navigation item, action text (“Add estimate”, “3 tasks without an estimate”).",
    avoid: "Background of a large surface (A01.1), decoration, place dots.",
  },
  {
    token: "color-text-on-action",
    use: "Text and check mark on color-action-primary.",
    avoid: "Anywhere else.",
  },
];

export const placeTokens = Array.from({ length: 10 }, (_, i) => `color-place-${i + 1}`);

export const allColorTokens = [...surfaceRoles, ...lineRoles, ...textRoles, ...actionRoles].map(
  (r) => r.token,
);

export interface ContrastPair {
  foreground: string;
  background: string;
  kind: "text" | "ui";
  /** Accepted exception with its decision, shown instead of a failure. */
  exception?: string;
}

const surfaces = ["color-surface-page", "color-surface-list", "color-surface-raised"];

export const contrastPairs: ContrastPair[] = [
  ...[
    "color-text-primary",
    "color-text-muted",
    "color-action-primary",
    "color-text-danger",
  ].flatMap((foreground) =>
    surfaces.map((background) => ({ foreground, background, kind: "text" as const })),
  ),
  { foreground: "color-text-on-action", background: "color-action-primary", kind: "text" },
  ...["color-text-primary", "color-text-danger"].map((foreground) => ({
    foreground,
    background: "color-surface-raised-hover",
    kind: "text" as const,
  })),
  { foreground: "color-focus-ring", background: "color-surface-raised-hover", kind: "ui" },
  ...["color-action-primary", "color-border-control", "color-focus-ring"].flatMap((foreground) =>
    surfaces.map((background) => ({ foreground, background, kind: "ui" as const })),
  ),
  ...surfaces.map((background) => ({
    foreground: "color-border-divider",
    background,
    kind: "ui" as const,
    exception: "Decorative line, accepted below 3:1 (T1). Control edges use color-border-control.",
  })),
  ...placeTokens.flatMap((foreground) =>
    surfaces.map((background) => ({ foreground, background, kind: "ui" as const })),
  ),
];
