"use client";

import type { SubmitResult } from "@taskly/ui";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api-client";

/**
 * Submit handler for the auth forms: runs the Better Auth call, shows its user-facing message on
 * failure, and on success always lands on `/` (spec Q7), refreshing the server-rendered session.
 */
export function useAuthSubmit<F extends string, V>(call: (values: V) => Promise<void>) {
  const router = useRouter();
  return async (values: V): Promise<SubmitResult<F>> => {
    try {
      await call(values);
    } catch (error) {
      if (error instanceof ApiError) return { ok: false, formError: error.message };
      throw error;
    }
    router.replace("/");
    router.refresh();
    return { ok: true };
  };
}
