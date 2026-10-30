import "server-only";
import { ensureDefaultList } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { unstable_rethrow } from "next/navigation";

/**
 * The user's default list id, created on the first visit; null when it could not be opened, so
 * `/` shows "Could not open your tasks." inside the shell instead of an error page.
 */
export async function openDefaultList(userId: string): Promise<string | null> {
  try {
    return await ensureDefaultList(getDb(), userId);
  } catch (error) {
    // Next's own control-flow errors (redirect, notFound, prerender bail-outs) must reach Next.
    unstable_rethrow(error);
    // A DrizzleQueryError's message holds the SQL params, so only a fixed line is logged.
    console.error("Could not open the default task list");
    return null;
  }
}
