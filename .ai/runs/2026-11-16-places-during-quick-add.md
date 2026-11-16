# Places during quick add (E02-S04, #83)

- **Date:** 2026-11-16
- **Spec:** .ai/specs/implemented/2026-11-03-order-markers-and-spaces.md (moved there by this run) ("Creating a task with places", UI/UX "Places during quick add", steps 9a–13a)
- **Outcome:** complete (PR #86)

Source doc: .ai/specs/implemented/2026-11-03-order-markers-and-spaces.md
Engine: om-auto-create-pr (steps: 5, --loop: no)

## Goal

The owner can tick existing places and create a new one in the quick add of a task and of a subtask, and the task is saved together with its places in one request (#83, AC11–AC18). Phases 1–3 of the spec are on `main` (#69, #75); this run builds only the creation extension.

## Scope

- **core:** `createTaskInput.placeIds` (UUIDs, at most `PLACE_LIMIT`, no duplicates, default `[]`); `createTask` locks the requested places in UUID order `FOR KEY SHARE` with the owner-membership `EXISTS` rule shared with `setTaskPlace`, inserts the task and its `task_places` rows in one transaction, returns the complete view.
- **HTTP:** `POST /api/lists/[listId]/tasks` gains the field (route code unchanged; the schema carries it); HTTP integration cases.
- **ui:** `QuickAdd` gets an optional draft places picker ("Places…" next to "Description", `PlacePicker` in a popover, selected tags in the draft, unavailable-place state); `onSubmit` receives the selected ids as a second argument; `TaskRow` passes the catalog to the subtask quick add; `PlaceOptions` gains `onCreateForDraft` (create without assigning). Stories and docs.
- **app:** `toCreateInput` carries `placeIds`; `useCreateTask` shows the selected places on the temporary row; create-and-select for drafts; 404 Place on add refetches the catalog and keeps the draft.
- **tests:** unit (100%), DB integration, HTTP integration, browser test for AC11–AC18.

## Non-goals

- No migration (Phase 2 tables suffice). No change to the row's "Places…" flow, to edit forms, or to reorder. No filtering by place. No automatic replay of a possibly committed POST.

## Implementation Plan

### Phase 1: server

1. **Atomic creation (step 9a).** Schema + service + unit tests (SQL and lock clauses over the fake pg client) + DB integration: main/subtask with places, omitted `placeIds`, duplicates/excess/malformed ids (400 from the schema), viewer 403, non-member 404, another user's place 404 with nothing written, two `owner` rows, delete racing create (both orders), and rollback leaving no task, no assignment and no future-expense change.
2. **HTTP (step 10a).** `test/*-http.integration.test.ts` cases: 200 with places, old body without `placeIds`, 400 (malformed, duplicate, 21 ids), 401, 403, 404 Place with nothing written; route unit test for the forwarded body.

### Phase 2: design system

3. **Draft picker in QuickAdd (step 11a).** `QuickAdd` `places` prop, selection state, create-and-select, freeze while submitting or creating, Add/Cancel/Escape blocked while a place is being created, reset only on success, unavailable selected place, focus (picker close → trigger; success → title). `TaskRow` → subtask quick add; `TaskList` unchanged in shape. Component tests, stories (QuickAdd with places, loading, error, unavailable), `QuickAdd.mdx`, `PlacePicker.mdx`, E02 epic doc.

### Phase 3: app

4. **Draft wiring (step 12a).** `toCreateInput(values, parentId, placeIds)`, `add`/`addSubtask` take the ids, `onCreateForDraft`, temporary row with places, 404 Place → catalog refetch + actionable form error with the draft kept. Unit tests at 100% (queued adds, separate subtask drafts, catalog changes while a draft is open).

### Phase 4: verification and wrap-up

5. **Browser test and wrap-up (step 13a).** `test/places-creation-browser.integration.test.ts` (AC11–AC18), manual narrow-viewport/keyboard check, full gate, spec status + move to `specs/implemented/`, design-system status words, lessons.

## Risks

- **Portal events:** the picker's forms are portalled out of the quick add's DOM but not out of its React tree, so their `submit` and `Escape` would bubble into the quick add form (submitting or cancelling it). The popover content stops both.
- **Lock order:** membership → list → parent → places (UUID order) → inserts. `deletePlace` locks only the place row, so no cycle; a concurrent delete either wins (404, nothing written) or waits and cascades afterwards.
- **Integration environment:** DB/browser integration tests need Docker or `TEST_DATABASE_URL`; results are reported as run.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: server

- [x] 1.1 Atomic task creation with places in core — 1239ffb
- [x] 1.2 HTTP contract and integration cases — 64c6b5c

### Phase 2: design system

- [x] 2.1 Draft places picker in QuickAdd — 162bd06

### Phase 3: app

- [x] 3.1 Draft places wiring in the task screen — a8a8e92

### Phase 4: verification and wrap-up

- [x] 4.1 Browser test, full gate and spec wrap-up — 45ae94b, 95511ff, 3ce9227, 6213100

## Steps taken

1. Core: `createTaskInput.placeIds` and the place locks in `createTask`, with unit and DB integration tests (1239ffb); HTTP cases (64c6b5c).
2. Design system: the draft picker in `QuickAdd`, `toDraftPlaces`, the subtask quick add in `TaskRow`, stories and docs (162bd06).
3. App: `toCreateInput` carries the ids, the temporary row shows the chosen places, create-and-select for drafts, and 404 Place refetches the catalog and keeps the draft (a8a8e92).
4. Browser: PLACES-006…009 in `test/places-browser.integration.test.ts`, with QA scenarios in `.ai/qa/PLACES/` (45ae94b). The plan named a new `places-creation-browser` file. The cases went into the existing places browser test instead, which already has the catalog fixtures and helpers.
5. Wrap-up: the spec's Status updated and the spec moved to `specs/implemented/`. Path references updated in the Storybook docs, QA scenarios, data-model page, backlog and brief (95511ff). Analysis notes and older run logs are history and keep the path they had. Lesson recorded (3ce9227).
6. Gate: the unit run showed one uncovered statement (`task-list-screen.tsx:347`, the draft's create error path). The test typed "salon" while Salon was loaded, so the local duplicate check usually refused it before any request. The test now uses a name that passes the local check, and asserts the request (6213100).
7. Manual check of the running app (test env, production build) at a 320×740 viewport, using only the keyboard. Notes:
   - Tab reaches "Places…". Enter opens it with focus on the first place, Space ticks, and Escape closes it and returns focus to "Places…".
   - Enter in New place creates the place and ticks it in the draft, without adding a task.
   - Enter in the title adds the task with all three places. Afterwards the draft has no places and focus is in the title.
   - In the subtask draft, Escape closes only the picker. The subtask form and its title stay.
   - The subtask was saved with its own place. The parent kept its places, and the top draft stayed empty.
   - At 320px the popover opens upwards and scrolls (its max height is Radix's available height). No horizontal overflow.

## Files changed

- `packages/core/src/{schemas,tasks}.ts` and tests; `packages/core/src/places.integration.test.ts`
- `packages/ui/src/product/tasks/{quick-add,task-row,types,text}.tsx?`, `packages/ui/src/index.ts`, tests; stories and docs (`QuickAdd`, `TaskRow`, `TaskList`, `PlacePicker`, E02 epic, `TaskScreen` block, `WhatIsMissing`, `Screens`)
- `packages/app/components/tasks/{task-items,use-tasks,task-list-screen}.ts(x)` and tests; fixtures in `use-places.test.tsx`
- `test/places-http.integration.test.ts`, `test/places-browser.integration.test.ts`, `.ai/qa/PLACES/PLACES-006…009`
- `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` (moved), `.ai/specs/{backlog,product-brief}.md`, `.ai/data-model/…`, `.ai/qa/{MARKERS,REORDER,PLACES}` path references, `.ai/lessons.md`

## Verification (commands run and results)

- `npm run format:check`: fails on the first run (the data-model header was wider after the path change). Passes after `prettier --write` (3ce9227).
- `npm run lint`, `check:agents`, `test:env-scripts`, `typecheck`, `build`, `audit`: pass.
- `npm test`: 1274 tests pass. The first gate run was 99.95% (the line above). After 6213100 it reports 100% on all four metrics. A further run had one failing test out of 1274; it was not captured, and the next six full runs passed (see Problems).
- `npm run test:integration`: 23 of 24 files pass on the full run. `tasks-browser` failed to start with "Port 3206 is already in use": another worktree's integration run held the fixed port at the same time. Rerun alone: 14/14 pass.
- Design system: `check:tokens`, `test:storybook` (120 files, 940 tests, both themes) and `build-storybook` pass.
- Manual check: see step 7. Screenshots are in the task's artifacts (`shots/01…07`).

## Problems / open questions

- An intermittent unit failure, roughly once in ten full `npm test` runs on this machine, not reproduced in isolation. The failing test's name was not captured. Earlier in the run, one of its occurrences was the timing-dependent coverage of line 347, now fixed. If it recurs, capture the `FAIL` line.
- Integration tests use fixed ports, so two worktrees running the suite at once collide. This is not caused by this change.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-16: portalled popover events reach the enclosing form; `TextAction` overrides `PopoverTrigger`'s `data-slot`.
