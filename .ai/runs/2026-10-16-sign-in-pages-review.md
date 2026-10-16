# Sign-in pages specification review

- **Date:** 2026-10-16
- **Spec:** .ai/specs/2026-10-16-sign-in-pages.md
- **Outcome:** success (review completed with five findings; build blocked by environment)

## Goal

Review the sign-in specification against repository standards, the current authentication implementation, and installed framework contracts without changing its requirements or application code.

## Steps taken

- Read the specification, engineering standards, lessons, and om-spec-writing review instructions.
- Started a fresh-context scope-cohesion review as required by the skill.
- Compared session, proxy, password-administration, and deployment contracts with installed Better Auth 1.7.7 and Next.js 16.4.0 source.
- Read the bundled Cache Components authentication guide and relevant product decisions. Independent scope review found one cohesive authentication prerequisite.
- Independently cross-checked the full-document session-renewal scenario with a second source reviewer.
- Checked official Better Auth [security](https://better-auth.com/docs/reference/security) and [session-management](https://better-auth.com/docs/concepts/session-management) guidance. Installed source remains authoritative for this version.

## Files changed

- This run log.
- `.ai/lessons.md`: corrected the overbroad session-renewal entry and added the verified adapter-boundary lesson.
- `.ai/lessons/2026-10-16-better-auth-session-and-reset-boundaries.md`.
- Specification requirements and application source unchanged; no commits.

## Verification (commands run and results)

- Read-only repository and dependency-source inspection completed.
- An isolated `parseEnv` call with only the runbook's `DATABASE_URL` reproduced validation failures for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `ANTHROPIC_API_KEY`. No database connection was made and no real credentials were read.
- `npm run lint`: passed.
- `npm run build`: failed in Turbopack CSS processing because a worker could not bind a port (`Operation not permitted`). The approved escalation retry failed with the same restriction.
- `npx prettier --check .ai/runs/2026-10-16-sign-in-pages-review.md .ai/lessons/2026-10-16-better-auth-session-and-reset-boundaries.md .ai/lessons.md`: passed.
- Evaluated the enabled Next.js feedback protocol (resolved CLI from the root workspace; fetching instructions required an approved network retry). The build failure is an environment permission restriction; no independent framework defect was verified for a feedback report.
- Unit and browser suites not run: this review changes only documentation. Session-renewal and failure scenarios are source-derived design findings, not runtime reproductions.

## Architectural review

**Verdict: revise before implementation.** The product direction is cohesive. Five behavior or delivery gaps remain; none requires changing the approved sign-up, language, or session-duration decisions.

1. **High: failed sign-out redirects with a live session.** [Spec line 149](/var/www/taskly/.ai/specs/2026-10-16-sign-in-pages.md:149) requires redirecting even when the request fails. If the server never receives the request or refuses it, the HTTP-only cookie and session remain valid. The proposed `redirectIfSignedIn()` then returns the visitor from `/sign-in` to `/`; clearing TanStack Query does not sign them out. Replace this failure path with an explicit unsuccessful-sign-out message and retry, and navigate as signed out only after success. Test a failed request with the original session still valid. Related spec lines: 100, 148–149, and step 5.

2. **High: password replacement and session revocation are separate commits.** Spec line 90 calls `updatePassword` followed by `deleteUserSessions`. The installed [internal adapter](/var/www/taskly/packages/core/node_modules/better-auth/dist/db/internal-adapter.mjs:627) performs separate operations, and the [Drizzle adapter](/var/www/taskly/node_modules/@better-auth/drizzle-adapter/dist/index.mjs:559) defaults transactions off. If deletion fails, the password has changed while existing, potentially stolen sessions remain active. Specify an explicit atomic transaction using Better Auth's adapter context with actual Drizzle transactions enabled, or a documented fail-safe protocol; add failure-injection coverage and define concurrent sign-in behavior. Repository standards §3 require transactional shared-state mutations; the spec presents reset as the all-device revocation mitigation at lines 174 and 187.

3. **Medium: the following API call does not reliably repair renewal during a full page render.** Spec line 115 relies on authenticated API reads to keep cookies fresh, but the proposed guard calls the existing [getSessionUser](/var/www/taskly/packages/core/src/auth.ts:36) without disabling refresh. In installed [nextCookies](/var/www/taskly/packages/core/node_modules/better-auth/dist/integrations/next-js.mjs:67), only `RSC: 1` requests suppress refresh. Ordinary document loads lack that header. An aged session can therefore advance its [database expiry](/var/www/taskly/packages/core/node_modules/better-auth/dist/api/routes/session.mjs:198) during rendering while cookie writes fail silently; the subsequent API read sees a fresh row and does not renew the browser cookie. Explicitly disable refresh in page-only guards and retain renewal in cookie-writable contexts. Add an aged-session → full document navigation → API read integration test that checks the cookie as well as the row. This is a high-confidence source inference independently cross-checked, not a browser reproduction.

4. **Medium: the sign-up name contract is enforced only in the browser.** Spec lines 79–80 introduce a trimmed 1–100 character name schema for forms, and line 127 labels it the endpoint contract. The unchanged [Better Auth request schema](/var/www/taskly/packages/core/node_modules/better-auth/dist/api/routes/sign-up.mjs:15) accepts any string for `name` and persists it without applying those constraints. A direct POST while sign-up is enabled bypasses them. Specify server validation through a Better Auth hook that applies the shared schema while retaining the HTTP router and its rate limiting. Test direct requests with empty, whitespace-only, and overlong names. Repository standards §5 require shared client/server schemas; client validation alone does not establish the promised API contract.

5. **Medium: the reset runbook omits required environment initialization.** Spec line 203 sets only `DATABASE_URL`, but the planned helper initializes `getAuth()`, whose [environment schema](/var/www/taskly/packages/core/src/env.ts:3) also requires the auth secret, base URL, and Anthropic key. The `tsx` command does not itself load Next.js env files. The isolated parser check reproduced these three missing-variable errors. Specify how the CLI loads an existing private environment file or explicitly document all required exported variables; keep the tunneled production database override explicit. Test the documented bootstrap from a fresh shell so the recovery procedure does not depend on implicit shell state.

## Review limits

- No application behavior was implemented or browser-tested. Direct request acceptance and navigation consequences above follow from installed source and the proposed contracts.
- Apache itself was not exercised; the trusted-proxy algorithm matches installed source, but the real vhost configuration still needs deployment verification.
- No tracker actions, requirement edits, or production-data changes were made.

## Problems / open questions

- The five findings above remain for the specification author.
- Production build verification is blocked by the worker-port restriction, including on the approved retry.

## Lessons recorded (links into .ai/lessons.md)

- [Better Auth session and reset boundaries](../lessons/2026-10-16-better-auth-session-and-reset-boundaries.md).
