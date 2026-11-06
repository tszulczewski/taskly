# Taskly

Plan and track home renovation work. Task lists (e.g. "Bathroom") hold tasks with subtasks (plastering, painting). Each task has an AI estimate (min–max range) and a real cost, all in PLN. A global shopping list supports quick adding and sharing, and a summary shows spent vs. upcoming expenses (upcoming = AI estimate). Lists are shared by invitation with `owner` / `editor` / `viewer` roles; tasks inherit access from their list.

Web only; on phones it runs as a PWA.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript (strict), npm workspaces |
| Database | PostgreSQL + Drizzle ORM, SQL migrations in the repo |
| Auth | Better Auth (email + password, DB-backed sessions); Google login after the MVP |
| Validation | Zod for all API inputs/outputs and AI responses |
| UI | Tailwind CSS, shadcn/ui, dnd-kit, TanStack Query (optimistic updates) |
| Live updates | Server-Sent Events from a Route Handler |
| AI | Claude API, server-side only, structured JSON validated with Zod |
| PWA | Web app manifest + service worker (e.g. Serwist) |
| Tests | Vitest (unit, 100% coverage), integration on real PostgreSQL via Testcontainers, agent-browser (browser) |

## Repository layout

```
packages/
  app/    Next.js application: UI and API Route Handlers
  core/   Zod schemas, domain logic, authorization, server-side Claude client
  db/     Drizzle schema, migrations, client
  ui/     Reusable UI components (shadcn/ui)
.ai/      Agent workflow: specs, run logs, lessons (see AGENTS.md)
```

Dependencies point one way: `app` → `ui`, `core`, `db`. `ui` and `db` never import `app`. Server-only modules (`db`, the Claude client) are never bundled into the browser.

## Architecture notes

**Request flow.** Route Handler parses input with Zod → calls a `core` function → `core` checks authorization and runs domain logic against `db` → handler validates/serialises the response with Zod. Handlers stay thin.

**Authorization.** Access is defined on the list: a user is `owner`, `editor` or `viewer` through list membership (created via invitations). Tasks, subtasks and list-scoped data inherit the list's access; there is no per-task ACL. All checks live in `core`.

**Ordering.** Tasks (and subtasks) have a `position` column using fractional indexing. Moving an item computes a key between its new neighbours and updates only that row, which keeps drag-and-drop cheap, optimistic and conflict-friendly.

**Optimistic UI.** TanStack Query applies mutations (create, edit, reorder, check off) locally, rolls back on error and reconciles with server state.

**Live updates (SSE).** Shared lists subscribe to a Route Handler that streams events (with periodic heartbeats). Clients invalidate/patch their TanStack Query cache on events. SSE was chosen over WebSockets because traffic is one-way and it works through a plain reverse proxy.

**AI estimates.** The server calls Claude to estimate a task's cost as a min–max range in PLN. The response is requested as structured JSON and validated with Zod before anything is stored; invalid output is rejected. The API key never reaches the browser.

**Money.** PLN only, stored as integers in grosze. Spent = sum of real costs; upcoming = sum of AI estimates for tasks not yet done.

**PWA.** A manifest plus a service worker give installability and an offline shell on phones.

## Deployment

Target: a small Ubuntu 24.04 VPS (~1 GB RAM, no swap), so memory use is kept deliberately low.

```
Internet ──TLS (Let's Encrypt)──▶ Apache vhost ──▶ 127.0.0.1:3000 (Next.js standalone, systemd)
                                                         │
                                                         ▼
                                              local PostgreSQL (low-RAM tuning)
```

- `next.config.ts` sets `output: 'standalone'` and `outputFileTracingRoot` to the repository root, so workspace packages are included in the trace.
- After `npm run build`, copy `public/` and `.next/static` into the standalone output, then run `node packages/app/.next/standalone/packages/app/server.js` under systemd with `HOSTNAME=127.0.0.1` and `PORT=3000`.
- Apache is a reverse proxy in its own vhost. The SSE route must not be buffered or compressed and needs a long timeout.
- Prefer building off the VPS (CI or locally) and shipping the artifact; a Next.js build can exhaust 1 GB of RAM.
- PostgreSQL runs locally with small `shared_buffers`, `work_mem` and `max_connections`; keep the app's connection pool small.
- The standalone server does not read `.env`; load it with systemd `EnvironmentFile=`. Configuration is via environment variables (`DATABASE_URL`, Better Auth secret/URL, Anthropic API key). See `.env.example` once added.

## Development

Requires Node.js, npm and a locally installed PostgreSQL.

```bash
npm install
npm run dev     # start the dev server
npm run lint
npm run build
npm test        # Vitest
npm run typecheck
npm run test:integration  # Testcontainers PostgreSQL + agent-browser (needs Docker, run `npm run build` first)
npm run test:env-scripts  # regression test of the QA launcher scripts in .ai/scripts (no Docker)
```

Agents working on this repo: read `AGENTS.md` and follow the `.ai/` workflow.
