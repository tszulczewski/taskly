import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

const productName = "Taskly";

addons.setConfig({
  theme: create({ base: "light", brandTitle: productName, brandUrl: undefined }),
});

// The browser tab shows only the product name, not the tool behind the documentation.
const retitle = () => {
  const title = document.title.replace(/\s*⋅\s*Storybook$/, "");
  const next = title.endsWith(productName) ? title : `${title} ⋅ ${productName}`;
  if (document.title !== next) document.title = next;
};
new MutationObserver(retitle).observe(document.querySelector("title") ?? document.head, {
  childList: true,
  subtree: true,
  characterData: true,
});
retitle();
