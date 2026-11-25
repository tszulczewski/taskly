# CSP review fixes on PR #94 (#79)

- **Date:** 2026-11-23
- **Spec:** none (issue #79, threat T-07; follows `.ai/runs/2026-11-23-csp-security-headers.md`)
- **Outcome:** success

## Goal

Address the CHANGES REQUESTED review on PR #94 (issuecomment-7099367244, head `fb33636`) without changing the policy or `cacheComponents`, which is the owner's pending decision.

## Steps taken

1. Checked the branch against `origin/main`: 0 commits behind, no merge needed.
2. Major (accepted-risk record wrong): corrected the `security-headers.ts` comment, the lesson, its `lessons.md` index line and T-07. They now say that inline `<script>` **and `javascript:` URLs** stay allowed (CSP3 checks `javascript:` navigations against `script-src-elem 'unsafe-inline'`; an injected `<iframe src="javascript:…">` runs with no click) and only inline event handlers and `eval` are refused. Policy unchanged. Rewrote "What still holds" in the PR body.
3. Minor (lint covers one sink): `react/no-danger` now takes `customComponentNames: ["*"]`, so it checks `<Foo dangerouslySetInnerHTML>`. A new `no-restricted-properties` block refuses `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `createContextualFragment` and `document.write`/`writeln` outside `*.test.*` files. The only current use is a test fixture (`app-shell.test.tsx`), so lint stays clean. T-07 lists what lint still misses (computed property names, `DOMParser`, other `Range` methods, `iframe.srcdoc`, third-party code).
4. Nit: the lesson says `experimental.sri` does not help (it adds `integrity` to `<script src>` only, not to the inline RSC payload).
5. Nit: T-07 and the lesson say browsers without CSP3 `script-src-attr` (Safari < 15.4, Firefox < 108) fall back to `script-src 'self' 'unsafe-inline'` and run inline handlers.

## Files changed

- `packages/app/lib/security-headers.ts` (comment only)
- `eslint.config.mjs`
- `.ai/docs/security/threat-model.md` (T-07, changelog)
- `.ai/lessons/2026-11-23-csp-with-cache-components.md`, `.ai/lessons.md`
- `.ai/runs/2026-11-23-csp-review-fixes.md`

## Verification (commands run and results)

- `eslint --stdin` probe in `packages/app` and `packages/ui`: each sink (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `document.writeln`, `createContextualFragment`, `<Foo dangerouslySetInnerHTML>`) reports an error.
- Gate, all exit 0: `format:check`, `lint` (clean on the current code with the new rules), `check:agents` (30 routed paths), `test:env-scripts`, `typecheck`, `npm test` (86 files, 1281 tests, 100% statements/branches/functions/lines), `build`, `audit` (`--audit-level=high`; the moderate esbuild advisories already on `main`), `test:integration` run alone with `TMPDIR=/tmp` (24 files, 305 tests).
- Not checked: browsers other than Chromium, production behind Apache (unchanged from the first run).

## Problems / open questions

- Owner decisions unchanged: accept the inline-script + `javascript:` URL gap for version 1, and `Closes #79` vs `Refs #79`.

## Lessons recorded (links into .ai/lessons.md)

- Updated the 2026-11-23 CSP lesson (accepted gap includes `javascript:` URLs; `experimental.sri` does not help; test "what still holds" with a real injected link and iframe).
