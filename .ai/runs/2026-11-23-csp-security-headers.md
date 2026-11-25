# Content-Security-Policy and framing headers (#79, T-07)

- **Date:** 2026-11-23
- **Spec:** none (issue #79, threat model T-07)
- **Outcome:** partial: headers, lint rule and tests shipped. The script policy is weaker than #79 asked, because nonces and hashes can't work with Cache Components (see Problems).

## Goal

`/om-auto-fix-issue 79`, dispatched by cezar run 147a3813. Every response carries a CSP (`default-src 'self'`, `script-src 'self'` plus a hash or nonce, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff` and `Referrer-Policy`. The app runs without CSP violations, a test asserts the headers, and a lint rule fails on a new `dangerouslySetInnerHTML` outside the theme script.

## Steps taken

1. Read AGENTS.md, `.ai/lessons.md`, the issue, the skill and its references. The tracker descriptor (`.ai/trackers/github.md`) has no atomic lock operations, so I claimed with the descriptor's own convention: claim comment 7096238298 (`Claim-Run`, `Claim-Actor`, `Claim-State`), `in-progress`, assignee. The sibling run for #76 did the same.
2. Verified the defect: `packages/app/next.config.ts` had no `headers()`. Branch `fix/issue-79-csp-and-framing-headers` off `origin/main` (f6d33e4), `npm ci`.
3. Read Next 16.4's CSP guide (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`). Built `main` and read the inline scripts of a served `/sign-in`: the theme script, `$RT`, the Turbopack chunk list, `(self.__next_f=…).push([0])`, two `self.__next_f.push([1,"…"])` RSC payloads (~9 KB each) and `$RX`. The payload scripts are part of the prerendered shell (`x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`), so:
   - a hash of the theme script alone would block the payload and break hydration, and a hash also switches off `'unsafe-inline'`;
   - a nonce cannot reach a shell written at build time ("PPR is incompatible with nonce-based CSP" in the guide). `cacheComponents` is a documented project standard (engineering-standards.md, "Cache Components"), so turning it off is not this issue's call.
4. Picked the strongest policy that works under PPR: `script-src-elem 'self' 'unsafe-inline'` and `script-src-attr 'none'` (refuses inline handlers, the only way client-side `innerHTML` markup runs script), no `'unsafe-eval'` outside `next dev`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin` (not `no-referrer`, which sends `Origin: null` on form posts). `upgrade-insecure-requests` is left out: the test environment runs on plain `http://127.0.0.1`, and Apache does TLS.
5. `packages/app/lib/security-headers.ts` (+ unit tests) builds the headers. `next.config.ts` applies them to `/:path*` and passes the dev phase through (`'unsafe-eval'` only under `next dev`).
6. Checked in the browser that an injected `<img onerror>` is refused. agent-browser's `console`/`errors` showed nothing, so I wrote `test/record-csp-violations.js`, an init script that keeps `securitypolicyviolation` events in sessionStorage. It showed one more violation on every page: `script-src` `eval` from Zod 4's `Function("")` JIT probe (chunk column 4480). Fixed with `z.config({ jitless: true })` in `packages/core/src/zod-config.ts`, imported by the isomorphic `@taskly/core` entry (+ unit test).
7. `react/no-danger` is an error everywhere except `components/shell/theme-script.tsx` (`eslint.config.mjs`). A probe file with a new `dangerouslySetInnerHTML` failed lint (`react/no-danger`, exit 1); the theme script passed.
8. Tests: `createBrowser` starts every agent-browser session with the recorder and offers `cspViolations()`. It fails if the recorder is missing, so a browser left over from an older run can't read as "no violations". `useSignedInBrowserSuite` (tasks, subtasks, completion, places, reorder, markers, expenses, unestimated) and both auth browser suites assert no violations in `afterEach`. `app.integration` asserts the exact production headers on `/sign-in`, `/` (redirect) and `/api/auth/ok`, and that an injected `onerror` handler is refused and recorded.
9. Docs: threat model T-07 row, SAST row and changelog; engineering-standards §7 (XSS and CSP); runbook (don't set the headers again in Apache); lessons.

## Files changed

- `packages/app/lib/security-headers.ts`, `packages/app/lib/security-headers.test.ts` (new)
- `packages/app/next.config.ts`: `headers()`
- `packages/core/src/zod-config.ts`, `packages/core/src/zod-config.test.ts` (new), `packages/core/src/index.ts`: import it
- `eslint.config.mjs`: `react/no-danger`
- `test/record-csp-violations.js` (new), `test/helpers.ts`, `test/browser-suite.ts`, `test/app.integration.test.ts`, `test/auth-browser-open.integration.test.ts`, `test/auth-browser-closed.integration.test.ts`
- `.ai/docs/security/threat-model.md`, `.ai/docs/engineering-standards.md`, `.ai/docs/runbook.md`, `.ai/lessons.md`, `.ai/lessons/2026-11-23-csp-with-cache-components.md`, this log

Outside the order's listed scope, and needed for #79's "done when": `eslint.config.mjs` (the lint rule), `packages/core/src/zod-config.ts` (without it every page reports a violation), and the shared test helpers.

## Verification (commands run and results)

All on the final tree, locally (WSL2), integration with `TMPDIR=/tmp`:

- `npm run format:check`: all files use Prettier code style. `npm run lint`: exit 0. `npm run check:agents`: 30 routed paths exist. `npm run test:env-scripts`: all checks passed. `npm run typecheck`: exit 0.
- `npm test`: 86 files, 1281 tests passed; coverage 100% statements (2175/2175), branches (1343/1343), functions (752/752), lines (1895/1895).
- `npm run build`: compiled; `/`, `/sign-in`, `/sign-up` still partially prerendered (`◐`).
- `npm run audit`: exit 0 (4 moderate advisories from before this change; the gate fails on high).
- `npm run test:integration`: 24 files, 305 tests passed (260 s).
- Regression check of the violation guard: with the `zod-config` import commented out and rebuilt, `auth-browser-closed` + `app.integration` failed 3 tests with `script-src blocked eval on /sign-in` (and `/sign-up`). Restored and rebuilt: 8/8 passed. The completion suite passed both ways (no Zod parse on that page's load).
- Served build, by hand: `curl -D -` on `/sign-in` and `/api/auth/ok` shows the four headers. In Chromium an injected `<img onerror>` did not run, and the recorder logged `script-src-attr`.
- Not done: a check in a real deployment behind Apache (no access; runbook step added), and other browser engines (agent-browser drives Chromium only).

## Problems / open questions

- **Inline `<script>` stays allowed (#79 asked for `script-src 'self'` plus a hash or nonce).** Not possible while `cacheComponents` is on. A strict policy means nonces from `proxy.ts` and every page rendered per request: a project decision for the owner (performance on the 1 GB VPS, the Cache Components standard). Recorded as an accepted risk in T-07, to revisit before list sharing ships.
- Chromium under cezar: `Socket path too long` with the agent's long `TMPDIR`. The integration suite runs with `TMPDIR=/tmp` (lesson extended).
- The #76 sibling run also edits the threat-model table (T-08 row, next to T-07) and its changelog. Whichever PR merges second gets a small text conflict there.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23: CSP with Cache Components, Zod `jitless`, recording violations ([details](../lessons/2026-11-23-csp-with-cache-components.md))
- 2026-11-16 TMPDIR lesson extended to agent-browser's Chromium
