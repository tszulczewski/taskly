# Tasks and subtasks (E01) implementation

- **Date:** 2026-10-29
- **Spec:** .ai/specs/2026-10-16-tasks-and-subtasks.md
- **Outcome:** in progress

## Goal

Implement the E01 spec task by task (tracker: `track.md`), one subagent and one commit per task, stopping after each phase for the owner's manual test.

## Steps taken

- Read `.ai/lessons.md` and the spec. Broke the spec's 11 steps into 17 tasks in three phases that match its PRs A/B/C (`track.md`). Branch `feat/e01-tasks-and-subtasks` off `main` at `9f99bbd`.
- Preconditions checked: sign-in Phase A is merged (#40); `engineering-standards.md` §6 already has the roll-up rule (Q3); issue #15 carries the rewritten AC1–AC7; Docker works in this session, so Testcontainers runs locally.
- Spec vs. code: step 8 asks for `npx shadcn@latest init` and new primitives in `packages/ui`. The design system (#30) has since added them, plus the task components in `packages/ui/src/product/tasks/`, so the screen reuses those.

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)
