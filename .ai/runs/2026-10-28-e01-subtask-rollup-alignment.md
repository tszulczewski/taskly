# Align E01, issues, backlog, design system and prototype with the 2026-10-27 brief refresh

- **Date:** 2026-10-28
- **Spec:** `.ai/specs/2026-10-16-tasks-and-subtasks.md` (E01), against `.ai/specs/product-brief.md` (R12–R18, D22–D24)
- **Outcome:** in progress

## Goal

Bring spec E01, issues #15/#16, `backlog.md`, the design system (`packages/ui`) and the styled prototype (`prototypes/task-list-v1/`) in line with the 2026-10-27 brief refresh: subtask estimates add up into their task (R12–R15, D22, D23), an exact price is typed once (R18, D24), quick add shows the amounts next to the title (C1), and future expenses counts the summed estimate once (R17). Step by step, with the owner's approval after each step. Implementation of E01 (step 5) only on the owner's explicit request.

## Steps taken

### Step 1 — spec E01 review (`om-spec-writing`, review of an existing spec)

- Read `.ai/lessons.md`, `AGENTS.md`, the brief (R12–R18, D22–D24, superseded R06–R08/D15/D16, A02, H10–H16), both 2026-10-27 decision records, the three 2026-10-27 interview notes, the revision-002 README (C1–C7, A-P12–A-P17), spec E01 in full, the revision-002 run log with its "Update" section, issues #13, #15, #16, #20, #21.
- Checked the code: `packages/core/src/tasks.ts` is still a stub; only migration `0000` exists (E01's `0001` is not written yet); `tasks.estimate_min_grosze` / `estimate_max_grosze` exist in `0000`; `formatPlnRange` still has the pre-F11 format.
- Found an extra conflict outside the list: `.ai/docs/engineering-standards.md` §6 says subtask estimates "are informational and never summed" (R06), and `packages/core/src/summaryService.ts` still says "leaf tasks".
- Change list presented to the owner. Owner's answers (2026-10-28): Q1 yes (status messages on the first subtask hiding a typed figure and on its return), Q2 no (no "sum" mark on the row), Q3 yes (update engineering-standards §6 now), Q4 yes (R14 as an AC of #20 plus a backlog note, in step 2). The list itself was accepted with these answers.
- Rewrote spec E01 (revision 2026-10-28):
  - roll-up computed on read by `rollUpEstimate`; no migration beyond the planned `0001`, the typed figure stays in `estimate_min/max_grosze` (R15);
  - `TaskView` gets `unestimatedSubtasks`, `estimateViewSchema` (uncapped) for output; subtask mutations return the parent `TaskView`; DELETE returns the parent or `null`;
  - 409 on an estimate PATCH of a task with subtasks; the edit form hides the amounts and shows "Sum of subtasks";
  - exact price via `estimateFromAmounts` ("Amount" / "up to (optional)"); `formatPlnRange` returns one amount when min = max; "Enter both amounts or neither" removed;
  - quick add per C1; roll-up status messages (Q1);
  - new Edge Cases rows, concurrency section, tests in steps 2, 5, 8, 9, 10; #15/#16 AC numbering used by step 2.
- Updated `.ai/docs/engineering-standards.md` §6 (Q3).
- Fresh-context review of the spec (skill step 8): verdict "approve with minor changes", no Critical/High; lock reasoning confirmed (FOR UPDATE vs FOR KEY SHARE; no new deadlock cycle). Applied all seven Medium/Low findings:
  - READ COMMITTED and "existence check after the lock; keep FOR UPDATE" stated in Roll-up under concurrency;
  - step 9 concurrency tests ordered with a third connection holding a lock (`pg_locks` to see the wait);
  - roll-up message triggers defined (`onMutate` snapshot; DELETE response), two-tab contradiction accepted in Edge Cases;
  - HTTP table lists the 409s from the constraint translation;
  - a refused PATCH also drops the title change; resaving sends the title; tested in step 10;
  - R12's "materials as another subtask" needs no UI (stated);
  - Phasing lists the rewritten ACs of #15/#16 and #20's R14 as a precondition of PR B/C (the drafts for step 2).

- Owner accepted step 1 ("ok").

### Step 2 — issues and backlog

- Saved the previous bodies of #15, #16, #20, #21 (and titles, `.json`) in the session scratchpad (`issues-old/`).
- Drafts shown to the owner and approved ("tak i commit"):
  - #15: AC1/AC4 in "Amount" / "up to" terms; AC6 "both amounts or neither" replaced by the exact price (R18); new AC7, amounts beside the title (C1); Decisions in play D23, D24, R16, R18; "Changes (2026-10-28)".
  - #16: retitled "… and the task's estimate becomes their sum"; Expected outcome, Out of scope, Open questions rewritten; AC2–AC4 roll-up (R12, R13, R15), old AC4 → AC5; Decisions in play D22, R12, R13, R15, R18; spec link.
  - #20: new AC6 (R14), per Q4.
- Applied with `gh issue edit --body-file` (and `--title` for #16); live bodies match the drafts (only a trailing newline differs).
- `backlog.md`: E01-S02 title row updated; a "Decisions made after filing (2026-10-27, D22–D24)" note covering #15, #16, #20 and #21.
- Committed steps 1–2 as `0c1194c` (owner: "tak i commit").
- #21: draft shown and approved ("tak"): AC2 replaced (R17: the task counts once with its summed estimate), AC1 in the DS format, AC3 + R13, AC4 + R14, AC5 "No estimates yet" (as the DS `FutureExpenses` already shows) instead of "0–0 PLN", new AC7 (R18). Applied with `gh issue edit 21 --body-file`; live body matches.

### Step 3 — design system (`packages/ui`, separate PR)

- Plan shown and confirmed by the owner ("potwierdzam"), with:
  - S1: branch `feat/ui-estimate-rollup` from `docs/discovery-subtask-rollup` (stacked PRs);
  - S2: in `UnestimatedTasks`, a task whose subtasks all lack an estimate shows muted "Add estimates to its N subtasks" instead of "Add estimate" (no action; full handling in E03);
  - S3: the description toggle uses the DS collapsible text action ("Description" with its arrow); spec wording changed from "+ Description";
  - S4: roll-up messages (Q1) are a visible muted `role="status"` line in the parent's row, cleared by the app on its next change.
- Spec E01 updated for S3 and S4 (UI/UX quick add, add subtask, roll-up messages, PR B/C precondition, step 8). Issue #15 AC7 still says "+ Description"; to be shown to the owner.
- Branch `feat/ui-estimate-rollup` from `ddd3205` (commit of the spec S3/S4 wording and this log on `docs/discovery-subtask-rollup`).
- Code (`packages/ui/src/product/`):
  - `tasks/types.ts`: `amount` / `upTo` replace `min` / `max`; `TaskItem.unestimatedSubtasks`, `TaskItem.notice`.
  - new `tasks/task-fields.tsx`: `EstimateFields` ("Estimate (optional)" group, "Amount", "up to (optional)") and `DescriptionField` (collapsible "Description" toggle, opened by an error).
  - `QuickAdd`: one row from 640px (title, amounts at 2/5, Add), `h-lh` spacers align the fields under the legend; "Details" removed.
  - `TaskForm`: `summedEstimate` shows "Sum of subtasks" as text instead of the amounts; description open when set.
  - `TaskRow`: "N subtasks without an estimate" in the meta line; the roll-up notice line (`role="status"`).
  - `EstimateRange`, `FutureExpenses`: doc comments (R17, R18).
  - `UnestimatedTasks`: "Amount" / "up to"; `subtasksWithoutEstimate` shows the muted note instead of the button (S2); focus after a save skips tasks without a button.
  - unit tests for each change (`tasks.test.tsx`, `expenses.test.tsx`).
- Storybook: `task-data.ts` (`rollUp`, R17 totals, exact price formatting, new messages, Polish texts), `TaskScreen.tsx` (roll-up notices), stories (QuickAdd, TaskForm, TaskRow, EstimateRange Exact Price, UnestimatedTasks Priced Through Subtasks, patterns, Screens, FutureExpenses, Collapsible, FormField), MDX of the components, patterns, epics E01/E03, system pages and primitives; `catalog.ts`, `Catalog.tsx`.
- The owner decisions of this step got design-system ids W1–W4 in `packages/ui/POSTEP.md` (Etap 10): W1 = roll-up notices (Q1/S4), W2 = no sum mark (Q2), W3 = subtask note (S2), W4 = Description toggle (S3). "Q" and "S" already name reference answers and screens in the Storybook legend.
- `.ai/docs/design-system.md`: component table (Input, Collapsible, Quick add, Estimate range), Content (money: one amount, sum), source legend (D01–D24, R06–R18, W1–W4).
- Left as history: the archived grey prototype and the built `task-list` prototype under `.storybook/public/prototypes/` (step 4 rebuilds the latter), earlier POSTEP.md stages.
- QuickAdd measured in the built Storybook (With Estimate story, agent-browser): 320px stacked (title 256×44; Amount and up to 124×44 side by side; Add 63×44; Description under), 640px one row (title 266, amounts 111 each, Add 63; all top 84px, 36px high), 980px one row (title 470, amounts 179 each, Add 63; aligned). No horizontal scroll at any width. Screenshots: scratchpad `quickadd-320.png`, `quickadd-640.png`, `quickadd-980.png`.
- Changed MDX pages opened in the built Storybook (13 pages); all render.
- Owner accepted step 3 and the #15 AC7 wording ("akceptuje wszystko"):
  - committed as `ea716ea` on `feat/ui-estimate-rollup`; pushed `docs/discovery-subtask-rollup` (`0c1194c`, `ddd3205`, so PR #36 carries steps 1–2) and the new branch;
  - opened PR #37 (`feat/ui-estimate-rollup` → `docs/discovery-subtask-rollup`, stacked on #36);
  - #15 AC7: "+ Description" → a collapsible "Description" toggle; previous body in the scratchpad (`issues-old/15-before-ac7.md`).
- Next: step 4 (styled prototype `prototypes/task-list-v1/`) after the owner's go-ahead.

### Step 4 — styled prototype (`prototypes/task-list-v1/`)

- Owner: "zacznij". Branch `feat/prototype-estimate-rollup` from `56dc157` (on top of PR #37, which the prototype's components come from).
- Read `lekcja-07/prompty/prompt-mapa-ekranow.md` and `prompt-klikalny-prototyp.md`, the map, the prototype README and task screen, spec E01 (UI/UX, Edge Cases), the rewritten ACs of #15/#16, the revision-002 README (C1–C7) and the roll-up decision record.
- Map `prototypes/konta-i-role/mapa-ekranow.md`: new section "Rozszerzenie: suma podzadań i dokładna cena" with the current ACs, 6 superseded states (ids kept, marked), 18 new states (s04.30–s04.35, s05.8, s06.9–s06.12, s07.8–s07.11, s08.8–s08.10), a new P09 value (409 on an estimate save, s06.12), data notes and numbers (prototype shows 96 states); C4, C5, C7 left to E03. New spec gap L23 (K2's wall data after R12) in section 7 with options; the map prompt says to stop for approval, so the prototype waits for it.
- Owner approved the map ("zatwierdzam") and chose L23 = A (AskUserQuestion). Map status and L23 updated.
- Prototype (`prototypes/task-list-v1/`):
  - `data.ts`: L23 A (TV parts without the "not included" description; wall description "Living room. Without the sockets").
  - `screens/task-screen.tsx`: list rolled up with `rollUp`; roll-up notices on the first subtask and on deleting the last one, cleared on the next change; a task with subtasks keeps its own figure on edit; P09 "task got a subtask in another tab" gives the 409 of s06.12; validation adds the spec's 2 000-character description limit (the DS sample `validateTask` has none, so s04.33 was unreachable).
  - `scenarios.ts` (P09 value), `states.ts` (18 new states; superseded ones disabled with "replaced by …"), `review-bar.tsx` (disabled superseded options), `screens.ts` (notes), `navigation.test.tsx` (4 new tests, s07.1 → s07.8 in the guide test).
  - `README.md`, `POSTEP.md` (section "Rozszerzenie 2026-10-28" with the walk table).
- agent-browser walk on the built prototype (screenshots in `prototypes/task-list-v1/evidence/rollup-01…09-*.png`, absolute paths in POSTEP.md): s04.34, s04.31, s04.32, s07.9, s08.8, s06.9, s06.12 at 1440 dark; s04.30, s07.8, s04.33 at 320 light. All as the map says, except focus in s04.33.
- Found DS08: a client-side description error with the toggle closed opens it but leaves focus in the title in Chromium; a jsdom test of the same flow passes (temporary test, removed). Not fixed (prompt rule 8: no design-system changes from the prototype); asked the owner whether to fix it in PR #37.

## Files changed

- `.ai/runs/2026-10-28-e01-subtask-rollup-alignment.md` (this log)
- `.ai/specs/2026-10-16-tasks-and-subtasks.md`
- `.ai/docs/engineering-standards.md` (§6 totals rule)
- `.ai/specs/backlog.md`, `.ai/lessons.md`
- GitHub issues #15, #16 (title and body), #20, #21 (body)
- Step 3 (branch `feat/ui-estimate-rollup`, uncommitted): `packages/ui/src/product/{tasks,expenses}/…`, `packages/ui/src/components/ui/collapsible.tsx` (comment), `packages/ui/.storybook/**` (blocks, stories, MDX), `packages/ui/POSTEP.md`, `.ai/docs/design-system.md`, `.ai/lessons.md`, this log

## Verification (commands run and results)

- `npx prettier --check` on the spec, the standards and this log: pass.
- Step 3 gate (2026-10-28): `npm run format:check` pass; `npm run lint` 0 errors (1 existing warning in `.agents/skills/om-share-this-session`, unrelated); `npm run typecheck` pass; `npm test` 47 files, 262 tests, coverage 100% (803/803 statements, 600/600 branches, 329/329 functions, 717/717 lines); `npm run build` pass; `check:tokens` pass; `test:storybook` 120 files, 916 tests pass (both themes, axe); `build-storybook` pass.
- Step 4: `npx tsc --noEmit -p prototypes/task-list-v1/tsconfig.json` pass; `npx vitest run --config prototypes/task-list-v1/vitest.config.mts` 17 tests pass; `vite build` of the prototype pass; agent-browser walk as above.
- First `test:storybook` run after the code change: 22 failures (11 stories × 2 themes) from old labels, totals and the now-ambiguous amount labels; fixed in the stories.

## Problems / open questions

- see the spec's Open Questions once written

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-28: grep docs, TODOs and the design system for superseded rule ids.
- 2026-10-28: design-system ids are a shared namespace (W1–W4 instead of Q/S).
- 2026-10-28: a new field in quick add makes Storybook label queries ambiguous; scope them.
- 2026-10-28: focus into a Radix collapsible can pass in jsdom and fail in Chromium.
- 2026-10-28: agent-browser at 320 px, the review engine's "← Back" button covers controls.
