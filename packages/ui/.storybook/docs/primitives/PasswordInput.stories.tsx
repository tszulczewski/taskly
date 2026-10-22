import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button, FormField, PasswordInput } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const meta = {
  title: "Primitives/Password input",
  component: PasswordInput,
  decorators: [withDocFrame],
  args: { "aria-label": "Password", autoComplete: "current-password", disabled: false },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector("input") as HTMLInputElement;
    const toggle = canvas.getByRole("button", { name: "Show password" });
    await userEvent.type(input, "plaster-and-paint");
    await expect(input).toHaveAttribute("type", "password");
    // Keyboard: Tab moves from the field to the toggle, Space shows the password.
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(input).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  },
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Password input"
        cells={[
          { state: "empty", node: <PasswordInput aria-label="Empty" /> },
          {
            state: "filled, hidden",
            node: <PasswordInput aria-label="Hidden" defaultValue="plaster-and-paint" />,
          },
          {
            state: "focus (keyboard)",
            node: (
              <PasswordInput
                aria-label="Focused"
                defaultValue="plaster"
                data-preview-state="focus-visible"
              />
            ),
          },
          {
            state: "error",
            node: <PasswordInput aria-label="Invalid" aria-invalid defaultValue="short" />,
          },
          {
            state: "disabled",
            node: <PasswordInput aria-label="Disabled" disabled defaultValue="plaster-and-paint" />,
          },
        ]}
      />
    </Stack>
  ),
};

export const HiddenAgainAfterSubmit: Story = {
  render: () => (
    <form className="flex flex-col gap-between-groups" onSubmit={(event) => event.preventDefault()}>
      <FormField label="Password" hint="At least 10 characters">
        {(field) => <PasswordInput {...field} autoComplete="new-password" />}
      </FormField>
      <Button variant="primary" type="submit">
        Create account
      </Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Password");
    await userEvent.type(input, "plaster-and-paint");
    await userEvent.click(canvas.getByRole("button", { name: "Show password" }));
    await expect(input).toHaveAttribute("type", "text");
    await userEvent.click(canvas.getByRole("button", { name: "Create account" }));
    await expect(input).toHaveAttribute("type", "password");
  },
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <FormField label="Password" hint="At least 10 characters">
        {(field) => (
          <PasswordInput {...field} defaultValue="a-very-long-passphrase-for-the-renovation-app" />
        )}
      </FormField>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <FormField label="Hasło" hint="Co najmniej 10 znaków">
      {(field) => <PasswordInput {...field} toggleLabel="Pokaż hasło" />}
    </FormField>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <FormField label="Password" hint="At least 10 characters">
            {(field) => <PasswordInput {...field} />}
          </FormField>
        ),
        why: "The rule is visible before typing, and the user can check what they typed.",
      }}
      bad={{
        node: (
          <div className="flex flex-col gap-between-groups">
            <FormField label="Password">{(field) => <PasswordInput {...field} />}</FormField>
            <FormField label="Repeat password">{(field) => <PasswordInput {...field} />}</FormField>
          </div>
        ),
        why: "A second “Repeat password” field doubles the typing; the show-password button replaces it (sign-in spec, Q10).",
      }}
    />
  ),
};
