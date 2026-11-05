> **Repo-local override.** Adds this repository's author-account comment review format to verdict submission.

## Step 10 — submit the verdict (extend)

Read `SDLC.md` → **Author-account review and merge**. Use the tracker descriptor's **review-pr** operation for both account identities, passing the full review body, verdict, and actual reviewed SHA. It records a comment when the reviewer is the PR author. Preserve the review checklist, validation evidence, verdict-driven labels, autofix loop, and pending-CI disclosure. Append a new report after re-review; never rewrite old findings into approval. High-risk comment reviews do not satisfy the author-account approval exception on their own; under `SDLC.md` → **Solo maintainer** an approving report counts as the second person's review only from a run that did not write or fix the reviewed change. When this run pushed autofix commits, say in the report that an independent re-review of the new head is still needed.

## Step 14 — report back (extend)

Link the report comment and explicitly distinguish the review verdict from a formal GitHub approval. A positive review is not authorization to merge or a QA sign-off.
