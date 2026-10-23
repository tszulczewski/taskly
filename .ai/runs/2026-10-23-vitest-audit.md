# Vitest security patch (audit)

- **Date:** 2026-10-23
- **Spec:** none (decision M4 in `packages/ui/POSTEP.md`, design-system stage 5)
- **Outcome:** success

## Goal

Clear the moderate `npm audit` finding for the Vitest family (GHSA-p458-7748-mcp3: the Vitest server misapplies `server.fs.deny`) on a branch of its own, separate from the design system and from the Next.js upgrade.

## Steps taken

- Branch `chore/vitest-audit` from `origin/main` (54d75c2).
- `npm install -D vitest@^5.0.5 @vitest/coverage-v8@^5.0.5` at the root. No `npm audit fix --force`.
- Lockfile changes are patch releases only: `vitest`, `@vitest/coverage-v8`, `@vitest/mocker`, `@vitest/spy` 5.0.4 → 5.0.5, and their tooling `vite` 8.3.4 → 8.3.5, `rolldown` (and its platform bindings) 1.2.14 → 1.2.15, `@oxc-project/types` 0.154.0 → 0.155.0, `postcss` 8.5.30 → 8.5.31.

## Files changed

- `package.json`, `package-lock.json`

## Verification (commands run and results)

- `format:check`, `lint`, `typecheck`, `build`: pass. (The first run of `format:check` and `lint` failed only on `packages/ui/storybook-static/`, untracked build output left on disk from the design-system branch, where it is ignored; moved aside, then both passed.)
- `npm test`: 16 files, 88 tests, coverage thresholds met.
- `npm audit`: Vitest is no longer reported. `npm run audit` still fails on `next` 16.0.0–16.4.0 (critical), fixed by the separate Next.js 16.4.2 upgrade; `braces` and `esbuild` remain.
- Not run: `test:integration` (no Docker and no `TEST_DATABASE_URL` locally); CI runs it.

- Rebased on `main` after #29 (`next` 16.4.2, 8777f99): no conflicts; `npm install` left the lockfile unchanged and `npm ci --dry-run` passes. Gate rerun: `format:check`, `lint`, `typecheck`, `test` (88), `build` and `npm run audit` all pass.

## Problems / open questions

- (Before the rebase) the `audit` job failed on `next`; #29 fixed it.
- `feat/design-system-foundations` adds `@vitest/browser` and `@vitest/browser-playwright` 5.0.4 in `packages/ui`. Whichever branch merges second must bump them to 5.0.5 with the same version as `vitest`, and regenerate the lockfile.

## Lessons recorded (links into .ai/lessons.md)

- None.
