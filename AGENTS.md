<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Taskly — Agent Instructions

Taskly is a web app for planning and tracking home renovation work. Task lists (e.g. "Bathroom") contain tasks with subtasks (plastering, painting). Each task has an AI estimate (min–max range) and a real cost, all in **PLN**. There is a global, shareable shopping list with quick adding, and a summary of spent vs. upcoming expenses (upcoming = AI estimate). Lists are shared via invitations with `owner` / `editor` / `viewer` roles; tasks inherit access from their list.

Commands (run from the repo root): `npm run dev`, `npm run build`, `npm run lint`, plus `npm test` (Vitest, 100% coverage), `npm run test:integration`, `npm run typecheck`, `npm run db:generate` / `db:migrate`, `npm run auth:set-password` (offline password reset; see `.ai/docs/runbook.md`).

## Project assumptions (binding)

These are decisions already made. Do not swap technologies or deviate without asking the user.

### Stack
- **Next.js (latest, App Router)** + **React** + **TypeScript**. Package manager: **npm** only (no yarn/pnpm/bun; commit `package-lock.json`).
- **Web only.** On phones it runs as a **PWA** (web app manifest + service worker, e.g. Serwist). No native apps.
- **PostgreSQL + Drizzle ORM.** Schema changes are **SQL migrations kept in the repo** (generated with drizzle-kit, reviewed, committed). Never edit an applied migration; add a new one.
- **Authentication: Better Auth**, email + password, sessions stored in our database. Google login comes **after the MVP** — don't add it now.
- **Frontend:** Tailwind CSS, shadcn/ui, **dnd-kit** for drag and drop, **TanStack Query**.
- **Live updates:** shared lists use **Server-Sent Events** from a Route Handler (not WebSockets).
- **AI:** the Claude API is called **only from server code**, never from the browser; responses are structured JSON. API keys live in server-only env vars.

### Monorepo (npm workspaces)
Sub-packages live in `packages/`. Minimum structure:

| Package | Purpose |
| --- | --- |
| `packages/app` | The main Next.js application: UI and API Route Handlers. |
| `packages/core` | Reusable parts: Zod schemas, domain logic, authorization, the server-side Claude client. |
| `packages/db` | Data management: Drizzle schema, migrations, client. |
| `packages/ui` | Reusable UI components (shadcn/ui). |

Rules:
- Business rules and authorization (role checks for owner/editor/viewer, inheritance from list to task) live in `core`, not in route handlers or components.
- Every access to lists/tasks/shopping items must go through the authorization layer in `core`.
- Browser bundles must never import server-only code (`db`, the Claude client, secrets). Mark such modules `server-only`.
- Install dependencies at the repo root with workspace flags (`npm install -w packages/app <pkg>`); keep a single lockfile.
- Workspace packages are named `@taskly/<name>` and consumed as TypeScript source (`transpilePackages` in `packages/app/next.config.ts`). Shared tsconfig: `tsconfig.base.json`.
- The standalone server entry is `packages/app/.next/standalone/packages/app/server.js` (copy `public/` and `.next/static` into `packages/app/.next/standalone/packages/app/`).

### Deployment target and resource limits
- Small **Ubuntu 24.04 VPS, ~1 GB RAM, no swap.** Keep memory use low: avoid heavy dependencies, no in-process caches of unbounded size, stream large responses, keep DB pool small, avoid running `next build` alongside other heavy processes on the VPS (build in CI/locally and ship the artifact when possible).
- Next.js with **`output: 'standalone'`** and **`outputFileTracingRoot`** pointing to the **repository root** (required so workspace packages are traced).
- Run by **systemd** on **127.0.0.1:3000** (set `HOSTNAME=127.0.0.1`, `PORT=3000`); never bind publicly.
- **Apache reverse proxy** in a separate vhost, **TLS via Let's Encrypt**, and **no buffering for the SSE route** (no response buffering/compression, long proxy timeout; the SSE handler sends `Cache-Control: no-cache, no-transform` and periodic heartbeat comments).
- **Client IP for rate limiting:** the app trusts `X-Forwarded-For` only from `127.0.0.1`/`::1` and uses the right-most untrusted address (`advanced.ipAddress` in `packages/core/src/auth.ts`). Two failure modes: if Apache stops sending XFF, every client is seen as 127.0.0.1 and shares one bucket, so a stranger's failed sign-ins can lock the owner out; if the app is ever exposed without Apache, a client can forge a fresh XFF per request and bypass the rate limit — the 127.0.0.1-only bind prevents that.
- **Local PostgreSQL** tuned for low RAM (small `shared_buffers`, `work_mem`, `max_connections`). Development also uses a locally installed PostgreSQL (not Docker).
- Configuration via environment variables (`DATABASE_URL`, Better Auth secret/URL, Anthropic API key, `ALLOW_SIGN_UP`); never commit secrets; keep a `.env.example`.

Operator procedures (Apache vhost check, creating the owner account, resetting a password): `.ai/docs/runbook.md`.

### Engineering standards (digest)

Full rules and rationale: `.ai/docs/engineering-standards.md` — read it before writing code. For any UI, also read `.ai/docs/design-system.md` (the design system in `packages/ui` and its Storybook). The essentials:

