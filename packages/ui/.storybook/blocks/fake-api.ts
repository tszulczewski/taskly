import type { FieldErrors, SignInValues, SignUpValues, SubmitResult } from "../../src";

/**
 * Simulated server answers for stories (P1: async handlers in props, no MSW). Messages are the
 * sign-in spec's (UI/UX, Messages).
 */
export const messages = {
  wrongCredentials: "Email or password is incorrect.",
  rateLimited: "Too many attempts. Wait a few seconds and try again.",
  signUpFailed: "Could not create the account.",
  invalidSignUp: "Check your details and try again.",
  signOutFailed: "Could not sign out. Try again.",
  unexpected: "Something went wrong. Try again.",
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Answers after a short delay, so the pending state is visible. */
export const answer =
  <F extends string>(result: SubmitResult<F>, ms = 400) =>
  async (): Promise<SubmitResult<F>> => {
    await wait(ms);
    return result;
  };

/** A request that never reaches the server, as when the phone is offline. */
export const offline = async (): Promise<never> => {
  await wait(200);
  throw new TypeError("Failed to fetch");
};

/** A request that never finishes, to show the pending state. */
export const never = () => new Promise<never>(() => {});

/**
 * Example field rules. The real ones come from `signInInput` / `signUpInput` in `@taskly/core`;
 * the spec fixes only the password hint, so these message texts are examples (E3).
 */
const email = (value: string) =>
  value.trim() === ""
    ? "Enter your email address."
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? undefined
      : "Enter an email address like anna@example.com.";

export const validateSignIn = (values: SignInValues): FieldErrors<keyof SignInValues> => ({
  email: email(values.email),
  password: values.password === "" ? "Enter your password." : undefined,
});

export const validateSignUp = (values: SignUpValues): FieldErrors<keyof SignUpValues> => ({
  name: values.name.trim() === "" ? "Enter your name." : undefined,
  email: email(values.email),
  password: values.password.length < 10 ? "Use at least 10 characters." : undefined,
});
