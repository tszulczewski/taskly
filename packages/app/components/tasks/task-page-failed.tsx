"use client";

import { ErrorState } from "@taskly/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export const PAGE_FAILED_TEXT = "Could not open your tasks.";

/**
 * "Page did not open" (spec E01, States; s04.21): the default list could not be opened, so there
 * is no quick add and no list. "Try again" renders the page on the server again.
 */
export function TaskPageFailed() {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  return (
    <ErrorState
      title={PAGE_FAILED_TEXT}
      onRetry={() => startTransition(() => router.refresh())}
      retrying={retrying}
    />
  );
}
