# Taskly — Engineering Standards

- **Date:** 2026-10-14
- **Status:** active (approved by the owner: functional services without DI, helpers + lint boundaries first, password minimum 10). AGENTS.md carries the digest; this file holds the full rules and rationale.

Adapted from the DevMentor standards to Taskly's actual stack (Next.js App Router, Drizzle, Better Auth, Zod, TanStack Query, SSE) and to the code that already exists. Where DevMentor's rule does not fit, the difference is called out in the last section.

---

## 1. Layering and dependencies

```
app ──▶ core ──▶ db
app ──▶ ui          (ui imports nothing from the other packages)
```

- `db`: Drizzle schema, migrations, client. No business rules.
- `core`: Zod schemas, domain logic, authorization, services, AI client, auth config. Never imports `next`, `react` or `next/*` (except `better-auth/next-js`, isolated in `auth.ts`).
- `app`: Route Handlers, pages, wiring. No SQL or Drizzle calls, no business rules.
- `ui`: presentational and generic components. No `fetch`, no domain rules.
- **Two entry points in core.** `@taskly/core` is isomorphic (schemas, roles, position, the future-expenses rule, errors) and safe for client bundles. `@taskly/core/server` is server-only (`import "server-only"`: services, auth, AI, events). Client components import only `@taskly/core`.
- Enforce with ESLint `no-restricted-imports`: `ui` → nothing from `@taskly/*`; `core` → `next`, `react`; `db` → `@taskly/core`, `@taskly/app`; client files → `@taskly/db`, `@taskly/core/server`.

## 2. Naming

| Element | Convention | Example |
| --- | --- | --- |
| Package | `@taskly/<name>` | `@taskly/core` |
| Domain concept folder | plural, lowercase, matches the event namespace | `lists`, `tasks`, `shopping`, `invitations` |
| Files | kebab-case; suffix by role | `task.service.ts`, `task-create.schema.ts` |
| DB table / column | snake_case, plural table; camelCase property in Drizzle | `list_members`, `createdAt` → `created_at` |
| Money columns | `<name>Grosze`, integer | `costGrosze` |
| Service module | `core/src/<concept>.ts` (or `<concept>/` once it has several files); functions, not classes | `createTask(db, userId, input)` |
| Zod schema | camelCase + `Schema` / `Input` suffix; shared client+server | `createTaskInput`, `estimateSchema` |
| Domain error | PascalCase + `Error`, in `core/src/errors.ts` | `NotFoundError`, `ForbiddenError` |
| Event | `concept.entity.action`, past tense (type today: `task`, `shopping`, `members`, `list`) | `tasks.task.updated` |
| Route handler | one `route.ts` per resource under `app/api/<concept>/…` | `api/lists/[listId]/tasks/route.ts` |
| React component | kebab-case file (shadcn convention), PascalCase export; hooks `useX` | `task-row.tsx` → `TaskRow`, `useTasks` |
| TanStack Query keys | built in one `queryKeys` module, never inline arrays | `queryKeys.tasks(listId)` |
| Booleans | positive: `isDone`, `canEdit` | |

Create a concept folder when its first file is added. Do not scaffold empty ones.

## 3. Core services

