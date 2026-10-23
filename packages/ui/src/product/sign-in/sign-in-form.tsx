"use client";

import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Link } from "../../components/ui/link";
import { PasswordInput } from "../../components/ui/password-input";
import { useForm, type FieldErrors, type SubmitResult } from "../../lib/use-form";

export type SignInField = "email" | "password";
export type SignInValues = Record<SignInField, string>;

export interface SignInFormText {
  email: string;
  password: string;
  showPassword: string;
  submit: string;
  submitting: string;
  signUp: string;
  unexpectedError: string;
}

const defaultText: SignInFormText = {
  email: "Email",
  password: "Password",
  showPassword: "Show password",
  submit: "Sign in",
  submitting: "Signing in…",
  signUp: "Create an account",
  unexpectedError: "Something went wrong. Try again.",
};

export interface SignInFormProps {
  /** Field messages from the shared schema (`signInInput`). */
  validate: (values: SignInValues) => FieldErrors<SignInField>;
  /** Calls the auth endpoint; the app maps its errors to the spec's messages. */
  onSubmit: (values: SignInValues) => Promise<SubmitResult<SignInField>>;
  /** Link to sign-up; pass it only while sign-up is open (sign-in spec, Q1). */
  signUpHref?: string;
  text?: Partial<SignInFormText>;
}

/** Email and password, "Sign in", and "Create an account" while sign-up is open (sign-in spec). */
export function SignInForm({ validate, onSubmit, signUpHref, text }: SignInFormProps) {
  const t = { ...defaultText, ...text };
  const form = useForm<SignInField>({
    initialValues: { email: "", password: "" },
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
  });

  return (
    <form {...form.formProps} data-slot="sign-in-form" className="flex flex-col gap-between-groups">
      {form.formError ? <Alert title={form.formError} /> : null}
      <FormField label={t.email} error={form.errors.email}>
        {(control) => (
          <Input {...control} {...form.field("email")} type="email" autoComplete="email" />
        )}
      </FormField>
      <FormField label={t.password} error={form.errors.password}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.field("password")}
            autoComplete="current-password"
            toggleLabel={t.showPassword}
          />
        )}
      </FormField>
      <Button type="submit" variant="primary" loading={form.pending} className="wide:self-start">
        {form.pending ? t.submitting : t.submit}
      </Button>
      {signUpHref ? (
        <p>
          <Link href={signUpHref}>{t.signUp}</Link>
        </p>
      ) : null}
    </form>
  );
}
