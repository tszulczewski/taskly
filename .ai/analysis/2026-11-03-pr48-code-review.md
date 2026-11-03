# 🔍 Code Review: PR #48 — align E02/E03 and the design system with D25–D27

## Verdict
✅ **approve** — two minor findings; no blocker or major found. Reviewed head `cf363a542cc1e6d8bc9b682fbe58635ee618ef06`, rechecked against GitHub after validation. This code-review verdict does not satisfy the separate `needs-qa` merge gate.

## 🎯 Summary
The design system creates places by name, allows repeated colours and describes a limit of 20. Future expenses can list unestimated subtasks with their parent task and an inline estimate form. Product decisions, backlog, stories and documentation are updated together. The app, core, DB, dependency graph and production route boundaries are unchanged.

## Findings

### Minor
1. `packages/ui/.storybook/docs/product/tasks/Screens.stories.tsx:180` — the organized screens pass only `predefinedPlaces`, but `organizedTasks` assigns `hall` (Przedpokój) to “Replace the light switches” and “Buy paint and rollers”. In the built Organized Desktop story, Przedpokój appears on the task row but its checkbox and Edit entry are absent from Places, so the demonstrated assignment cannot be removed or edited. Pass an owner-place fixture containing the predefined places **and every assigned custom place**, including `hall`. Apply it to the corresponding organized fixtures in Reorder, TaskList, TaskRow and the Polish screen too. Add a browser assertion that an already assigned custom place is present, checked and removable. This is confined to the Storybook demonstrations; the app does not use these components yet.
2. `packages/ui/.storybook/blocks/catalog.ts:391` — the summary still says colours in use cannot be chosen, contradicting D26 and the adjacent updated usage text. At line 411 the UnestimatedTasks entry still excludes subtasks, contradicting D27; the same exclusion remains in `.ai/docs/design-system.md:68` and `packages/ui/.storybook/docs/system/StartHere.mdx`. Update these quick-reference descriptions to allow repeated colours and open unestimated subtasks. The detailed component pages already describe the new behavior.

## 🧪 Validation Gate

Commands executed from the repository root, in configured order. Additional UI checks followed.

| Command | Status | Evidence or limitation |
| --- | --- | --- |
| `npm run format:check` | PASS | Formatting passes. |
| `npm run lint` | PASS | 0 errors; 1 existing unused-import warning in the session-sharing skill. |
| `npm run check:agents` | PASS | Routes and budgets pass. |
| `npm run typecheck` | PASS | All workspaces and test types pass. |
| `npm test` | PASS | 947 tests; statements, branches, functions and lines all 100%. |
| `npm run build` | PASS | Next.js production build succeeds. |
| `npm run audit` | PASS | Exit 0 at the configured high threshold; 4 moderate advisories remain. |
| `npm run test:integration` | PASS on retry | 162 passed, 1 skipped using the documented local development DB. First attempt failed during Testcontainers startup because no Docker runtime was available. |
| `npm run check:tokens` | PASS | UI token check passes. |
| `npm run test:storybook` | PASS | 922 tests in 120 files, both themes and axe checks. |
| `npm run build-storybook` | PASS | Static Storybook build succeeds. |

The skipped test is the existing fresh-database migration test, explicitly skipped when TEST_DATABASE_URL is supplied: the local role cannot create databases and migrations target public. No migration changes are in this PR; Docker/CI still needs to cover that test. Local retry used only the documented loopback taskly development database, with credentials kept out of output.

## 💥 Touched contracts
The internal `@taskly/ui` API changes (`PlaceSubmit`/`PlaceOptions.onCreate`, `UnestimatedItem`, `items`, expense text callbacks and removed colour helpers) have migrated callers in packages/ at the reviewed revision. Searches for the affected components and PlaceOptions found no current app consumer. Storybook browser tests exercise the migrated consumers, satisfying the internal-package migration policy in BACKWARD_COMPATIBILITY.md. No protected HTTP, storage, auth, SSE or money-representation contract changes were found. D26 and D27 explicitly replace the old G4/G5 and W3 behavior.

## 🧪 Test Coverage and browser evidence
Unit and Storybook tests cover name-only creation, selecting colours already in use, mixed task/subtask counts, subtask labels, saving and focus movement. In the freshly built Storybook, a manual Chromium walk at 320px priced “Mask the lamp and the sockets” through FutureExpenses: total changed from 730–950 zł to 830–1 050 zł, the remaining count became “2 tasks without an estimate”, and document width stayed 320px. Another Chromium walk confirmed finding 1 (assigned place visible on the row, absent from the picker). No new route, provider, SDK or dependency is introduced; this review makes no measured bundle-size claim.

Local diagnostic logs and screenshots: `/tmp/taskly-review48/`. Review run log: `.ai/runs/2026-11-03-pr48-code-review.md`. This is the read-only review-engine report; no tracker claim, label mutation or verdict submission was performed.
