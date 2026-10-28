"use client";

import { useRef } from "react";
import { Skeleton } from "../../components/ui/skeleton";
import { Surface } from "../../components/ui/surface";
import { TextAction } from "../../components/ui/text-action";
import { defaultExpensesText } from "./text";
import { UnestimatedTasks, type UnestimatedTasksProps } from "./unestimated-tasks";

export interface FutureExpensesProps extends Omit<UnestimatedTasksProps, "tasks" | "onEmptied"> {
  /** loading: the first load. error: it failed (a message with "Try again"). */
  status: "loading" | "error" | "ready";
  /** As shown, e.g. "12 000–15 000 zł" or one amount (R18); null when no open task has an estimate. */
  total: string | null;
  /** Open main tasks without an estimate (R10, R13). */
  unestimated: UnestimatedTasksProps["tasks"];
  onRetry: () => void;
  retrying?: boolean;
}

/**
 * The one summary of version 1 (D19): what the open main tasks may still cost, as one min–max
 * range in a single line on its own surface (R17, R02.7, P04, `color-surface-list`), under the
 * list's name (decision I1). The app computes the range on the server, each task with subtasks
 * counting their sum once (standards §6). Tasks without an estimate are named under it (Luki 9).
 */
export function FutureExpenses({
  status,
  total,
  unestimated,
  onRetry,
  retrying = false,
  text,
  ...unestimatedProps
}: FutureExpensesProps) {
  const t = { ...defaultExpensesText, ...text };
  const totalRef = useRef<HTMLParagraphElement>(null);

  if (status === "loading") {
    return (
      <Surface padding="inset">
        <div data-slot="future-expenses" aria-busy="true" className="flex flex-col gap-inline">
          <Skeleton className="w-1/3" />
          <span role="status" className="sr-only">
            {t.loading}
          </span>
        </div>
      </Surface>
    );
  }

  if (status === "error") {
    return (
      <Surface padding="inset">
        <div data-slot="future-expenses" className="flex flex-wrap items-center gap-x-group">
          <p role="alert" className="text-danger">
            {t.loadError}
          </p>
          <TextAction disabled={retrying} aria-busy={retrying} onClick={onRetry}>
            {retrying ? t.retrying : t.retry}
          </TextAction>
        </div>
      </Surface>
    );
  }

  return (
    <Surface padding="inset">
      <div data-slot="future-expenses" className="flex flex-col gap-inline">
        {/* A status, so a change (a task completed, an estimate added) is read out. */}
        <p
          ref={totalRef}
          role="status"
          tabIndex={-1}
          className="flex flex-wrap items-baseline gap-x-group outline-none focus-visible:focus-ring"
        >
          <span className="text-muted">{t.label}</span>
          {total === null ? (
            <span className="text-muted">{t.noTotal}</span>
          ) : (
            <span className="numeric text-heading font-strong">{total}</span>
          )}
        </p>
        <UnestimatedTasks
          {...unestimatedProps}
          tasks={unestimated}
          onEmptied={() => totalRef.current?.focus()}
          text={text}
        />
      </div>
    </Surface>
  );
}
