import { ChevronDown, ChevronRight, Ellipsis, GripVertical, Moon, Plus, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { DocFrame } from "./DocFrame";

const cell = "border-b border-divider py-group pr-group align-top text-left";

/* Typography ------------------------------------------------------------------------------- */

interface TypeRole {
  role: string;
  classes: string;
  sample: string;
  tokens: string;
  source: string;
}

export const typeRoles: TypeRole[] = [
  {
    role: "Page heading",
    classes: "text-heading font-strong text-primary",
    sample: "My renovation",
    tokens: "font-size-heading, line-height-heading, font-weight-strong",
    source: "Luki 1 (22px: list name), R01.3",
  },
  {
    role: "Total",
    classes: "text-heading font-strong text-primary numeric",
    sample: "Future expenses: 12 000–15 000 zł",
    tokens: "font-size-heading, font-weight-strong, tabular-nums",
    source: "Luki 1, P04, P06",
  },
  {
    role: "Section heading",
    classes: "text-body font-strong text-primary",
    sample: "Tasks without an estimate",
    tokens: "font-size-body, font-weight-strong",
    source: "Proposal: three sizes only (Luki 1), hierarchy by weight and colour (R01.3)",
  },
  {
    role: "Task title",
    classes: "text-body font-strong text-primary",
    sample: "Hang curtain rods",
    tokens: "font-size-body, font-weight-strong",
    source: "Luki 1",
  },
  {
    role: "Body",
    classes: "text-body font-regular text-primary",
    sample: "Prime the wall first, then two coats of decorative plaster.",
    tokens: "font-size-body, line-height-body, font-weight-regular",
    source: "Luki 1",
  },
  {
    role: "Label",
    classes: "text-body font-regular text-primary",
    sample: "Title",
    tokens: "font-size-body, font-weight-regular",
    source: "Proposal: labels are body text, never uppercase (P12, tokens rule 4)",
  },
  {
    role: "Metadata",
    classes: "text-meta font-regular text-muted",
    sample: "Bathroom · Living room · Important · 1/3",
    tokens: "font-size-meta, color-text-muted",
    source: "Luki 1, Luki 4, Luki 6",
  },
  {
    role: "Amount",
    classes: "text-body font-strong text-primary numeric",
    sample: "1 200–1 500 zł",
    tokens: "font-size-body, font-weight-strong, tabular-nums",
    source: "Luki 1, P06, tokens rule 5",
  },
  {
    role: "Helper text",
    classes: "text-meta font-regular text-muted",
    sample: "At least 10 characters",
    tokens: "font-size-meta, color-text-muted",
    source: "Luki 1; sign-in spec (UI/UX)",
  },
];

export function TypeRoles() {
  return (
    <DocFrame>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-meta text-muted">
            <th className={cell}>Role</th>
            <th className={cell}>Sample</th>
            <th className={cell}>Tokens</th>
            <th className={cell}>Source</th>
          </tr>
        </thead>
        <tbody>
          {typeRoles.map((r) => (
            <tr key={r.role}>
              <td className={`${cell} text-meta`}>{r.role}</td>
              <td className={cell}>
                <span className={r.classes}>{r.sample}</span>
              </td>
              <td className={`${cell} text-meta`}>
                <code>{r.tokens}</code>
              </td>
              <td className={`${cell} text-meta`}>{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}

export function TypePolish() {
  return (
    <DocFrame label="Polish copy: diacritics come from the Latin Extended subset of Instrument Sans">
      <p className="text-heading font-strong leading-heading numeric">
        Przyszłe wydatki: 12 000–15 000 zł
      </p>
      <p className="text-body font-strong">Zawieś karnisze w salonie</p>
      <p className="text-meta text-muted">Łazienka · Salon · Ważne · Pilne · 1/3</p>
      <p className="text-body">Zadania bez szacunku nie wliczają się do sumy.</p>
    </DocFrame>
  );
}

export function Measure() {
  return (
    <DocFrame label="Running text: max-w-measure (about 65 characters per line)">
      <p className="max-w-measure">
        The cost of each candidate task gets lost when you choose quickly what to do next. Write the
        task down with a rough range now, and the list keeps the cost in view for you. A task
        without an estimate is left out of the future-expenses total until it gets one.
      </p>
    </DocFrame>
  );
}

/* Spacing ---------------------------------------------------------------------------------- */

const levels = [
  {
    token: "space-inline",
    utility: "gap-inline",
    use: "Inside one element: dot and place name, icon and text.",
  },
  {
    token: "space-group",
    utility: "gap-group",
    use: "Within a group: places, “Important”, “Urgent”, “1/3”; handle, chevron, checkbox; adjacent buttons.",
  },
  {
    token: "space-between-groups",
    utility: "gap-between-groups",
    use: "Between groups: row content and the amount.",
  },
  {
    token: "space-inset",
    utility: "p-inset",
    use: "Inside a panel: horizontal row padding, expanded details.",
  },
  {
    token: "space-section",
    utility: "gap-section",
    use: "Between sections: total, quick add, list.",
  },
  {
    token: "space-page-gutter",
    utility: "px-page-gutter",
    use: "Side margin of the page: 16px up to 640px, 24px above.",
  },
  {
    token: "space-page-top",
    utility: "pt-page-top",
    use: "Space above the content on a computer; not on a phone.",
  },
];

export function SpacingLevels() {
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Relation</th>
            <th className={cell}>Utility</th>
            <th className={cell}>Size</th>
            <th className={cell}>Use</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l.token}>
              <td className={cell}>
                <code>{l.token}</code>
              </td>
              <td className={cell}>
                <code>{l.utility}</code>
              </td>
              <td className={cell}>
                <span
                  aria-hidden="true"
                  className="block h-group bg-action rounded-control"
                  style={{ width: `var(--${l.token})` }}
                />
              </td>
              <td className={cell}>{l.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}

function Box({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-control border border-control px-group text-meta ${className}`}
    >
      {label}
    </span>
  );
}

/** The relation rule drawn with real tokens: inline < group < between groups < section. */
export function SpacingRelations() {
  return (
    <DocFrame label="Each level uses exactly one token; the gaps grow from the inside out">
      <div className="flex flex-col gap-section">
        {/* Wraps at 320px instead of widening the docs page (decision N11). */}
        <div className="bg-list rounded-surface p-inset flex flex-wrap items-center justify-between gap-between-groups">
          <div className="flex min-w-0 flex-col gap-inline">
            <span className="flex flex-wrap items-center gap-group">
              <Box label="handle" />
              <Box label="chevron" />
              <Box label="checkbox" />
              <Box label="title" />
            </span>
            <span className="flex flex-wrap items-center gap-group">
              <span className="inline-flex items-center gap-inline">
                <Box label="dot" />
                <Box label="place" />
              </span>
              <Box label="marker" />
              <Box label="1/3" />
            </span>
          </div>
          <Box label="amount" />
        </div>
        <p className="text-meta text-muted">
          gap-group inside each group · gap-inline between the dot and its name · gap-between-groups
          between content and amount · p-inset inside the surface · gap-section to the next section
        </p>
      </div>
    </DocFrame>
  );
}

/* Layout ----------------------------------------------------------------------------------- */

const widths = [
  { viewport: 320, gutter: 16, top: "0 (phone)", content: 288 },
  { viewport: 768, gutter: 24, top: "space-page-top", content: 720 },
  { viewport: 1440, gutter: 24, top: "space-page-top", content: 980 },
];

export function LayoutWidths() {
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta numeric">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Viewport</th>
            <th className={cell}>Side gutter</th>
            <th className={cell}>Space above content</th>
            <th className={cell}>Content column</th>
          </tr>
        </thead>
        <tbody>
          {widths.map((w) => (
            <tr key={w.viewport}>
              <td className={cell}>{w.viewport}px</td>
              <td className={cell}>{w.gutter}px</td>
              <td className={cell}>{w.top}</td>
              <td className={cell}>
                {w.content}px{w.content === 980 ? " (layout-content-max-width, centred)" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}

/** One content column, centred, never wider than layout-content-max-width (P01, R01.5). */
export function PageColumn() {
  return (
    <div className="bg-page text-primary min-h-row px-page-gutter wide:pt-page-top">
      <div className="mx-auto max-w-content flex flex-col gap-section">
        <p className="text-heading font-strong leading-heading">My renovation</p>
        <div className="bg-list rounded-surface p-inset text-meta text-muted">
          Content column: full width minus the gutter, at most 980px, centred. No sidebar.
        </div>
      </div>
    </div>
  );
}

/* Shape and depth -------------------------------------------------------------------------- */

const radii = [
  { token: "radius-control", utility: "rounded-control", use: "Buttons and fields." },
  { token: "radius-surface", utility: "rounded-surface", use: "The list surface, the total line." },
  { token: "checkbox-radius", utility: "rounded-checkbox", use: "Task and subtask checkbox." },
  { token: "—", utility: "rounded-full", use: "Place dot only." },
];

export function Radii() {
  return (
    <DocFrame>
      <ul className="flex flex-wrap gap-between-groups">
        {radii.map((r) => (
          <li key={r.utility} className="flex flex-col gap-inline text-meta">
            <span
              aria-hidden="true"
              className={`block size-touch bg-raised border border-control ${r.utility}`}
            />
            <code>{r.utility}</code>
            <span className="text-muted max-w-measure">{r.use}</span>
          </li>
        ))}
      </ul>
    </DocFrame>
  );
}

/** Depth is tone, not shadow (tokens rule 1): page, then the list surface, then a raised row. */
export function Depth({ theme }: { theme?: "dark" | "light" }) {
  return (
    <DocFrame theme={theme} label={theme ? `${theme} theme` : undefined}>
      <div className="bg-page border border-divider rounded-surface p-inset flex flex-col gap-group">
        <span className="text-meta text-muted">color-surface-page</span>
        <div className="bg-list rounded-surface flex flex-col">
          <span className="p-inset text-meta text-muted border-b border-divider">
            color-surface-list, rows divided by color-border-divider
          </span>
          <span className="p-inset text-meta bg-raised">
            color-surface-raised: hovered, expanded or dragged row
          </span>
          <span className="p-inset text-meta text-muted">color-surface-list</span>
        </div>
      </div>
    </DocFrame>
  );
}

/* Motion ----------------------------------------------------------------------------------- */

export function MotionDemo() {
  const [open, setOpen] = useState(false);
  return (
    <DocFrame label="Expanding a row turns the chevron over motion-duration-base; ticking a box fills it over motion-duration-quick. With reduced motion both are instant.">
      <div className="bg-list rounded-surface p-inset flex flex-col gap-group">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-inline self-start min-h-touch rounded-control px-group text-action font-strong focus-visible:outline outline-focus"
        >
          <ChevronRight
            aria-hidden="true"
            className={`size-icon stroke-icon transition-transform duration-base ease-standard ${open ? "rotate-90" : ""}`}
          />
          {open ? "Hide details" : "Show details"}
        </button>
        <span className="flex items-center gap-group text-meta text-muted">
          <span
            aria-hidden="true"
            className={`size-checkbox rounded-checkbox border border-control transition-colors duration-quick ease-standard ${open ? "bg-action" : "bg-list"}`}
          />
          {open ? "Details shown" : "Details hidden"}
        </span>
        {open ? (
          <p className="text-meta text-muted">
            Prime the wall first, then two coats of decorative plaster.
          </p>
        ) : null}
      </div>
    </DocFrame>
  );
}

/* Icons ------------------------------------------------------------------------------------ */

const icons: { Icon: LucideIcon; name: string; gesture: string; label: string }[] = [
  { Icon: GripVertical, name: "GripVertical", gesture: "Drag handle", label: "Reorder “{title}”" },
  {
    Icon: ChevronRight,
    name: "ChevronRight",
    gesture: "Expand a row (collapsed)",
    label: "Show details of “{title}”",
  },
  {
    Icon: ChevronDown,
    name: "ChevronDown",
    gesture: "Collapse a row (expanded)",
    label: "Hide details of “{title}”",
  },
  { Icon: Ellipsis, name: "Ellipsis", gesture: "Row menu “…”", label: "Actions for “{title}”" },
  {
    Icon: Plus,
    name: "Plus",
    gesture: "Add, always next to a word",
    label: "Visible text, e.g. “Add subtask”",
  },
  { Icon: Moon, name: "Moon", gesture: "Theme switch: Dark", label: "Visible text “Dark”" },
  { Icon: Sun, name: "Sun", gesture: "Theme switch: Light", label: "Visible text “Light”" },
];

export function IconSet() {
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Icon</th>
            <th className={cell}>Lucide name</th>
            <th className={cell}>Replaces the gesture</th>
            <th className={cell}>Accessible name</th>
          </tr>
        </thead>
        <tbody>
          {icons.map(({ Icon, name, gesture, label }) => (
            <tr key={name}>
              <td className={cell}>
                <Icon aria-hidden="true" className="size-icon stroke-icon text-primary" />
              </td>
              <td className={cell}>
                <code>{name}</code>
              </td>
              <td className={cell}>{gesture}</td>
              <td className={cell}>{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}

/* Themes ----------------------------------------------------------------------------------- */

export function ThemePair() {
  return (
    <div className="grid gap-group wide:grid-cols-2">
      {(["dark", "light"] as const).map((theme) => (
        <DocFrame key={theme} theme={theme} label={theme === "dark" ? "Dark (default)" : "Light"}>
          <div className="bg-list rounded-surface p-inset flex items-start justify-between gap-between-groups">
            <div className="flex flex-col gap-inline">
              <span className="font-strong">Hang curtain rods</span>
              <span className="flex flex-wrap items-center gap-group text-meta text-muted">
                <span className="inline-flex items-center gap-inline">
                  <span aria-hidden="true" className="size-dot rounded-full bg-place-2" />
                  Living room
                </span>
                <span>Important</span>
              </span>
            </div>
            <span className="font-strong numeric">300–450 zł</span>
          </div>
        </DocFrame>
      ))}
    </div>
  );
}
