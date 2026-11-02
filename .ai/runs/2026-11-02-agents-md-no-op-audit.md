# AGENTS.md no-op audit and cleanup

- **Date:** 2026-11-02
- **Spec:** none
- **Outcome:** success

## Goal

Audit `AGENTS.md` for instructions that cost context without changing behavior (`eliminate-no-op` skill), propose a rewrite, and apply the owner's decisions.

## Steps taken

1. Read the instruction hierarchy (`AGENTS.md`, `CLAUDE.md`, `packages/app/AGENTS.md`, `.ai/docs/engineering-standards.md`, `.ai/lessons.md`) and the tooling it describes (ESLint, tsconfig, Vitest, CI, `next.config.ts`, `auth.ts`).
2. Ran the skill's `analyze.py` (a patched copy: the original crashes on `foo**`-style references) and classified all 74 directives. Report: `.ai/analysis/2026-11-02-agents-md-no-op-report.md`.
3. Owner decisions, all applied:
   - apply the rewrite (merge duplicated rules into the Engineering standards digest, cut the `.ai/` tree and lines duplicated in `.ai/lessons.md`, drop prose already enforced by ESLint/tsconfig);
   - move the Runbook verbatim to `.ai/docs/runbook.md`, with pointers from `AGENTS.md`;
   - move the content of `CLAUDE.md` into `AGENTS.md` (today's date for prefixes, read the relevant spec at task start, "autonomous or long" runs) and delete `CLAUDE.md`;
   - remove "(or `numeric`)" from the money rule;
   - narrow "Use subagents" to broad codebase searches, never a review agent without asking.

## Files changed

- `AGENTS.md`: rewrite and decisions above (about 3,920 → 2,900 estimated tokens).
- `CLAUDE.md`: deleted.
- `.ai/docs/runbook.md`: new, the Runbook moved verbatim.
- `test/auth-set-password.integration.test.ts`: comment points to the runbook's new path.
- `.ai/analysis/2026-11-02-agents-md-no-op-report.md`: audit report (cut lines kept verbatim).
- `.ai/lessons.md`: one lesson.

## Verification (commands run and results)

See the PR description for the commands run and their results.

## Problems / open questions

- With `CLAUDE.md` gone, Claude Code may not load `AGENTS.md` by itself. The owner was told and chose to delete it. Agents should read `AGENTS.md` at session start.
- Not fixed (observations in the report): the documented gate omits CI's `design-system` job (`check:tokens`, `test:storybook`, `build-storybook`), and "Plan complex tasks first" vs "Fix bugs autonomously" has no precedence rule for a multi-file bug fix.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-02: `next dev` writes its managed blocks into `packages/app/AGENTS.md`, not the root file.
