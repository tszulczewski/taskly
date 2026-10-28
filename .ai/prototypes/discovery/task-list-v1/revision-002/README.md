# Discovery prototype: task list with future expenses (revision 002)

- Revision date: 2026-10-27
- Brief: `.ai/specs/product-brief.md` (refreshed 2026-10-16)
- Selected flow: Key flows → "Future state", with the focus on "dodanie zadań z szacunkiem i podzadań" (adding tasks with an estimate, and their subtasks).
- Previous revision: [`../revision-001/`](../revision-001/README.md). It is unchanged: all 17 files match its manifest's SHA-256 values, and it holds no manual additions.
- Panel report: `.ai/specs/research/walkthroughs/2026-10-27-dodanie-zadan-z-szacunkiem-i-podzadan-session-001/report.md`. This is the 2026-10-27 `[SYNTHETIC]` panel on revision 001 (stance validate, 2 runs × 2 personas).
- Boundary: confirmed by the owner on 2026-10-27, covering changes C1–C7 with the English UI kept. Confirmation approves the simulation, not the truth of its assumptions.

**Open it:** open `index.html` in a browser (`file://…/revision-002/index.html`). No server or network is needed. **Reset prototype** in the "Test state" box returns to the start. All tasks are fictitious and live only in page memory. This artifact is not research evidence. It does not satisfy the Definition of Ready and says nothing about production readiness.

## What changed since revision 001

Every change is presentation only. No business rule, non-goal or decision changed. The subtask estimate still changes nothing (R06/D15), the user still types the range (R07/D16), future expenses still sums open main tasks only (R08/D19), and an unestimated task is still left out (R10).

| Id | Change | Why (panel finding, `[SYNTHETIC]`) | Assumption |
|---|---|---|---|
| C1 | Quick add shows Title, Min, Max and Add in one row under "Estimate (optional)". The description sits behind a bordered "+ Description" toggle button. The "Details" disclosure is gone | B1: the estimate was not found while adding, because "Details" did not read as clickable (weight 4, spread ±0) | A-P12 |
| C2 | The add-subtask form uses the same layout, with Add after the amounts. Under the row it says "For reference only. Not added to the task or to future expenses." The estimate group points to this note (`aria-describedby`) | B3: where a subtask's money goes was unclear (3, ±1). Seen once: Add sat above the amount fields | A-P15 |
| C3 | A subtask row with an estimate shows "(reference)" after the range | B3 | A-P15 |
| C4 | The summary names every open main task without an estimate ("2 tasks without an estimate: Pantry wall finish, Fix the hall light."). Each name is a button that opens that task's estimate form | The line did not name the task or say how to fix it (3, ±1) | A-P14 (supersedes A-P03's count-only line) |
| C5 | On an open task or subtask without an estimate, "No estimate" becomes an "Add estimate" button. It opens a short in-row form with Min, Max, "Save estimate" and Cancel; Escape cancels. Completed rows keep the muted "No estimate" | B1: every price needed the full Edit form | A-P13 |
| C6 | The edit form order is now Title, Estimate, (reference note for a subtask), Description, then a "Markers and places" toggle. The toggle starts collapsed unless a marker or place is set, so nothing set is ever hidden | B2: the edit form felt like "milion informacji", and markers and places were skipped (4, ±0) | A-P16 |
| C7 | "0/1 subtasks" becomes "0 of 1 subtask done" (visible text, no separate screen-reader copy) | Seen once: "0/1 subtasks" was ambiguous (done, or priced?) | A-P17 |

Not addressed, on purpose:
- **Roll-up or a sum of the subtasks.** Contradicts R06/D15 and needs the owner's decision. This is the panel's main contradiction.
- **Comparison with available money.** Excluded by N04/D06.
- **Order and dependencies.** Excluded by D10.
- **Faster reordering on long lists.** Kept as A-P02.
- **Places for a flat or a whole-flat job.** Kept as A-P01.
- **Price guidance.** Excluded by D11.
- **Polish wording.** The owner kept English on 2026-10-27.
- **Leftover open subtask form.** Unchanged.

Each of these stays a hypothesis in the panel report.

## Actor, start, success

