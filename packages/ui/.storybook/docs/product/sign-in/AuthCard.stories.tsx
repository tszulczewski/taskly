import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { AuthCard, SignInForm, SignUpClosed, Surface } from "../../../../src";
import { answer, validateSignIn } from "../../../blocks/fake-api";
import { DoDont } from "../../../blocks/Primitives";

const meta = {
  title: "Product/Sign-in/Auth card",
  component: AuthCard,
  parameters: { layout: "fullscreen" },
  args: { title: "Sign in", children: null },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof AuthCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <AuthCard {...args}>
      <SignInForm validate={validateSignIn} onSubmit={answer({ ok: true })} />
    </AuthCard>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("main")).toContainElement(
      canvas.getByRole("heading", { level: 1, name: "Sign in" }),
    );
  },
};

export const ShortContent: Story = {
  args: { title: "Create an account" },
  render: (args) => (
    <AuthCard {...args}>
      <SignUpClosed signInHref="/sign-in" />
    </AuthCard>
  ),
};

export const Polish: Story = {
  args: { title: "Zaloguj się" },
  render: (args) => (
    <AuthCard {...args}>
      <SignInForm
        validate={validateSignIn}
        onSubmit={answer({ ok: true })}
        text={{
          email: "E-mail",
          password: "Hasło",
          showPassword: "Pokaż hasło",
          submit: "Zaloguj się",
        }}
      />
    </AuthCard>
  ),
};

export const DoAndDont: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="bg-page p-inset">
      <DoDont
        good={{
          node: <Surface padding="inset">One card with the form.</Surface>,
          why: "One surface on the page background (R01.1).",
        }}
        bad={{
          node: (
            <Surface padding="inset">
              <Surface padding="inset">A card inside a card.</Surface>
            </Surface>
          ),
          why: "A panel inside a panel (A02).",
        }}
      />
    </div>
  ),
};