- **Plain functions with explicit dependencies.** Signature: `(db, actorUserId, …input)`. No DI container, no classes, no hidden globals. Tests pass a real `Db`.
- **Order inside every service function:** (1) parse input with Zod → (2) authorize via `requireRole` → (3) do the work → (4) publish the event → (5) return the result. Authorization is never skipped, including for reads.
- **Authorization lives in core only.** Role checks are `can(role, action)` + `requireRole(db, userId, listId, action)`. Tasks and shopping items resolve their list and check that list's role. No per-task ACL.
- **Fail closed.** Non-member → `NotFoundError` (do not leak existence). Member without rights → `ForbiddenError`. Unexpected error inside a check → deny.
- **Errors:** services throw only `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `NotImplementedError`, plus `UnauthorizedError`, `ValidationError`, `ConflictError` as needed). They never build HTTP responses.
- **Transactions:** any check-then-write on shared state (membership changes, accepting an invitation, moving tasks, adding shopping items) runs in `db.transaction`. Backstop with unique indexes.
- **Events:** emitted after a successful mutation, from the service, never from the route. In-process only (single Node process). If it ever scales out, switch to PostgreSQL LISTEN/NOTIFY behind the same `publish/subscribe` API.
- **External services via ports.** The Claude client sits behind an `Estimator` function type. Services take the estimator as a parameter (default: the real one), so tests inject a fake. Vendor SDKs are imported only in their adapter file.

## 4. HTTP layer (Route Handlers)

A route file is wiring only: **parse → authenticate → call core → respond**.

Add to `packages/core/src/http.ts` (server-side, no `next` import) and `packages/app/lib/api.ts` (the thin `NextResponse` glue):

- `apiHandler(fn)` — wraps every handler. Maps `ZodError` → 400 with field errors, `UnauthorizedError` → 401, `ForbiddenError` → 403, `NotFoundError` → 404, `ConflictError` → 409, anything else → 500 with a generic message. Unexpected errors are logged with context. Stack traces never reach the client. **No route writes its own try/catch.**
- `requireUser(req)` — resolves the Better Auth session or throws `UnauthorizedError`. Every non-public route calls it first.
- **Envelope:** `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`. SSE routes are the exception (event stream).
- Route params use `RouteContext<'/api/…'>` (generated by `next typegen`), awaited `ctx.params`.
- Request bodies are parsed with a named Zod schema from `core`. Never spread a raw body into an insert/update.
- Do not add `makeCrudRoute`-style generators yet (YAGNI). Revisit after three routes have the same shape.

## 5. Client (React)

- **Server state = TanStack Query only.** No `useEffect` + `fetch`, no state copies of server data. Mutations use optimistic updates with rollback in `onError` and `invalidateQueries` in `onSettled`.
- **One fetch helper** (`packages/app/lib/api-client.ts`): the only code that calls `fetch('/api/…')`. It sets a custom header (`x-requested-with: taskly`), parses the envelope defensively, returns typed results / throws `ApiError`. Components never call `fetch`.
- **Forms** reuse the same Zod schema as the server (`@taskly/core`). Show server `fieldErrors` next to the field.
- **Drag and drop (dnd-kit):** the handler computes `{afterId, beforeId}` from the new neighbours and sends only that. It never sends or renumbers other rows. The cache is updated optimistically in the same order.
- **SSE:** one `useListEvents(listId)` hook subscribes with `EventSource`, patches or invalidates the Query cache, and cleans up on unmount. Reconnect is handled by `EventSource`. No SSE logic inside components.
- **Server vs client components:** default to Server Components. Add `"use client"` only for state, effects, browser APIs or dnd-kit. Keep client leaves small. Never import server-only code (`@taskly/db`, `@taskly/core/server`) into a client file.
- **UI placement:**
  1. shadcn primitive → `ui/src/components/ui/`, added with `npx shadcn@latest add`, not hand-written.
  2. Generic, concept-agnostic pattern (form field, empty state, data list) → `ui/src/components/`.
  3. Concept-specific component → `packages/app/components/<concept>/`. Exception (design system decision P1, 2026-10-21): its presentational part (props in, callbacks out; no `fetch`, no domain rules, no `@taskly/core` import; amounts arrive formatted) lives in `ui/src/product/<epic>/` and is documented in Storybook. The app wraps it there with TanStack Query hooks and the shared Zod schema.
  4. Used by one page → colocate; promote on the second use.
- Loading, error and empty states use shared components, not ad-hoc JSX.
- Styling: Tailwind utilities only, via `cn()`; design tokens in CSS variables. No inline `style` for static values. Mobile-first (phone PWA is a primary target); touch targets ≥ 44px.

## 6. Data and money

- **Money:** integer grosze everywhere (DB, Zod, API, state). Convert to PLN only at the display edge via one `formatPln(grosze)` helper. Never use floats for arithmetic. The AI's PLN numbers are converted with `Math.round(pln * 100)` at the boundary and Zod-checked (`min ≤ max`).
- **Totals are computed server-side.** The client never supplies totals or sums. A task with subtasks takes its estimate from them: the sum of their minimums and of their maximums, computed by `rollUpEstimate` in `@taskly/core` and never stored; its own typed figure is kept but not counted (product brief R12–R15). Totals count **main tasks only** (tasks without a parent), each with that effective estimate, so a subtask is never counted twice (R17; owner decision 2026-10-28, replacing the 2026-10-16 rule that subtask estimates are never summed).
- **Ordering:** `position` is a fractional-index string compared with `COLLATE "C"`. Never renumber siblings; one moved row = one `UPDATE`.
- **Migrations:** generated with `drizzle-kit generate`, reviewed, committed. Never edit an applied migration. Destructive changes (drop/rename) get a note in the PR and the run log. Resetting a shared or production DB is never done silently.
- **IDs:** UUID for domain rows; Better Auth tables keep its string ids.
- **Time:** `timestamptz` in the DB, ISO strings over the wire, formatting at the UI edge. Never store local times.
- **Cache Components:** this project enables `cacheComponents`. Data that depends on the user/session is never cached across users. Fetch user data inside `<Suspense>`-wrapped dynamic parts and read request data (`headers()`/`cookies()`) deliberately. Read `node_modules/next/dist/docs/` before touching caching.

## 7. Security and validation (minimum)

- **Auth is Better Auth.** Do not hand-roll password hashing, sessions, or cookies. Configure instead: `minPasswordLength` = 10, secure + httpOnly + sameSite=lax cookies in production (Better Auth defaults — verify, do not weaken), `trustedOrigins` set explicitly, secret ≥ 32 random bytes from env, built-in rate limiting enabled for sign-in/sign-up.
- **Every route authenticates server-side.** Hiding a button is not authorization.
- **Authorize the record, not just the user.** Each mutation resolves the record's list and checks the role. An invitation can only be accepted by the matching email, only once, and before it expires. Invitations never grant `owner`.
- **Mass assignment:** only Zod-parsed, explicitly typed fields reach Drizzle `insert/update`.
- **Injection:** Drizzle query builder or `sql` template with parameters. No string-concatenated SQL.
- **CSRF:** sameSite cookies + the custom header required on state-changing `/api` calls (the client helper always sets it; the handler wrapper rejects mutating requests without it) + Better Auth's origin check.
- **Secrets:** only in env, validated at startup by a Zod `env` schema in `core`. `.env` is git-ignored; `.env.example` lists names only. Never log passwords, tokens, cookies or the API key. The Anthropic key is read only in server code.
- **AI output is untrusted.** Always `JSON.parse` + Zod. Invalid output → error, nothing is stored. Bound `max_tokens`, set a timeout, rate-limit the estimate endpoint per user (cost control), and never put other users' data in the prompt.
- **Auth error messages are generic** (no "email not registered").
- **SSE** streams authenticate once per connection, verify list membership, and filter events to lists the user may read. Closing the connection unsubscribes (no listener leaks on a 1 GB VPS).
- **Dependencies:** `npm audit` is part of the gate. Do not add a dependency for 20 lines of code. Pin major versions. Note that this project's Next.js has breaking changes: consult the bundled docs.

## 8. Tooling and quality gates

- TypeScript `strict`, plus `noUncheckedIndexedAccess` (already in `tsconfig.base.json`). **No `any`**, no `@ts-ignore` (use `@ts-expect-error` with a reason). Narrow `unknown` with Zod.
- ESLint: `no-restricted-imports` boundaries (§1), `@typescript-eslint/no-explicit-any` as error, unused vars warn with `_` prefix, `no-console` (use the logger), `no-restricted-syntax` on direct `fetch(` outside the client helper.
- Prettier with the committed `.prettierrc.json` (`npm run format` / `format:check`); formatting is never mixed into behaviour changes.
- **Gate before "done":** `npm run format:check`, `npm run lint`, `npm run check:agents` (routed paths and line budgets of the `AGENTS.md` files), `npm run typecheck`, `npm test` (100% coverage), `npm run build`, `npm run audit` (production deps, fails on high), `npm run test:integration`.
- Commits: imperative subject, one purpose each, no drive-by refactors. Branch per change; never commit `.env`, `node_modules`, `.next` (checked by `.gitignore`).
- Comments only for non-obvious *why*. No commented-out code, no `console.log`, no dead code. No magic numbers: name the constant and say why (e.g. `INVITATION_TTL_MS = 7 days`).
- Functions do one thing, use early returns, no nesting beyond ~3 levels. No boolean-flag parameters at call sites: use an options object.

## 9. Testing

- **100% unit coverage is mandatory for all code** (statements, branches, functions, lines), enforced by Vitest thresholds in `vitest.config.mts` and by the CI `unit` job. Do not lower thresholds or add to the coverage `exclude` list to pass; only logic-free framework glue (`layout.tsx`, `page.tsx`) is excluded and must be covered by integration tests.
- **Unit (Vitest):** no DB, no network. Mock external modules (`vi.mock`); use `vi.stubEnv`/`vi.stubGlobal` for env and `fetch`. Components use jsdom + Testing Library. Stubbed services are tested to throw `NotImplementedError` until implemented, and those tests are replaced when real logic lands.
- **Integration (Vitest + Testcontainers PostgreSQL):** `*.integration.test.ts`, run with `npm run test:integration`. `test/global-setup.ts` starts an ephemeral `postgres:16-alpine`, applies the repo migrations and exports `DATABASE_URL`. Service functions are tested against the real DB (allowed, forbidden per role, non-member 404, concurrency). Never mock the DB. `TEST_DATABASE_URL` reuses an existing database when Docker is unavailable.
- **Browser integration (agent-browser):** the production build is started against the ephemeral DB (`test/helpers.ts`) and driven with the agent-browser CLI. Cover home/landing pages and each new page or flow.
- **AI:** unit-test `parseEstimate` with valid/fenced/invalid/out-of-order output; service tests inject a fake `Estimator`. Real API calls only in an opt-in, skipped-by-default test.
- **Route handlers:** thin; covered by unit tests with mocked core plus integration tests of the real endpoints.
- A bug fix ships a regression test that fails without the fix; a security-relevant fix is never merged without one.
- **CI:** `.github/workflows/ci.yml` runs lint/format/typecheck, unit (coverage), build, integration and audit on every pull request.

## 10. Performance and deployment constraints (1 GB VPS)

- Keep the DB pool small (`DATABASE_POOL_MAX` default 5); one pool per process (already global-cached).
- Paginate lists. Never load whole tables into memory. Prefer one query over N+1. Aggregate in SQL when data grows (future expenses currently load the list's rows; revisit when lists get large).
- No unbounded in-memory caches or listener maps. SSE sends heartbeats and unsubscribes on close.
- Prefer small dependencies. Check the bundle impact of any client library. Dynamic-import heavy client code (e.g. drag-and-drop) only where used.
- `next build` needs ~1 GB: build in CI or on a dev machine, ship the standalone output. Run production with `output: 'standalone'`, `HOSTNAME=127.0.0.1`, env via systemd `EnvironmentFile=`.
- Service worker: cache only static assets and the app shell; never cache authenticated `/api` responses.

## 11. Review checklist (copy into PR descriptions)

Structure
- [ ] Dependency direction respected; client files import no server-only code.
- [ ] Route = parse → auth → core call → envelope; no inline try/catch, no business logic.
- [ ] New server state goes through TanStack Query and the shared fetch helper.

Security (blockers)
- [ ] Authentication enforced server-side on every non-public route.
- [ ] Authorization checks the specific record's list role; non-members get 404.
- [ ] Input parsed by a named Zod schema; no raw body into Drizzle.
- [ ] No secrets/tokens in logs, responses or the client bundle.
- [ ] Check-then-write flows are in a transaction / backed by a unique index.
- [ ] AI output validated before use or storage.

Correctness
- [ ] Money is integer grosze end-to-end; totals computed server-side.
- [ ] Reorder writes only the moved row.
- [ ] Tests: success, forbidden, not-found, and (where relevant) concurrency; regression test for fixes.
- [ ] lint, typecheck, tests, build pass; `.ai/` run log/lessons updated.

---

## Differences from the DevMentor example (deliberate)

| DevMentor | Taskly | Why |
| --- | --- | --- |
| MikroORM + entities | Drizzle schema + SQL migrations | Chosen stack. |
| `awilix` DI, `Cradle`, `withScope` | Plain functions taking `db` | One small app; explicit parameters are greppable and simpler. YAGNI. |
| bcrypt + hand-rolled JWT cookie | Better Auth (DB sessions) | Library owns hashing, cookies and rate limiting; we configure, not reimplement. |
| `ui` has `backend/` panel layer (`CrudForm`, `DataTable`) | Not copied | Taskly is not an admin panel; add shared form/list components when the second use appears. |
| `makeCrudRoute` | Deferred | Few plain-CRUD resources; extract after repetition is real. |
| Entities/services/validators split by concept folders across packages | Concept folders only inside `core` when a module grows past one file | Smaller surface; Zod schemas stay in `schemas.ts` until they hurt. |
| No RBAC | Three list roles are core product | Hence `requireRole` in every service. |
| Event bus as `Cradle` singleton | Module-level bus on `globalThis`, feeds SSE | Same in-process-only rule. |
| No SSE/PWA | SSE and PWA rules added | Product requirements. |
