import "server-only";
import type { ReactNode } from "react";
import { requireSessionUser } from "../../lib/session";
import { AppShell } from "./app-shell";

/**
 * A protected page's body; render it inside `<Suspense>`. A visitor without a session is sent to
 * `/sign-in` before `children` render, so nothing behind it loads for them.
 */
export async function SignedInShell({ children }: { children: ReactNode }) {
  await requireSessionUser();
  return <AppShell>{children}</AppShell>;
}
