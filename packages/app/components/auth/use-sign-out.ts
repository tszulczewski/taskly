"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { SignOutOtherDevicesResult } from "@taskly/ui";
import { useRouter } from "next/navigation";
import { ApiError, authCall } from "../../lib/api-client";

/** Drops this user's cached data and goes to `/sign-in`, as the 401 handler in `QueryProvider`. */
function useLeaveToSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return () => {
    queryClient.clear();
    router.replace("/sign-in");
    router.refresh();
  };
}

/**
 * Sign-out for `AppHeader`: resolves false when the call failed, leaving the cache and the page as
 * they are (the session may still be valid). Only a confirmed sign-out drops this user's cached
 * data and goes to `/sign-in`.
 */
export function useSignOut() {
  const leave = useLeaveToSignIn();
  return async (): Promise<boolean> => {
    try {
      await authCall("/api/auth/sign-out");
    } catch {
      return false;
    }
    leave();
    return true;
  };
}

/**
 * "Sign out of other devices" (#78, threat T-06): Better Auth's `revoke-other-sessions` deletes
 * every other session of the signed-in user and keeps this one, so the cache and the page stay. A
 * 401 means this session is gone too (another device signed it out first), so it goes to
 * `/sign-in` like any 401 (sign-in spec, "Session expired while the tasks screen is open"). Any
 * other failure leaves the page as it is; some other sessions may then still be valid.
 */
export function useSignOutOtherDevices() {
  const leave = useLeaveToSignIn();
  return async (): Promise<SignOutOtherDevicesResult> => {
    try {
      await authCall("/api/auth/revoke-other-sessions");
      return "done";
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) return "failed";
      leave();
      return "sessionEnded";
    }
  };
}
