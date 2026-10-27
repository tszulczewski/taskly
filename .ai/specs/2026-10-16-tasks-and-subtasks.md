# Tasks and subtasks (E01)

- **Date:** 2026-10-16
- **Status:** draft
- **Issue:** #11 (stories #15, #16; task #22)
- **Depends on:** a separate spec for minimal sign-up / sign-in pages, built first (Q2; confirmed 2026-10-16): `.ai/specs/2026-10-16-sign-in-pages.md`, specifically its Phase A ("Phase 0" below); its Phase B (password reset) gates nothing here. Only PR B (steps 7–8: routes and the screen) waits for it; PR A (steps 1–6) does not.

## 📝 TLDR

The owner, mid-renovation, forgets low-impact tasks and loses each task's cost while choosing what to do next (brief, Problems). Today Taskly has no task feature: `packages/core/src/tasks.ts` is a stub that throws `NotImplementedError`, there are no task routes, and the app shows the Next.js starter page. This spec proposes (not yet built) that the signed-in owner gets one default task list. On it they add, edit and delete tasks with a title, an optional description and an optional typed min–max PLN estimate, plus one level of subtasks with the same fields. A subtask's estimate never changes its task (R06).

## 📝 Problem Statement

- **Need (evidence):** the owner forgets many low-impact tasks (curtain rods, decorative wall, pantry finish) when choosing what to do next, and the cost of each candidate task "is lost in quick thinking and choosing". Source: `[INTERVIEW]` owner, 2026-10-15. This is the brief's main problem. D01 puts it first, and D13 narrows v1 to a prototype for the owner alone.
- **Current code:**
  - Migration `0000` already has `tasks(title, parent_id, status, position, estimate_min_grosze, estimate_max_grosze, cost_grosze)`.
  - `parent_id` has no FK. There is no description column and no `min ≤ max` check.
  - Services are stubs. `createTaskInput` and `estimateSchema` exist.
  - `requireRole` and the lists service are implemented (#6).
  - No route or page uses any of this, and no sign-in page exists.
- **What this does not prove:** A01 (seeing costs changes ordering) and A02 (typing one range per task is acceptable effort) stay untested. This spec gives the owner the tool to test them.

## 📝 Proposed Solution

A vertical slice through the existing layers (`.ai/docs/engineering-standards.md`):

1. **db:** one additive migration. It adds `tasks.description`, a same-list self-FK for subtasks with cascade delete, estimate `CHECK`s, a unique sibling `position`, and a default-list marker on `lists`.
2. **core:** the task stubs become real services. Each one runs Zod-parse → `requireRole` on the task's list → work, in one transaction. `ensureDefaultList` gives each user exactly one default project list, which `deleteList` refuses to delete. `parsePlnToGrosze` converts typed amounts without floats.
3. **app:** thin Route Handlers, plus one client screen at `/` built on TanStack Query with optimistic add/edit/delete.

Both answered questions shape this design:

- **One default list per user (Q1).** There is no list picker. The data stays list-scoped, so `requireRole`, the role matrix and a future multi-list or sharing version need no rework. Spaces (E02) become their own many-to-many entity instead of overloading `list_id`.
- **One level of subtasks (Q5).** A subtask is a `tasks` row whose `parent_id` points at a top-level task in the same list. `parent_id` cannot be changed after creation.

**Alternatives rejected**

| Alternative | Why it lost |
| --- | --- |
| A separate `subtasks` table | Subtasks carry the same fields as tasks (D21), and a second table would duplicate every service and the later markers/spaces joins. |
| Tasks owned directly by a user, with no list | Bypasses the mandatory list-based authorization layer (`AGENTS.md`) and would need rework for sharing. |
| Picking the default list as "the first list the user owns" | Two first requests racing would create two lists. The unique marker is the backstop the standards require. |

**Out of scope:** reorder UI and `moveTask` (E02-S01), markers (E02-S02), spaces (E02-S03), completion and future expenses (E03), real cost, AI estimates, sharing and the shopping list (version 2).

## 📝 Research

The comparison set is the dated benchmark (`.ai/specs/research/2026-10-15_taskly_benchmark.md`) and general task-manager patterns (Todoist, Trello checklists). Those patterns come from product knowledge and were not re-checked on 2026-10-16.

- **Worth copying:**
  - Quick capture where only the title is required, so a task is saved in one step and details come later. This matches the panel hypotheses H1 and H9 (`[SYNTHETIC]`) and R10 (estimate optional).
  - Deleting a parent removes its subtasks.
  - Subtasks shown inline under their parent.
- **Complexity we skip:**
  - Deep nesting. Mature tools allow several levels; we keep one (Q5).
  - Rich-text descriptions, attachments and comments.
  - Roll-up of subtask costs. Planners such as Buildry show planned vs. actual cost per room; R06 explicitly rejects a roll-up for v1.
- **Benchmark risk applied:** the benchmark flags "too much manual data entry" in mature tools. Hence estimate and description are optional, and amount input accepts Polish formatting (`1 500,50`).

## 📝 Architecture

```mermaid
flowchart LR
    page["/ page (server, new)"] -->|"ensureDefaultList"| lists["core lists.ts (existing + new fn)"]
    page --> screen["TaskListScreen (client, new)"]
    screen -->|"apiCall (existing)"| routes["Route Handlers (new)"]
    routes -->|"apiHandler + requireUser (existing)"| tasks["core tasks.ts (stubs → real)"]
    tasks -->|"requireRole (existing)"| access["core access.ts"]
    tasks --> db[("tasks / lists (migration 0001)")]
```

All task access goes through `requireRole` on the task's list, and the only new client→server path is the existing `apiCall` helper.

- **Reused:**
  - `requireRole` / `can`
  - `apiHandler`, `requireUser`, `mapError` and the envelope
  - `apiCall` and `queryKeys.tasks(listId)`
  - `positionBetween`, `formatPlnRange` and `estimateSchema`
  - the error classes
- **New in core (isomorphic, `@taskly/core`):**
  - `parsePlnToGrosze`
  - `MAX_ESTIMATE_GROSZE`, `estimateGroszeSchema`
  - `taskFieldsInput`, `createTaskInput` (changed), `updateTaskInput`
  - `subtaskViewSchema`, `taskViewSchema`, `taskListResponseSchema`, `deleteTaskResponseSchema`, and the inferred `TaskView` type
- **New in core (server, `@taskly/core/server`):**
  - `ensureDefaultList` in `lists.ts`, and a default-list guard in `deleteList`
  - `listTasks`, `createTask`, `updateTask` and `deleteTask` in `tasks.ts`
  - `moveTask` stays a stub for E02
- **New in app:**
  - routes `app/api/lists/[listId]/tasks/route.ts` and `app/api/tasks/[taskId]/route.ts`
  - components under `components/tasks/`
  - hooks `useTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`
  - shadcn primitives (Button, Input, Textarea, Label, AlertDialog) added to `packages/ui` with `npx shadcn@latest add`
- **Events:** services do **not** call `publishListEvent`. It is still a stub that throws, and live updates serve shared lists, which are out of scope for v1 (N02). This is a deliberate skip of step 4 of standards §3, the same as the lists service. The SSE spec adds the publish calls.
- **Caching:** the `/` page reads the session, so it renders dynamically inside `<Suspense>` (`cacheComponents` is on). The implementer reads `node_modules/next/dist/docs/` on Cache Components and `RouteContext` before writing the page and the routes.

## 📝 Data Model

Migration `0001` (generated by drizzle-kit, reviewed, committed) is additive only. It adds new nullable columns, constraints and indexes, and edits no applied migration.

| Change | Definition | Why |
| --- | --- | --- |
| `tasks.description` | `text NULL` | D14, D21. Length is limited by Zod (≤ 2000). |
| Same-list parent | unique index `tasks_list_id_id_idx (list_id, id)`, plus FK `(list_id, parent_id) → tasks(list_id, id) ON DELETE CASCADE` | The database guarantees a subtask's parent exists and is in the same list. Deleting a task deletes its subtasks (Q6). With `MATCH SIMPLE`, a top-level task (`parent_id NULL`) is not checked. |
| Estimate checks | `tasks_estimate_pair_chk`: `(estimate_min_grosze IS NULL) = (estimate_max_grosze IS NULL)`; `tasks_estimate_range_chk`: `estimate_min_grosze IS NULL OR (estimate_min_grosze >= 0 AND estimate_min_grosze <= estimate_max_grosze)` | Q7 and R01, enforced below Zod as well. |
| Unique sibling order | unique `tasks_sibling_position_uq (list_id, parent_id, position) NULLS NOT DISTINCT` (PostgreSQL 16 locally and in Testcontainers) | Two concurrent appends can never share a key. Duplicate keys would break `generateKeyBetween` in E02's reorder. |
| `lists.default_for_user_id` | `text NULL REFERENCES "user"(id) ON DELETE CASCADE`, partial unique index `lists_default_for_user_kind_uq (default_for_user_id, kind) WHERE default_for_user_id IS NOT NULL` | Exactly one default project list per user, safe under concurrent first requests. The same index can later back `ensureShoppingList` (kind `shopping`) without a new migration. |

- **Unchanged and unused here:** `tasks.status` (E03), `tasks.cost_grosze` (version 2, D17) and the existing `tasks_list_parent_idx`. Columns are not dropped (expand-only, per `BACKWARD_COMPATIBILITY.md`).
- **Position** stays `text` with the default collation. Every ordering query uses `position COLLATE "C"` (standards §6), so the column collation does not change.
- **Sensitive data:** titles and descriptions are free text about the owner's house. They are scoped by list membership. Request bodies are not logged. `apiHandler` logs only unexpected (500) errors, and constraint violations, whose pg `detail` holds the row values, are translated to 404/409 before reaching it (see API Contracts).

```mermaid
flowchart LR
    classDef newEntity fill:#2f6feb,color:#fff,stroke:#1b4fb0
    classDef existingEntity fill:#e5e7eb,color:#111,stroke:#9ca3af

    entity_1["tasks (changed): description, estimate checks, same-list parent FK, unique sibling position"]:::newEntity
    entity_2["lists (changed): default_for_user_id"]:::newEntity
    entity_3["user (existing): id"]:::existingEntity
    entity_4["list_members (existing): list_id, user_id, role"]:::existingEntity

    entity_2 -->|1-n tasks| entity_1
    entity_1 -->|"1-n subtasks (same list, one level)"| entity_1
    entity_3 -->|"1-n default lists (one per kind)"| entity_2
    entity_2 -->|1-n| entity_4
    entity_3 -->|1-n| entity_4
```

## 📝 API Contracts

### Shared schemas (`@taskly/core`, isomorphic)

```ts
MAX_ESTIMATE_GROSZE = 1_000_000_000          // 10 000 000.00 PLN; fits integer
groszeSchema: int, ≥ 0                        // unchanged and uncapped: E03 totals may exceed the estimate cap
estimateGroszeSchema: int, 0 … MAX_ESTIMATE_GROSZE
estimateSchema: { minGrosze, maxGrosze } (both estimateGroszeSchema), refine min ≤ max with path ["maxGrosze"]

taskFields = {                                // NO defaults anywhere in this object
  title: string, trimmed, 1–200
  description: string, trimmed, ≤ 2000; "" → null; nullable
  estimate: estimateSchema | null
}
createTaskInput = { title, description: default null, estimate: default null }   // listId is the route param
                  // Phase 2 adds: parentId: uuid | null = null (additive)
updateTaskInput = taskFields.partial(), refine: at least one key
                  // built from taskFields, never from createTaskInput: Zod 4's .partial() keeps
                  // defaults, so { title } would parse to { title, description: null, estimate: null }
                  // and wipe both fields

subtaskViewSchema = z.object({
  id: z.uuid(),
  title: string, 1–200,
  description: string, ≤ 2000, nullable,
  estimate: estimateSchema.nullable()
})
taskViewSchema = subtaskViewSchema.extend({ subtasks: z.array(subtaskViewSchema) })
taskListResponseSchema = z.array(taskViewSchema)
deleteTaskResponseSchema = z.null()
type TaskView = z.infer<typeof taskViewSchema>
// Response fields have no defaults: missing fields must fail validation.
// Accept additive unknown fields, preserving compatibility with newer servers.

parsePlnToGrosze(text: string): number | null
// accepts "1500", "1500.5", "1 500,50" (space / NBSP thousands, comma or dot decimal, ≤ 2 decimals);
// pure string arithmetic, no floats; null for anything else
```

The `estimateSchema` refine path moves to `maxGrosze`. `mapError` then reports field errors under `estimate.maxGrosze`, and the form shows the message next to the max field. `aiEstimateResponse` reuses the same schema, which is harmless (it carries no field UI).

The response schemas validate outputs at runtime, not just through TypeScript. POST and PATCH always return `taskViewSchema`; when the affected row is a subtask, its `subtasks` is an empty array. GET returns `taskListResponseSchema`; DELETE returns `deleteTaskResponseSchema` (`null`). Infer client types from these schemas rather than defining a separate response shape.

### Services (`@taskly/core/server`)

Every service runs in `db.transaction`. "Write" means `requireRole(tx, userId, listId, "write")`.

| Function | Authorization | Behaviour |
| --- | --- | --- |
| `ensureDefaultList(db, userId)` → `string` | the session user | Read first: a plain `SELECT` of the user's default project list returns its id, so the normal case writes nothing. Only on a miss, in one transaction: `INSERT … ON CONFLICT (default_for_user_id, kind) WHERE default_for_user_id IS NOT NULL DO NOTHING RETURNING id`, then an `owner` `list_members` row only when a row was returned; otherwise select the existing id again. Name: "My renovation". Idempotent. |
| `deleteList(db, userId, listId)` (existing, **changed**) | `manage` | Besides the lock change below, it rejects a list with `default_for_user_id IS NOT NULL` with `ConflictError("The default list cannot be deleted")`, like the shopping list. `renameList` still allows renaming it. |
| `listTasks(db, userId, listId)` → `TaskView[]` | `read` | Top-level tasks by `position COLLATE "C"`, then `id`, each with its subtasks in the same order. One query, grouped in memory. Not paginated, because one owner's renovation list is expected to stay in the low hundreds (Q02 open); revisit when E02 adds filters. |
| `createTask(db, userId, listId, input)` → `TaskView` | `write` on `listId` | After authorization, lock the `lists` row `FOR NO KEY UPDATE` to serialize appends. Phase 2, when `parentId` is set: then read the parent `FOR KEY SHARE`; it must be in `listId` and top-level, otherwise `NotFoundError("Task")` or `ConflictError("Subtasks cannot have subtasks")`. The parent lock makes a concurrent parent delete wait for this transaction, then cascade. Set position = `positionBetween(last sibling, null)`: new tasks and subtasks always append at the end of their siblings. |
| `updateTask(db, userId, taskId, input)` → `TaskView` | `write` on the task's list | Via `requireTaskRole`. Writes only the keys present in the parsed input. `parentId` is not updatable. |
| `deleteTask(db, userId, taskId)` → `void` | `write` on the task's list | Via `requireTaskRole`. Subtasks go with it through the FK cascade. |

**`requireTaskRole(tx, userId, taskId, action)`**

- **Lock order matches `deleteList`, membership before task:**
  1. Read the task's `list_id` without a lock. This is safe because `list_id` is immutable.
  2. Run `requireRole` on that list. `manage` takes the membership row `FOR UPDATE`; any other action takes it `FOR SHARE`.
  3. Re-select the task `FOR UPDATE`.
- **Rejections:**
  - An unknown or malformed id, a task in a list the user does not belong to, or a task deleted between steps 1 and 3 → `NotFoundError("Task")`.
  - A viewer → `ForbiddenError`.

**Lock protocol (all list-scoped writes)**

| Who | Lock order |
| --- | --- |
| Writers (task create, update, delete) | 1. Their **own** membership row `FOR SHARE` (`requireRole`). 2. For appends, the `lists` row `FOR NO KEY UPDATE`. 3. Then task rows (the parent `FOR KEY SHARE` on subtask creation; the target `FOR UPDATE` on update/delete). Inserts also take an implicit `FOR KEY SHARE` on `lists` through the FK, compatible with their already-held append lock. |
| List deletion (`deleteList`, existing code, **changed by this spec**) | 1. Its own membership `FOR UPDATE` (`requireRole … "manage"`). 2. Then **all** membership rows of the list `FOR UPDATE`, ordered by `user_id`. 3. Only then the `DELETE FROM lists`. |

Why `deleteList` must change: per-actor membership locks do not serialize *different* users. Today `deleteList` locks only the owner's own row, then locks the list row and cascades into the editor's membership row. Meanwhile an editor's insert holds the editor's membership row and waits on the list row. That is a cycle. A parallel review reproduced it as `40P01` against local PostgreSQL (lesson `2026-10-16-cross-actor-list-locks`). With the change, deletion waits until every in-flight writer of the list has committed.

**DB constraint errors are translated in `tasks.ts`, never surfaced raw**

| PostgreSQL error | Becomes |
| --- | --- |
| `23503` (FK) | `NotFoundError("Task")` |
| `23505` (unique) | `ConflictError("Please try again")` |
| `23514` (check) | `ConflictError("Invalid estimate")` |

So these failures map to 404 or 409, and pg's "Failing row contains (…)" detail never reaches `apiHandler`'s 500 log.

### HTTP (`apiHandler` envelope; `requireUser` first)

| Route | Body | Success `data` | Errors |
| --- | --- | --- | --- |
| `GET /api/lists/[listId]/tasks` | — | `TaskView[]` | 401, 404 |
| `POST /api/lists/[listId]/tasks` | `createTaskInput` | `TaskView` | 400 (`fieldErrors`), 401, 403, 404, 409 (depth) |
| `PATCH /api/tasks/[taskId]` | `updateTaskInput` | `TaskView` | 400, 401, 403, 404 |
| `DELETE /api/tasks/[taskId]` | — | `null` | 401, 403, 404 |

All of these are new routes, so no existing contract changes. Once shipped, they are protected by `BACKWARD_COMPATIBILITY.md`, which allows only additive changes. The `listId` route param is passed to the service separately. The body is never spread into an insert.

**Response validation boundaries**

- Extend the existing `apiHandler` with an optional response schema; every task route supplies its schema from the table above. Validate success `data` before serializing the envelope. Invalid service output is a generic 500, never a 400 input error. Do not pass the output `ZodError`, its values, or its details to the logger or client; log only a fixed diagnostic for the output-contract failure. Keep existing callers without a response schema working.
- Extend the existing `apiCall` to accept a response schema; all task hooks supply it. Validate the success envelope and its `data` before returning or putting anything in the Query cache. A malformed response throws `ApiError` with code `bad_response`, entering the existing error/optimistic-rollback path. Validate error-envelope fields defensively as well. Keep all HTTP calls in this helper.
- Unit tests cover valid task/subtask/list/null responses, missing required fields, incorrect field types, invalid estimate ranges, malformed envelopes, and additive unknown fields. Route tests prove invalid output becomes a generic 500 without exposing row values; client tests prove malformed data is rejected before it reaches the cache.

## 📝 UI/UX

There is one screen, at `/`, for a signed-in user. A signed-out user is redirected to the sign-in page from the auth spec. The layout is mobile-first, with touch targets of at least 44 px below 640 px and 36 px from 640 px (design-system decision V1, 2026-10-26).

- **Quick add.** At the top is a title field with an "Add" button; Enter submits. A "Details" disclosure reveals the description and the min / max fields (`inputmode="decimal"`, suffix "zł"). Only the title is required.
- **After an add.** The new task is appended at the end of the list. Its row scrolls into view and is briefly highlighted (no scroll animation or highlight under `prefers-reduced-motion: reduce`), and focus stays in the quick-add title field for the next capture. A new subtask is appended at the end of its parent's subtasks.
- **Task row.**
  - The row shows the title, the estimate as `formatPlnRange` (or "No estimate" in muted text) and, for a task with subtasks, "N subtasks" on a second line. Opening the row (its title) shows the description and the indented subtasks, each with its own estimate, plus "Add subtask". The description is shown only in the opened row (design system `TaskRow`; owner, 2026-10-26, prototype map L07).
  - **Note (2026-10-22, design system decision F11, approved by the owner):** `formatPlnRange` in `packages/core/src/money.ts` currently returns "1200,00 zł – 1500,00 zł" (`pl-PL` groups thousands only from five digits, always two decimals, spaces around the dash). Tokens rule 5 and the design system (`EstimateRange`) require "1 200–1 500 zł": thousands grouped with a non-breaking space, grosze only when not zero, an en dash without spaces, one "zł". Fix `formatPlnRange` (with unit tests) as part of this spec's UI work (PR B).
  - Row actions are in the row's "…" menu: "Add subtask", "Edit" and "Delete" (L07).
  - A subtask row has the same fields and actions except "Add subtask".
- **Edit:** the row switches in place to the same form, prefilled. Clearing both amounts removes the estimate.
- **Task deleted elsewhere (404 on an edit save or on adding a subtask):** the form shows "This task was deleted. The list has been refreshed.", the list is refetched and the row disappears; focus moves to the list. The server answers 404 both for a deleted task and for one the user cannot access, so the message must not claim more than that (owner, 2026-10-27, prototype map L15, states s06.8 and s07.6).
- **Delete:** a confirm dialog. For a task with subtasks it reads "Delete '{title}' and its N subtasks?". Deletion is irreversible (there is no soft delete).
- **Validation:**
  - The form parses amounts with `parsePlnToGrosze` and validates with the same `createTaskInput` / `updateTaskInput` before sending.
  - Server `fieldErrors` are shown under the matching field: `title`, `description`, `estimate.minGrosze`, `estimate.maxGrosze`.
  - Messages: "Enter an amount like 1 500,50", "Min must not exceed max", "Enter both amounts or neither".
- **States:**
  - **Loading:** a skeleton.
  - **Empty:** "No tasks yet. Start with one task. Only the title is required." with focus in the title field (owner, 2026-10-26, prototype map L22).
  - **Error:** a message with "Try again" (refetch).
  - **Page did not open** (the server page fails before any list exists, e.g. `ensureDefaultList` errors): the app shell stays, with a working "Sign out" and theme toggle, the heading "My renovation", and an error state "Could not open your tasks." with "Try again". There is no quick add and no list (owner, 2026-10-27, prototype map L13 and DS04, state s04.21).
  - Shared loading, empty and error components go in `packages/ui/src/components/` (standards §5).
- **Optimistic updates:**
  - Only add is optimistic: it inserts a temporary row at the end. Edit and delete wait for the server: the edit form shows "Saving…" and the row changes only after the server confirms; the delete dialog shows "Deleting…" and the row goes after the server confirms (design system "Optimistic change"; owner, 2026-10-26, prototype map L08).
  - A temporary row is pending until the server returns its real id: it renders dimmed, and its Edit, Delete and Add subtask actions are disabled, so no request is ever sent with a temporary id.
  - On error the cache rolls back and a toast-free inline error is shown; typed text is kept (design system texts, L14):
    - add refused: the temporary row goes and "Could not add the task. Try again." appears above the form;
    - add refused with 409: the form shows the server's `error.message` instead (e.g. "Please try again"). `ConflictError` messages are fixed, user-facing texts with no row data, so this is safe to show (owner, 2026-10-27, state s04.12);
    - edit refused: the form stays open with "Could not save the task. Try again.";
    - delete refused: the dialog stays open with "Could not delete the task. Try again.".
  - `onSettled` invalidates `queryKeys.tasks(listId)`.
- **Accessibility:**
  - Labelled inputs, with errors linked through `aria-describedby`.
  - Subtasks are a nested list (`<ul>` inside an `<li>`).
  - The dialog traps focus and returns focus to the trigger.

## 📝 Edge Cases & Failure Scenarios

| Case | Outcome the user sees |
| --- | --- |
| min > max, or only one amount typed | The form blocks the save with a message on the field. If bypassed, the API returns 400 with `fieldErrors`, and the DB `CHECK` is the last line. |
| `12,5`, `12.50`, `1 500`, `-5`, `1e3`, `12.345` | The first three are accepted (1250, 1250, 150000 grosze). The rest get "Enter an amount like 1 500,50". |
| Amount over 10 000 000 PLN | Field error. |
| Subtask added under a subtask (crafted request) | 409 "Subtasks cannot have subtasks". The UI never offers it. |
| Parent in another list (crafted request) | 404, and the composite FK also rejects it. |
| Parent deleted while a subtask is being added (two tabs) | If the add locks the parent first, the delete waits and then cascades the new subtask. If the delete commits first, the add gets 404: the form shows "This task was deleted. The list has been refreshed." and the refetch shows the consistent state (see UI/UX). |
| Task deleted in another tab while it is being edited | The save gets 404 and the UI behaves as in the previous row. |
| Two quick adds racing | The `lists` row lock serializes them, so they get distinct positions. If the unique sibling index ever fires, the result is 409 "Please try again", not a 500. The quick-add form shows that server message and keeps the typed text. |
| Editor adds a task while the owner deletes its list (API only; no editors exist in v1) | The delete locks every membership before touching the list (see Lock protocol). If the editor already holds their membership lock, deletion waits for the add to commit and then cascades it. If deletion wins first, the add gets 404. Neither ordering produces `40P01` or a 500. |
| First visit races in two tabs | `ensureDefaultList` returns the same list (unique index plus `ON CONFLICT`). |
| Task id of another user's list, or a malformed id | 404, which does not reveal whether it exists. |
| Session expired mid-use | 401. The client redirects to sign-in, and the unsaved form text is lost (accepted for v1). |
| Server produces an invalid task response | Server output validation returns a generic 500. If malformed data nevertheless reaches the browser, the client rejects it with `bad_response`, shows the existing error state, and rolls back an optimistic action. Invalid data never enters the Query cache. |
| Network failure on an optimistic action | Rollback plus an inline error. Nothing is half-saved, because each call is one transaction. |
| Owner tries to delete the default list (no UI for it; API exists from #6) | 409 "The default list cannot be deleted". Its tasks stay. Renaming it is allowed. |
| User acts on a just-added row before the server confirms it | Its actions are disabled until the real id arrives; nothing is sent with a temporary id. |

## 📝 Risks & Impact Review

- **`risk-high`** (schema migration, money, data scoping), per `SDLC.md`. The implementation PRs must carry:
  - a migration test applying `0001` on a clean DB and on a DB with `0000` data. The upgrade test needs a fresh database, which the local dev role cannot create (no `CREATEDB`, and the migrations hard-code `"public"`), so it runs under Testcontainers in CI and skips itself when `TEST_DATABASE_URL` is set. The rollback SQL is tested by hand and recorded in the run log;
  - money parsing and boundary tests;
  - an isolation integration test showing user B cannot list, add to, edit or delete user A's tasks, and that B's default list is separate;
  - `needs-qa` with no self-QA, and a second reviewer. PR A has no routes or UI, so its QA is evidence-based: the PR body carries the pre-deploy violation query and its output on the dev DB, `0001` applied to the dev DB, the integration run (isolation, concurrency, deadlock tests), the CI migration-upgrade test and the manual rollback check, and the QA reviewer verifies that evidence. PR B and PR C get hands-on QA.
- **Constraint tightening on existing data:** adding the `CHECK`s and the unique sibling index fails if a database already holds violating rows. No feature writes tasks today, but a pre-deploy query (`SELECT … WHERE` violates) goes in the PR body. If it finds rows, fix the data first.
- **Rollback plan** (no down migration is generated): drop the new constraints and indexes, then `tasks.description` and `lists.default_for_user_id`. Dropping the columns loses descriptions and the default-list marker, but not tasks. The app's previous build ignores the new columns.
- **Hard to reverse later:**
  - The `TaskView` and route shapes become a protected HTTP surface.
  - "One level of subtasks" is a cheap rule to relax later (drop the 409 check), but a costly one to tighten once deeper data exists.
- **Stub signature change:** `createTask(db, userId, input)` becomes `(db, userId, listId, input)` to match `renameList`. It has no consumers yet.
- **Totals rule (resolved 2026-10-16):** the owner approved updating `.ai/docs/engineering-standards.md` §6 from "leaf tasks only" to "main tasks only" (R06, R08). The TODO in `packages/core/src/summaryService.ts` still says "leaf tasks"; E03-S02 replaces it when the summary is built.
- **Issue #22 scope (resolved 2026-10-16):** the owner approved narrowing #22 to this spec's migration. Completed state, markers and spaces ship with their own migrations in E02/E03.

## 📝 Decisions in play

- **Relied on:**
  - D02, D13 (single owner, simple prototype)
  - D14 (description)
  - D15, R06 (subtasks with their own estimate, no roll-up)
  - D16, R07 (typed min–max, no real cost)
  - R01 (PLN, integer grosze)
  - R10 (estimate optional)
  - N02 (no sharing UI)
- **Partly delivered:** D21. Subtasks get a description and an estimate here; markers and spaces arrive with E02 for tasks and subtasks together.
- **Not superseded:** nothing. Q1–Q7 are design choices within the brief, confirmed by the owner on 2026-10-16.
- **Grilling decisions (owner, 2026-10-16):**
  - The default list cannot be deleted; it can be renamed.
  - The 10M PLN cap applies to estimate inputs only (`estimateGroszeSchema`); `groszeSchema` stays uncapped for totals.
  - The upgrade migration test runs only in CI (Testcontainers); the rollback is checked by hand.
  - Delivery is three PRs (see Phasing); PR A gets evidence-based QA.
  - New tasks append at the end, scroll into view and keep focus in quick-add.
  - Pending optimistic rows have their actions disabled.
  - `ensureDefaultList` reads first and writes only on a miss.
- **Clickable prototype decisions (owner, 2026-10-26 and 2026-10-27; `prototypes/konta-i-role/mapa-ekranow.md`, `prototypes/task-list-v1/`):** the description is shown only in the opened row and actions sit in "…" (L07); only add is optimistic (L08); the "page did not open" state (L13); design-system error texts (L14); the deleted-task message (L15); the empty-state text (L22); a 409 on add shows the server's message. All of these are in UI/UX above.

## 📋 Phasing

- **Phase 0 (prerequisite, separate spec):** minimal sign-up / sign-in pages and a session redirect (Phase A of the sign-in spec).
- **Phase 1 — Tasks (#15, #22):** migration, money parsing, default list, task services, routes and the screen. Shippable alone: the owner can capture tasks with estimates.
- **Phase 2 — Subtasks (#16):** one level of subtasks in the services and the UI. It builds on the Phase 1 schema, which already contains the parent FK.

**Delivery: three PRs.** Each one mentions the PRs it depends on without closing their issues. Epic #11 closes during post-merge housekeeping once all three are merged.

| PR | Steps | Closes | Waits for | QA |
| --- | --- | --- | --- | --- |
| A — schema and core | 1–6 | #22 | nothing | Evidence-based (see Risks) |
| B — routes and screen | 7–8 | #15 | Phase 0 merged (step 7's HTTP tests need its `createUser` helper and session config) | Hands-on |
| C — subtasks | 9–11 | #16 | PR B | Hands-on |

PR A is db and core only. Its integration tests insert users directly, like the existing `lists` and `access` tests. The routes become protected HTTP surface only when PR B ships them together with the UI that uses them.

## 📋 Implementation Plan

Each step ends with `npm test` at 100% coverage and leaves the app working.

### Phase 1 — Tasks

1. **Migration `0001`.** Update `packages/db/src/schema.ts` (description, composite parent FK, unique `(list_id, id)`, estimate checks, unique sibling position with `nullsNotDistinct`, `lists.default_for_user_id` and its partial unique index). Run `npm run db:generate` and review the SQL. Declare `(list_id, id)` as a `unique()` constraint and check that it comes **before** the composite FK in the generated file. drizzle-kit writes FKs before indexes (see `0000`), and the FK needs the unique to exist. Reorder by hand before the migration is first applied if needed. Extend `schema.integration.test.ts`: the checks reject min > max, one bound and a negative amount; a cross-list parent is rejected; deleting a parent cascades; duplicate sibling positions are rejected; a second default project list for the same user is rejected. Add an upgrade test that runs only under Testcontainers and skips itself when `TEST_DATABASE_URL` is set: on a fresh database, apply `0000`, insert lists, members and tasks (top-level, `parent_id` set, with and without estimates), apply `0001`, and assert the rows survive and the new constraints hold. Write the rollback SQL into the run log and test it once by hand.
2. **Money and schemas.** Add `parsePlnToGrosze` and `MAX_ESTIMATE_GROSZE` to `money.ts`. Add `estimateGroszeSchema` (leaving `groszeSchema` uncapped), `taskFields` / `createTaskInput` (without `parentId`) / `updateTaskInput`, the `estimateSchema` path, the four response schemas and the inferred `TaskView` type to `schemas.ts`. Unit tests cover every row of the amount table in Edge Cases, plus the boundaries (0, max, max + 1), and show that `groszeSchema` still accepts values above the cap. They also include a regression test that `updateTaskInput.parse({ title: "x" })` yields exactly `{ title: "x" }`, and that `{}` is rejected. Cover valid and malformed output shapes, including missing fields, invalid estimate ranges, empty subtask arrays and compatible additive fields.
3. **`ensureDefaultList`** in `lists.ts`, read first and writing only on a miss. Unit tests use a mocked `Db` and cover both the hit path (no insert) and the miss path. Integration tests: idempotent, two concurrent first calls → one list and one owner row, separate per user.
4. **`deleteList` changes:** the default-list guard (`ConflictError("The default list cannot be deleted")`; unit and integration tests, plus a test that `renameList` still renames it), and the lock change (Lock protocol): lock all of the list's membership rows `FOR UPDATE`, ordered by `user_id`, before the delete. The concurrency tests use a non-default project list made with `createList`. Integration test with **distinct actors** and explicit barriers: an editor's open write transaction plus the owner's `deleteList` → no `40P01`, the delete completes after the editor commits, and nothing is left behind. Exercise the complete `createTask` service in step 5 and subtask creation in step 9, testing both operation orderings. Existing `lists` tests stay green.
5. **`createTask` (top-level) and `listTasks`,** with the `requireTaskRole` helper and the pg error translation (unit-tested for 23503 / 23505 / 23514 and pass-through of other errors). Unit tests, plus integration tests: success, viewer → `ForbiddenError`, non-member → `NotFoundError`, user B cannot see A's tasks, 10 concurrent creates → 10 distinct positions. Remove the replaced assertions from `stubs.test.ts`.
6. **`updateTask` and `deleteTask`.** Success, forbidden and not-found tests for each. A title-only update keeps the description and estimate (the integration regression for the `.partial()` pitfall), and clearing the estimate (`null`) works. A concurrency test runs `deleteTask` and `deleteList` together and checks there is no deadlock. **End of PR A** (closes #22): collect the QA evidence listed in Risks into the PR body.
7. **Routes and response validation** (PR B; starts once Phase 0 is merged). Add the optional response-schema support to `apiHandler` and `apiCall`, preserving their current callers. Wire `api/lists/[listId]/tasks` (GET, POST) and `api/tasks/[taskId]` (PATCH, DELETE) to the appropriate output schemas. Unit tests use mocked core: parse, 401, envelope, valid responses, and malformed service output → generic 500 without sensitive data in logs. Client-helper tests cover malformed success/error envelopes, malformed data → `bad_response`, and compatible additive fields. Integration tests hit the real endpoints: outputs pass their schemas, CSRF header required on mutations, 400 `fieldErrors` keys, and session renewal (a session older than one day gets a fresh `Set-Cookie` on `GET …/tasks`, which is how "renewed while used" works per the sign-in spec).
8. **Screen at `/`:** this step is gated on Phase 0 being merged, because it needs the sign-in route as the redirect target.
   - initialise shadcn in `packages/ui` (`npx shadcn@latest init`; no `components.json` exists yet), then add the primitives
   - the agent-browser test creates its user with the `createUser` test helper from `.ai/specs/2026-10-16-sign-in-pages.md` (backed by `createPasswordUser`, not the sign-up endpoint), then signs in through Better Auth's HTTP endpoint. Run with `ALLOW_SIGN_UP=false` to prove task flows work with registration closed; clean up uniquely named fixture users and their lists afterward.
   - the server page with `ensureDefaultList` inside `<Suspense>`. The session lookup and the redirect live in a unit-tested helper in `packages/app/lib/`, so `page.tsx` stays logic-free glue (it is excluded from coverage). Page guards explicitly disable session refresh, as specified in the sign-in prerequisite. Extend the renewal integration test from step 7: age a session past the one-day renewal interval, open `/` as a full document request without `RSC: 1`, verify the guard leaves database expiry unchanged, then let the screen call `GET …/tasks` and assert both the advanced database expiry and renewed browser cookie. This catches page renders consuming renewal before the API call.
   - `TaskListScreen`, `TaskForm`, `TaskItem`, the hooks with optimistic updates and response-schema validation through `apiCall`, and the shared loading/empty/error components
   - jsdom component tests: the add, edit, delete, rollback and field-error paths, including malformed responses never entering the cache; a pending row has its actions disabled until confirmed; after an add, the new row is scrolled into view and focus stays in quick-add; edit and delete change the row only after the server confirms; a 409 on add shows the server's message; a 404 on an edit save shows the deleted-task message and refetches the list; the "page did not open" state keeps "Sign out" working
   - an agent-browser integration test for #15 AC1–AC4 (add 1500–2000 shown in PLN; 12,50 → shown as 12,50 zł; no estimate saved; min > max refused)
   - **End of PR B** (closes #15).

### Phase 2 — Subtasks

9. **`createTask` with `parentId`** (PR C) (add the field to `createTaskInput`; same list, top-level parent `FOR KEY SHARE`, 409 on depth), and `listTasks` nesting. A concurrency test deletes the parent while a subtask is added and expects either a cascade or a 404, never a 500. Integration tests for #16 AC2/AC3: adding or editing a subtask leaves the parent's estimate unchanged. AC4: a subtask on another user's task → 404.
10. **UI for subtasks:** "Add subtask", the indented rows, and subtask edit/delete. The delete dialog counts subtasks. Component tests (including a 404 on adding a subtask: the deleted-task message and a refetch), plus an agent-browser test for #16 AC1–AC3.
11. **Finish:** run the full gate (`format:check`, `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`), record lessons, and move this spec to `.ai/specs/implemented/` (`git mv`). **End of PR C** (closes #16). Every PR runs the full gate before it opens; only PR C moves the spec.
