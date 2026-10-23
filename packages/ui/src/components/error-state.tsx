import type { ReactNode } from "react";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";

export interface ErrorStateProps {
  /** What failed: "Could not load your tasks." */
  title: ReactNode;
  /** What to do or what was kept, in normal text (C7). */
  children?: ReactNode;
  onRetry: () => void;
  /** The retry request is running. */
  retrying?: boolean;
  retryLabel?: string;
  retryingLabel?: string;
}

/** Replaces content that failed to load, with a way to try again (spec E01: error state). */
export function ErrorState({
  title,
  children,
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  retryingLabel = "Trying again…",
}: ErrorStateProps) {
  return (
    <Alert
      data-slot="error-state"
      title={title}
      action={
        <Button loading={retrying} onClick={onRetry}>
          {retrying ? retryingLabel : retryLabel}
        </Button>
      }
    >
      {children}
    </Alert>
  );
}
