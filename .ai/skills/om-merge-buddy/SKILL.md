> **Repo-local override.** Adds author-account review reports to this repository's readiness classification.

## Step 2 — collect gate status (extend)

Read `SDLC.md` → **Author-account review and merge**. Resolve **current-user**; only when it matches the PR author and the diff is low/medium risk, a current qualifying positive report via **list-issue-comments** can satisfy the project review gate instead of `reviewDecision == APPROVED`. Fetch head SHA and diff risk before deciding. Check the latest report and all unresolved feedback, CI and QA gates; labels alone never prove review. A report cannot satisfy formal branch-protection approval requirements. Keep all high-risk requirements and read-only behavior. If required-check discovery is unavailable, evaluate all configured PR CI jobs and runs for this head; missing data never counts as green.
