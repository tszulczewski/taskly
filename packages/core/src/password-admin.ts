import "server-only";
import { runWithTransaction } from "@better-auth/core/context";
import { getAuth } from "./auth";
import { type SignUpInput, signUpInput } from "./schemas";

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
