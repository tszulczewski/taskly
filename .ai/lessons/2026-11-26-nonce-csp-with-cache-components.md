# A nonce CSP works with Cache Components once no page is fully static

- **Date:** 2026-11-26
- **Trigger:** bug fix (#101), correcting `2026-11-23-csp-with-cache-components.md`
- **Related:** #101, #79, `packages/app/proxy.ts`, `packages/app/lib/content-security-policy.ts`, `packages/app/components/shell/request-time-hole.tsx`, `.ai/runs/2026-11-26-strict-script-src.md`, threat T-07

## Context

#79 shipped `script-src-elem 'self' 'unsafe-inline'`, on the grounds that Next writes its inline scripts into the prerendered shell at build time. Next's CSP guide still says "Partial Prerendering (PPR) is incompatible with nonce-based CSP". #101 had to drop `'unsafe-inline'` before sharing ships.

## Finding

- With Next 16.4.6 the guide is out of date. A Cache Components shell (`◐`) carries no RSC payload and no Turbopack bootstrap. Those come in the per-request resume, and Next puts the request's nonce on them, reading it from the request's `Content-Security-Policy` header (`app-render.js`, `withTurbopackBootstrapScript`). Only two inline scripts in the shell lack a nonce: the theme script and React's `requestAnimationFrame(function(){$RT=performance.now()});`. Both are fixed strings, so their SHA-256 hashes go in `script-src`.
- A fully static page (`○`, e.g. `/_not-found`) still has its whole payload inline from the build, with no nonce, so it is refused. One `await connection()` in a `<Suspense>` in the root layout makes every page `◐`.
- `next.config.ts` cannot import a `.tsx` module (the config loader does not resolve it), so the CSP builder that hashes the theme script lives apart from the static headers.
- Cost, measured on the standalone build without a heap cap: idle RSS unchanged, burst RSS +~40 MB, page p50 +<1 ms. The 404 page goes from 0.8 to 5.6 ms because it now renders per request.

## Resolution

`proxy.ts` makes a nonce per request and sets the policy on the request (for Next) and on the response. `lib/content-security-policy.ts` builds `script-src 'self' 'nonce-…' <two hashes>`. `RequestTimeHole` sits in the root layout. A unit test fails when the installed React stops writing the hashed `$RT` script. `app.integration` checks every inline script on a page and on the 404, and that an injected `<script>`, `javascript:` link and `javascript:` iframe are refused.

## Rule going forward

- Before claiming a Next CSP limit, read the installed `app-render.js`, then build and check the served HTML: every inline `<script>` must carry the response's nonce or match a listed hash.
- Keep every page `◐` in the build output. A `○` page means its inline scripts are refused.
- A new fixed inline script in the shell needs its hash in `SHELL_SCRIPT_HASHES`. A browser suite failing with `script-src-elem blocked inline` is the signal.
