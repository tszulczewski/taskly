# E02 spec writing (order, markers and spaces)

- **Date:** 2026-11-03
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Outcome:** success (draft spec written; spec review not run yet)

## Goal

Write the E02 spec (#12; stories #17, #18, #19) with `om-spec-writing`, skeleton first, stopping at the Open Questions gate.

## Steps taken

1. Read `.ai/lessons.md`, the backlog, issues #12, #17–#19, decisions 2026-10-21 and 2026-11-03, brief rows D01, D07, D09, D21, D25, D26, the E03 spec, `packages/db/src/schema.ts`, `packages/core/src/tasks.ts`, `lists.ts`, `schemas.ts`, the task route, and the design system's places, markers and sortable components and docs (`PlacePicker.mdx`, `Reorder.mdx`, `E02OrderMarkersPlaces.mdx`, `place-data.ts`, `task-data.ts`).
2. Wrote the skeleton with four Open Questions and stopped.
3. Owner's answers (2026-11-03): Q1 one spec, three phases; Q2 markers → spaces → reorder; Q3 places per user, only the list owner's assignable; Q4 yes, drop the colour line from #19.
4. Edited issue #19: removed "choosing a space's colour (version 1)" from Out of scope and recorded the change under "Changes (2026-11-03)".
5. Wrote the full spec: research, architecture, data model (`0002` markers, `0003` places + `task_places` with backfill), API contracts, UI/UX (pending-change replay shared with E03), edge cases, risks, acceptance criteria additions (Q3-1, S-1, C-1, M-1), three phases, 17 steps.
6. Data-model graph: Mermaid in the spec, interactive HTML in `.ai/data-model/`.
7. Review checklist applied by the author. The skill delegates the scope-cohesion check to a fresh-context subagent; `AGENTS.md` forbids launching a review agent without asking, so it was not launched (offered to the owner).

## Files changed

- `.ai/specs/2026-11-03-order-markers-and-spaces.md` (new)
- `.ai/data-model/2026-11-03-order-markers-and-spaces.html` (new)
- `.ai/runs/2026-11-03-e02-spec-writing.md` (this log)
- GitHub issue #19 body (Out of scope line, Changes note)

## Verification (commands run and results)

- `npx prettier --check` on the HTML: passes after `--write` (Markdown is in `.prettierignore`).
- No code changed; the gate was not run.

## Problems / open questions

- Design points decided by the agent, not the owner (all reversible, stated in the spec): places ordered by a fractional `position`; colour = (number of places mod 10) + 1; `name_key` computed in `core` instead of `lower()` in SQL; per-user advisory lock for the limit of 20; seeding inside `ensureDefaultList` plus a migration backfill; stale moves refused with 409 "The list changed. Try again."; marker and place toggles share E03's per-tree mutation scope, generalized whichever epic ships second.
- The `lower()` / `LC_CTYPE` concern is general PostgreSQL behaviour, not checked against the local database's locale.

## Lessons recorded (links into .ai/lessons.md)

None: no correction or new pitfall this run.

## Revision after the pre-implementation audit (2026-11-03)

Source: `.ai/analysis/2026-11-03-pre-implement-order-markers-and-spaces.md` (no-go, F1–F5), run by the owner. All five findings accepted and applied to the spec (see its "Review changes" table):

- F2: `PlacePicker` gets `status` (`loading` / `error` / `ready`) and `onRetry`; new step 11 (design system), P-1.
- F3: `place_owners` table (seeded marker + per-user lock), `ensurePlaces` first in every places operation; seeding removed from `ensureDefaultList`; no backfill; S-2, C-1 extended.
- F4: one mutation queue per list (`scope: tasks:<listId>`) for every task mutation, E01 and E03 included; Q-1. One-line "Superseded in part" note added to the E03 spec header (design, not requirements).
- F5: M-1 rewritten (A, C, D, B → 409), M-2 added (A, C, B → no-op).
- F1: the owner accepted the revision (2026-11-03); status set to `ready`, then committed and merged on the owner's request.
- Data-model graph (Mermaid and HTML) gains `place_owners`; Phase 2 and 3 steps renumbered (2 → 13 steps, 3 → 18).

Files changed in this revision: the E02 spec, the E03 spec (header note), the data-model HTML, this log, `.ai/lessons.md`.
