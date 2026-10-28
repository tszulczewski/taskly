"use client";

import { signInInput } from "@taskly/core";
import { SignInForm as SignInFormView, type SignInField } from "@taskly/ui";
import { AUTH_MESSAGES, authCall } from "../../lib/api-client";
import { firstFieldErrors } from "../../lib/form-errors";
import { useAuthSubmit } from "./use-auth-submit";

export interface SignInFormProps {
  /** Decided by the page from `ALLOW_SIGN_UP`; the "Create an account" link shows only when open. */
  signUpOpen: boolean;
}

export function SignInForm({ signUpOpen }: SignInFormProps) {
  const onSubmit = useAuthSubmit<SignInField, Record<SignInField, string>>((values) =>
    authCall("/api/auth/sign-in/email", signInInput.parse(values)),
  );
  return (
    <SignInFormView
      validate={(values) => firstFieldErrors(signInInput, values)}
      onSubmit={onSubmit}
      signUpHref={signUpOpen ? "/sign-up" : undefined}
      text={{ unexpectedError: AUTH_MESSAGES.generic }}
    />
  );
}
