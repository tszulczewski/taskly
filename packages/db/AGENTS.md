# packages/db — Drizzle schema, migrations, client

Project-wide rules and the Task Router: root `AGENTS.md`. Full rules: `.ai/docs/engineering-standards.md` §6, §10.

- Schema changes are **SQL migrations kept in the repo** (generated with drizzle-kit via `npm run db:generate`, reviewed, committed; applied with `npm run db:migrate`). Never edit an applied migration; add a new one.
- **Local PostgreSQL** tuned for low RAM (small `shared_buffers`, `work_mem`, `max_connections`). Development also uses a locally installed PostgreSQL (not Docker).
