import type { ScreenId } from "./screens";

/**
 * s05–s08 are views inside s04 (map, section 1). TaskList keeps its open row, edit form and
 * dialog to itself, so on arrival the prototype opens them the way a person would: a click on the
 * title, on "Add subtask", or on "…" and a menu item. Nothing in the design system is changed.
 */
const presets: Partial<Record<ScreenId, { task: string; steps: Step[] }>> = {
  s05: { task: "Decorative wall", steps: ["open"] },
  s06: { task: "Curtain rods", steps: [{ menu: "Edit" }] },
  s07: { task: "Decorative wall", steps: ["open", "addSubtask"] },
  s08: { task: "Decorative wall", steps: [{ menu: "Delete" }] },
};

type Step = "open" | "addSubtask" | { menu: string };

const until = async <T>(find: () => T | null | undefined, timeout = 2000): Promise<T | null> => {
  const end = Date.now() + timeout;
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() > end) return null;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

const mainRows = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("li[data-move-id]")).filter(
    (row) => !row.parentElement?.closest("li[data-move-id]"),
  );

const titleOf = (row: HTMLElement) =>
  row.querySelector('[data-slot="task-title"]')?.textContent ?? "";

/**
 * The preset's task, or (when it was deleted or the account has other tasks) the first task with
 * subtasks, or the first task at all.
 */
const rowFor = (root: HTMLElement, title: string) => {
  const rows = mainRows(root);
  return (
    rows.find((row) => titleOf(row) === title) ??
    rows.find((row) => row.querySelector("li[data-move-id]")) ??
    rows[0]
  );
};

/** Runs the preset of `id` inside `root`; false when its task is gone (deleted earlier). */
export async function runPreset(id: ScreenId, root: HTMLElement): Promise<boolean> {
  const preset = presets[id];
  if (!preset) return true;
  const row = await until(() => rowFor(root, preset.task));
  const title = titleOf(row ?? root);
  if (!row) return false;
  let last: HTMLElement = row;
  for (const step of preset.steps) {
    if (step === "open") {
      row.querySelector<HTMLButtonElement>('button[data-slot="task-title"]')?.click();
    } else if (step === "addSubtask") {
      const add = await until(() =>
        Array.from(row.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Add subtask"),
        ),
      );
      add?.click();
      last = (await until(() => row.querySelector<HTMLElement>("form"))) ?? row;
    } else {
      const trigger = row.querySelector<HTMLButtonElement>(
        `button[aria-haspopup="menu"][aria-label="More actions for “${title}”"]`,
      );
      if (!trigger) return false;
      trigger.focus();
      // Radix opens a menu on pointerdown or Enter, not on click().
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      const item = await until(() =>
        Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
          (candidate) => candidate.textContent?.trim() === step.menu,
        ),
      );
      item?.click();
      if (step.menu === "Edit")
        last = (await until(() => row.querySelector<HTMLElement>("form"))) ?? row;
    }
  }
  // The engine scrolls to the top on arrival; show the opened part of the row.
  last.scrollIntoView({ block: "center" });
  return true;
}
