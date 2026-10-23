import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button, Input, SignUpClosed } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow } from "../../../blocks/Primitives";

const meta = {
  title: "Product/Sign-in/Sign-up closed",
  component: SignUpClosed,
  decorators: [withDocFrame],
  args: { signInHref: "/sign-in" },
} satisfies Meta<typeof SignUpClosed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "Sign in" });
    await expect(link).toHaveAttribute("href", "/sign-in");
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: (args) => (
    <Narrow>
      <SignUpClosed {...args} />
    </Narrow>
  ),
};

export const Polish: Story = {
  args: {
    message: "Rejestracja jest zamknięta. Poproś właściciela tego Taskly o konto.",
    signIn: "Zaloguj się",
  },
};

export const DoAndDont: Story = {
  render: (args) => (
    <DoDont
      good={{ node: <SignUpClosed {...args} />, why: "Says why and offers the way back." }}
      bad={{
        node: (
          <div className="flex w-full flex-col gap-group">
            <Input aria-label="Email" disabled />
            <Button variant="primary" disabled>
              Create account
            </Button>
          </div>
        ),
        why: "A disabled form never says why it is disabled.",
      }}
    />
  ),
};
