import type { Decorator, Preview } from "@storybook/react-vite";
import "./preview.css";

export type Theme = "dark" | "light";

/**
 * The theme lives on the root element (not a wrapper), so dialogs, menus and popovers that
 * portal outside the story get it too.
 */
const withTheme: Decorator = (Story, context) => {
  const theme: Theme = context.globals.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark (default)" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "dark" },
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    viewport: {
      options: {
        phone320: {
          name: "Phone 320",
          styles: { width: "320px", height: "640px" },
          type: "mobile",
        },
        tablet768: {
          name: "Tablet 768",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop1440: {
          name: "Desktop 1440",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
      },
    },
    options: {
      storySort: {
        order: [
          "Design system",
          [
            "Start here",
            "Components",
            "How to choose",
            "Usage and accessibility",
            "Content",
            "What to avoid",
            "What is missing",
            "Contributing",
          ],
          "Foundations",
          [
            "Color",
            "Typography",
            "Spacing and layout",
            "Shape and depth",
            "Motion",
            "Icons",
            "Themes",
          ],
          "Primitives",
          "Product",
          "Patterns",
        ],
      },
    },
  },
};

export default preview;
