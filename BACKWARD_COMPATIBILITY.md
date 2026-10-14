# Backward compatibility

Taskly is a single deployed web app (plus PWA clients that may run a cached older bundle), not a published library. These are the surfaces whose change needs care. Review skills check diffs against this file; implementation skills warn when a change violates it.

## Protected surfaces

| Surface | Breaking change | Required path |
| --- | --- | --- |
| **DB schema and migrations** (`packages/db/migrations/`, `packages/db/src/schema.ts`) | Editing an applied migration; dropping/renaming a column or table in use; tightening a constraint on existing data | Never edit an applied migration — add a new one. Destructive changes use expand → migrate data → contract across separate releases. PR body carries a rollback plan and a migration test (`risk-high`). |
| **HTTP API** (`packages/app/app/api/**`) | Removing/renaming a route, field, or error `code`; changing the envelope `{ ok, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`; changing a status code's meaning | Additive changes only. The PWA service worker can serve an older client, so keep the previous shape working for one release, then remove it in a follow-up PR. Zod schemas in `@taskly/core` are the contract. |
| **SSE event stream** (shared-list live updates) | Renaming events or changing payload shape | Add new event types alongside the old; keep old payloads until clients have rolled over. |
| **Money representation** | Changing units (grosze integers) or the min–max estimate shape | Not allowed without a data migration and an explicit user decision; PLN-only is a binding project assumption. |
| **Ordering** (`position`, fractional indexing, `COLLATE "C"`) | Changing the key scheme or collation | Requires a data migration that preserves order; never renumber siblings. |
| **Auth** (Better Auth tables, session cookies, roles `owner`/`editor`/`viewer`) | Changing session/cookie format, role semantics, or invitation behavior | `risk-high`: migration plan for existing sessions/users, denied-path integration tests, second reviewer. |
| **Workspace package APIs** (`@taskly/core` `.` and `./server`, `@taskly/db` `.` and `./schema`, `@taskly/ui`) | Removing or changing an export's signature | Internal packages: update all consumers in the same PR; keep the isomorphic (`.`) vs server-only (`./server`) split intact. |
| **Environment variables** (`.env.example`) | Renaming/removing a variable or making an optional one required | Update `.env.example`, document in the PR, and note the deploy step; never commit secrets. |
| **PWA manifest / service worker** | Changing the cache scheme or scope in a way that strands old clients | Version the cache; ensure old clients update cleanly. |
| **Deployment contract** (standalone output path, `127.0.0.1:3000`, SSE proxy behavior) | Changing entrypoint path, bind address, or SSE buffering assumptions | Update the deployment notes in `AGENTS.md` in the same PR. |

## Process

1. Identify whether the diff touches a surface above.
2. If breaking: stop and ask the user unless the spec already approves it; describe the migration path in the PR body.
3. Reviewers raise an unjustified break as a **blocker** (see `CODE_REVIEW.md`).
