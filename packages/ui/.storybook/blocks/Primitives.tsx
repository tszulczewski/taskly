import type { ReactNode } from "react";

/**
 * Documentation-only layouts for component pages. They arrange real components from the package;
 * nothing here is exported from @taskly/ui.
 */

export interface StateCell {
  state: string;
  node: ReactNode;
  /** Take the whole row, for content that fills its container (skeletons, lists). */
  wide?: boolean;
}

/** A row of the state matrix: one variant shown in each state, with the state written under it. */
export function StateRow({ title, cells }: { title: string; cells: StateCell[] }) {
  return (
    <section className="flex flex-col gap-group">
      <h3 className="text-body font-strong">{title}</h3>
      <div className="flex flex-wrap items-start gap-between-groups">
        {cells.map((cell) => (
          <div
            key={cell.state}
            className={
              cell.wide ? "flex w-full flex-col gap-inline" : "flex flex-col items-start gap-inline"
            }
          >
            {cell.node}
            <span className="text-meta text-muted">{cell.state}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Stacks rows of a state matrix or examples with the "between groups" space. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-section">{children}</div>;
}

interface Example {
  node: ReactNode;
  /** One sentence: why this is right or wrong. */
  why: string;
}

/** A do / don't pair side by side; the verdict is written in words, not only shown by colour. */
export function DoDont({ good, bad }: { good: Example; bad: Example }) {
  return (
    <div className="grid gap-between-groups wide:grid-cols-2">
      {[
        { verdict: "Do", example: good },
        { verdict: "Don't", example: bad },
      ].map(({ verdict, example }) => (
        <figure
          key={verdict}
          className="flex flex-col gap-group rounded-surface border border-divider p-inset"
        >
          <div className="flex flex-col items-start gap-group">{example.node}</div>
          <figcaption className="text-meta">
            <strong className={verdict === "Do" ? "text-action" : "text-danger"}>{verdict}.</strong>{" "}
            <span className="text-muted">{example.why}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Shows content at the narrowest supported width (320px) inside a docs page. */
export function Narrow({ children }: { children: ReactNode }) {
  return <div className="doc-narrow flex flex-col gap-group">{children}</div>;
}
