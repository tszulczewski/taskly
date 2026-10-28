# Discovery prototype: task list with future expenses (revision 001)

- Revision date: 2026-10-26
- Brief: `.ai/specs/product-brief.md` (refreshed 2026-10-16)
- Selected flow: Key flows → "Future state": the owner looks at the task list, reads a task's description, sees its estimate range and the future-expenses total, opens its subtasks, marks tasks completed, and orders or reorders.
- Previous revision: none
- Panel report: none supplied. The only walkthrough on record (`.ai/specs/research/walkthroughs/2026-10-15-open-exploration-session-001/report.md`) was an open exploration without a flow, so it was not used as this prototype's panel input. Its hypotheses are listed below as context only.
- Boundary confirmed by the owner on 2026-10-26, with delete added at their request. Confirmation approves the simulation, not the truth of its assumptions.

**Open it:** open `index.html` in a browser (double-click, or `file://…/revision-001/index.html`). No server or network is needed. Use **Reset prototype** in the "Test state" box to return to the start. All tasks are fictitious and kept only in page memory. This artifact is not research evidence, does not satisfy the Definition of Ready and says nothing about production readiness.

## Actor, start, success

- **Actor:** the owner, the only user of version 1 (D02, D13). Already signed in; sign-in is not simulated.
- **Start:** the Tasks screen with six fictitious main tasks (one completed, one without an estimate) and their subtasks. A test control switches to an empty list so a renovator can type their own jobs (collection plan, second entry).
- **Success:** the owner has read the tasks and the future-expenses range, completed a task and seen the total drop, reopened one, reordered tasks or subtasks, and added or edited a task with an estimate.

## Rules and decisions kept

| Id | Meaning in this prototype | Source | Status, owner | Change path |
|---|---|---|---|---|
| R01 | PLN only, amounts kept as whole grosze, estimate is a min–max range | brief, AGENTS.md | active, owner | owner approves a superseding row |
| R06 / D15 | A subtask has its own range; it changes nothing in its task or in future expenses | brief | active, owner | same |
| R07 / D16 | The range is typed by the user; there is no real cost, payment or incurred figure | brief | active, owner | same |
| R08 / D19 | Future expenses = sum of mins – sum of maxes of main tasks that are not completed; the only summary | brief | active, owner | same |
| R09 / D20 | Completing a main task completes all its subtasks and removes it from future expenses | brief | active, owner | same |
| R10 | A task without an estimate is left out of future expenses | brief | active, owner | same |
| R11 | A subtask can be completed alone; completing all subtasks does not complete the task; reopening a task does not reopen its subtasks; a reopened task returns to the total | brief | active, owner | same |
| D07 | Separate "Important" and "Urgent" markers | brief | active, owner | same |
| D09 | A task can be in several places at once | brief | active, owner | same |
| D14 / D21 | A task and a subtask have a description, markers and places | brief | active, owner | same |
| 2026-10-21 order | Completed tasks are shown at the end, muted and struck through, in plan order; completed subtasks at the end of their task; a reopened task or subtask goes first; completed rows cannot be moved | `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md` | active, owner | owner decision |
| N02, N04, D05, D06, D10, D11, D17, D18 | No sharing, no stored budget, no effort, no dependencies, no AI estimates, no real cost or other expense figures | brief | active / proposal, owner | owner approves a superseding row |

Wording comes from the existing design system (`packages/ui/src/product/*/text.ts`): "Future expenses", "No estimates yet", "N tasks without an estimate", "Complete task", "Delete task", "Move up / Move down", the validation messages from spec E01, and **"Places"** for the brief's glossary term **"Space"** (the UI's existing word).

## Excluded destinations

Real cost and payments, incurred expenses, expenses of completed tasks, AI estimates, effort, job dependencies, shopping list, sharing, sign-in, creating or editing places, and drag and drop. The "About this prototype" screen lists them. There are no controls for them on the Tasks screen.

## Assumptions

