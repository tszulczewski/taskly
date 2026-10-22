import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { CatalogGroupList, missingPreviews } from "../../blocks/Catalog";
import { catalog } from "../../blocks/catalog";

/** The Components page: one list per group; the checks keep the catalog complete. */
const meta = {
  title: "Design system/Components",
  component: CatalogGroupList,
  parameters: { a11y: { context: "body" } },
} satisfies Meta<typeof CatalogGroupList>;

export default meta;
type Story = StoryObj<typeof meta>;

const pages = import.meta.glob<{ default: { title?: string } }>(
  ["../primitives/*.stories.tsx", "../product/**/*.stories.tsx"],
  { eager: true },
);

export const Primitives: Story = {
  args: { group: "Primitives" },
  play: async () => {
    const documented = Object.values(pages)
      .map((page) => page.default.title)
      .filter((title): title is string => title !== undefined && !title.endsWith("/Screens"));
    const listed = catalog.map((entry) => entry.title);
    // Every component page is in the catalog, and every catalog entry has a page and a preview.
    await expect([...documented].sort()).toEqual([...listed].sort());
    await expect(missingPreviews).toEqual([]);
  },
};

export const AppShell: Story = { args: { group: "Product · App shell" } };

export const SignIn: Story = { args: { group: "Product · Sign-in" } };

export const Tasks: Story = { args: { group: "Product · Tasks" } };

export const Places: Story = { args: { group: "Product · Places" } };

export const Expenses: Story = { args: { group: "Product · Expenses" } };