- **Actor:** the owner, the only user of version 1 (D02, D13). Already signed in; sign-in is not simulated.
- **Start:** the Tasks screen with six fictitious main tasks (one completed, one without an estimate). "Start with an empty list" in Test state lets a renovator type their own jobs.
- **Success:** the owner has added tasks with and without an estimate, priced an unestimated task from its row or from the summary, added subtasks with a reference estimate, and edited a task, and has seen future expenses follow R08/R10 throughout. The revision-001 flows still work: complete, reopen, reorder and delete.

## Rules and decisions kept

These are unchanged from [revision 001](../revision-001/README.md#rules-and-decisions-kept): R01, R06/D15, R07/D16, R08/D19, R09/D20, R10, R11, D07, D09, D14/D21, the 2026-10-21 completed-order decision, and the non-goals N02, N04, D05, D06, D10, D11, D17 and D18. Each has the owner as owner and the change path "owner approves a superseding row". Wording comes from the design system (`packages/ui/src/product/*/text.ts`) where it exists. New strings are listed under the assumptions below.

**Relation to spec E01** (`.ai/specs/2026-10-16-tasks-and-subtasks.md`):
- **Quick add.** E01 specifies quick add as a title with "Add" plus a "Details" disclosure holding the description and the Min/Max fields. C1 departs from that on purpose and is a proposal to test. Adopting it means changing E01, which needs the owner's approval through the spec's change path.
- **Row layout.** E01's opened-row layout (description and subtasks shown when the row is opened) is still not simulated; A-P09 carries over.

## Assumptions

Carried over unchanged from revision 001: A-P01, A-P02, A-P04, A-P05, A-P06, A-P08, A-P09, A-P10, A-P11 (see [revision 001](../revision-001/README.md#assumptions)). Superseded here:
- **A-P03** (count-only missing line) is replaced by A-P14.
- **A-P07** (estimate behind "Details" in quick add) is replaced by A-P12.

| Id | Assumption | Why it is needed | How to check |
|---|---|---|---|
| A-P12 `[ASSUMPTION]` | Quick add shows the estimate fields next to the title; the description stays behind a "+ Description" toggle; markers and places stay in Edit | B1 `[SYNTHETIC]`; E01 shows the estimate only under "Details" | in the collection-plan sitting, count the tasks that get an estimate at the moment they are added, and compare with revision 001 |
| A-P13 `[ASSUMPTION]` | "Add estimate" on a row opens a short form. Both amounts are required there ("Enter both amounts"), because saving nothing would change nothing. After saving, focus moves to the row's Edit button. The button appears only on open rows | B1 `[SYNTHETIC]`; a quick path to price a task added on a tired evening | watch whether people price tasks later from the row, or go through Edit |
| A-P14 `[ASSUMPTION]` | The missing-estimate line lists every open main task without an estimate, in plan order, with no cap. Each name opens that task's estimate form. Cancel or Escape returns focus to the row's "Add estimate" button | the line did not name the task `[SYNTHETIC]`; a long list may need a cap | ask whether the named list helps or clutters once there are many unpriced tasks |
| A-P15 `[ASSUMPTION]` | The subtask estimate is labelled "For reference only. Not added to the task or to future expenses." in its forms and "(reference)" on its row. The wording explains R06; it does not change it | B3 `[SYNTHETIC]`; R06 gives no UI text | ask whether people still expect the subtask price to count, and what they then type for the task |
| A-P16 `[ASSUMPTION]` | In Edit, the estimate comes before the description; markers and places sit behind a "Markers and places" toggle, open by default when any is set | B2 `[SYNTHETIC]` | watch whether markers and places are still used when collapsed (D07, D09 stay in scope) |
| A-P17 `[ASSUMPTION]` | The subtask counter reads "N of M subtasks done" | seen once `[SYNTHETIC]` | none needed for discovery |

## Synthetic findings used (context only, not built into the UI)

From the panel report named above; all `[SYNTHETIC]`, hypotheses rather than evidence:
- **B1, B2, B3.** The barriers shaped C1–C6.
- **Contradiction with R06/D15.** Nobody would keep subtask costs in mind while typing the task's figure. Deliberately not acted on; it needs the owner's decision.
- **Contradiction with N04/D06.** People want the total compared with available money. Not acted on.
- **Missing cases:** tired-evening capture leaves the estimate empty, and the missing line gives no route to fix it. Partly met by C4 and C5, which give a later route to the estimate; whether people take it is untested.
- **Missing cases not met:** order and dependencies, long-list reordering, places for a flat, distrust of self-typed numbers.

The interface contains no hint about these findings or about expected reactions. The reference wording explains R06; it does not coach.

## Screen and state map (changes and checks)

Rows marked "as in 001" behave as in [revision 001's map](../revision-001/README.md#screen-and-state-map).

| Screen / state | Action | Expected next state | Rules / assumptions |
|---|---|---|---|
| Tasks (`#tasks`), sample data | open | total 4 380–6 850 zł; "1 task without an estimate: Pantry wall finish." with the name as a button; Pantry row shows "Add estimate" | R08, R10, A-P14, A-P13 |
| Quick add with estimate | Title, Min, Max → Add | appended; total rises by the range; form cleared, description collapsed, focus in Title | R07, R08, A-P12 |
| Quick add title only | Title → Enter | appended with "Add estimate"; its name joins the missing line | R10, A-P14 |
| Quick add validation | bad / one / inverted amounts | inline error on the field, focus there, nothing added; correction adds | E01 messages |
| Description toggle | "+ Description" | `aria-expanded` true, Description field shown; collapses again after Add | A-P12 |
| Estimate form | a name in the missing line, or "Add estimate" on a row | in-row form with Min/Max, focus in Min; empty → "Enter both amounts"; save → range on the row, total updated, name leaves the line, focus to Edit; Cancel/Escape → focus to "Add estimate" | R08, R10, A-P13, A-P14 |
| Subtask form | Add subtask | Add after the amounts; reference note below; added subtask shows "range (reference)"; task and total unchanged | R06, A-P15 |
| Subtask "Add estimate" | Add estimate → save | form shows the reference note; subtask range shown; task and total unchanged | R06, A-P13, A-P15 |
| Edit | Edit | Title, Estimate, Description, "Markers and places" (collapsed when none set, open when any set); subtask edit shows the reference note; clearing both amounts removes the estimate | D07, D09, D21, A-P16 |
| Complete, reopen, reorder, delete, save failure, load failure, empty, About, unknown link, Reset | as in 001 | as in 001; the save failure also covers the estimate form | R09, R11, A-P02, A-P04, A-P10 |

## Verification

**Static review (passed).**
- **Flow and rules.** Every screen and action in the confirmed flow has a destination, and no rule, non-goal or decision changed.
- **Self-contained.** All HTML, CSS and JS are inline in `index.html`. A scan found no URLs, `fetch`/XHR, storage, cookies, `innerHTML`, external scripts, fonts or images, and no form `action`.
- **Safe handlers.** Every form handler calls `preventDefault`, and user text is inserted only as text nodes.
- **Script.** The extracted script passes `node --check`.
- **Accessibility.** New controls are native buttons with `aria-expanded`/`aria-controls` where they toggle. The estimate groups are `role="group"` with a visible label, and errors are linked with `aria-describedby`.

**Browser walk (passed).**
- **Tool and session.** agent-browser 0.39.1 (the repo's `node_modules/.bin/agent-browser`, the configured provider), session `proto-tasklist-002`, on `file://` at 1280×900 and 360×780. The session was closed at the end.
- **Fix during the walk.** After the first entry screenshot, the in-row "Add estimate" button was made smaller (36 px high, 14 px text) so it does not stretch the row. The entry screenshots were retaken from a fresh load, and all checks below ran on the final file.

| Check | Expected | Observed | Evidence |
|---|---|---|---|
| V01 entry | 4 380–6 850 zł; missing line names "Pantry wall finish" as a button; quick add shows Title, Min, Max, Add, "+ Description" | as expected | `evidence/01-entry.png` |
| V02 quick add with estimate | "Paint the hall" 1 500–2 000 → total 5 880–8 850 zł; form cleared; focus in Title; status "Task “Paint the hall” added." | as expected | `evidence/02-quick-add-filled.png` |
| V03 title only | "Fix the hall light" via Enter → "Add estimate" on its row; line "2 tasks without an estimate: Pantry wall finish, Fix the hall light." | as expected | — |
| V04 validation | `1e3` → "Enter an amount like 1 500,50"; one amount → "Enter both amounts or neither" (focus Max); 5 000 > 3 000 → "Min must not exceed max"; nothing added; correction to 7 000 adds, total 10 880–15 850 zł | as expected | `evidence/03-validation-error.png` |
| V05 description toggle | opens with `aria-expanded=true`; task added with its description; toggle collapsed and field cleared after Add | as expected | `evidence/04-description-open.png` |
| V06 estimate from summary | clicking "Pantry wall finish" opens its form with focus in Min; empty save → "Enter both amounts" (Min, then Max); 300–600 saved → total 11 180–16 450 zł, name leaves the line, focus to Edit, status "Estimate for “Pantry wall finish” saved. Future expenses updated." | as expected | `evidence/05-estimate-form-from-summary.png`, `evidence/06-estimate-saved.png` |
| V07 row Add estimate | opens with focus in Min; Cancel and Escape close and return focus to "Add estimate"; opening Edit closes the estimate form | as expected | — |
| V08 subtask form | Add after Min/Max; note "For reference only. Not added to the task or to future expenses." referenced by the group; subtask "Buy a ceiling lamp" 150–400 shows "(reference)"; parent still "Add estimate"; total unchanged | as expected | `evidence/07-subtask-form.png`, `evidence/08-subtasks-reference.png` |
| V09 subtask Add estimate | form shows the note; 80–120 saved with "(reference)"; parent and total unchanged; status without "Future expenses updated." | as expected | `evidence/08-subtasks-reference.png` |
| V10 edit form | order Title > Estimate > Description > "Markers and places"; collapsed for a task without markers, opens on click; Important + Max 2 500 saved (tag shown, total 11 180–16 950 zł); reopened with a marker → expanded; subtask edit shows the note; clearing both amounts removes the estimate and the task joins the missing line | as expected | `evidence/09-edit-form-collapsed.png`, `evidence/10-edit-subtask.png` |
| V11 counter | after ticking one of two subtasks: "1 of 2 subtasks done"; total unchanged | as expected | — |
| V12 complete / reopen | dialog "Complete “Sow the rest of the lawn” and its 3 open subtasks?"; total 3 180–5 050 zł, row at the end; reopen restores 4 380–6 850 zł and puts it first | as expected | — |
| V13 reorder | Move down swaps the first two; focus stays; "moved down, now 2 of 5." | as expected | — |
| V14 save failure in the estimate form | "Fail the next change" → alert "Something went wrong. Try again."; form kept, total unchanged; "Try again" saves (4 680–7 450 zł) and clears the alert | as expected | `evidence/11-save-failure.png` |
| V15 delete | "Delete “Decorative wall in the living room” and its 4 subtasks?" → deleted, total 2 180–3 450 zł, focus to the next row | as expected | — |
| V16 load failure | "Loading tasks…", then "Could not load your tasks." with focus on "Try again", quick add hidden; retry reloads | as expected | `evidence/12-load-failure.png` |
| V17 empty | "No tasks yet.", "No estimates yet", focus in Title; first task without an estimate is named in the missing line | as expected | `evidence/13-empty.png` |
| V18 navigation | About with heading focus; back returns to Tasks with state kept; forward returns to About; `#payments` shows the recovery screen; "Go to Tasks" recovers | as expected | `evidence/14-about.png`, `evidence/15-unknown-link.png` |
| V19 Reset | sample restored, focus on heading, "Prototype reset to the sample tasks.", "Fail the next change" cleared | as expected | — |
| V20 keyboard | Tab order Title → Min → Max → Add → "+ Description"; Enter and Space toggle it; Tab reaches the missing-line name; Enter opens its form, Escape returns; an estimate typed and saved by keyboard only (4 630–7 300 zł); 3px solid focus outline throughout | as expected | `evidence/16-keyboard-focus.png` |
| V21 narrow | no horizontal scroll at 360 px, also with the estimate and subtask forms open; quick-add fields wrap under the title | as expected | `evidence/17-narrow-360.png`, `evidence/18-narrow-subtask-form.png` |

**Not checked:** a real screen reader. Status and alert texts were read from the DOM, not heard.

**Limitations:**
- **Narrow screens.** At 360 px the subtask form's reference note sits below the Add button, so it can be read after adding.
- **Toggle names.** The "+"/"−" sign on the toggles comes from CSS generated content. The accessibility tree includes it in the name ("+ Description").
