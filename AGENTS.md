<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Taskly — Agent Instructions

Taskly is a web app for planning and tracking home renovation work. Task lists (e.g. "Bathroom") contain tasks with subtasks (plastering, painting). Each task has an AI estimate (min–max range) and a real cost, all in **PLN**. There is a global, shareable shopping list with quick adding, and one expense summary: future expenses, the min–max sum of the estimates of open main tasks (version 1); incurred expenses (real costs) come later (D18, D19). Lists are shared via invitations with `owner` / `editor` / `viewer` roles; tasks inherit access from their list.

Commands (run from the repo root): `npm run dev`, `npm run build`, `npm run lint`, plus `npm test` (Vitest, 100% coverage), `npm run test:integration`, `npm run typecheck`, `npm run db:generate` / `db:migrate`, `npm run auth:set-password` (offline password reset; see `.ai/docs/runbook.md`).

## Task Router

Read `.ai/lessons.md` first, then what the task needs. Rules only one package needs live in that package's `AGENTS.md`.

| Task | Read |
| --- | --- |
| Bug fix | `.ai/lessons.md`, `.ai/lessons/_template.md`, `.ai/docs/engineering-standards.md` (§9 Testing) |
| New feature | `.ai/specs/product-brief.md`, `.ai/specs/backlog.md`, `.ai/specs/_template.md`, `.ai/docs/engineering-standards.md` |
| Refactor | `.ai/docs/engineering-standards.md`, `BACKWARD_COMPATIBILITY.md` |
| Review | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `.ai/docs/engineering-standards.md` (§11) |
| Security, auth, validation | `.ai/docs/engineering-standards.md` (§7), `packages/core/AGENTS.md` |
| Money, estimates, totals | `.ai/docs/engineering-standards.md` (§6), `.ai/specs/product-brief.md` |
| UI, screens, Storybook | `.ai/docs/design-system.md`, `packages/ui/AGENTS.md` |
| Integration or browser tests | `test/AGENTS.md`, `test/helpers.ts` |
| CI failure | `.github/workflows/ci.yml` |
| Deployment, operations | `packages/app/AGENTS.md`, `.ai/docs/runbook.md` |
| Tickets, labels, PR flow | `SDLC.md`, `.ai/agentic.config.json` |
| `packages/app` — Next.js pages, Route Handlers, client data, PWA, SSE | `packages/app/AGENTS.md` |
| `packages/core` — Zod schemas, services, authorization, Better Auth, Claude client | `packages/core/AGENTS.md` |
| `packages/db` — Drizzle schema, migrations, client | `packages/db/AGENTS.md` |
| `packages/ui` — design system (shadcn/ui), Storybook | `packages/ui/AGENTS.md` |

## Project assumptions (binding)

These are decisions already made. Do not swap technologies or deviate without asking the user.

- **Stack:** Next.js (latest, App Router) + React + TypeScript; PostgreSQL + Drizzle ORM; Better Auth (email + password); Tailwind CSS, shadcn/ui, **dnd-kit** for drag and drop, **TanStack Query**; Server-Sent Events for live updates; the Claude API from server code only.
- **Web only.** On phones it runs as a PWA. No native apps.
- Package manager: **npm** only (no yarn/pnpm/bun; commit `package-lock.json`). Install dependencies at the repo root with workspace flags (`npm install -w packages/app <pkg>`); keep a single lockfile.
- **Monorepo (npm workspaces):** packages live in `packages/` (see the Task Router). Workspace packages are named `@taskly/<name>` and consumed as TypeScript source. Shared tsconfig: `tsconfig.base.json`.
- Business rules and authorization (role checks for owner/editor/viewer, inheritance from list to task) live in `core`, not in route handlers or components. Every access to lists/tasks/shopping items must go through the authorization layer in `core`.
- **Resource limits:** the target is a small **Ubuntu 24.04 VPS, ~1 GB RAM, no swap.** Keep memory use low: avoid heavy dependencies, no in-process caches of unbounded size, stream large responses, keep DB pool small, avoid running `next build` alongside other heavy processes on the VPS (build in CI/locally and ship the artifact when possible).
- Configuration via environment variables (`DATABASE_URL`, Better Auth secret/URL, Anthropic API key, `ALLOW_SIGN_UP`); never commit secrets; keep a `.env.example`.

### Engineering standards (digest)

Full rules and rationale: `.ai/docs/engineering-standards.md` — read it before writing code. The essentials:

- **Layering:** `app` → `ui`, `core`, `db`; `core` → `db` only where it must; `ui` imports no `@taskly/*`; `db` never imports `app`. Client code imports only `@taskly/core` (isomorphic), never `@taskly/core/server` or `@taskly/db`; browser bundles never get server-only code (`db`, the Claude client, secrets), so mark such modules `server-only`. `core` never imports `next`/`react`. Enforced by ESLint `no-restricted-imports`.
- **Money** is integer grosze end-to-end, never floats; totals computed server-side, formatted to PLN only at the UI edge. **Order** uses fractional-index `position` compared with `COLLATE "C"`; never renumber siblings, only the moved row changes.
- **Security:** Better Auth owns passwords/sessions/cookies (min password length 10, rate limiting on); authorize the specific record; Zod validates every API input and output (Zod-parsed input only, no mass assignment); AI output is untrusted (Zod-validate; invalid output is an error and is never stored); no secrets in logs or client bundles.
- **Quality:** no dead code, comments only for non-obvious *why*; tests for success/forbidden/not-found (+ concurrency). Gate before calling work done (plus a manual check of the running app where relevant; report real results in the run log, including failures and anything skipped): `npm run format:check`, `lint`, `check:agents`, `typecheck`, `test`, `build`, `audit`, `test:integration`. Use `npm run format` to fix formatting.

### Testing (mandatory)

- **Every new feature must be 100% covered by unit tests** (statements, branches, functions, lines). `npm test` runs Vitest with coverage and **fails below 100%** (thresholds in `vitest.config.mts`). A feature is not done, and a PR must not be opened, until `npm test` passes. Never lower the thresholds or widen the coverage `exclude` list to get green; only framework glue with no logic (`app/layout.tsx`, `app/page.tsx`) is excluded, and it is covered by the browser integration tests instead. Bug fixes ship a regression test.
- Unit tests (`*.test.ts[x]`, next to the code) must not touch the network or a database; mock external modules. Components use `// @vitest-environment jsdom`.
- New user-facing pages/flows get an integration test (`test/AGENTS.md`).

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
