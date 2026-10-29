import "server-only";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { signUpInput } from "./schemas";

/**
 * Better Auth `hooks.before`: applies the shared sign-up rules (trimmed name) before the
 * library's handler, which still checks `disableSignUp` and validates the fields it owns.
 */
export const signUpBeforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-up/email") return;
  // `loose` keeps the library-owned optional fields (image, callbackURL, rememberMe).
  const parsed = signUpInput.loose().safeParse(ctx.body);
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", {
      code: "INVALID_SIGN_UP_INPUT",
      message: "Invalid sign-up details",
    });
  }
  return { context: { body: parsed.data } };
});
