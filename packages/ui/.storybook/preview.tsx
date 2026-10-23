import type { Decorator, Preview } from "@storybook/react-vite";
import "./preview.css";

export type Theme = "dark" | "light";

/**
 * The theme lives on the root element (not a wrapper), so dialogs, menus and popovers that
 * portal outside the story get it too.
 */
const withTheme: Decorator = (Story, context) => {
  if (!docsFrame) {
    const theme: Theme = context.globals.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
  }
  return <Story />;
};

/**
 * A story shown in an iframe on a docs page (`docs.story.inline: false`, used for overlays)
 * gets no globals from the toolbar, so it mirrors the docs page's root theme instead.
 * The addon-docs `IFrameStory` block gives its frame the id `iframe--<story id>`.
 */
const docsFrame = window.frameElement?.id.startsWith("iframe--") ? window.frameElement : null;

if (docsFrame) {
  const docsRoot = docsFrame.ownerDocument.documentElement;
  const mirror = () => {
    document.documentElement.dataset.theme = docsRoot.dataset.theme === "light" ? "light" : "dark";
  };
  mirror();
  new MutationObserver(mirror).observe(docsRoot, { attributeFilter: ["data-theme"] });
}

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
            "Epics",
            [
              "Sign-in",
              "E01 Tasks and subtasks",
              "E02 Order, markers and places",
              "E03 Completion and future expenses",
              "E04 Later",
            ],
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
          [
            "Button",
            "Text action and link",
            "Input",
            "Password input",
            "Textarea",
            "Form field",
            "Checkbox",
            "Radio group",
            "Surface",
            "Alert",
            "Skeleton",
            "Collapsible",
            "Confirm dialog",
            "Menu",
            "Popover",
            "Tooltip",
            "Empty state",
            "Error state",
          ],
          "Product",
          [
            "App shell",
            ["Theme toggle", "App shell", "Screens"],
            "Sign-in",
            ["Auth card", "Sign-in form", "Sign-up form", "Sign-up closed", "Screens"],
            "Tasks",
            [
              "Quick add",
              "Task list",
              "Task row",
              "Task form",
              "Estimate range",
              "Delete task dialog",
              "Drag handle",
              "Markers",
              "Task checkbox",
              "Subtask progress",
              "Complete task dialog",
              "Screens",
            ],
            "Places",
            ["Place picker", "Place tag", "Place color picker"],
            "Expenses",
            ["Future expenses", "Unestimated tasks"],
          ],
          "Patterns",
          [
            "Form",
            "List",
            "Details in row",
            "Quick capture",
            "Inline edit",
            "Delete confirmation",
            "Optimistic change",
            "Reorder",
            "Complete and reopen",
          ],
        ],
      },
    },
  },
};

export default preview;
