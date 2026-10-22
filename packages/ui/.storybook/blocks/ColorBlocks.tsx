import type { ColorRole, ContrastPair } from "./color-roles";
import { contrastPairs, placeTokens } from "./color-roles";
import { DocFrame } from "./DocFrame";
import { contrastRatio, toHex, useMeasuredTokens } from "./measure";
import { findToken } from "./tokens";

const cell = "border-b border-divider py-group pr-group align-top text-left";

function Swatch({ token, theme }: { token: string; theme: "dark" | "light" }) {
  const measured = useMeasuredTokens([token], theme)?.[token];
  return (
    <span className="inline-flex items-center gap-group">
      <span data-theme={theme} className="inline-flex rounded-control p-inline bg-page">
        <span
          aria-hidden="true"
          className="block size-touch rounded-control border border-control"
          style={{ background: `var(--${token})` }}
        />
      </span>
      <span className="text-meta numeric">
        {measured?.rgb ? toHex(measured.rgb) : "—"}
        {measured && measured.alpha !== null ? ` at ${Math.round(measured.alpha * 100)}%` : null}
      </span>
    </span>
  );
}

/** One row per semantic colour token: both theme values, purpose, and source from tokens.css. */
export function ColorRoleTable({ roles }: { roles: ColorRole[] }) {
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Token</th>
            <th className={cell}>Dark (default)</th>
            <th className={cell}>Light</th>
            <th className={cell}>Use for</th>
            <th className={cell}>Do not use for</th>
            <th className={cell}>Source</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.token}>
              <td className={cell}>
                <code>{role.token}</code>
              </td>
              <td className={cell}>
                <Swatch token={role.token} theme="dark" />
              </td>
              <td className={cell}>
                <Swatch token={role.token} theme="light" />
              </td>
              <td className={cell}>{role.use}</td>
              <td className={cell}>{role.avoid}</td>
              <td className={cell}>{findToken(role.token, "dark")?.source ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}

const names = [
  "Bathroom",
  "Living room",
  "Dining room",
  "Garden",
  "Kitchen",
  "Bedroom",
  "Pantry",
  "Lawn",
  "Perimeter strip",
  "Hallway",
];

/** Place dots always stand next to the place name: colour is never the only carrier (Luki 3). */
export function PlaceDots({ theme }: { theme?: "dark" | "light" }) {
  return (
    <DocFrame theme={theme} label={theme ? `${theme} theme, on the list surface` : undefined}>
      <ul className="bg-list rounded-surface p-inset flex flex-wrap gap-between-groups">
        {placeTokens.map((token, i) => (
          <li key={token} className="inline-flex items-center gap-inline text-meta text-muted">
            <span
              aria-hidden="true"
              className="size-dot rounded-full"
              style={{ background: `var(--${token})` }}
            />
            {names[i]}
            <code className="text-meta">{token.replace("color-", "")}</code>
          </li>
        ))}
      </ul>
    </DocFrame>
  );
}

function threshold(pair: ContrastPair) {
  return pair.kind === "text" ? 4.5 : 3;
}

/** Contrast measured in the browser from the live CSS variables, in both themes. */
export function ContrastTable() {
  const tokens = [...new Set(contrastPairs.flatMap((p) => [p.foreground, p.background]))];
  const dark = useMeasuredTokens(tokens, "dark");
  const light = useMeasuredTokens(tokens, "light");
  const ratio = (m: typeof dark, p: ContrastPair) => {
    const fg = m[p.foreground]?.rgb;
    const bg = m[p.background]?.rgb;
    return fg && bg ? contrastRatio(fg, bg) : Number.NaN;
  };
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Foreground</th>
            <th className={cell}>Background</th>
            <th className={cell}>Threshold</th>
            <th className={cell}>Dark</th>
            <th className={cell}>Light</th>
            <th className={cell}>Result</th>
          </tr>
        </thead>
        <tbody>
          {contrastPairs.map((pair) => {
            const d = ratio(dark, pair);
            const l = ratio(light, pair);
            const t = threshold(pair);
            const passes = d >= t && l >= t;
            const result = passes
              ? "Pass"
              : (pair.exception ??
                "Below threshold: fix before use (propose a darker or lighter value).");
            return (
              <tr key={`${pair.foreground}-${pair.background}`}>
                <td className={cell}>
                  <code>{pair.foreground}</code>
                </td>
                <td className={cell}>
                  <code>{pair.background}</code>
                </td>
                <td className={`${cell} numeric`}>
                  {t}:1 ({pair.kind === "text" ? "text, WCAG 1.4.3" : "UI, WCAG 1.4.11"})
                </td>
                <td className={`${cell} numeric`}>{d.toFixed(2)}:1</td>
                <td className={`${cell} numeric`}>{l.toFixed(2)}:1</td>
                <td className={cell}>
                  {passes ? "✓ " : "✗ "}
                  {result}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DocFrame>
  );
}
