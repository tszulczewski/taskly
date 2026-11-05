> **Repo-local override.** Adds the SHA-pinned author-account merge path defined by this repository's SDLC.

## Steps 1–3 — review evidence and approval (extend)

Read `SDLC.md` → **Author-account review and merge**. Resolve **current-user** and compare with `author.login`. Only on the low/medium-risk author-account path, verify the latest qualifying report via **list-issue-comments**, including its author, verdict, full SHA, findings disposition, and actual diff risk. A valid report replaces the attempt to submit formal self-approval. Missing/stale/negative evidence blocks this path; do not post a bare "Approved" comment as a replacement review. For a `risk-high` PR, read `SDLC.md` → **Solo maintainer** and require its three records for the current head: an independent qualifying review report, the maintainer's QA evidence with `QA head:`, and `Maintainer sign-off:`. Any missing, stale or agent-authored record blocks. For other paths retain formal review and all high-risk requirements.

## Step 4 — squash-merge (extend)

Require an explicit request to merge this PR and all SDLC review, validation, CI, QA, and label gates. When those conditions hold, do not ask again solely because formal self-approval is unsupported. Re-fetch the head and call the descriptor's **merge-pr** with the reviewed SHA as expected head. A changed head requires re-review. Never use admin override or auto-merge to defer this path's gates. With unavailable required-check discovery, verify the configured PR workflow's jobs and runs for the head; unknown, missing, pending, or failing CI blocks merge.
