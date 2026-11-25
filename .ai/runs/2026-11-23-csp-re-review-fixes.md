# PR #94 re-review fixes: more raw-HTML lint, lesson and SAST row (#79)

- **Date:** 2026-11-23
- **Spec:** none (issue #79, threat T-07; previous runs `2026-11-23-csp-security-headers.md`, `2026-11-23-csp-review-fixes.md`)
- **Outcome:** success

## Goal

Address the re-review of PR #94 on head `27d1cc1` (issuecomment-7099908017). (1) Integration failed once in `test/reorder-browser.integration.test.ts:104`: check the re-run, and investigate if it fails again. (2) Lint missed `setHTMLUnsafe`, `parseHTMLUnsafe`, and `document.write` through `window.document` or `ownerDocument`; T-07's not-covered list must match. (3) The lesson said an inserted `<script>` is refused; the SAST row named only `react/no-danger`. Out of scope (owner decision pending): the CSP policy, `cacheComponents`, `Closes #79`.

## Steps taken

1. Re-run 45165616783 (attempt 2) of Integration on `27d1cc1`: **success** (job 137667399188).
2. `eslint.config.mjs`: `no-restricted-properties` also lists `setHTMLUnsafe` and `parseHTMLUnsafe`. `document.write`/`writeln` moved to a `no-restricted-syntax` selector (`documentWrite`) that matches the bare `document`, `window.document` and any `ownerDocument`. Restricting `write` on every object would hit Node streams (`process.stdout.write`, `child.stdin.write`, `output.write` in `prompt-hidden.ts`). A later block's options replace an earlier block's, so the app block repeats `documentWrite` next to the `fetch` rule, and an app-tests block keeps only `fetch` (tests stay exempt from the sink rules, as before).
3. Probed the rules with temporary files in `packages/app/lib` (+ `.test.ts`), `packages/app/lib/api-client.ts`, `test/` (+ `.test.ts`), `packages/core/src` and `packages/ui/src`: every sink fails outside tests, tests pass, `process.stdout.write` passes everywhere, `fetch` still fails in app code and app tests and passes in `api-client.ts` and outside the app. The first probe showed that `/^writeln?$/` never matched `write`, fixed as `/^(write|writeln)$/`.
4. T-07: the lint list names the new rules; "not covered" now also names `document.write` through any other reference (an alias, `document.open().write`, an iframe's `contentDocument`) and the `srcDoc` prop. SAST row names `no-restricted-properties` and `no-restricted-syntax`. Changelog line added.
5. Lesson: an inserted `<script>` is inert through `innerHTML`/`insertAdjacentHTML`/`dangerouslySetInnerHTML` (HTML parser, not CSP) but runs through `createContextualFragment`/`document.write`; Resolution lists the new rules.
6. Flake check: a temporary probe suite (port 3299, deleted afterwards) sent Space, ArrowDown, Space with no waits 6 times and with waits 3 times; the row moved every time. Twice the drop went out while the live region still read "“A” is now at “A”." and the move still landed. The race I suspected (a drop before `over` updates) is not the cause, so no test change ships. A speculative wait would not be a root-cause fix.

## Files changed

- `eslint.config.mjs`
- `.ai/docs/security/threat-model.md` (T-07, SAST row, changelog)
- `.ai/lessons/2026-11-23-csp-with-cache-components.md`
- `.ai/lessons.md` (three index lines)
- `.ai/runs/2026-11-23-csp-re-review-fixes.md`

## Verification (commands run and results)

See the PR reply for the final table. Run in this worktree after `npm ci`:

- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`: pass
- `npm test`: 1281 tests, 100% statements/branches/functions/lines
- `npm run build`: pass
- `npm run audit`: pass at `--audit-level=high`
- `npm run test:integration` (`TMPDIR=/tmp`): see the PR reply

## Problems / open questions

- The first `npm test` and `npm run build` failed (99.92% branches; "Could not find the Next.js package") because the fresh worktree had no `node_modules` and resolved the main checkout's. `npm ci` fixed both (existing lessons 2026-11-03/05/12).
- I ran `git checkout -B fix/issue-79-csp-and-framing-headers`. That branch was checked out in another worktree (`7a44a6d2`), and the command moved its ref from `fb33636` to `27d1cc1`. I put the ref back with `git update-ref` (the other worktree is clean again at `fb33636`) and worked on `cez/75eb53fd`. Lesson recorded.
- REORDER-001's CI failure is not reproduced or explained. If it comes back, check `data-dragging` and the live region at the moment of failure before changing waits.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23 — `git checkout -B` on a branch another worktree holds
- 2026-11-23 — dnd-kit's announcement at pickup; the REORDER-001 probe
- 2026-11-23 — `no-restricted-syntax` regex and flat-config option replacement
