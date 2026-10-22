"use client";

import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Link } from "../../components/ui/link";
import { PasswordInput } from "../../components/ui/password-input";
import { useForm, type FieldErrors, type SubmitResult } from "../../lib/use-form";

export type SignUpField = "name" | "email" | "password";
export type SignUpValues = Record<SignUpField, string>;

export interface SignUpFormText {
  name: string;
  email: string;
  password: string;
  passwordHint: string;
  showPassword: string;
  submit: string;
  submitting: string;
  signIn: string;
  unexpectedError: string;
}

const defaultText: SignUpFormText = {
  name: "Name",
  email: "Email",
  password: "Password",
  passwordHint: "At least 10 characters",
  showPassword: "Show password",
  submit: "Create account",
  submitting: "Creating account…",
  signIn: "Sign in",
  unexpectedError: "Something went wrong. Try again.",
};

export interface SignUpFormProps {
  /** Field messages from the shared schema (`signUpInput`). */
  validate: (values: SignUpValues) => FieldErrors<SignUpField>;
  /** Creates the account; on success the app signs in and goes to `/` (sign-in spec, Q7). */
  onSubmit: (values: SignUpValues) => Promise<SubmitResult<SignUpField>>;
  /** Link back to `/sign-in` for someone who already has an account (owner decision E11). */
  signInHref: string;
  text?: Partial<SignUpFormText>;
}

/** Name, email and password for the owner's account, shown only while sign-up is open (Q1, Q4). */
export function SignUpForm({ validate, onSubmit, signInHref, text }: SignUpFormProps) {
  const t = { ...defaultText, ...text };
  const form = useForm<SignUpField>({
    initialValues: { name: "", email: "", password: "" },
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
  });

  return (
    <form {...form.formProps} data-slot="sign-up-form" className="flex flex-col gap-between-groups">
      {form.formError ? <Alert title={form.formError} /> : null}
      <FormField label={t.name} error={form.errors.name}>
        {(control) => <Input {...control} {...form.field("name")} autoComplete="name" />}
      </FormField>
      <FormField label={t.email} error={form.errors.email}>
        {(control) => (
          <Input {...control} {...form.field("email")} type="email" autoComplete="email" />
        )}
      </FormField>
      <FormField label={t.password} hint={t.passwordHint} error={form.errors.password}>
        {(control) => (
          <PasswordInput
            {...control}
            {...form.field("password")}
            autoComplete="new-password"
            toggleLabel={t.showPassword}
          />
        )}
      </FormField>
      <Button type="submit" variant="primary" loading={form.pending} className="wide:self-start">
        {form.pending ? t.submitting : t.submit}
      </Button>
      <p>
        <Link href={signInHref}>{t.signIn}</Link>
      </p>
    </form>
  );
}
