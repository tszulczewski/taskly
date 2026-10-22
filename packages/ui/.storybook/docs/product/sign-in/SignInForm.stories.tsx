import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { FormField, Input, SignInForm, type SignInFormProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, messages, never, offline, validateSignIn } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";

const meta = {
  title: "Product/Sign-in/Sign-in form",
  component: SignInForm,
  decorators: [withDocFrame],
  args: {
    validate: validateSignIn,
    onSubmit: fn(answer({ ok: true })) as SignInFormProps["onSubmit"],
  },
  argTypes: { validate: { control: false }, onSubmit: { control: false } },
} satisfies Meta<typeof SignInForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const fill = async (canvas: ReturnType<typeof within>, email: string, password: string) => {
  await userEvent.type(canvas.getByLabelText("Email"), email);
  await userEvent.type(canvas.getByLabelText("Password"), password);
};

export const Playground: Story = {
  args: { signUpHref: "/sign-up" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna@example.com", "correct horse battery");
    await userEvent.keyboard("{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: "anna@example.com",
      password: "correct horse battery",
    });
    // Success only after the server answers; the button stays busy until the page changes.
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const SignUpClosed: Story = { args: { signUpHref: undefined } };

export const MissingFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(canvas.getByLabelText("Email")).toHaveFocus();
    await expect(canvas.getByText("Enter your email address.")).toBeVisible();
    await expect(canvas.getByText("Enter your password.")).toBeVisible();
  },
};

export const WrongPassword: Story = {
  args: { onSubmit: answer({ ok: false, formError: messages.wrongCredentials }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna@example.com", "wrong password");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.wrongCredentials);
    // What was typed stays, so the user only fixes the password.
    await expect(canvas.getByLabelText("Email")).toHaveValue("anna@example.com");
  },
};

export const RateLimited: Story = {
  args: { onSubmit: answer({ ok: false, formError: messages.rateLimited }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna@example.com", "wrong password");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.rateLimited);
  },
};

export const Offline: Story = {
  args: { onSubmit: offline },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna@example.com", "correct horse battery");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.unexpected);
  },
};

export const Pending: Story = {
  args: { onSubmit: fn(never) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna@example.com", "correct horse battery");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await userEvent.type(canvas.getByLabelText("Password"), "{Enter}");
    // A second click cannot spend a second rate-limit attempt (sign-in spec, UI/UX).
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  args: {
    signUpHref: "/sign-up",
    onSubmit: answer({ ok: false, formError: messages.rateLimited }),
  },
  render: (args) => (
    <Narrow>
      <SignInForm {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fill(canvas, "anna.kowalska-wisniewska@example.com", "x");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await canvas.findByRole("alert");
  },
};

export const Polish: Story = {
  args: {
    signUpHref: "/sign-up",
    text: {
      email: "E-mail",
      password: "Hasło",
      showPassword: "Pokaż hasło",
      submit: "Zaloguj się",
      submitting: "Logowanie…",
      signUp: "Załóż konto",
      unexpectedError: "Coś poszło nie tak. Spróbuj ponownie.",
    },
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <FormField label="Email">
            {(control) => <Input {...control} type="email" placeholder="anna@example.com" />}
          </FormField>
        ),
        why: "The label stays visible; the placeholder is only an example.",
      }}
      bad={{
        node: <Input aria-label="Email" type="email" placeholder="Email" />,
        why: "A placeholder as the name disappears while typing (WCAG 3.3.2).",
      }}
    />
  ),
};
