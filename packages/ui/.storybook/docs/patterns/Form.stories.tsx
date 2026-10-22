import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { SignUpForm, type SignUpFormProps } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { answer, messages, never, offline, validateSignUp } from "../../blocks/fake-api";

/**
 * The form pattern, shown on the sign-up form (three fields). Every state is its own story;
 * server answers are simulated (P1).
 */
const meta = {
  title: "Patterns/Form",
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

type Canvas = ReturnType<typeof within>;

const fillValid = async (canvas: Canvas) => {
  await userEvent.type(canvas.getByLabelText("Name"), "Anna");
  await userEvent.type(canvas.getByLabelText("Email"), "anna@example.com");
  await userEvent.type(canvas.getByLabelText("Password"), "correct horse battery");
};

const submit = (canvas: Canvas) =>
  userEvent.click(canvas.getByRole("button", { name: "Create account" }));

export const Empty: Story = {};

export const CheckedOnLeavingAField: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Tabbing through an empty field shows nothing; leaving a field after typing checks it.
    await userEvent.click(canvas.getByLabelText("Name"));
    await userEvent.tab();
    await expect(canvas.queryByText("Enter your name.")).toBeNull();
    await userEvent.type(canvas.getByLabelText("Email"), "anna@");
    await userEvent.tab();
    await expect(canvas.getByText("Enter an email address like anna@example.com.")).toBeVisible();
    await userEvent.type(canvas.getByLabelText("Email"), "example.com");
    await expect(canvas.queryByText("Enter an email address like anna@example.com.")).toBeNull();
  },
};

export const SubmittedWithErrors: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Email"), "anna@example.com");
    await submit(canvas);
    await expect(canvas.getByLabelText("Name")).toHaveFocus();
    await expect(canvas.getByText("Enter your name.")).toBeVisible();
    await expect(canvas.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(canvas.getByLabelText("Email")).toHaveValue("anna@example.com");
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Pending: Story = {
  args: { onSubmit: fn(never) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await fillValid(canvas);
    await submit(canvas);
    const button = canvas.getByRole("button", { name: "Creating account…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    // The busy button takes no clicks; Enter in a field is the other way to submit again.
    await userEvent.type(canvas.getByLabelText("Email"), "{Enter}");
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
  },
};

export const ConfirmedByServer: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await fillValid(canvas);
    await submit(canvas);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    // Done only after the server answered; the app then goes to `/` (sign-in spec, Q7).
    await expect(canvas.getByRole("button", { name: "Creating account…" })).toBeVisible();
  },
};

export const FieldErrorFromServer: Story = {
  args: {
    onSubmit: answer({ ok: false, fieldErrors: { name: "Use at most 100 characters." } }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillValid(canvas);
    await submit(canvas);
    await expect(await canvas.findByText("Use at most 100 characters.")).toBeVisible();
    await expect(canvas.getByLabelText("Name")).toHaveFocus();
  },
};

export const ServerError: Story = {
  args: { onSubmit: answer({ ok: false, formError: messages.invalidSignUp }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillValid(canvas);
    await submit(canvas);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.invalidSignUp);
    await expect(canvas.getByLabelText("Name")).toHaveValue("Anna");
  },
};

export const NoNetwork: Story = {
  args: { onSubmit: offline },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillValid(canvas);
    await submit(canvas);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(messages.unexpected);
    await expect(canvas.getByRole("button", { name: "Create account" })).not.toHaveAttribute(
      "aria-busy",
    );
  },
};
