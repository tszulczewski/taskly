# proxy.test.ts without Next's x-middleware-request-* encoding (#106)

- **Date:** 2026-11-26
- **Spec:** none (issue #106, follow-up from #104 review)
- **Outcome:** success

## Goal
Make `packages/app/proxy.test.ts` assert on the headers the proxy hands to `NextResponse.next({ request: { headers } })` instead of Next's internal `x-middleware-request-*` response headers, keeping the nonce-match proof and 100% coverage.

## Steps taken
- Checked Next 16.4.6 `next/experimental/testing/server`: it exports `unstable_doesMiddlewareMatch`, `getRedirectUrl`, `isRewrite`, `getRewrittenUrl` — nothing for forwarded request headers.
- Replaced the `forwarded(response, name)` helper with one that reads `NextResponse.next`'s last call through a `vi.spyOn` that calls through; added `vi.restoreAllMocks()` in `afterEach`, and a `toHaveBeenCalledOnce()` check.
- Mutation check: removing `requestHeaders.set("Content-Security-Policy", policy)` from `proxy.ts` fails "sends the same nonce CSP to the render and to the browser"; restored.

## Files changed
- `packages/app/proxy.test.ts`
- `.ai/lessons.md`
- `.ai/runs/2026-11-26-proxy-test-forwarded-headers.md`

## Verification (commands run and results)
- `npx vitest run packages/app/proxy.test.ts` — 5/5 passed; with the mutation above, 1 failed (expected).
- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck` — all exit 0.
- `npm test` — passed, 100% statements/branches/functions/lines.
- `npm run build` — exit 0.
- `npm run audit` — exit 0 (4 moderate advisories reported, pre-existing, below the audit threshold).
- `TMPDIR=/tmp/t106 npm run test:integration` — 25 files, 319 tests passed.
- No manual app check: test-only change, `proxy.ts` untouched.

## Problems / open questions
None.

## Lessons recorded (links into .ai/lessons.md)
- 2026-11-26 — spy on `NextResponse.next` to test forwarded request headers (#106).
