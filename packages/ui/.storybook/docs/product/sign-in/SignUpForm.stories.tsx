import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button, SignUpForm, type SignUpFormProps } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { answer, messages, validateSignUp } from "../../../blocks/fake-api";
import { DoDont, Narrow } from "../../../blocks/Primitives";

const meta = {
  title: "Product/Sign-in/Sign-up form",
  component: SignUpForm,
  decorators: [withDocFrame],
  args: {
    validate: validateSignUp,
    signInHref: "/sign-in",
    onSubmit: fn(answer({ ok: true })) as SignUpFormProps["onSubmit"],
  },
  argTypes: { validate: { control: false }, onSubmit: { control: false } },
} satisfies Meta<typeof SignUpForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Name"), "Anna");
    await userEvent.type(canvas.getByLabelText("Email"), "anna@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "short");
    await userEvent.tab();
    // Leaving the field after typing checks it; the hint already said why.
    await expect(canvas.getByText("Use at least 10 characters.")).toBeVisible();
    await userEvent.type(canvas.getByLabelText("Password"), " and longer");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};

export const EmailAlreadyUsed: Story = {
  args: { onSubmit: answer({ ok: false, formError: messages.signUpFailed }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Name"), "Anna");
    await userEvent.type(canvas.getByLabelText("Email"), "anna@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.signUpFailed);
  },
};

export const LongNameNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <SignUpForm {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText("Name"),
      "Anna Maria Kowalska-Wiśniewska-Szczepańska",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(canvas.getByLabelText("Email")).toHaveFocus();
  },
};

export const Polish: Story = {
  args: {
    text: {
      name: "Imię",
      email: "E-mail",
      password: "Hasło",
      passwordHint: "Co najmniej 10 znaków",
      showPassword: "Pokaż hasło",
      submit: "Załóż konto",
      submitting: "Zakładanie konta…",
      signIn: "Zaloguj się",
      unexpectedError: "Coś poszło nie tak. Spróbuj ponownie.",
    },
  },
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: <Button variant="primary">Create account</Button>,
        why: "The button says what happens.",
      }}
      bad={{
        node: <Button variant="primary">Submit</Button>,
        why: "“Submit” names the mechanism, not the result (Luki 5).",
      }}
    />
  ),
};
