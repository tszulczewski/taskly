# Better Auth session and password-reset boundaries

- **Date:** 2026-10-16
- **Context:** source review of the sign-in specification against installed Better Auth 1.7.7 and Next.js 16.4.0; the navigation scenario below is inferred from source, not browser-reproduced.

## Session reads during page rendering

`nextCookies()` suppresses refresh only when the incoming request has `RSC: 1` without `next-action`. A full HTML document request does not normally carry that header. On such a render, `getSession` can advance the database session expiry, then the plugin swallows the failure to write the cookie in a Server Component. The next API read sees the advanced expiry and may decide renewal is no longer due. Repeating this can leave an active user's browser cookie at its original expiry.

Use an explicit `disableRefresh` query on page-only session reads, with a separate renewing read in contexts that can write cookies. Test an aged session through a full document navigation followed by the authenticated API call, checking both the cookie and database expiry. A direct API-only renewal test misses this ordering.

Evidence: `packages/core/node_modules/better-auth/dist/integrations/next-js.mjs:67`, `packages/core/node_modules/better-auth/dist/api/routes/session.mjs:180`, `packages/core/src/auth.ts:36`, and `node_modules/next/dist/server/base-server.js:161`.

## Password reset and revocation

`internalAdapter.updatePassword` and `deleteUserSessions` are independent database operations. Updating the password first leaves old sessions valid if revocation fails. The installed Drizzle adapter defaults its `transaction` option to false; using Better Auth's internal adapter does not itself supply an atomic boundary around multiple calls.

Specify real adapter transactions and a transaction scope around password replacement and revocation, or an explicit fail-safe protocol. Include a failure-injection test for session deletion and define concurrent sign-in behavior. Hashing remains Better Auth's responsibility.

Evidence: `packages/core/node_modules/better-auth/dist/db/internal-adapter.mjs:503`, `:627`, and `node_modules/@better-auth/drizzle-adapter/dist/index.mjs:559`.
