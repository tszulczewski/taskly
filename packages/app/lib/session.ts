import "server-only";
import { getSessionUser } from "@taskly/core/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Pages cannot write cookies, so their session reads never renew (renewal happens in API calls).
async function pageSessionUser() {
  return getSessionUser(await headers(), { disableRefresh: true });
}

/** For protected pages: the signed-in user, or a redirect to /sign-in. */
export async function requireSessionUser() {
  const user = await pageSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For /sign-in and /sign-up: sends a signed-in visitor to /. */
export async function redirectIfSignedIn() {
  if (await pageSessionUser()) redirect("/");
}
