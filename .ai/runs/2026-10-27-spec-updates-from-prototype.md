# Spec, design-system and issue updates from the clickable prototype's questions

- **Date:** 2026-10-27
- **Spec:** `.ai/specs/2026-10-16-sign-in-pages.md`, `.ai/specs/2026-10-16-tasks-and-subtasks.md`; screen map `prototypes/konta-i-role/mapa-ekranow.md`; prototype `prototypes/task-list-v1/`
- **Outcome:** done; all seven answers applied

## Goal

Apply the owner's answers to the seven "Pytania do specyfikacji" in the prototype's final report (`prototypes/task-list-v1/POSTEP.md`): "1. zrób to 2. zrób to 3. ostatecznie tak 4. pokaz tekst z serwera 5. tak 6. przenieś 7. wpisz". Spec requirement changes here are approved by the owner in that message.

## Steps taken

1. 404 text: tasks spec UI/UX ("Task deleted elsewhere") and Edge cases (parent deleted while adding a subtask; task deleted while being edited); DS `DetailsInRow` story text and MDX note (no longer "a proposal").
2. Sign-up limit texts: sign-in spec "Field errors"; DS `validateSignUp` in `.storybook/blocks/fake-api.ts` and `SignUpForm.mdx` Content. The prototype's own copy of the two rules was removed (it now uses `validateSignUp`).
3. s04.21 final: tasks spec state "Page did not open"; map s04.21; "for now" removed from the prototype comment, the s04 note, README and POSTEP.
4. 409 on add shows the server's message: tasks spec UI/UX and Edge cases (`ConflictError` messages are fixed user-facing texts); prototype s04.12 shows "Please try again"; guide hint and map updated.
5. Rate-limit wait: sign-in spec Messages ("Too many attempts. Try again in N seconds.", generic fallback), API rule (read Better Auth's `X-Retry-After` as a positive integer), Edge cases, step 3 tests and the 429 integration check. Verified in `better-auth/dist/api/rate-limiter/index.mjs` that the 429 carries `X-Retry-After` in whole seconds. DS: `rateLimitedIn(seconds)` in `fake-api.ts`, `messages.rateLimited` is its 7-second example; `SignInForm.mdx` states table. Prototype P02/P03: fixed 8 s (`retryAfterSeconds` in `server.ts`).
6. s04.22–s04.29 moved to `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md` (new section, English); the map keeps a pointer, ids unchanged. Memory `project-e02-e03-spec-inputs` updated. No new spec created (owner's rule: no unrequested specs).
7. Sign-in spec Q3 records L04. GitHub issue #15 body edited (`gh issue edit 15 --body-file`): AC1/AC2 in the DS format ("1 500–2 000 zł", "12,50 zł", L18), AC4 confirmed and new AC6 "both amounts or neither" (L03), editing and deleting removed from "Out of scope" (L09), a "Changes" section, the spec link in Notes. Previous body kept in the session scratchpad. Tasks spec also corrected for L07 (description only in the opened row, actions in "…"), L08 (only add is optimistic; edit/delete wait; DS error texts) and L22 (empty-state text), with a "Clickable prototype decisions" entry under "Decisions in play" and matching component tests in steps 8 and 10.
8. Map: new table "Trzecia tura" in section 7 listing the seven answers and where each was written.

## Files changed

- `.ai/specs/2026-10-16-sign-in-pages.md`, `.ai/specs/2026-10-16-tasks-and-subtasks.md`, `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md`
- `packages/ui/.storybook/blocks/fake-api.ts`, `packages/ui/.storybook/docs/patterns/DetailsInRow.stories.tsx`, `DetailsInRow.mdx`, `packages/ui/.storybook/docs/product/sign-in/SignInForm.mdx`, `SignUpForm.mdx`
- `prototypes/task-list-v1/src/server.ts`, `src/screens/sign-in.tsx`, `src/screens/sign-up.tsx`, `src/screens/task-screen.tsx`, `src/screens.ts`, `src/states.ts`, `README.md`, `POSTEP.md`
- `prototypes/konta-i-role/mapa-ekranow.md`
- GitHub issue #15 (body)
- No app, `packages/*/src` or test-harness code changed.

## Verification (commands run and results)

- `npx tsc -p prototypes/task-list-v1/tsconfig.json --noEmit`: ok. `npm run typecheck` (all workspaces + `test`): exit 0.
- `npx eslint prototypes/task-list-v1 packages/ui/.storybook/blocks/fake-api.ts packages/ui/.storybook/docs/patterns/DetailsInRow.stories.tsx`: ok.
- `npx prettier --write` on every changed file (reformatted `src/screens.ts` and the `SignInForm.mdx` table).
- `npx vitest run --config prototypes/task-list-v1/vitest.config.mts`: 13/13.
- Storybook tests (`packages/ui`, `npx vitest run` on DetailsInRow, Form and the sign-in stories): 14 files, 82/82.
- `vite build --config prototypes/task-list-v1/vite.config.ts`: ok (chunk-size warning only).
- Browser (agent-browser 0.39.1, static server on :6107): s01.7 shows "Too many attempts. Try again in 8 seconds."; s04.12 shows "Please try again" and keeps the typed title.
- Not run: repo-wide `npm run lint` and a final `prettier --check` (the auto-mode permission check gave no verdict several times in a row; eslint on the changed files passed), `npm test`, `npm run build`, `test:integration` (no `packages/*/src` or app code changed).

## Problems / open questions

- The auto-mode permission classifier returned no verdict a few times; those steps were redone with the Edit tool.

## Lessons recorded (links into .ai/lessons.md)

- none