| Id | Assumption | Why it is needed | How to check |
|---|---|---|---|
| A-P01 `[ASSUMPTION]` | Places are chosen from a fixed sample set (Bathroom, Living room, Dining room, Kitchen, Pantry, Hall, Garden); places cannot be created or edited | D09 needs places to exist; managing them is not in the flow | ask the owner whether the set of places changes during a renovation |
| A-P02 `[ASSUMPTION]` | Reordering uses "Move up / Move down" buttons only; drag is not simulated. The prototype swaps two rows, while the product stores fractional positions | the flow needs a way to reorder; drag adds no discovery value at low fidelity | watch whether the owner tries to drag |
| A-P03 `[ASSUMPTION]` | The summary always shows the count of open main tasks without an estimate, with one line of explanation (the design system's collapsed line, shown expanded) | R10 silently changes the total; the reader needs to know why | ask whether the owner noticed tasks missing from the total |
| A-P04 `[ASSUMPTION]`, owner-requested | A task or subtask can be deleted after a confirmation; deleting a task deletes its subtasks; it cannot be undone | added by the owner on 2026-10-26; the brief's flow does not mention delete; the behavior follows the draft E01 spec | see whether delete is used during the owner's own trial |
| A-P05 `[ASSUMPTION]` | When no open main task has an estimate (including when all tasks are completed), the summary reads "No estimates yet" and shows no zero range | the design system's `noTotal` text; the brief does not say what to show | ask whether "0 zł" would be clearer after everything is done |
| A-P06 `[ASSUMPTION]` | Subtasks can be added to, completed in or reopened in a completed task; reopening a subtask does not reopen its task | R11 does not restrict this; no rule forbids it | ask the owner |
| A-P07 `[ASSUMPTION]` | Quick add takes title, description and estimate; markers and places are set through Edit | follows E01's quick add; markers and places came later (E02) | watch whether the owner looks for markers while adding |
| A-P08 `[ASSUMPTION]` | Amounts above 10 000 000 zł get "Enter at most 10 000 000 zł" | E01 requires a field error but gives no message | spec E01 owner |
| A-P09 `[ASSUMPTION]` | The description is always shown in full (E01 clamps it to 2 lines with an expand control) | low-fi simplicity | none needed for discovery |
| A-P10 `[ASSUMPTION]` | A failed change shows one page-level alert with "Try again"; the change is rolled back | simulates E01's optimistic rollback without per-row error placement | spec E01 owner |
| A-P11 `[ASSUMPTION]` | The range is always shown as min–max, even when min equals max | the brief and the design system only define ranges | ask the owner |

Sample records are fictitious and loosely based on the brief's examples (curtain rods, decorative wall, pantry wall finish, sowing grass, perimeter strip). Amounts are invented.

## Synthetic hypotheses (context only, not built into the UI)

From the 2026-10-15 open-exploration panel, as listed in the brief. Each is `[SYNTHETIC]` and is a hypothesis, not evidence.

- H1 `[SYNTHETIC]`: nothing useful appears until a lot has been typed. The empty-list start and quick add let an observer time a first sitting.
- H2 `[SYNTHETIC]`: typed numbers may not be trusted, or may be left blank. Tasks without an estimate and the count line make gaps visible.
- H4 `[SYNTHETIC]`: order and blocking matter more than a plain list. Only manual reordering is simulated (D10, Q12).
- H5, H6 `[SYNTHETIC]` (time/work per job, money per month) conflict with D05 and D06 and are deliberately absent.

The interface contains no hint about these hypotheses or about expected reactions.

## Screen and state map

| Screen / state | Action | Expected next state | Rules / assumptions |
|---|---|---|---|
| Tasks (`#tasks`), sample data | open | 6 main tasks; future expenses 4 380–6 850 zł; "1 task without an estimate" | R08, R10, A-P03 |
| Complete dialog | tick a task with open subtasks | "Complete “…” and its N open subtasks?" with "Complete task" / "Cancel" | R09, R11 |
| Task completed | confirm | task muted, struck through, at the end; subtasks ticked; total drops | R08, R09, 2026-10-21 |
| Task reopened | untick | task first; subtasks stay completed; total rises | R11, 2026-10-21 |
| Subtask completed / reopened | tick / untick a subtask | goes to end / first of its task; parent and total unchanged | R06, R11 |
| Reordered | Move up / Move down | row swaps among open siblings; completed rows have no move buttons | A-P02, 2026-10-21 |
| Quick add / validation | Add with bad amounts | inline error on the field, focus moves there, nothing added | E01 messages, A-P08 |
| Task added | Add with valid fields | appended at end of open tasks; total includes it; form cleared, focus in Title | R08 |
| Add subtask | Add subtask → Add | subtask under its task; total unchanged | R06 |
| Edit in place | Edit → Save / Cancel / Escape | fields, markers, places saved; clearing both amounts removes the estimate | D07, D09, D21, A-P01 |
| Delete dialog | Delete → Delete task / Cancel / Escape | task and subtasks removed; focus to the next row | A-P04 |
| Save failure (test state) | "Fail the next change", then any change | alert "Something went wrong. Try again."; state rolled back; "Try again" applies the change | A-P10 |
| Load failure (test state) | "Show load failure" | "Loading tasks…" then "Could not load your tasks." with "Try again" | E01 states |
| Empty list (test state) | "Start with an empty list" | "No tasks yet. Add the first thing you need to do."; "No estimates yet"; focus in Title | E01, A-P05 |
| About (`#about`) | nav link | list of what is not simulated; "Back to tasks" | Non-goals |
| Unknown link (e.g. `#payments`) | open | "This screen is not part of the prototype" with "Go to Tasks" | — |
| Reset | "Reset prototype" | sample data, cleared inputs, errors and test toggles, Tasks screen, focus on heading, announced | — |

## Verification

**Static review (passed).** Every screen and action in the confirmed flow has a destination. No rule, non-goal or decision was changed. All HTML, CSS and JS are inline in `index.html`. A scan found no URLs, `fetch`/XHR, storage, cookies, `innerHTML`, external scripts, fonts or images, and no form `action`. Every form handler calls `preventDefault`. User text is inserted only as text nodes. The page has headings, labelled fields, errors linked with `aria-describedby`, a polite status region and native `<dialog>` confirmations. Contrast: muted text #5c5c5c on white is about 6.6:1.

**Browser walk (passed).** agent-browser 0.39.1 (the repo's `node_modules/.bin/agent-browser`, the configured provider), session `proto-tasklist-001`, on `file://` at 1280×900 and 360×780. The session was closed at the end.

The first walk found a defect: the amount field builder threw on every render, so the quick-add form never appeared and focus after changes was lost. It was fixed in this revision (`amountField`), and every check below was run again from a fresh page load.

| Check | Expected | Observed | Evidence |
|---|---|---|---|
| C01 entry | total 4 380–6 850 zł, "1 task without an estimate", plan order, completed row struck through with no move buttons, quick add present | as expected | `evidence/01-entry.png` |
| C02 complete with subtasks | dialog naming 3 open subtasks, focus in dialog; Cancel keeps the task open and returns focus; confirm completes the subtasks, total 3 180–5 050 zł, row at the end, status announced | as expected | `evidence/02-complete-dialog.png`, `evidence/03-task-completed.png` |
| C03 reopen | task first, subtasks stay completed, total restored | as expected | — |
| C04 subtasks | completed subtask last; parent open and total unchanged even with all subtasks done; reopened subtask first | as expected | `evidence/04-subtasks.png` |
| C05 / C19 Reset | sample restored, focus on heading, status "Prototype reset to the sample tasks.", typed input, error and "Fail the next change" cleared | as expected | — |
| C06 reorder | Move up/down for tasks and subtasks; focus stays, or moves to the remaining move button at the top; total unchanged; position announced | as expected | `evidence/05-reordered.png` |
| C07 / C08 validation | "Enter an amount like 1 500,50" (`1e3`), "Min must not exceed max", "Enter both amounts or neither", "Enter a title"; focus to the invalid field; nothing added. Correction adds the task, total 4 530–8 050 zł, form cleared | as expected | `evidence/06-validation-error.png` |
| C09 add subtask | added under its task; total unchanged; Cancel returns focus to "Add subtask" | as expected | — |
| C10 / C11 edit | estimate, Important and places saved; task enters the total (5 230–9 150 zł) and the no-estimate line disappears; clearing both amounts takes it out again | as expected | `evidence/07-edit-form.png` |
| C12 delete | "Delete “…” and its 4 subtasks?"; deleted; total 2 030–4 050 zł; focus to the next row | as expected | `evidence/08-delete-dialog.png` |
| C13 save failure | alert shown, checkbox and total rolled back; "Try again" applies the change and keeps focus | as expected | `evidence/09-save-failure.png` |
| C14 load failure | loading text, then error with focus on "Try again"; quick add hidden; recovery reloads the list | as expected | `evidence/10-load-failure.png` |
| C15 / C16 empty and all completed | empty text, "No estimates yet", focus in Title; a first task without an estimate is counted as missing; after completing it, "No estimates yet" and no missing line | as expected | `evidence/11-empty.png` |
| C17 navigation | About screen with heading focus and `aria-current`; browser back returns to Tasks with state kept; forward returns to About; "Back to tasks" works | as expected | `evidence/12-about.png` |
| C18 unknown fragment | `#payments` shows the recovery screen; "Go to Tasks" recovers | as expected | `evidence/13-unknown-link.png` |
| C20 keyboard | Tab order through row controls; 3px solid focus outline after Tab; Space toggles completion; Escape closes the dialog (focus returns to its trigger) and cancels edit; Tab then Enter open "Details" | as expected | `evidence/15-keyboard-focus.png` |
| C21 narrow | no horizontal scroll at 360px; row actions wrap and stay visible | as expected | `evidence/14-narrow-360.png` |

**Not checked:** a real screen reader. The status and alert texts were read from the DOM, not heard.

**Note:** agent-browser's interactive snapshot does not list the native `<summary>` "Details" control. It is keyboard reachable and works with Enter (C07).
