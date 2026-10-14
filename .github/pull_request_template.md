## Purpose
<!-- One purpose per PR. Link the spec/run log if any. -->

## Checklist (see .ai/docs/engineering-standards.md §11)
**Structure**
- [ ] Dependency direction respected; client files import no server-only code
- [ ] Route = parse → auth → core call → envelope; no inline try/catch or business logic
- [ ] Server state goes through TanStack Query and `apiCall`

**Security (blockers)**
- [ ] Authentication enforced server-side on every non-public route
- [ ] Authorization checks the specific record's list role; non-members get 404
- [ ] Input parsed by a named Zod schema; no raw body into Drizzle
- [ ] No secrets/tokens in logs, responses or the client bundle
- [ ] Check-then-write flows are in a transaction / unique index
- [ ] AI output validated before use or storage

**Correctness**
- [ ] Money is integer grosze end-to-end; totals computed server-side
- [ ] Reorder writes only the moved row
- [ ] Tests: success, forbidden, not-found (+ concurrency); regression test for fixes
- [ ] `npm run lint`, `typecheck`, `test`, `build` pass; `.ai/` run log/lessons updated
