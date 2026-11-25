import "server-only";
import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { sharedAuthOptions } from "./auth-options";

/**
 * Better Auth for offline maintenance (`auth:set-password`): the app's shared options, and nothing
 * that needs more than `DATABASE_URL`. It gets a throwaway secret rather than the deployment's
 * `BETTER_AUTH_SECRET`, and no logger: the caller owns all output, and adapter logs can carry SQL
 * parameters such as a password hash.
 */
function createMaintenanceAuth() {
  const shared = sharedAuthOptions();
  return betterAuth({
    secret: randomBytes(32).toString("base64"),
    logger: { disabled: true },
    ...shared,
    emailAndPassword: { ...shared.emailAndPassword, disableSignUp: true },
  });
}

let instance: ReturnType<typeof createMaintenanceAuth> | undefined;

/**
 * The maintenance instance's context (adapter, password hasher), never the instance: without its
 * `handler` and `api` no request can reach its endpoints, which have no rate limit, no sign-up hook
 * and a secret that dies with the process. Not in the `server` barrel; only `password-admin` uses it.
 */
export function getMaintenanceContext() {
  return (instance ??= createMaintenanceAuth()).$context;
}
