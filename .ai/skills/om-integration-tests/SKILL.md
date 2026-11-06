> **Repo-local override.** Makes the markdown scenario mandatory, fixes where it lives and how it is named, links it to the executable test, and adds this repository's scenario-writing rules. Everything in the base skill still applies; where this file is stricter, this file wins.

## Workflow — step 5 Name the test (extend)

Every executable test case (one Vitest `it(...)`) gets a scenario ID `{AREA}-{NNN}`:

- `AREA` — uppercase domain area, one word: `AUTH`, `LISTS`, `TASKS`, `SUBTASKS`, `COMPLETION`, `EXPENSES`, `SHOPPING`, `SHARING`, `ESTIMATES`. Reuse an existing folder under `.ai/qa/` before inventing a new area; add a new one only for a domain none of these covers.
- `NNN` — three digits, sequential per area. Take the next free number from `ls .ai/qa/{AREA}/`; never reuse or renumber an ID, even after a scenario is deleted or archived.
- Name the `it(...)` itself by **action + condition + expected result** (e.g. `refuses an estimate when Amount is above up to`), not `test 3`. Keep the repo's existing `ACn:` prefix when the test covers a spec acceptance criterion.

## Workflow — step 8 Markdown scenario (replace)

The markdown scenario is **mandatory**, not optional: every new or changed executable test case gets one, written in the same run.

- **Path:** `.ai/qa/{AREA}/{AREA}-{NNN}-{slug}.md` — `slug` is lowercase kebab-case of the scenario goal, e.g. `.ai/qa/TASKS/TASKS-004-amount-above-up-to-is-refused.md`.
- **One file per scenario**, i.e. per business case (see rule 2 below). When one test file holds several `it(...)` cases, each case gets its own scenario file.
- **Link to the implementation** at the top of the file, as a relative link from the scenario to the test file plus the exact test name, so it survives line shifts:

  ```markdown
  # TASKS-004 — Amount above "up to" is refused

  | Field | Value |
  | --- | --- |
  | Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `AC4: Amount above up to is refused with the message on up to, and nothing is sent` |
  | Category | TASKS |
  | Priority | High / Medium / Low |
  | Type | UI / API |
  | Source requirement | `.ai/specs/…` (section / AC id) or issue `#N` |
  | Prerequisites | role, data created by the test itself |
  ```

  Then: **Scenario** in Given–When–Then, a **Steps** table (step / action / expected result) filled with the actions actually performed and results actually observed in step 6, and **Edge cases** naming the sibling scenarios (by ID) that cover the negative and boundary paths.
- When a test is renamed, moved or deleted, update or remove the link in the same change; a scenario must never point at a test that does not exist. Before finishing, check every link you wrote resolves (`test -f` on the target and `grep -F` for the test name).
- These files are committed (only the test-env artifacts in `.ai/qa/` are gitignored).

## Scenario and test rules (add — always apply)

Source: `best-practices-testow-integracyjnych.md` (team guideline). Apply all of them to both the scenario file and the executable test.

1. **Test behaviour, not implementation.** Assert what the user or another system sees (status shown, response body, row persisted), never that an internal function was called.
2. **One business case per scenario.** Many steps are fine; one goal. Do not test cancel, refund and export inside a "pay" scenario.
3. **Given–When–Then** in every scenario file: Given = starting state, When = the action, Then/And = expected results.
4. **Deterministic.** No random data without a recorded seed, no dependence on the current date/time (fix it or derive it), no data shared between tests, no run-order dependence, no unstable external services. No arbitrary sleeps (`wait(5000)`, `setTimeout`): wait for a concrete state (agent-browser `wait`/`find` on text or role, a polled API response).
5. **Independent.** Each test creates its own data, runs, verifies, and cleans up. Never assume an earlier test created a user, list or task.
6. **Set up data through the API or the test layer** (`test/helpers.ts`: `createUser`, `authRequest`, HTTP calls), and drive through the UI only the flow under test — unless the scenario's purpose is the full user journey.
7. **Verify at the right levels, only what matters.** Choose among API response, visible UI change, database row, SSE event — whichever the scenario is about; do not assert everything everywhere.
8. **Replace external integrations with controlled doubles** (the Claude API, email): fake adapter, mock server or intercepted request. Still assert the request the system sent (e.g. the estimate prompt carried the task title). Never mock Taskly's own components the test is meant to integrate — the database stays real.
9. **Cover positive, negative and boundary cases** for every important feature: happy path, invalid input, missing permission (owner / editor / viewer), missing resource (404), conflict or repeated operation, integration timeout or failure, boundary values (e.g. 0 grosze, min = max). Each of these is its own scenario ID.
10. **Verify idempotence** where an operation can be repeated (double submit, retried request, replayed event): repeating it must not apply the effect twice.
11. **Stable UI selectors**, in this order: role + accessible name, field label, visible text, then an existing `data-testid` only when it is already in the app and no semantic locator exists. Never structural/CSS paths (`div > div:nth-child(3)`). Do not add `data-testid` to product code just for a test.
12. **Specific assertions.** Not `expect(res.ok).toBe(true)` but the exact status and body (`toBe(201)`, `toMatchObject({ amountMin: 150000, currency: "PLN" })`). A failure must say what differs.
13. **No helpers that hide the behaviour under test.** Prefer small single-purpose helpers (`openList`, `fillEstimate`, `submitTask`) over `completeWholeFlow(page)`.
14. **Name = action + condition + expected result**, for both the `it(...)` and the scenario title.
15. **Expected results come from the specification, not from the model.** Derive every Then from a spec, acceptance criterion or issue and cite it in *Source requirement*. Exploration (step 6) confirms the selectors and flow; it does not define correctness. When observed behaviour contradicts the requirement, do not encode the observed behaviour — report it as a product finding (step 10, owner `User/Product team`). When no requirement covers an expectation, mark the scenario `Status: needs human review` and say so in the report instead of guessing. AI-drafted scenarios are drafts until a human reviews them.

## Rules (extend)

- MUST write a scenario file at `.ai/qa/{AREA}/{AREA}-{NNN}-{slug}.md` for every new or changed test case, with a working relative link to the test file and the exact test name.
- MUST apply the 15 scenario and test rules above to every authored scenario and test.
- The base rule "the markdown scenario is optional documentation" does not apply in this repository.
