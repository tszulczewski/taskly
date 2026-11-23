# A strict CSP does not fit Cache Components; Zod and the browser console hide the rest

- **Date:** 2026-11-23
- **Trigger:** bug fix; corrected after review (the first version said injected markup could run script only through an event handler)
- **Related:** #79, `.ai/runs/2026-11-23-csp-security-headers.md`, `packages/app/lib/security-headers.ts`, `test/record-csp-violations.js`, threat T-07

## Context

#79 asked for a CSP with `script-src 'self'` plus the hash of the theme script, or a nonce. The app runs with `cacheComponents` (and so partial prerendering), and every page except the API routes is prerendered (`◐` in the build output).

## Finding

- A hash cannot work. Next writes its bootstrap and the RSC payload as inline scripts (`self.__next_f.push([1,"…"])`, `$RT=…`, `$RX=…`, the Turbopack chunk list). The payload is different for every page and every build, so no hash list covers it. A hash in `script-src` also switches `'unsafe-inline'` off, so "hash plus unsafe-inline" is not a compromise either.
- A nonce cannot work. The prerendered shell, inline scripts included, is written at build time, so a per-request nonce never reaches it. Next's CSP guide says so ("Partial Prerendering (PPR) is incompatible with nonce-based CSP"). Nonces need `cacheComponents` off, with every page rendered per request.
- Next's `experimental.sri` does not help either. It only adds `integrity` to `<script src>` chunks (`required-scripts.js`), not to the inline `self.__next_f.push` payload.
- What works under PPR: `script-src-elem 'self' 'unsafe-inline'` with `script-src-attr 'none'`. That refuses inline event handlers and nothing more. Inline `<script>` that the server renders stays allowed, and so do `javascript:` URLs, because CSP3 checks them against `script-src-elem`. Markup injected through a raw-HTML sink (`innerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`) can still run script: `<a href="javascript:…">` on click, and `<iframe src="javascript:…">` with no click at all (`frame-src 'none'` does not stop it). Only an inserted `<script>` and an `onerror`-style handler are refused. React 19 blocks `javascript:` URLs in the attributes it renders, so the open path is raw HTML, which lint now refuses. Browsers without CSP3 `script-src-attr` (Safari < 15.4, Firefox < 108) fall back to `script-src 'self' 'unsafe-inline'` and run inline handlers too. That whole set is the accepted gap.
- Zod 4 probes for `eval` (`try { Function("") }`) before its first object parse. Without `'unsafe-eval'` the probe is refused. Zod falls back quietly, but the browser still reports a `script-src` violation on every page. `z.config({ jitless: true })` (in `packages/core/src/zod-config.ts`, loaded by the isomorphic entry) turns the probe off.
- agent-browser's `console` and `errors` do not show CSP violations. A page init script that listens for `securitypolicyviolation` does (`AGENT_BROWSER_INIT_SCRIPTS`, read when the session's browser starts).

## Resolution

The headers come from `packages/app/lib/security-headers.ts` through `headers()` in `next.config.ts`, on every route. `react/no-danger` is a lint error outside the theme script, on custom components too, and `no-restricted-properties` refuses `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `createContextualFragment` and `document.write`/`writeln` outside tests. `createBrowser` loads `test/record-csp-violations.js` into every session, and every browser suite fails in `afterEach` on a recorded violation. `app.integration` injects an `onerror` handler to prove both the refusal and the recorder.

## Rule going forward

- Under this policy CSP is not an XSS backstop for raw HTML. Keep raw-HTML sinks out of the code (the lint rules), and test any statement of "what still holds" with a real injected `javascript:` link and iframe before writing it down.
- Before tightening `script-src`, check the build output: as long as any page shows `◐`/`○`, nonces are out, and Next's inline scripts need `'unsafe-inline'` on `script-src-elem`.
- A new library that calls `eval`/`new Function`, a new origin, or an inline handler shows up as a failing browser suite, not a console warning. Change the policy on purpose, or configure the library (as with Zod's `jitless`).
- To find the source of a violation, log `event.sourceFile`, `lineNumber` and `columnNumber` from a `securitypolicyviolation` listener, then read the chunk at that column.
