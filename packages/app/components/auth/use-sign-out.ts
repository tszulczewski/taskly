"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authCall } from "../../lib/api-client";

/**
 * Sign-out for `AppHeader`: resolves false when the call failed, leaving the cache and the page as
 * they are (the session may still be valid). Only a confirmed sign-out drops this user's cached
 * data and goes to `/sign-in`.
 */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async (): Promise<boolean> => {
    try {
      await authCall("/api/auth/sign-out");
    } catch {
      return false;
    }
    queryClient.clear();
    router.replace("/sign-in");
    router.refresh();
    return true;
  };
}
