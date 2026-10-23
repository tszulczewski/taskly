import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button, FormField, Input, PasswordInput, Surface } from "../../../src";
import { withDocFrame } from "../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../blocks/Primitives";

const tasks = [
  { title: "Remove the old tiles", amount: "800–1 000 zł" },
  { title: "Level the bathroom wall", amount: "1 200–1 500 zł" },
  { title: "Paint the bathroom ceiling", amount: "No estimate" },
];

function TaskLines() {
  return (
    <ul>
      {tasks.map((t) => (
        <li
          key={t.title}
          className="flex min-h-row items-center justify-between gap-between-groups border-b border-divider px-inset last:border-b-0"
        >
          <span className="font-strong">{t.title}</span>
          <span className="numeric text-muted">{t.amount}</span>
        </li>
      ))}
    </ul>
  );
}

function SignInCard() {
  return (
    <Surface asChild padding="inset" className="max-w-measure">
      <section aria-label="Sign in" className="flex flex-col gap-between-groups">
        <FormField label="Email">
          {(f) => <Input {...f} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Password">
          {(f) => <PasswordInput {...f} autoComplete="current-password" />}
        </FormField>
        <Button variant="primary" type="submit">
          Sign in
        </Button>
      </section>
    </Surface>
  );
}

const meta = {
  title: "Primitives/Surface",
  component: Surface,
  decorators: [withDocFrame],
  args: { padding: "inset", children: "Future expenses: 12 000–15 000 zł" },
  argTypes: {
    padding: { control: "inline-radio", options: ["none", "inset"] },
    children: { control: "text" },
  },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <StateRow
        title='padding="none": the task list'
        cells={[
          {
            state: "rows bring their own padding",
            node: (
              <Surface className="w-full">
                <TaskLines />
              </Surface>
            ),
          },
        ]}
      />
      <StateRow
        title='padding="inset": the sign-in card'
        cells={[{ state: "free content", node: <SignInCard />, wide: true }]}
      />
    </Stack>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Surface has no interactive states"
        cells={[
          {
            state: "as rendered",
            node: <Surface padding="inset">Future expenses: 12 000–15 000 zł</Surface>,
          },
          {
            state: "light theme, pinned",
            node: (
              <div data-theme="light" className="bg-page p-inset">
                <Surface padding="inset">Future expenses: 12 000–15 000 zł</Surface>
              </div>
            ),
          },
        ]}
      />
    </Stack>
  ),
};

export const SectionLandmark: Story = {
  render: () => <SignInCard />,
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole("region", { name: "Sign in" });
    await expect(region).toHaveAttribute("data-slot", "surface");
  },
};

export const ManyRowsNarrow: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <Surface>
        <TaskLines />
        <TaskLines />
      </Surface>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => <Surface padding="inset">Przyszłe wydatki: 12 000–15 000 zł</Surface>,
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <Surface className="w-full">
            <TaskLines />
          </Surface>
        ),
        why: "One continuous surface; rows are separated by a 1px line (R02.1).",
      }}
      bad={{
        node: (
          <Surface padding="inset" className="flex w-full flex-col gap-group">
            {tasks.map((t) => (
              <Surface key={t.title} padding="inset">
                {t.title}
              </Surface>
            ))}
          </Surface>
        ),
        why: "A card for every task inside a panel is the card-in-card look we avoid (A02, A01.3).",
      }}
    />
  ),
};
