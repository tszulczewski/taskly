> **Repo-local override.** Recognizes this repository's author-account review reports at the review-first gate.

## Workflow — review-first gate (extend)

Read `SDLC.md` → **Author-account review and merge**. For low/medium-risk PRs reviewed through the author's account, a qualifying positive report for the current head satisfies the project review prerequisite. Verify report identity, latest verdict, SHA and diff risk through tracker operations; missing, negative or stale evidence routes to `om-auto-review-pr` as usual. Preserve high-risk requirements and all QA evidence, label, and self-QA restrictions. A comment review never grants `qa-approved`. On a `risk-high` PR (`SDLC.md` → **Solo maintainer**) post the evidence only: the maintainer applies `qa-approved` after their own manual pass.
