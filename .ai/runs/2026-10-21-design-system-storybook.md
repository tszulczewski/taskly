# Design system and Storybook in packages/ui

- **Date:** 2026-10-21
- **Spec:** none (task prompt `.ai/design/prompt-storybook.md`; progress and approved decisions in `packages/ui/POSTEP.md`)
- **Outcome:** in progress

## Goal

Build the Taskly design system in `packages/ui` with Storybook documentation in `packages/ui/.storybook`, in stages 0–5, stopping after each stage for the owner's "dalej".

## Steps taken

- Stage 0 (2026-10-21): inventory and plan written to `packages/ui/POSTEP.md`; owner accepted proposals P1–P5.
- Stage 1 (2026-10-21): foundations.
  - Installed Storybook 10.6.3 (react-vite), addon-docs (+ remark-gfm), addon-a11y, addon-vitest with Vitest 5.0.4 browser mode (Playwright Chromium), Vite 8, Tailwind 4.3.3, fontsource Instrument Sans, lucide-react. Configured by hand (no `storybook init`, so no onboarding addon).
  - Tokens in three layers (`src/styles/tokens.css`), Tailwind bridge without the default theme (`theme.css`), base styles, package export `@taskly/ui/styles.css`.
  - Re-measured contrast from the written values: identical to tokeny.md; only the decorative divider (T1) is below 3:1.
  - Theme switch on the root element, a11y test = error, one Vitest project per theme.
  - Seven Foundations pages with live token blocks; `check:tokens` script.
- Stage 2 (2026-10-21): owner accepted F1–F8 and K1–K5.
  - Batch 1: `shadcn add button input textarea label` (CLI 4.22.1), then rewrote all four on tokens and added TextAction/Link, FormField, PasswordInput; `cn` helper with token-aware tailwind-merge.
  - Docs pages with 13 sections and 40 stories in `.storybook/docs/primitives/`; frozen states via `@custom-variant` overrides in `preview.css`.

- Stage 2 reverted (2026-10-21), at the owner's request ("cofnąć się do stanu etapu 1, tak jakbyśmy nie robili etapu 2"):
  - Deleted `components.json`, `src/components/`, `src/lib/`, `.storybook/docs/primitives/`, `.storybook/blocks/Matrix.tsx`.
  - Restored `src/index.ts`; uninstalled `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`.
  - Removed the K1–K5 tokens and utilities, the frozen-state variants, the docs frame decorator, the `-0` exception in `check-tokens`, the stage 2 POSTEP sections and the two batch 1 lessons.
  - Kept everything from stage 1, including F1–F8 and the CI job (F8). K1–K5 answers are no longer recorded in POSTEP.

## Files changed

- `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/vitest.config.ts`
- `packages/ui/src/styles/{tokens,theme,base,index}.css`
- `packages/ui/.storybook/` (`main.ts`, `preview.tsx`, `preview.css`, `manager.ts`, `vite-env.d.ts`, `blocks/*`, `docs/foundations/*`)
- `packages/ui/scripts/check-tokens.mjs`, `packages/ui/POSTEP.md`
- root `package.json` (scripts), `package-lock.json`, `.gitignore`, `.prettierignore`, `eslint.config.mjs` (ignore storybook-static)
- `.ai/lessons.md`
- Stage 2 batch 1: `packages/ui/components.json`, `src/lib/cn.ts`, `src/components/ui/*` (+ tests), `src/index.ts`, `src/styles/{tokens,theme,base}.css`, `scripts/check-tokens.mjs` (allow `-0`), `.storybook/{main.ts,preview.tsx,preview.css}`, `.storybook/blocks/{Matrix.tsx,tokens.ts}`, `.storybook/docs/primitives/*`

## Verification (commands run and results)

Stage 1:
- `npm run check:tokens`: no values outside the token system. A fixture with `bg-zinc-900 text-white p-[13px] p-4 text-sm rounded-lg shadow-md border-2 duration-150 md:flex`, `#fff`, `rgb(…)`, `oklch(…)` produced 13 findings and exit 1; `data-[state=open]:` was correctly not flagged.
- `npm run test:storybook`: 14 files, 54 tests passed (27 stories × dark and light). A temporary low-contrast story failed `color-contrast` in both themes (gate verified), then removed.
- `npm run build-storybook`: success. Built Storybook served locally and checked with agent-browser: all 7 Foundations docs pages in dark and light (screenshots), manager branding "Taskly", tab title "… ⋅ Taskly", no onboarding checklist, GFM tables render, Instrument Sans loads locally, column story at 320px has no horizontal scroll.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass. `npm test`: 88 tests, 100% coverage. `npm run build` (app): success.
- Not run: `npm run audit`, `npm run test:integration` (no app or DB change).

Stage 2, batch 1:
- `check:tokens` clean; `format:check`, `lint`, `typecheck` pass; `npm test`: 113 tests, 100% statements/branches/functions/lines.
- `test:storybook`: 134 passed (67 stories × 2 themes), a11y = error.
- `build-storybook` and app `npm run build` succeed. Built Storybook checked with agent-browser: the six Primitives docs pages (dark, plus light spot checks), state matrices in both themes, 320px stories without horizontal scroll, manager shows only "Taskly".
- Not run: `npm run audit`, `npm run test:integration` (no app or DB change).

## Problems / open questions

- npm 11 skipped install scripts not covered by `allowScripts` (esbuild postinstall among them); Storybook and Vite builds still work. Not changed.
- Stage 1 proposals F1–F8: accepted.
- Batch 1 open points B1–B3 wait for the owner (see `packages/ui/POSTEP.md`).

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-21 Tailwind 4 token bridge (`@theme inline reference`).
- 2026-10-21 Storybook 10 options and per-theme Vitest projects.
- 2026-10-21 `pkill -f` kills the tool's own shell.
- 2026-10-21 Frozen hover/focus states by overriding Tailwind variants in Storybook CSS.
- 2026-10-21 jsdom accessible names drop spaces inside a span.
