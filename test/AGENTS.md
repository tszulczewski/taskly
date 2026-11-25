# test — integration tests

Project-wide rules and the Task Router: root `AGENTS.md`. Full rules: `.ai/docs/engineering-standards.md` §9.

- **Integration tests** (`*.integration.test.ts`, run with `npm run test:integration`) use a real PostgreSQL (no DB mocks) started by Testcontainers (`test/global-setup.ts`; needs Docker) and drive the production build with the **agent-browser** CLI (`test/helpers.ts`). Set `TEST_DATABASE_URL` to use an existing database when Docker is unavailable. Run `npm run build` first.
- A browser suite with sign-up closed and signed-in users gets its frame (own app on its own port, browser reset, pool, `signIn`, teardown of the run's users) from `useSignedInBrowserSuite` in `test/browser-suite.ts`. Do not copy that frame into a new file.
- Open a row's "…" menu only through `browser.openRowMenu(title)` / `browser.rowAction(title, item, role?)` (`test/helpers.ts`), never with two bare `clickRole` calls: the menu is non-modal and closes when focus moves, so the helper waits for a settled screen and a focused menu first.
