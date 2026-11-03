# packages/ui — design system (shadcn/ui, Storybook)

Reusable UI components. Project-wide rules and the Task Router: root `AGENTS.md`.

- Before any UI work read `.ai/docs/design-system.md`; it lists the Storybook pages to read and the decisions in `packages/ui/POSTEP.md`.
- CI also runs the `design-system` job for this package (`.github/workflows/ci.yml`): `npm run check:tokens`, `npm run test:storybook`, `npm run build-storybook`. Run them before calling a `packages/ui` change done.
