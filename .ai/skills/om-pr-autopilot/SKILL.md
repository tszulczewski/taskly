> **Repo-local override.** Recognizes this repository's author-account review reports during PR diagnosis.

## Workflow — diagnose and re-diagnose (extend)

Read `SDLC.md` → **Author-account review and merge**. For low/medium-risk PRs on the author's account, evaluate the latest qualifying report, author, SHA, verdict and diff risk before treating an empty formal review decision as missing review. For a `risk-high` PR, diagnose against `SDLC.md` → **Solo maintainer**; name the missing record (independent review, maintainer QA, maintainer sign-off), which only the human can supply for QA and sign-off. Use tracker operations and preserve all unresolved-feedback, CI, QA and high-risk gates. Merge remains opt-in; dispatch any explicitly authorized merge through `om-approve-merge-pr` so it re-checks evidence and pins the expected head.
