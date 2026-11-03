# AGENTS.md task router

- **Date:** 2026-11-02
- **Spec:** none
- **Outcome:** success

## Goal

Turn the root `AGENTS.md` into a task router (`task-router` skill): short root with the summary, hard rules and a `| Task | Read |` table; unit-only rules moved into per-unit `AGENTS.md` files; a dependency-free check script that fails on a missing routed path or an over-budget file.

## Steps taken

1. Discovery: `git status` (uncommitted: `skills-lock.json`, new skills, PR #45 review files; none touched). Instruction files: `AGENTS.md`, `packages/app/AGENTS.md` (only the two `next dev`-managed blocks). Units: `packages/{app,core,db,ui}`, `test/`. Commands from `package.json` and `.github/workflows/ci.yml`. Docs: `.ai/docs/*`, `CODE_REVIEW.md`, `SDLC.md`, `BACKWARD_COMPATIBILITY.md`, `README.md`, specs, lessons.
2. Owner decision: no `CLAUDE.md` shims ("claude.md is not required right now in claude, claude now using agents.md"). Keeps the 2026-11-02 decision.
3. Split the root rules. Moved: Routes, Client, PWA, SSE, `transpilePackages`, standalone output/entry, systemd bind and Apache/SSE proxy rules → `packages/app/AGENTS.md` (after the `next dev` blocks, which `upsertManagedBlock` preserves). Services, Better Auth (Google after MVP), client-IP/XFF and the Claude-client rule → `packages/core/AGENTS.md`. Migrations and local PostgreSQL → `packages/db/AGENTS.md`. The design-system pointer → `packages/ui/AGENTS.md` and a UI route. Integration-test rules → `test/AGENTS.md`. Stack bullets folded into one Stack line; the Monorepo table became the unit rows of the Task Router; the browser-bundle rule merged into Layering.
4. Dropped: the "GitHub Actions runs these checks … All jobs must pass before merging" line (CI enforces it and the gate already lists every check; replaced by the `CI failure` route). The root `nextjs-agent-rules` block is a duplicate of `packages/app`'s but was kept (General rules forbid touching it; lesson 2026-11-02).
5. Added (not moved): `packages/ui/AGENTS.md` lists CI's `design-system` job commands (`check:tokens`, `test:storybook`, `build-storybook`), the gap noted in the no-op audit run.
6. Root `AGENTS.md` gained a `## Task Router` table (15 rows). Repointed `BACKWARD_COMPATIBILITY.md` and `.ai/docs/runbook.md` from the old root deployment section to `packages/app/AGENTS.md`.
7. Added `.ai/scripts/check-agents-md.mjs` (`npm run check:agents`, no dependencies): fails on a missing routed path, an unrouted unit `AGENTS.md`, or a file over budget (root 150, unit 120 lines).

## Files changed

- `AGENTS.md`: 106 → 94 lines; Task Router added, unit-only rules moved out.
- `packages/app/AGENTS.md`: app section appended (managed blocks untouched), 50 lines.
- `packages/core/AGENTS.md` (16), `packages/db/AGENTS.md` (6), `packages/ui/AGENTS.md` (6), `test/AGENTS.md` (5): new.
- `.ai/scripts/check-agents-md.mjs`, `package.json` (`check:agents`): new check.
- `BACKWARD_COMPATIBILITY.md`, `.ai/docs/runbook.md`: pointers to the deployment rules.
- `.ai/lessons.md`: one lesson.

## Verification (commands run and results)

- `npm run check:agents`: pass (29 routed paths). Negative test: a route to `test/nope.ts` and a 135-line `test/AGENTS.md` both reported, exit 1; restored, pass again.
- `npm run format:check`: pass. `npm run lint`: 0 errors, 1 warning in the untracked installed skill `.agents/skills/om-share-this-session/` (not this change).
- Skipped: `typecheck`, `test`, `build`, `audit`, `test:integration`. No product code changed, and the new script is outside the coverage `include`.

## Problems / open questions

- Gaps (no doc, so no route): SSE/live updates and PWA (not built yet), Apache vhost/systemd unit files, the AI estimate prompt and `Estimator` contract beyond standards §3/§7.
- The check is not wired into CI (`.github/workflows/ci.yml`); that needs an owner decision.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-02: `next dev` rewrites only its managed blocks in `packages/app/AGENTS.md`; app rules live after them.

## Follow-up (2026-11-03): check wired into CI

- Owner asked to run the check in CI and commit. Added `npm run check:agents` as a step in the CI `lint` job after `npm run lint`. Added it to every place that lists the gate, so they stay identical: `AGENTS.md`, `SDLC.md`, `CODE_REVIEW.md`, `.ai/agentic.config.json`, `.ai/docs/engineering-standards.md` §8, `.github/pull_request_template.md`.
- Verified: `npm run check:agents` pass, `npm run format:check` pass, `npm run lint` exit 0 (the same untracked-skill warning), `.ai/agentic.config.json` parses. The CI step itself runs on the next push.
