import tokensCss from "../../src/styles/tokens.css?raw";

export type TokenLayer = "raw" | "semantic" | "component";
export type Theme = "dark" | "light";

export interface TokenEntry {
  name: string;
  expression: string;
  source: string | null;
  layer: TokenLayer;
  /** Set for colour tokens, which have one value per theme. */
  theme: Theme | null;
  /** Set when the declaration sits inside a media query. */
  media: string | null;
}

const componentTokens = new Set([
  "task-row-min-height",
  "task-row-padding-y",
  "task-row-indent",
  "place-dot-size",
  "checkbox-size",
  "checkbox-radius",
  "touch-target-min",
  "input-font-size-mobile",
  "icon-stroke-width",
  "icon-size",
  "control-height",
  "control-padding-x",
  "field-padding-x",
  "field-padding-y",
  "focus-ring-width",
  "focus-ring-offset",
  "focus-ring-offset-field",
  "opacity-disabled",
  "spinner-size",
  "spinner-stroke",
  "spinner-duration",
  "radio-dot-size",
]);

const declaration = /^\s*--([\w-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/;

/** Parses tokens.css, keeping the source comment written after each declaration. */
export function parseTokens(css: string = tokensCss): TokenEntry[] {
  const entries: TokenEntry[] = [];
  const selectors: string[] = [];
  let pending = "";
  for (const line of css.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.endsWith("{")) {
      selectors.push(`${pending} ${trimmed.slice(0, -1)}`.trim());
      pending = "";
      continue;
    }
    if (trimmed.endsWith(",") && !trimmed.startsWith("--")) {
      pending = `${pending} ${trimmed}`;
      continue;
    }
    if (trimmed === "}") {
      selectors.pop();
      continue;
    }
    const match = declaration.exec(line);
    if (!match) continue;
    const [, name, expression, source] = match as unknown as [string, string, string, string?];
    const scope = selectors.join(" ");
    entries.push({
      name,
      expression: expression.trim(),
      source: source ?? null,
      layer: name.startsWith("raw-") ? "raw" : componentTokens.has(name) ? "component" : "semantic",
      theme: scope.includes('"light"') ? "light" : scope.includes('"dark"') ? "dark" : null,
      media: selectors.find((s) => s.startsWith("@media")) ?? null,
    });
  }
  return entries;
}

export function findToken(name: string, theme: Theme | null = null): TokenEntry | undefined {
  return parseTokens().find((t) => t.name === name && t.media === null && t.theme === theme);
}
