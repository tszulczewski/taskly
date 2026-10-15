# Lessons Learned

Long-term memory for AI agents working on this project. Read this file **before starting any task**.

## How to use

- Add a one-line entry to the index below for every lesson. Newest first.
- Put details (context, root cause, fix, how to avoid) in `.ai/lessons/YYYY-MM-DD-slug.md`.
- Small, self-explanatory lessons may live only in the index.
- Before adding, check for an existing lesson on the topic; update it instead of duplicating.
- Remove or correct lessons that turn out to be wrong.

## Index

<!-- Format: - YYYY-MM-DD — Short summary → [details](lessons/YYYY-MM-DD-slug.md) -->

- 2026-10-15 — No Docker: run integration tests with `TEST_DATABASE_URL` on the dev DB; tests must create and delete their own uniquely named rows → [details](lessons/2026-10-15-integration-tests-without-docker.md)
- 2026-10-14 — "Set up" means skeleton only; do not implement features unasked → [details](lessons/2026-10-14-scope-skeleton-only.md)
- 2026-10-14 — tsc fails on a clean tree until `next typegen` runs → [details](lessons/2026-10-14-typecheck-needs-typegen.md)
