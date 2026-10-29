import "server-only";
import { runWithTransaction } from "@better-auth/core/context";
import { getAuth } from "./auth";
import { NotFoundError } from "./errors";
import { type SignUpInput, setPasswordInput, signUpInput } from "./schemas";

/**
 * Creates an email + password user the way Better Auth's sign-up handler does, but without
 * its `disableSignUp` gate and HTTP rate limit. For tests and maintenance, never for a route.
 * A duplicate email rejects with the database's unique-constraint error.
 */
export async function createPasswordUser(input: SignUpInput) {
  const { name, email, password } = signUpInput.parse(input);
  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(password);
  // User and credential account commit together, so a failed account insert leaves no user.
  const user = await runWithTransaction(ctx.adapter, async () => {
    const created = await ctx.internalAdapter.createUser(
      { name, email: email.toLowerCase() },
      { method: "email-password" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: hash,
    });
    return created;
  });
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Replaces a user's password and signs out all their sessions, committing both or neither.
 * An offline maintenance step: stop the app first, so no in-flight sign-in that checked the old
 * password can create a session after the revocation. Never exposed as an endpoint.
 */
export async function setPassword(email: string, newPassword: string) {
  const input = setPasswordInput.parse({ email, newPassword });
  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(input.newPassword);
  await runWithTransaction(ctx.adapter, async () => {
    const found = await ctx.internalAdapter.findUserByEmail(input.email);
    if (!found) throw new NotFoundError("User");
    const userId = found.user.id;
    // updatePassword silently matches no row when there is no credential account; refuse rather
    // than revoke sessions and report a reset that set no password.
    if (!(await ctx.internalAdapter.findCredentialAccount(userId))) {
      throw new NotFoundError("Credential account");
    }
    await ctx.internalAdapter.updatePassword(userId, hash);
    await ctx.internalAdapter.deleteUserSessions(userId);
  });
}
