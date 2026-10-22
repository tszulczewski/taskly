import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AuthCard, SignInForm, SignUpClosed, SignUpForm } from "../../../../src";
import { answer, messages, validateSignIn, validateSignUp } from "../../../blocks/fake-api";

/** Full screens S1–S3 (sign-in spec, UI/UX). The state map is on the Sign-in screens docs page. */
const meta = {
  title: "Product/Sign-in/Screens",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop1440", isRotated: false } };
const tablet = { viewport: { value: "tablet768", isRotated: false } };
const phone = { viewport: { value: "phone320", isRotated: false } };

const signIn = (signUpOpen: boolean, onSubmit = answer<"email" | "password">({ ok: true })) => (
  <AuthCard title="Sign in">
    <SignInForm
      validate={validateSignIn}
      onSubmit={onSubmit}
      signUpHref={signUpOpen ? "/sign-up" : undefined}
    />
  </AuthCard>
);

const signUp = (
  <AuthCard title="Create an account">
    <SignUpForm validate={validateSignUp} onSubmit={answer({ ok: true })} signInHref="/sign-in" />
  </AuthCard>
);

const closed = (
  <AuthCard title="Create an account">
    <SignUpClosed signInHref="/sign-in" />
  </AuthCard>
);

export const SignIn: Story = { globals: desktop, render: () => signIn(false) };

export const SignInWithSignUpOpen: Story = { globals: tablet, render: () => signIn(true) };

export const SignInFailed: Story = {
  globals: phone,
  render: () => signIn(false, answer({ ok: false, formError: messages.wrongCredentials })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Email"), "anna@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "wrong password");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.wrongCredentials);
  },
};

export const SignUpOpen: Story = { globals: desktop, render: () => signUp };

export const SignUpOpenPhone: Story = { globals: phone, render: () => signUp };

export const SignUpIsClosed: Story = { globals: phone, render: () => closed };
