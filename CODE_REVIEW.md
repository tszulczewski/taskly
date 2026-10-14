# Code review rules

Applied automatically by `om-code-review` (and so `om-auto-review-pr`). Full rationale: `.ai/docs/engineering-standards.md` — the checklist in its section 11 is the source for the repo-specific checks below. Project rules: `AGENTS.md`.

## Review priorities

1. **Security and authorization** — a missed check is a blocker.
2. **Correctness** — money, ordering, concurrency, validation of untrusted data.
3. **Contracts** — anything listed in `BACKWARD_COMPATIBILITY.md`.
4. **Tests** — 100% unit coverage is enforced; check the tests actually assert behavior.
5. **Quality and style** — only what lint/format cannot catch.

## Repo-specific checks

### Structure
- Dependency direction `app → core → db`; `ui` imports no `@taskly/*`; `core` never imports `next`/`react`. Client code imports only `@taskly/core`, never `@taskly/core/server` or `@taskly/db`. Server-only modules are marked `server-only`.
- Route Handlers are wiring only: Zod parse → `requireUser` → call `core` → envelope, wrapped in `apiHandler` (no inline try/catch, no business logic). Envelope is `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`.
- Services are plain functions `(db, actorUserId, input)`: Zod-parse → `requireRole` → work → publish event. No classes, no DI container.
- Server state in the client goes through TanStack Query (optimistic update + rollback) and the single fetch helper `packages/app/src/lib/api-client.ts`.
- Next.js here differs from common knowledge: check usage against `node_modules/next/dist/docs/`.

### Security (blockers)
- Every non-public route enforces authentication server-side.
- Authorization checks the specific record's list role (`owner` / `editor` / `viewer`; tasks inherit from the list). Non-member → `NotFoundError`, insufficient role → `ForbiddenError`; fail closed.
- All input parsed by a named Zod schema; no raw body into Drizzle (no mass assignment).
- Check-then-write runs in a transaction or is backed by a unique index.
- AI (Claude) output is untrusted: Zod-validate before use, never store invalid output. Claude is called only from server code.
- No secrets in logs, responses, or client bundles; Better Auth owns passwords/sessions/cookies (min password length 10, rate limiting on).

### Correctness
- Money is integer grosze end-to-end, never floats; totals computed server-side; PLN formatting only at the UI edge. Estimates are a min–max range.
- Order uses fractional `position` compared with `COLLATE "C"`; reorder writes only the moved row (client sends `{afterId, beforeId}`).
- Schema changes are new drizzle-kit SQL migrations; an applied migration is never edited.
- SSE route sends `Cache-Control: no-cache, no-transform` and heartbeats; no buffering.

### Quality
- TypeScript strict, no `any`, no `console.log`, no dead code; comments only for non-obvious *why*.
- Tests for success, forbidden, not-found (and concurrency where relevant); bug fixes ship a regression test. Coverage thresholds in `vitest.config.mts` are never lowered and the `exclude` list is never widened.
- New user-facing flows get an `*.integration.test.ts`.
- Memory-conscious (1 GB VPS): no unbounded in-process caches, small DB pool, no heavy dependencies.
- `.ai/lessons.md` updated after bug fixes.

## Validation gate

Run in order (from `.ai/agentic.config.json`): `format:check`, `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`. A failing command is a blocker.

## Severity

- **Blocker** — security/authorization gap, data loss, float money, broken layering that leaks server code to the client, edited applied migration, breaking a protected contract, failing gate.
- **Major** — missing validation, missing test for a branch/forbidden path, race condition, wrong ordering logic.
- **Minor** — naming, style, small simplifications, comment quality.
- **Nit** — preference; do not block on it.

Labels and the review state machine follow `SDLC.md`.
