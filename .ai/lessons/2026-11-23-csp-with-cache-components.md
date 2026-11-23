# A strict CSP does not fit Cache Components; Zod and the browser console hide the rest

- **Date:** 2026-11-23
- **Trigger:** bug fix
- **Related:** #79, `.ai/runs/2026-11-23-csp-security-headers.md`, `packages/app/lib/security-headers.ts`, `test/record-csp-violations.js`, threat T-07

## Context

#79 asked for a CSP with `script-src 'self'` plus the hash of the theme script, or a nonce. The app runs with `cacheComponents` (and so partial prerendering), and every page except the API routes is prerendered (`◐` in the build output).

## Finding

- A hash cannot work. Next writes its bootstrap and the RSC payload as inline scripts (`self.__next_f.push([1,"…"])`, `$RT=…`, `$RX=…`, the Turbopack chunk list). The payload is different for every page and every build, so no hash list covers it. A hash in `script-src` also switches `'unsafe-inline'` off, so "hash plus unsafe-inline" is not a compromise either.
- A nonce cannot work. The prerendered shell, inline scripts included, is written at build time, so a per-request nonce never reaches it. Next's CSP guide says so ("Partial Prerendering (PPR) is incompatible with nonce-based CSP"). Nonces need `cacheComponents` off, with every page rendered per request.
- What works under PPR: `script-src-elem 'self' 'unsafe-inline'` with `script-src-attr 'none'`. Markup injected on the client through `innerHTML` can run script only through an event handler (an inserted `<script>` never runs), and `script-src-attr 'none'` refuses the handler. Inline `<script>` that the server renders is still allowed: that is the accepted gap.
- Zod 4 probes for `eval` (`try { Function("") }`) before its first object parse. Without `'unsafe-eval'` the probe is refused. Zod falls back quietly, but the browser still reports a `script-src` violation on every page. `z.config({ jitless: true })` (in `packages/core/src/zod-config.ts`, loaded by the isomorphic entry) turns the probe off.
- agent-browser's `console` and `errors` do not show CSP violations. A page init script that listens for `securitypolicyviolation` does (`AGENT_BROWSER_INIT_SCRIPTS`, read when the session's browser starts).

## Resolution

The headers come from `packages/app/lib/security-headers.ts` through `headers()` in `next.config.ts`, on every route. `react/no-danger` is a lint error outside the theme script. `createBrowser` loads `test/record-csp-violations.js` into every session, and every browser suite fails in `afterEach` on a recorded violation. `app.integration` injects an `onerror` handler to prove both the refusal and the recorder.

## Rule going forward

- Before tightening `script-src`, check the build output: as long as any page shows `◐`/`○`, nonces are out, and Next's inline scripts need `'unsafe-inline'` on `script-src-elem`.
- A new library that calls `eval`/`new Function`, a new origin, or an inline handler shows up as a failing browser suite, not a console warning. Change the policy on purpose, or configure the library (as with Zod's `jitless`).
- To find the source of a violation, log `event.sourceFile`, `lineNumber` and `columnNumber` from a `securitypolicyviolation` listener, then read the chunk at that column.
