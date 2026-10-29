# Code review — sign-in phases 1–2

- **Date:** 2026-10-28
- **Spec:** .ai/specs/2026-10-16-sign-in-pages.md
- **Outcome:** success (review completed; verdict: request changes)

## Goal

Review branch implementation from its base `84f1575` through phase 2 (`0236bfe`), using `om-code-review`. Phase 3 is in progress and is not judged as finished.

## Steps taken

- Read skill, project standards, lessons, compatibility policy, implementation tracker, specification and installed Next.js auth/cache guide.
- Delegate independent read-only reviews of core auth and app/UI.
- Validation targets the current working tree (HEAD `4139404` plus existing uncommitted phase-3 work). Preserve all existing edits.
- During review, another process committed phase-3 work as `c8bfce1`; no phase-1/2 implementation files changed. Final integration validation includes that work. This reviewer made no commits.
- Reviewed the complete phase-1/2 diff against the spec, protected product decisions, compatibility policy and built-in/repository checklists. Independent reviews confirmed the auth configuration, sign-up normalization, non-renewing page reads, dynamic flag reads and successful-sign-out-only cache clearing.

## Files changed

- This run log and one lesson index entry about auth request deadlines. No implementation edits.

## Verification (commands run and results)

- `npm run format:check`: PASS.
- `npm run lint`: PASS (existing skill-script warning).
- `npm run typecheck`: PASS.
- `npm test`: first run FAIL (4 session-guard assertions), targeted rerun PASS, full rerun PASS (60 files, 388 tests, 100% statements/branches/functions/lines). No implementation change by reviewer; initial failure cause not established.
- `npm run build`: initial sandbox invocation interrupted by blocked registry access; rerun outside sandbox PASS, including partially prerendered auth pages.
- `npm run audit`: PASS at configured high threshold; 4 moderate vulnerabilities reported.
- `npm run test:integration`: default environment startup FAIL with Vite `code.charCodeAt is not a function`, no tests executed. Documented local-PostgreSQL override (`TEST_DATABASE_URL`) PASS: 7 files, 42 tests. No claim of a successful Testcontainers run.
- Command logs: `/tmp/taskly-phase12-review/` (local, ephemeral).

## Problems / open questions

- Integration evidence is a planned phase-3 deliverable; distinguish it from defects in phases 1–2.

## Review report

**Verdict: request changes.** One major and one minor in phases 1–2; no confirmed security defect. No unauthorized compatibility break found: closed sign-up and longer sessions are explicitly approved by the spec, cookie format and schema remain compatible.

### Major

- `packages/app/lib/api-client.ts:98` — `authCall` has no request deadline or abort signal. An accepted connection that never delivers its response leaves forms (`packages/ui/src/lib/use-form.ts:94`) and sign-out (`packages/ui/src/product/shell/app-header.tsx:43`) awaiting forever, with the submit/sign-out button disabled. No caller supplies a timeout. Add an explicit deadline covering response headers and body parsing, map timeout to the existing error state, and test a hung response followed by retry. Sign-out timeout must preserve the cache and current route. This violates the skill's explicit outbound-timeout checklist rule.

### Minor

- `packages/app/components/auth/auth-form-skeleton.tsx:3` — the fixed two-field skeleton is used by `/sign-up` (`packages/app/app/(auth)/sign-up/page.tsx:12`), whose open form has three fields, a password hint and footer. Replacing the fallback changes card height, contrary to its stated no-jump intent. Provide a registration-specific variant with matching geometry and verify it at mobile and desktop widths. This finding follows from the markup; no CLS measurement was taken.

### Coverage and remaining phase-3 work

- Existing unit tests cover validation, guards, auth error mapping, form pending/error/success, sign-out failure/retry and theme hydration. Current phase-3 HTTP tests passed against PostgreSQL, including rate limiting, closed/open sign-up, old-cookie reuse and non-renewing page reads versus API renewal.
- Full browser flows and runbook remain explicitly pending phase-3 tasks; this review does not approve the whole branch for merge. Timeout recovery and skeleton geometry need the cases named above.

## Lessons recorded (links into .ai/lessons.md)

- Added the auth request-deadline lesson to `.ai/lessons.md`.