- **Layering:** `app` → `ui`, `core`, `db`; `core` → `db` only where it must; `ui` imports no `@taskly/*`; `db` never imports `app`. Client code imports only `@taskly/core` (isomorphic), never `@taskly/core/server` or `@taskly/db`. `core` never imports `next`/`react`. Enforced by ESLint `no-restricted-imports`.
- **Services = plain functions** `(db, actorUserId, input)`; no DI container, no classes. Order: Zod-parse → `requireRole` → work → publish event. Non-member → `NotFoundError`, insufficient role → `ForbiddenError`; fail closed. Check-then-write runs in a transaction.
- **Routes** are wiring only: parse → `requireUser` → call core → envelope, wrapped in `apiHandler` (no inline try/catch). Envelope: `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`.
- **Client:** server state only via TanStack Query (optimistic updates, rollback); the single fetch helper `packages/app/lib/api-client.ts` is the only `fetch('/api…')` call site; one SSE hook; reorder sends only `{afterId, beforeId}`.
- **Money** is integer grosze end-to-end, never floats; totals computed server-side, formatted to PLN only at the UI edge. **Order** uses fractional-index `position` compared with `COLLATE "C"`; never renumber siblings, only the moved row changes.
- **Security:** Better Auth owns passwords/sessions/cookies (min password length 10, rate limiting on); authorize the specific record; Zod validates every API input and output (Zod-parsed input only, no mass assignment); AI output is untrusted (Zod-validate; invalid output is an error and is never stored); no secrets in logs or client bundles.
- **Quality:** no dead code, comments only for non-obvious *why*; tests for success/forbidden/not-found (+ concurrency). Gate before calling work done (plus a manual check of the running app where relevant; report real results in the run log, including failures and anything skipped): `npm run format:check`, `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`. Use `npm run format` to fix formatting.

### Testing and CI (mandatory)

- **Every new feature must be 100% covered by unit tests** (statements, branches, functions, lines). `npm test` runs Vitest with coverage and **fails below 100%** (thresholds in `vitest.config.mts`). A feature is not done, and a PR must not be opened, until `npm test` passes. Never lower the thresholds or widen the coverage `exclude` list to get green; only framework glue with no logic (`app/layout.tsx`, `app/page.tsx`) is excluded, and it is covered by the browser integration tests instead. Bug fixes ship a regression test.
- Unit tests (`*.test.ts[x]`, next to the code) must not touch the network or a database; mock external modules. Components use `// @vitest-environment jsdom`.
- **Integration tests** (`*.integration.test.ts`, run with `npm run test:integration`) use a real PostgreSQL (no DB mocks) started by Testcontainers (`test/global-setup.ts`; needs Docker) and drive the production build with the **agent-browser** CLI (`test/helpers.ts`). Set `TEST_DATABASE_URL` to use an existing database when Docker is unavailable. Run `npm run build` first. New user-facing pages/flows get an integration test.
- **GitHub Actions** (`.github/workflows/ci.yml`) runs these checks on every pull request (and pushes to `main`). All jobs must pass before merging.

## The `.ai/` directory (mandatory)

All AI-related project metadata lives in `.ai/`.

Naming: `YYYY-MM-DD-slug.md` everywhere — date is the creation date (today's date from the session context), slug is lowercase kebab-case (e.g. `2026-10-14-task-filtering.md`). Templates are in each folder as `_template.md`.

### Specs (`.ai/specs/`)
- Specs are the source of truth. At the start of a task, read any relevant spec fully; if requirements are unclear or conflict with the code, ask or note it in the run log rather than silently deviating.
- Do not edit a spec's requirements without the user's approval.
- When implementation is complete and verified, move the spec (`git mv`) to `specs/implemented/`. Obsolete or superseded specs go to `specs/archive/`. Never delete specs.

### Runs (`.ai/runs/`)
- Every autonomous or long AI run MUST write a log to `.ai/runs/YYYY-MM-DD-slug.md` (use `_template.md`): goal, linked spec, steps, files changed, verification results, problems, lessons recorded.
- Create the log at the start of the run and update it as you go; finalize it before finishing. If a file for that date+slug exists, pick a more specific slug.
- Run logs are append-only history; do not rewrite old ones.

### Lessons (`.ai/lessons.md` + `.ai/lessons/`)
- Read `.ai/lessons.md` before starting work.
- After fixing a bug, after a correction (from the user, a review, CI or a verification step), or whenever you learn something worth remembering (pitfall, project convention, tooling quirk, better approach), record it right away: add an index line to `lessons.md` and, if non-trivial, a detail file in `lessons/` (use `_template.md`). Rules that apply to all work belong in this file instead.

## Working principles
- **Plan complex tasks first.** For anything multi-step or touching several files, write a plan (plan mode in Claude Code; for spec-based work, the spec is the plan) and get it agreed before implementing. If the work goes sideways, stop and re-plan instead of pushing through.
- **Fix bugs autonomously.** Given a bug report, failing test or log, reproduce it, find the root cause and fix it without waiting for step-by-step direction.
- **Redo mediocre fixes.** If a fix feels like a workaround, discard it and implement the clean solution using what you learned.
- **Keep specs precise.** Ask clarifying questions up front rather than guessing.
- **Use subagents** only for broad codebase searches, to keep the main context clean. Never launch a review agent without asking.

## General rules
- Do not commit unless asked. Do not touch the `nextjs-agent-rules` block above (it is managed by `next dev`).
