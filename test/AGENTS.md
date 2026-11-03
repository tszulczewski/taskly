# test — integration tests

Project-wide rules and the Task Router: root `AGENTS.md`. Full rules: `.ai/docs/engineering-standards.md` §9.

- **Integration tests** (`*.integration.test.ts`, run with `npm run test:integration`) use a real PostgreSQL (no DB mocks) started by Testcontainers (`test/global-setup.ts`; needs Docker) and drive the production build with the **agent-browser** CLI (`test/helpers.ts`). Set `TEST_DATABASE_URL` to use an existing database when Docker is unavailable. Run `npm run build` first.
