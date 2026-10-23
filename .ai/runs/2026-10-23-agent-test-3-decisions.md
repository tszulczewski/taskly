# Decisions from the third agent test (A, U1–U4, C)

- **Date:** 2026-10-23
- **Spec:** none (gaps from `.ai/runs/2026-10-23-shopping-screen-agent-test-3.md`, branch `design/shopping-screen-agent-test-3`, af84092)
- **Outcome:** success

## Goal

Apply what the owner accepted on 2026-10-23, all as recommended: the A fixes (docs that only write down what code and examples already do: gaps 6–10, 13, 15–17), U1 variant A (first line of a row's text level with its 44px controls), U2 (skeleton of a one-line row), U3 (fractional skeleton widths), U4 (E04 Later assumptions apply until the spec), C (product questions into the E04 Later table). Branch `design/agent-test-3-decisions` from `main` (a9b7b93), PR when done.

## Steps taken

1. Measured before deciding U1 (built Storybook, Product/Tasks/Screens › Progress Desktop): rows without a meta line have the checkbox centre exactly on the title's first line; every row with a meta line has it 9.4px lower (title + meta = 40.6px, centred in the 44px block). The full fix makes rows with a meta line about 76px. Asked the owner again with that number; answer: full fix.
2. Implemented variant A: component token `task-row-text-offset` (`calc((touch − body font × body line-height) / 2)`, about 11px, one line with `/* prettier-ignore */` because the Storybook token parser reads one declaration per line), utility `pt-row-text`, `TaskRow` text block `pt-row-text` instead of `justify-center`, and a story Task row › First Line Lines Up (box centre = title's first line centre in every row; one-line row 68px). Alignment passed; the height check failed at 320px: below 640px the estimate sits under the title, so every task row on a phone has two lines and grows 68 → about 79px (with a meta line about 86 → 98px). My question had only given desktop numbers.
3. Asked again with the phone numbers; the owner chose **variant B**. Reverted all of step 2 (`git checkout` of the five files) before any commit; no code changes remain.
4. A fixes: Patterns › List (Text block, new row New item, Order), Optimistic change (what shows at once vs. what waits), App shell (`h1`), Spacing and layout › Relations (page groups), Start here and Checkbox › When to use (N5), E04 Later (test branches instead of the missing log path).
5. U1 (B): Checkbox › Content and List › Text block describe the real behaviour (centred while it fits in 44px, longer text grows down, the box stays at the top).
6. U2: Skeleton § 8 and List › Loading (one body-size bar, `w-2/3`, three rows). U3: Start here step 3 and Skeleton § 8 (fractions are proportions; `check:tokens` already allows them). U4 and C: E04 Later (rule sentence, third-test column, two new questions).
7. `.ai/docs/design-system.md` mirrors all of the above; `packages/ui/POSTEP.md` has stage 8 (test summary, A, U1–U4 with both U1 rounds, C, implementation). Two lessons added.

## Files changed

- `.ai/docs/design-system.md`
- `packages/ui/POSTEP.md`
- `packages/ui/.storybook/docs/`: `patterns/List.mdx`, `patterns/OptimisticChange.mdx`, `primitives/Checkbox.mdx`, `primitives/Skeleton.mdx`, `product/shell/AppShell.mdx`, `foundations/SpacingAndLayout.mdx`, `system/StartHere.mdx`, `system/epics/E04Later.mdx`
- `.ai/lessons.md`, this log

## Verification (commands run and results)

- Variant A attempt: `npx vitest run TaskRow`: First Line Lines Up failed on the height check at 320px (100.4px for a wrapped title + estimate, expected 68), alignment passed; this is the measurement behind the second question. Reverted.
- `npm run format:check`, `npm run lint`, `npm run check:tokens -w packages/ui`: clean.
- `npm run build-storybook -w packages/ui`: success. Opened the 8 changed docs pages at 320 and 1440px in the built Storybook (agent-browser): each renders its `h1`, no "is not defined", no horizontal scroll; checked that the new text is on the page (List, Optimistic change, E04 Later).
- MDX `{word}` check on the changed pages: only JSX and code blocks.
- Not run: `npm test`, `test:storybook`, `npm run build`, `typecheck`. No code, story or token file is changed (only MDX and Markdown).

## Problems / open questions

- U1 was decided twice (A, then B) because my first question gave only desktop numbers; the stage-8 entry in `POSTEP.md` records both rounds.

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-23: measure row-geometry changes at 320px before asking (U1).
- 2026-10-23: kill the `http-server` child, not the `npm exec` wrapper.
