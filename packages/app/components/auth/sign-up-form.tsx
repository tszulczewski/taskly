"use client";

import { signUpInput } from "@taskly/core";
import { SignUpForm as SignUpFormView, type SignUpField } from "@taskly/ui";
import { AUTH_MESSAGES, authCall } from "../../lib/api-client";
import { firstFieldErrors } from "../../lib/form-errors";
import { useAuthSubmit } from "./use-auth-submit";

/** Shown on `/sign-up` only while sign-up is open; the new account is signed in at once. */
export function SignUpForm() {
  const onSubmit = useAuthSubmit<SignUpField, Record<SignUpField, string>>((values) =>
    authCall("/api/auth/sign-up/email", signUpInput.parse(values)),
  );
  return (
    <SignUpFormView
      validate={(values) => firstFieldErrors(signUpInput, values)}
      onSubmit={onSubmit}
      signInHref="/sign-in"
      text={{ unexpectedError: AUTH_MESSAGES.generic }}
    />
  );
}
