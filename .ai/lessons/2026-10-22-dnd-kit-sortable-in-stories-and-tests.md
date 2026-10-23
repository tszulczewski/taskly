# dnd-kit sortable rows in stories and unit tests

- **Date:** 2026-10-22
- **Trigger:** run
- **Related:** `packages/ui/src/product/tasks/{sortable.tsx,task-row.tsx,sortable.test.tsx}`, `.storybook/docs/patterns/Reorder.stories.tsx`, run `.ai/runs/2026-10-21-design-system-storybook.md`

## Context
Building reorderable task rows (E02) with `@dnd-kit/core` 6 and `@dnd-kit/sortable` 10, with 100% unit coverage and Storybook play tests in Chromium.

## Finding
- A story that ends while a keyboard drag is active leaves dnd-kit's window key listeners in place. The next story in the same file lost the Space typed into an input ("Buysanitary silicone"). The story passed on its own, so the leak comes from the previous story.
- ESLint `react-hooks/refs` reports "Cannot access refs during render" for `sortable.setNodeRef` / `sortable.attributes` when the `useSortable` result is kept as one object. Destructuring it fixes that.
- Radix `PopoverAnchor` throws "must be used within `Popover`" when the `Popover` root is rendered only conditionally.
- The keyboard activator reads the synthetic `event.target` and calls the synthetic `event.preventDefault()`; the mouse activator reads `event.nativeEvent`. Unit tests that call `activators[0].handler` need both.
- A real keyboard pick-up works in jsdom (Space on the handle sets `isDragging`), so the lifted-row branch can be covered without mocks. `DndContext` is a `memo` object: to capture its props in tests, wrap it in a function component in a `vi.mock` factory (with `vi.hoisted` storage).
- An element hidden with `hidden wide:inline-flex` is out of the accessibility tree below the breakpoint: `getByRole` fails, so assert `queryByRole(...)` is null.
- jsdom has no `ResizeObserver`. Radix Radio or Checkbox inside a `<form>` renders a hidden input measured with `useSize`, so stub it in that test file.

## Resolution
Stories that pick a row up end with `{Escape}`. The `useSortable` result is destructured. The `Popover` root is always rendered and only its content depends on `places`. Tests stub `ResizeObserver` and pass both event shapes.

## Rule going forward
End every play function that starts a drag by dropping or cancelling it. Destructure dnd-kit hook results. Keep Radix roots unconditional when an anchor or trigger always renders.
