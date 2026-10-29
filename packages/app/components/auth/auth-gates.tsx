import "server-only";
import { getEnv } from "@taskly/core/server";
import { SignUpClosed } from "@taskly/ui";
import { connection } from "next/server";
import { redirectIfSignedIn } from "../../lib/session";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

// Request time only: a value read while prerendering would be frozen into the build (spec, Cache
// Components), so flipping ALLOW_SIGN_UP on the server would change nothing.
async function signUpOpenForVisitor() {
  await redirectIfSignedIn();
  await connection();
  return getEnv().ALLOW_SIGN_UP;
}

/** The dynamic part of `/sign-in`; render it inside `<Suspense>`. */
export async function SignInGate() {
  return <SignInForm signUpOpen={await signUpOpenForVisitor()} />;
}

/** The dynamic part of `/sign-up`; render it inside `<Suspense>`. */
export async function SignUpGate() {
  return (await signUpOpenForVisitor()) ? <SignUpForm /> : <SignUpClosed signInHref="/sign-in" />;
}
