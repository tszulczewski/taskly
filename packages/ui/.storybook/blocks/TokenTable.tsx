import { DocFrame } from "./DocFrame";
import { useMeasuredTokens } from "./measure";
import { parseTokens } from "./tokens";

const cell = "border-b border-divider py-group pr-group align-top text-left";

/** Lists tokens with their expression, the resolved value and the source comment in tokens.css. */
export function TokenTable({ names }: { names: string[] }) {
  const entries = parseTokens().filter((t) => names.includes(t.name) && t.theme !== "light");
  const resolved = useMeasuredTokens(names, "dark");
  return (
    <DocFrame>
      <table className="w-full border-collapse text-meta">
        <thead>
          <tr className="text-muted">
            <th className={cell}>Token</th>
            <th className={cell}>Layer</th>
            <th className={cell}>Defined as</th>
            <th className={cell}>Resolves to (this page width)</th>
            <th className={cell}>Source</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((t) => (
            <tr key={`${t.name}-${t.media ?? ""}`}>
              <td className={cell}>
                <code>{t.name}</code>
              </td>
              <td className={cell}>{t.layer}</td>
              <td className={cell}>
                <code>{t.expression}</code>
                {t.media ? <span className="text-muted"> in {t.media}</span> : null}
              </td>
              <td className={`${cell} numeric`}>
                {t.media ? "—" : (resolved[t.name]?.value ?? "—")}
              </td>
              <td className={cell}>{t.source ?? "Proposal (see the note above the token)"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocFrame>
  );
}
