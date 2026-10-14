<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Taskly — Agent Instructions

Taskly is a web app for planning and tracking home renovation work. Task lists (e.g. "Bathroom") contain tasks with subtasks (plastering, painting). Each task has an AI estimate (min–max range) and a real cost, all in **PLN**. There is a global, shareable shopping list with quick adding, and a summary of spent vs. upcoming expenses (upcoming = AI estimate). Lists are shared via invitations with `owner` / `editor` / `viewer` roles; tasks inherit access from their list.

Commands (run from the repo root): `npm run dev`, `npm run build`, `npm run lint`, plus `npm test` (Vitest); `npm run typecheck`, `npm run db:generate` / `db:migrate`; `npm run e2e` (Playwright) once added.

## Project assumptions (binding)

These are decisions already made. Do not swap technologies or deviate without asking the user.

### Stack
- **Next.js (latest, App Router)** + **React** + **TypeScript with `strict: true`**. Package manager: **npm** only (no yarn/pnpm/bun; commit `package-lock.json`).
- **Web only.** On phones it runs as a **PWA** (web app manifest + service worker, e.g. Serwist). No native apps.
- **PostgreSQL + Drizzle ORM.** Schema changes are **SQL migrations kept in the repo** (generated with drizzle-kit, reviewed, committed). Never edit an applied migration; add a new one.
- **Authentication: Better Auth**, email + password, sessions stored in our database. Google login comes **after the MVP** — don't add it now.
- **Zod** validates all API inputs and outputs and all AI responses.
- **Frontend:** Tailwind CSS, shadcn/ui, **dnd-kit** for drag and drop, **TanStack Query** with optimistic updates.
- **Ordering:** task order is stored in a `position` column using **fractional indexing**. Never renumber siblings on reorder; only the moved row changes.
- **Live updates:** shared lists use **Server-Sent Events** from a Route Handler (not WebSockets).
- **AI:** the Claude API is called **only from server code**, never from the browser. Responses are structured JSON validated with Zod; invalid output is an error, never trusted. API keys live in server-only env vars.
- **Money:** PLN only. Store amounts as integers in grosze (or `numeric`), never floats. Estimates are a min–max range.
- **Tests:** **Vitest** for unit tests and for integration tests against a **real PostgreSQL** (no DB mocks), **Playwright** for E2E.

### Monorepo (npm workspaces)
Sub-packages live in `packages/`. Minimum structure:

| Package | Purpose |
| --- | --- |
| `packages/app` | The main Next.js application: UI and API Route Handlers. |
| `packages/core` | Reusable parts: Zod schemas, domain logic, authorization, the server-side Claude client. |
| `packages/db` | Data management: Drizzle schema, migrations, client. |
| `packages/ui` | Reusable UI components (shadcn/ui). |

Rules:
- Dependency direction: `app` → `ui`, `core`, `db`; `core` → `db` only where it must; `ui` and `db` never import `app`. No circular dependencies.
- Business rules and authorization (role checks for owner/editor/viewer, inheritance from list to task) live in `core`, not in route handlers or components. Route Handlers stay thin: parse with Zod → call `core` → respond.
- Every access to lists/tasks/shopping items must go through the authorization layer in `core`.
- Browser bundles must never import server-only code (`db`, the Claude client, secrets). Mark such modules `server-only`.
- Install dependencies at the repo root with workspace flags (`npm install -w packages/app <pkg>`); keep a single lockfile.
- Workspace packages are named `@taskly/<name>` and consumed as TypeScript source (`transpilePackages` in `packages/app/next.config.ts`). Shared tsconfig: `tsconfig.base.json`.
- The standalone server entry is `packages/app/.next/standalone/packages/app/server.js` (copy `public/` and `.next/static` into `packages/app/.next/standalone/packages/app/`).

