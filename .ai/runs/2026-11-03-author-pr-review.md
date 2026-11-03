# Author-owned PR review and merge

- **Date:** 2026-11-03
- **Spec:** none — process change approved by the owner in the conversation
- **Outcome:** partial

## Goal

Allow the author to decide to merge a low/medium-risk PR after an agent review on the same account, without attempting GitHub self-approval. Preserve validation, QA, and high-risk requirements.

## Steps taken

- Read SDLC, tracker operations, engineering standards, and installed review/merge skill contracts.
- Plan approved by the owner: define a SHA-pinned comment review, extend the tracker and local skill overlays, verify the resulting process. Do not commit or merge any PR.
- Existing untracked PR #48 review artifacts belong to another run and are left untouched.
- Implemented the contract, tracker delta and five small local overlays; manually walked success and rejection paths. No commits, pushes, PR mutations, or GitHub settings changes were made.

## Files changed

- `SDLC.md`: canonical author-account review contract and review-stage completion rule.
- `.ai/trackers/github.md`: SHA-pinned comment submission for own-account reviews (positive and negative), expected-head merge option.
- `.ai/skills/{om-auto-review-pr,om-approve-merge-pr,om-merge-buddy,om-auto-qa-pr,om-pr-autopilot}/SKILL.md`: small local deltas using the canonical contract, without editing installed skills.
- `.ai/lessons.md`: author-account review convention.
- This run log.

## Verification (commands run and results)

- Overlay shape check: all five files have the required banner, no frontmatter, named delta sections, and fewer than half as many lines as their installed base. All reference the canonical SDLC section. No new executable skill or dependency was introduced; the upstream skills-collection `scripts/lint.sh` is not installed in this app repository.
- `git diff --check`: passed.
- Confirmed the installed CLI supports `gh pr merge --match-head-commit` through its help output; no review, label, merge, or settings mutation was made on GitHub.
- Manual contract walkthrough (instruction review; no live PR mutated):

| Scenario | Expected route verified in the instructions |
| --- | --- |
| Own PR, low/medium risk, latest report approved at current SHA | Project review gate satisfied; CI, QA and explicit merge request still required |
| Latest report negative, malformed, stale, or ambiguously ordered | No fallback to an older positive report; review required |
| Plain approval comment or matching label only | Does not satisfy review |
| Foreign comment carrying the report marker | Does not qualify as author-account evidence |
| New push after review / race before merge | Re-review; expected-head merge rejects a mismatch |
| High-risk label or high-risk diff with understated label | Author-account approval exception unavailable; existing requirements preserved |
| Missing QA, active claim/tester, unresolved feedback, conflict, or red CI | Merge blocked |
| Required-check API unavailable / empty checks / queued run | Verify configured workflow for head; unknown or pending CI blocks merge |
| Review-only or prepare-only request | No merge authorization |
| Explicit merge request and all gates pass | Skip unsupported self-approval without an identity-only confirmation |
| Other author's PR or required formal approval | Formal review/branch-protection requirements preserved |

- Full configured validation gate: running; final results will be appended below.
- Optional forced Markdown formatting check warned on `SDLC.md` and the tracker descriptor. Both committed baseline files produce the same warning; Markdown is excluded by the project's `.prettierignore`. The normal `npm run format:check` passed. Kept the focused edits without reformatting these entire existing documents.

### Final validation results

Raw command logs: `/tmp/taskly-author-pr-gate-w32tjvgq/` (ephemeral local artifacts).

| Command | Result |
| --- | --- |
| `npm run format:check` | Passed |
| `npm run lint` | Passed |
| `npm run check:agents` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 72 files, 947 tests; statements, branches, functions and lines all 100% |
| `npm run build` | Passed |
| `npm run audit` | Passed |
| `npm run test:integration` | Exit 1 in global setup before tests: no working container runtime; `TEST_DATABASE_URL` unset |

The integration diagnostic `docker info --format '{{.ServerVersion}}'` confirmed Docker is unavailable in this WSL distro. The "No test files found" headline is a consequence of setup failure, not missing test files. Integration verification remains incomplete; the full gate is not green. No DB configuration or application code was changed for this documentation/process task. No new browser flow was introduced, so manual app exercise is not applicable; the manual checks above inspect the instruction contract rather than claiming a live merge test.

## Problems / open questions

No supported self-review switch exists in `.ai/agentic.config.json`; preserve its validation commands and `qaGate: true` and use the documented tracker/overlay extension points.

Concurrent UI edits appeared during validation. They are outside this change and were not edited; full gate results describe the shared worktree at execution time.

## Lessons recorded (links into .ai/lessons.md)

- Added the author-account review convention to `.ai/lessons.md` (2026-11-03).

## Publication continuation

The owner explicitly requested commit and merge. Prepared an isolated branch from `origin/main` at `/tmp/taskly-author-pr-policy` so unrelated PR #48 is excluded. Re-running the configured gate in this worktree; the integration retry uses the documented local development database fallback, with the URL loaded privately from the existing root `.env`.

Publication gate attempt 1 (`/tmp/taskly-policy-publish-gate-WH3eKU`): format, lint, agents, typecheck, unit and audit passed. Build failed because Turbopack disallows dependency symlinks outside its root. Integration reached the dev database (110 tests passed, migration tests skipped as documented) but eight HTTP/browser suites failed because no standalone build existed. Installing isolated dependencies before repeating the gate; recorded the worktree build constraint in lessons.

### Publication gate attempt 2 — passed

Isolated dependencies installed with `npm ci` (lockfile unchanged). All configured commands passed in order in `/tmp/taskly-author-pr-policy`; raw logs are at `/tmp/taskly-policy-final-gate-8r9nbD/`.

| Command | Result |
| --- | --- |
| `npm run format:check` | Passed |
| `npm run lint` | Passed |
| `npm run check:agents` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 72 files, 950 tests, all four coverage measures 100% |
| `npm run build` | Passed |
| `npm run audit` | Passed |
| `npm run test:integration` | Passed: 14 files, 162 tests; one migration file/test skipped as designed with an existing database |

Final instruction review found no blockers or majors. The change is documentation/process-only and risk-low, with no application contract, code, migration or UI changes. QA is not applicable (`skip-qa`). Manual contract scenarios and overlay shape checks above passed. GitHub CI will additionally exercise Testcontainers migrations on a fresh database and the design-system gate before merge. The owner authorized commit and merge; publication proceeds on `docs/author-account-pr-review`, separate from PR #48. Final PR, head-pinned review and merge outcome are recorded on GitHub so no post-review documentation push stales the reviewed SHA.

**Final implementation outcome:** success; the local eight-command gate is green. The earlier failures remain above as append-only history.

### Base advance before merge

After publication as PR #50, `main` advanced to `274ecd3` through the separately merged PR #48. Integrated that base into the policy branch and resolved the sole conflict by preserving all lessons index entries. The PR diff against main remains the nine policy/log files. Re-running the full configured gate on the combined tree before publishing the merge commit and a new SHA-pinned review.

Updated-base gate (`/tmp/taskly-policy-updated-base-gate-8y0gIJ/`): all eight configured commands passed again. Unit: 72 files, 947 tests, all coverage measures 100%. Integration: 162 passed, one migration test/file skipped under the documented existing-DB fallback. `git diff origin/main --check` passed; merge-stage whitespace warnings originated solely in files already on main and were not changed by this policy PR. No additional instruction findings; preserving both lessons entries resolves the base conflict. Publishing the merge commit, then a fresh review report for its SHA; CI and the actual merge result will be recorded on PR #50.
