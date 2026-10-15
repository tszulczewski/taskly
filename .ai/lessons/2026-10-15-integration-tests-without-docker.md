# Integration tests without Docker share the dev database

- **Date:** 2026-10-15
- **Trigger:** run
- **Related:** .ai/runs/2026-10-15-authorization-layer-impl.md, test/global-setup.ts

## Context
`npm run test:integration` starts PostgreSQL through Testcontainers, but this WSL environment has no Docker and the `taskly` role cannot create databases.

## Finding
`TEST_DATABASE_URL=postgres://taskly:taskly@localhost:5432/taskly` reuses the local dev database (global setup applies migrations to it).

## Resolution
Integration tests insert rows with a per-run unique prefix (`Date.now()`) and delete them in `afterAll`, so they never touch or depend on dev data.

## Rule going forward
Every DB integration test must create its own uniquely named users/lists and clean them up; never truncate tables. A membership check must be proven under concurrency with a real second connection (`FOR SHARE` blocks a concurrent delete), which a mocked Db cannot show.
