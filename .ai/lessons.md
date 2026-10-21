# Lessons Learned

Long-term memory for AI agents working on this project. Read this file **before starting any task**.

## How to use

- Add a one-line entry to the index below for every lesson. Newest first.
- Put details (context, root cause, fix, how to avoid) in `.ai/lessons/YYYY-MM-DD-slug.md`.
- Small, self-explanatory lessons may live only in the index.
- Before adding, check for an existing lesson on the topic; update it instead of duplicating.
- Remove or correct lessons that turn out to be wrong.

## Index

<!-- Format: - YYYY-MM-DD — Short summary → [details](lessons/YYYY-MM-DD-slug.md) -->

- 2026-10-21 — Backlog stories have no per-story spec (issue bodies say so); check `.ai/specs/` before pointing decisions at "the spec for E0x-S0y". Decisions made before a spec exists go to `.ai/specs/research/decisions/` with a pointer in `backlog.md`.
- 2026-10-16 — The local dev DB role has no `CREATEDB`, and migrations hard-code the `"public"` schema, so tests that need a fresh database (e.g. applying `0000`, adding data, then applying later migrations) can't run locally. Run them only under Testcontainers (CI) and skip when `TEST_DATABASE_URL` is set.
- 2026-10-16 — Better Auth 1.7.7 `POST /sign-out` always returns 200 and clears the cookie: it only logs session-deletion DB errors and succeeds without a session. Don't promise "row deleted" or treat a no-session sign-out as an error.
- 2026-10-16 — Membership-first locking does not serialize different actors: an editor's task append can deadlock with an owner's list cascade deletion. Test lock protocols with distinct users → [details](lessons/2026-10-16-cross-actor-list-locks.md)
- 2026-10-16 — Better Auth 1.7.7: explicitly disable refresh for page-session reads; `nextCookies()` detects Flight requests but can advance DB expiry without renewing the cookie on document renders. Drizzle transactions are opt-in, and password updates plus session revocation need an explicit atomic boundary → [details](lessons/2026-10-16-better-auth-session-and-reset-boundaries.md)
- 2026-10-16 — Better Auth 1.7: rate limiting runs only in its HTTP router (direct `auth.api.*` calls from Server Actions skip it); `disableSignUp` also blocks server-side `signUpEmail`. Behind a proxy configure trusted client-IP resolution to avoid a shared rate-limit bucket.
- 2026-10-16 — Zod 4 `.partial()` keeps `.default()` values: `{title}` parses with `description: null` filled in, so a PATCH would wipe fields. Build update schemas from a default-free base object.
- 2026-10-15 — No Docker: run integration tests with `TEST_DATABASE_URL` on the dev DB; tests must create and delete their own uniquely named rows → [details](lessons/2026-10-15-integration-tests-without-docker.md)
- 2026-10-14 — "Set up" means skeleton only; do not implement features unasked → [details](lessons/2026-10-14-scope-skeleton-only.md)
- 2026-10-14 — tsc fails on a clean tree until `next typegen` runs → [details](lessons/2026-10-14-typecheck-needs-typegen.md)
