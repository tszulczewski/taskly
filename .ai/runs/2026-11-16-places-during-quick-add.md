# Places during quick add (E02-S04, #83)

- **Date:** 2026-11-16
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md ("Creating a task with places", UI/UX "Places during quick add", steps 9a–13a)
- **Outcome:** in progress

Source doc: .ai/specs/2026-11-03-order-markers-and-spaces.md
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

- [ ] 2.1 Draft places picker in QuickAdd

### Phase 3: app

- [ ] 3.1 Draft places wiring in the task screen

### Phase 4: verification and wrap-up

- [ ] 4.1 Browser test, full gate and spec wrap-up

## Steps taken

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)
