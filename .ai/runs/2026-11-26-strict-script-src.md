# Strict script-src without 'unsafe-inline' (#101, T-07)

- **Date:** 2026-11-26
- **Spec:** none (issue #101)
- **Outcome:** success

## Goal

Drop `'unsafe-inline'` from production `script-src` and `script-src-elem` before list sharing ships. Inline `<script>`, `javascript:` links and `javascript:` iframes in injected markup must be refused, with zero CSP violations in every browser suite.

## Steps taken

1. Picked the mechanism (the issue's blocking question) from the installed Next 16.4.6. `app-render.js` keeps the RSC payload and the Turbopack bootstrap out of a Cache Components shell and writes them in the per-request resume, with the nonce Next reads from the request's CSP header. The guide's "PPR is incompatible with nonce-based CSP" is out of date for this version. Option 2 (a Next feature that hashes inline PPR scripts) does not exist. Option 1 needed no change of rendering mode for the `◐` pages, so `cacheComponents` stays on.
2. Built `main` and read the prerendered shells. `index.html`, `sign-in.html` and `sign-up.html` hold only two inline scripts: the theme script and React's `requestAnimationFrame(function(){$RT=performance.now()});`. Both are fixed strings, so both are allowed by hash. `_not-found.html` (`○`) and `_global-error.html` hold the whole payload inline.
3. Added `packages/app/proxy.ts`. It makes a 128-bit nonce per request and sets the policy on the request (for Next) and on the response. The matcher covers pages and the API, and leaves out `_next/static`, `_next/image` and the favicon.
4. Added `lib/content-security-policy.ts`: `script-src 'self' 'nonce-…' <theme hash> <$RT hash>`, with `script-src-elem` the same. `'unsafe-eval'` is added in dev only. `script-src-attr 'none'` and `style-src` are unchanged. `lib/security-headers.ts` keeps the static headers for `next.config.ts`, which cannot import the `.tsx` theme module (build error "Cannot find module").
5. Audited the served HTML: `/sign-in`, `/sign-up` and `/` passed. The 404 failed (8 inline scripts with no nonce). Added `RequestTimeHole` (`await connection()` in `<Suspense>`) to the root layout. Every page is now `◐` and the 404 passes too.
6. Measured `main` against the fix, standalone builds, two rounds each. A warm-up, then 300 sequential requests each to `/sign-in`, `/sign-up` and a 404. No heap cap.
7. Tests, the threat model (T-07 and its changelog), engineering standards §7, and lessons (new lesson; the 2026-11-23 lesson is corrected).

## Files changed

- `packages/app/proxy.ts`, `proxy.test.ts` (new); `vitest.config.mts` adds `proxy.ts` to coverage
- `packages/app/lib/content-security-policy.ts`, `.test.ts` (new); `lib/security-headers.ts`, `.test.ts`; `next.config.ts`
- `packages/app/components/shell/request-time-hole.tsx`, `.test.tsx` (new); `app/layout.tsx`
- `test/app.integration.test.ts`: per-request headers with a fresh nonce (page, redirect, API, 404); every inline script carries the nonce or a shell hash; an injected `<script>`, `javascript:` link and `javascript:` iframe are refused (three `script-src-elem` violations, nothing runs)
- `.ai/docs/security/threat-model.md`, `.ai/docs/engineering-standards.md`, `.ai/lessons.md`, `.ai/lessons/2026-11-26-nonce-csp-with-cache-components.md`, `.ai/lessons/2026-11-23-csp-with-cache-components.md`

## Verification (commands run and results)

- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`: pass
- `npm test`: 1332 tests pass, 100% statements, branches, functions and lines
- `npm run build`: pass; `/`, `/_not-found`, `/sign-in` and `/sign-up` are all `◐`; `ƒ Proxy (Middleware)`
- `npm run audit`: pass (4 moderate advisories, below the gate's `high` level, lockfile unchanged)
- `npm run test:integration` (with `TMPDIR=/tmp`, because Chrome's singleton socket path is too long under the cezar temp dir): 316 of 317 pass. `places-browser` "adds places from a row's Add places … gives focus back to it" fails on its focus check after Escape. It fails the same way on a `main` build (2 of 2 runs), so it predates this change (#92) and is not a CSP violation. Every other browser suite ran with zero CSP violations
- Measurement (RSS in MB; latency p50/p95 in ms):

| Build | Idle RSS | RSS after burst | `/sign-in` | `/sign-up` | 404 |
| --- | --- | --- | --- | --- | --- |
| main r1 | 97 | 418 | 6.4 / 7.9 | 6.2 / 8.0 | 0.8 / 1.0 |
| fix r1 | 97 | 454 | 7.2 / 24.0 | 6.6 / 8.3 | 5.6 / 6.9 |
| main r2 | 98 | 414 | 6.7 / 8.5 | 6.4 / 8.3 | 0.8 / 1.0 |
| fix r2 | 98 | 459 | 6.8 / 8.7 | 6.6 / 9.1 | 5.6 / 7.0 |

The burst RSS is mostly lazily collected V8 heap without a heap cap, so it is an upper bound, not the steady state.

## Problems / open questions

- `_global-error` stays static. It shows only when the root layout itself throws. Its HTML renders, but its inline scripts are refused, so it does not hydrate (recorded in T-07).
- If a React upgrade changes the `$RT` script, it is refused on every page. `content-security-policy.test.ts` fails first, by checking the installed `react-dom` server bundle.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-26 — A nonce CSP works with `cacheComponents` on Next 16.4 → `lessons/2026-11-26-nonce-csp-with-cache-components.md` (corrects 2026-11-23)
