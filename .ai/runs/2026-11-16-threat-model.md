# Threat model of the whole system

- **Date:** 2026-11-16
- **Spec:** none (threat-model skill run on the whole system)
- **Outcome:** success

## Goal

Write the first threat model for Taskly: a system profile, a data flow diagram with trust boundaries, prioritized STRIDE threats with responses and verification, and a test scope.

## Steps taken

1. No existing threat model in the repository.
2. Discovery: read `AGENTS.md`, `.ai/lessons.md`, engineering standards §7, the runbook, the product brief scope, `packages/app/AGENTS.md` (deployment) and `packages/core/AGENTS.md`. Checked against the code: `core/src/auth.ts`, `access.ts`, `authorization.ts`, `tasks.ts`, `http.ts`, `env.ts`, the stubs (`ai.ts`, `invitations.ts`, `events.ts`, `shopping.ts`), all Route Handlers, `app/lib/api.ts`, `session.ts`, `next.config.ts`, the DB schema, and the existing cross-user, viewer and CSRF integration tests.
3. Wrote 16 threats: 11 on what ships today and 5 on version 2 features modelled from their stubs (invitations, SSE, AI estimates, audit trail).
4. Added the threat model to the Task Router's security row with a re-run trigger.

## Files changed

- `.ai/docs/security/threat-model.md` (new)
- `.ai/docs/security/threat-model.mmd` (new, diagram source)
- `AGENTS.md` (Task Router: security row points to the threat model)
- `.ai/runs/2026-11-16-threat-model.md` (this log)

## Verification (commands run and results)

- `prettier --check` on the new and changed Markdown files: all files use Prettier code style.
- `npm run check:agents` (run as `node .ai/scripts/check-agents-md.mjs`): "30 routed paths exist; every AGENTS.md is routed and within budget", exit 0.
- No code changed, so the test, typecheck and build gates were not run.

No SVG was rendered: no Mermaid renderer is installed, and installing one would pull in a headless browser. GitHub renders the inline block; to render locally, run `npx @mermaid-js/mermaid-cli -i .ai/docs/security/threat-model.mmd -o .ai/docs/security/threat-model.svg`.

## Problems / open questions

- Concrete gaps in shipped code found while modelling (no code changed in this run): T-08, where `apiHandler` logs whole unhandled errors (a `DrizzleQueryError` carries SQL params), and T-07, with no CSP, HSTS or frame-ancestors from the app (the Apache config is not in the repo).
- Open assumptions are listed in the threat model: Apache headers and body limit, Better Auth's per-path sign-in limit, the DB role privileges and backups.

## Lessons recorded (links into .ai/lessons.md)

None. This run produced a document, not a fix or a correction.
