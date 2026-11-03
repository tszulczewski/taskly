# packages/core — domain logic, authorization, auth, AI

Reusable parts: Zod schemas, domain logic, authorization, the server-side Claude client. Project-wide rules and the Task Router: root `AGENTS.md`. Full rules: `.ai/docs/engineering-standards.md` §1, §3, §7.

## Services

- **Services = plain functions** `(db, actorUserId, input)`; no DI container, no classes. Order: Zod-parse → `requireRole` → work → publish event. Non-member → `NotFoundError`, insufficient role → `ForbiddenError`; fail closed. Check-then-write runs in a transaction.

## Authentication (Better Auth)

- **Better Auth**, email + password, sessions stored in our database. Google login comes **after the MVP** — don't add it now.
- **Client IP for rate limiting:** the app trusts `X-Forwarded-For` only from `127.0.0.1`/`::1` and uses the right-most untrusted address (`advanced.ipAddress` in `packages/core/src/auth.ts`). Two failure modes: if Apache stops sending XFF, every client is seen as 127.0.0.1 and shares one bucket, so a stranger's failed sign-ins can lock the owner out; if the app is ever exposed without Apache, a client can forge a fresh XFF per request and bypass the rate limit — the 127.0.0.1-only bind prevents that.

## AI (Claude)

- The Claude API is called **only from server code**, never from the browser; responses are structured JSON. API keys live in server-only env vars.
