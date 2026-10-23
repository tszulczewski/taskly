#!/usr/bin/env node
/**
 * Fails when design-system code uses a value that does not come from a token:
 * - a literal colour (hex, rgb, hsl, oklch, …) anywhere but src/styles/tokens.css;
 * - a Tailwind palette class (bg-zinc-900, text-white);
 * - an arbitrary Tailwind value (p-[13px], bg-[#fff]);
 * - a default Tailwind scale class, which does not exist in this theme and would silently do
 *   nothing (p-4, text-sm, rounded-lg, shadow-md, border-2, duration-150); zero (min-w-0,
 *   inset-y-0, border-b-0) is allowed because theme.css maps --spacing-0, and so are fractions (w-1/2), which
 *   are proportions of the parent, not design values;
 * - in src/ only: a raw length or duration in CSS outside tokens.css.
 *
 * A line may opt out with a comment containing "check-tokens-allow: <reason>".
 * Usage: node scripts/check-tokens.mjs [dir …]   (defaults to src and .storybook)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tokensFile = path.join(root, "src/styles/tokens.css");
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["src", ".storybook"];
const extensions = new Set([".ts", ".tsx", ".css", ".mdx", ".js", ".mjs"]);

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const colorUtilities =
  "bg|text|border|border-[trblxyse]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|decoration|accent|caret|shadow|inset-shadow|drop-shadow|text-shadow";

const rules = [
  {
    id: "literal-colour",
    pattern: /#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g,
    applies: () => true,
  },
  {
    id: "tailwind-palette",
    pattern: new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:${colorUtilities})-(?:(?:${palette})-\\d{2,3}|white|black)(?:\\/\\d+)?(?![\\w-])`,
      "g",
    ),
    applies: () => true,
  },
  {
    // Arbitrary values (p-[13px]) and properties ([color:red]); arbitrary variants (data-[state=open]:, group-data-[state=open]/name:) are fine.
    id: "tailwind-arbitrary-value",
    pattern:
      /(?<![\w-])(?:[\w-]+:)*-?[a-z][\w-]*-\[[^\]\s]+\](?!:|\/[\w-]+:)|(?<![\w\]])\[[a-z-]+:[^\]\s]+\](?!:)/g,
    applies: (file) => !file.endsWith(".css"),
  },
  {
    id: "tailwind-default-scale",
    pattern: new RegExp(
      [
        "(?<![\\w-])(?:[\\w-]+:)*-?(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|inset|top|right|bottom|left|translate-x|translate-y)-(?:(?!0(?![\\d.]))\\d+(?:\\.5)?|px)(?![\\w/-])",
        "(?<![\\w-])(?:[\\w-]+:)*text-(?:xs|sm|base|lg|xl|\\dxl)(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*rounded(?:-[trblse]{1,2})?-(?:xs|sm|md|lg|xl|\\dxl)(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*shadow(?:-(?:xs|sm|md|lg|xl|2xl|inner|none))?(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*(?:border|border-[trblxyse]|outline|ring|ring-offset|outline-offset|divide-[xy]|duration|delay|opacity)-(?!0(?!\\d))\\d+(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*leading-(?:none|tight|snug|normal|relaxed|loose|\\d+)(?![\\w-])",
        "(?<![\\w-])(?:[\\w-]+:)*(?:sm|md|lg|xl|2xl):[\\w-]",
      ].join("|"),
      "g",
    ),
    applies: (file) => /\.(tsx?|mdx|jsx?)$/.test(file),
    // In MDX prose words like "shadow" are English, so only className values are checked.
    classesOnly: true,
  },
  {
    id: "raw-length-in-css",
    pattern: /(?<![\w-])-?\d*\.?\d+(?:px|rem|em|ms|s|vh|vw|ch)(?![\w-])/g,
    applies: (file) => file.endsWith(".css") && file.startsWith(path.join(root, "src")),
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "storybook-static") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (extensions.has(path.extname(entry))) yield full;
  }
}

/** Blank out comments so prose about rules ("never use bg-zinc-900") is not flagged. */
function stripComments(text, file) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (!file.endsWith(".css"))
    out = out.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
  if (file.endsWith(".mdx")) out = out.replace(/`[^`\n]*`/g, blank);
  return out;
}

/** MDX: keep only className attribute values, blank everything else (line numbers survive). */
function classNamesOnly(text) {
  const keep = new Array(text.length).fill(false);
  for (const m of text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const start = m.index + m[0].indexOf(m[1] ?? m[2]);
    for (let i = start; i < start + (m[1] ?? m[2]).length; i++) keep[i] = true;
  }
  return [...text].map((c, i) => (keep[i] || c === "\n" ? c : " ")).join("");
}

const findings = [];
for (const target of targets) {
  const dir = path.resolve(root, target);
  for (const file of walk(dir)) {
    if (file === tokensFile || file === path.join(root, "scripts/check-tokens.mjs")) continue;
    const original = readFileSync(file, "utf8").split("\n");
    const stripped = stripComments(original.join("\n"), file);
    const lines = stripped.split("\n");
    const classLines = file.endsWith(".mdx") ? classNamesOnly(stripped).split("\n") : lines;
    lines.forEach((line, i) => {
      if (original[i]?.includes("check-tokens-allow:")) return;
      for (const rule of rules) {
        if (!rule.applies(file)) continue;
        const text = rule.classesOnly ? classLines[i] : line;
        for (const match of text.matchAll(rule.pattern)) {
          findings.push(
            `${path.relative(process.cwd(), file)}:${i + 1}:${match.index + 1}  ${rule.id}  ${match[0].trim()}`,
          );
        }
      }
    });
  }
}

if (findings.length) {
  console.error(`check-tokens: ${findings.length} value(s) outside the token system:\n`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.warn("check-tokens: no values outside the token system.");
