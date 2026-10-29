# Implementation tracker — Tasks and subtasks (E01)

- **Spec:** `.ai/specs/2026-10-16-tasks-and-subtasks.md`
- **Run log:** `.ai/runs/2026-10-29-tasks-and-subtasks-impl.md`
- **Branch:** `feat/e01-tasks-and-subtasks` (one commit per task; the three PRs from the spec's Phasing can be cut at the phase boundaries)
- **Rule:** every task ends with `npm test` at 100% coverage, `lint` and `typecheck` green, and its own commit. Every phase ends with `npm run build && npm run test:integration` and a manual test by the owner.

Legend: `[ ]` to do · `[x]` done

## Phase 1 — Schema and core (PR A, closes #22; spec steps 1–6)

- [x] **1.1 Migration `0001`** — `schema.ts` (description, `(list_id, id)` unique, same-list parent FK with cascade, estimate checks, unique sibling position `NULLS NOT DISTINCT`, `lists.default_for_user_id` + partial unique index), `db:generate`, unique before FK in SQL, schema integration tests, Testcontainers-only upgrade test, rollback SQL tested by hand and recorded in the run log.
- [x] **1.2 Money, estimates and schemas** — `parsePlnToGrosze`, `MAX_ESTIMATE_GROSZE`, `estimate.ts` (`estimateFromAmounts`, `rollUpEstimate`), `estimateGroszeSchema`, `estimateViewSchema`, `taskFields` / `createTaskInput` / `updateTaskInput`, `estimateSchema` path → `maxGrosze`, response schemas and `TaskView`; unit tests.
- [x] **1.3 `ensureDefaultList`** — read first, write only on a miss (`ON CONFLICT DO NOTHING`); unit tests (hit/miss) and integration tests (idempotent, concurrent first calls, per user).
- [x] **1.4 `deleteList` changes** — default-list guard (409), lock all memberships `FOR UPDATE` ordered by `user_id`; `renameList` still renames the default list; distinct-actor concurrency test (no `40P01`).
- [x] **1.5 `createTask` (top-level) and `listTasks`** — `requireTaskRole`, list-row append lock, pg error translation (23503/23505/23514), `rollUpEstimate` in `listTasks`; unit + integration tests (exact price, viewer, non-member, isolation, 10 concurrent creates); clean up `stubs.test.ts`.
- [x] **1.6 `updateTask` and `deleteTask`** — success/forbidden/not-found, title-only update keeps fields, clear estimate, `deleteTask` vs `deleteList` concurrency; collect PR A QA evidence (pre-deploy violation query, `0001` on dev DB, integration run) in the run log.
- [x] **Phase 1 gate** — `npm run build && npm run test:integration`; owner's manual test (checklist in the run log).

## Phase 2 — Routes and screen (PR B, closes #15; spec steps 7–8)

- [x] **2.1 Response validation in `apiHandler` and `apiCall`** — optional response schema, generic 500 on invalid output (no values logged), `bad_response` on the client, existing callers unchanged; unit tests.
- [x] **2.2 Task routes** — `GET/POST /api/lists/[listId]/tasks`, `PATCH/DELETE /api/tasks/[taskId]`; route unit tests with mocked core; HTTP integration tests (schemas, CSRF header, 400 `fieldErrors`, session renewal on `GET …/tasks`).
- [x] **2.3 `formatPlnRange` fix (F11, R18)** — "1 200–1 500 zł", grosze only when not zero, one amount when min = max; unit tests; check `EstimateRange` in `packages/ui`.
- [x] **2.4 Page `/`** — tested session/redirect helper in `packages/app/lib/`, `ensureDefaultList` inside `<Suspense>`, "page did not open" state with working Sign out; renewal integration test (document render does not consume renewal).
- [x] **2.5 Task hooks** — `useTasks`, `useCreateTask` (optimistic append, pending row), `useUpdateTask`, `useDeleteTask` (wait for server), response schemas via `apiCall`, `onSettled` invalidation, rollback; unit tests.
- [x] **2.6 `TaskListScreen`** — design-system `QuickAdd` / `TaskList` / `TaskRow` / `TaskForm` / `DeleteTaskDialog` wired to the hooks: amounts, description toggle, scroll + highlight + focus after add, edit in place (changed fields only), delete dialog, loading/empty/error states, 409 and 404 messages; jsdom component tests.
- [ ] **2.7 Browser integration test for #15** — AC1–AC4, AC6, AC7 with `createUser`, `ALLOW_SIGN_UP=false`, fixture cleanup.
- [ ] **Phase 2 gate** — `npm run build && npm run test:integration`; owner's manual test at `/` (checklist in the run log).

## Phase 3 — Subtasks and the roll-up (PR C, closes #16; spec steps 9–11)

- [ ] **3.1 Subtasks in core** — `parentId` in `createTaskInput`, parent `FOR KEY SHARE`, depth 409, nesting in `listTasks`, parent `TaskView` for subtask create/update/delete, 409 on estimate edit of a task with subtasks; integration tests for #16 AC2–AC5, R14, sum above cap, and the three lock-ordered concurrency cases plus parent-delete race.
- [ ] **3.2 Subtask UI** — "Add subtask", nested rows, subtask edit/delete, summed estimate and "N subtasks without an estimate", read-only "Sum of subtasks" in the edit form, 409/404 handling, roll-up status messages, delete dialog counts subtasks; component tests.
- [ ] **3.3 Browser integration test for #16** — AC1–AC4.
- [ ] **3.4 Finish** — full gate (`format:check`, `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`), lessons, `git mv` the spec to `implemented/`, grep the repo (Storybook docs) for the spec path and status words.
- [ ] **Phase 3 gate** — owner's manual test of subtasks and the roll-up (checklist in the run log).

## Notes

- Spec step 8 says to run `npx shadcn@latest init` and add primitives; the design system (#30) has since shipped them and the task components in `packages/ui/src/product/tasks/`, so task 2.6 reuses those instead (recorded in the run log, spec requirements unchanged). Task 2.6 added `TaskRow.level` and made `TaskList.onAddSubtask` optional, so "Add subtask" stays hidden until task 3.2 passes `onAddSubtask`.