### Deployment target and resource limits
- Small **Ubuntu 24.04 VPS, ~1 GB RAM, no swap.** Keep memory use low: avoid heavy dependencies, no in-process caches of unbounded size, stream large responses, keep DB pool small, avoid running `next build` alongside other heavy processes on the VPS (build in CI/locally and ship the artifact when possible).
- Next.js with **`output: 'standalone'`** and **`outputFileTracingRoot`** pointing to the **repository root** (required so workspace packages are traced).
- Run by **systemd** on **127.0.0.1:3000** (set `HOSTNAME=127.0.0.1`, `PORT=3000`); never bind publicly. Copy `public/` and `.next/static` into the standalone output.
- **Apache reverse proxy** in a separate vhost, **TLS via Let's Encrypt**, and **no buffering for the SSE route** (no response buffering/compression, long proxy timeout; the SSE handler sends `Cache-Control: no-cache, no-transform` and periodic heartbeat comments).
- **Local PostgreSQL** tuned for low RAM (small `shared_buffers`, `work_mem`, `max_connections`). Development also uses a locally installed PostgreSQL (not Docker).
- Configuration via environment variables (`DATABASE_URL`, Better Auth secret/URL, Anthropic API key); never commit secrets; keep a `.env.example`.

## The `.ai/` directory (mandatory)

All AI-related project metadata lives in `.ai/`. Agents MUST use this structure.

```
.ai/
├── specs/                  # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md  # Active specs (not yet implemented)
│   ├── implemented/        # Specs whose implementation is complete
│   └── archive/            # Obsolete, rejected or superseded specs
├── runs/                   # Logs of autonomous AI runs
│   └── YYYY-MM-DD-slug.md
├── lessons.md              # Index of lessons learned (long-term memory)
└── lessons/                # Detailed lessons: YYYY-MM-DD-slug.md
```

Naming: `YYYY-MM-DD-slug.md` everywhere — date is the creation date, slug is lowercase kebab-case (e.g. `2026-10-14-task-filtering.md`). Templates are in each folder as `_template.md`.

### Specs (`.ai/specs/`)
- Specs are the source of truth. If work is based on a spec, read it fully first; if requirements are unclear or conflict with the code, ask or note it in the run log rather than silently deviating.
- Do not edit a spec's requirements without the user's approval.
- When implementation is complete and verified, move the spec (`git mv`) to `specs/implemented/`. Obsolete or superseded specs go to `specs/archive/`. Never delete specs.

### Runs (`.ai/runs/`)
- Every autonomous AI run MUST write a log to `.ai/runs/YYYY-MM-DD-slug.md` (use `_template.md`): goal, linked spec, steps, files changed, verification results, problems, lessons recorded.
- Create the log at the start of the run and update it as you go; finalize it before finishing. If a file for that date+slug exists, pick a more specific slug.
- Run logs are append-only history; do not rewrite old ones.

### Lessons (`.ai/lessons.md` + `.ai/lessons/`)
- Read `.ai/lessons.md` before starting work.
- After fixing a bug, or whenever you learn something worth remembering (pitfall, project convention, tooling quirk, better approach), record it: add an index line to `lessons.md` and, if non-trivial, a detail file in `lessons/` (use `_template.md`).
- Keep entries factual and actionable. Update or remove entries that become wrong; don't duplicate.

## Working principles
- **Plan complex tasks first.** For anything multi-step or touching several files, write a plan (plan mode in Claude Code; for spec-based work, the spec is the plan) and get it agreed before implementing. If the work goes sideways, stop and re-plan instead of pushing through.
- **Verify every change.** Run `npm run lint` and `npm run build` (plus any relevant tests or a manual check of the running app) before calling work done. Report real results in the run log, including failures and anything skipped.
- **Record lessons after corrections.** When the user corrects you, or a review/CI/verification step exposes a mistake, add a lesson to `.ai/lessons.md` right away so it is not repeated. Rules that apply to all work belong in this file instead.
- **Fix bugs autonomously.** Given a bug report, failing test or log, reproduce it, find the root cause and fix it without waiting for step-by-step direction. Record the lesson afterwards.
- **Redo mediocre fixes.** If a fix feels like a workaround, discard it and implement the clean solution using what you learned.
- **Keep specs precise.** Ask clarifying questions up front rather than guessing; specific requirements produce better results.
- **Use subagents** for broad searches or independent side tasks to keep the main context clean.

## General rules
- Do not commit unless asked. Do not touch the `nextjs-agent-rules` block above (it is managed by `next dev`).
