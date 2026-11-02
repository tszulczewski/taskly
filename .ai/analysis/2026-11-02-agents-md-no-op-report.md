# No-op audit: AGENTS.md

**Audited:** 2026-11-02 · **Mode:** full (repo access)
**Also read for cross-file duplication:** `CLAUDE.md`, `packages/app/AGENTS.md`, `.ai/docs/engineering-standards.md`, `.ai/lessons.md`, `README.md`, `BACKWARD_COMPATIBILITY.md`; tooling: `eslint.config.mjs`, `tsconfig.base.json`, `vitest.config.mts`, `.github/workflows/ci.yml`, `packages/app/next.config.ts`, `packages/core/src/auth.ts`, root and `packages/app` `package.json`.

**Owner decisions after this report (applied):** the rewrite was applied to `AGENTS.md`; the Runbook moved verbatim to `.ai/docs/runbook.md`; "(or `numeric`)" was removed from the money rule; "Use subagents" was narrowed to broad codebase searches, never a review agent without asking; `CLAUDE.md` was merged into `AGENTS.md` and deleted. The rest of this report describes the file as audited, before those decisions. Run log: `.ai/runs/2026-11-02-agents-md-no-op-audit.md`.

**Standard applied:** root AGENTS.md, imported by `CLAUDE.md` and so loaded on every turn. This is the strictest budget.

## Summary

|                | Before | After  | Δ                     |
| -------------- | ------ | ------ | --------------------- |
| Directives     | 74     | 65     | −9                    |
| Lines          | 138    | 117    | −21                   |
| Est. tokens    | ~3,920 | ~3,470 | −450 (−11%)           |
| Signal density | 0.88   | 1.00   | 65 of 74 carry signal |

With the proposed Runbook MOVE (not applied, see Open questions), the file would be about 2,860 tokens (−27%).

This file has high signal. Most of it is project nouns: commands, paths, thresholds, deployment facts, and constraints that contradict the obvious approach. There is almost no generic padding. The main waste is **internal duplication**: the Stack and Monorepo sections state a rule, and the Engineering standards digest states it again. Examples are money, ordering, layering, thin routes, Zod/AI validation, and the test stack. Two "Working principles" bullets repeat the gate and the lessons rule. The fix is MERGE, not CUT: every rule survives once, in the digest. The second lever is moving the operator Runbook (16% of the file) out of always-loaded context. That needs your approval. Confidence is high for the merges and medium for the one block CUT (the `.ai/` tree).

## Verdict breakdown

Directive = one bullet or paragraph, keyed by the original line number. The table counts as one directive, and so does the tree.

| Verdict | Count                         | Est. tokens (original text) |
| ------- | ----------------------------- | --------------------------- |
| KEEP    | 45                            | ~2,250                      |
| TRIM    | 10                            | ~440 → ~380                 |
| MERGE   | 7                             | ~285 (≈70 re-homed)         |
| MOVE    | 10 (Runbook, proposed only)   | ~610 (kept in rewrite)      |
| CUT     | 2                             | ~190                        |

## Findings

| Line   | Verdict | Code    | Directive (abbreviated)                                         | Rationale                                                                                                                                                                                    |
| ------ | ------- | ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22     | TRIM    | N6/N4   | "TypeScript with `strict: true`"                                | `strict` is set in `tsconfig.base.json:5` and enforced by `npm run typecheck`; also repeated at L85                                                                                          |
| 26     | MERGE   | N4      | "Zod validates all API inputs and outputs and all AI responses" | Restated at L30 and L84; folded into L84 ("Zod validates every API input and output")                                                                                                        |
| 27     | TRIM    | N4      | "TanStack Query with optimistic updates"                        | "optimistic updates, rollback" is in L82                                                                                                                                                     |
| 28     | MERGE   | N4      | "Ordering: fractional indexing; never renumber siblings"        | L83 covers `position` + `COLLATE "C"`; the never-renumber clause moved there                                                                                                                 |
| 30     | TRIM    | N4      | "AI … validated with Zod; invalid output is an error"           | Validation clause folded into L84's "AI output is untrusted"; the server-only call and keys stay at L30                                                                                      |
| 31     | MERGE   | N4      | "Money: PLN only, integers in grosze (or numeric), never floats" | L83 + L13 ("min–max range", "all in PLN") cover it; "(or `numeric`)" and "never floats" moved into L83                                                                                       |
| 32     | MERGE   | N4      | "Tests: Vitest … Testcontainers … agent-browser"                | L91 states the same stack in full; "(no DB mocks)" moved into L91                                                                                                                            |
| 45     | MERGE   | N4      | "Dependency direction: app → ui, core, db …"                    | Same topic as L79 (Layering); its unique facts (`app` → `db` allowed, `core` → `db` only where it must, `db` never imports `app`) moved into L79                                             |
| 46     | TRIM    | N4      | "Route Handlers stay thin: parse with Zod → call core → respond" | L81 says the same with more precision (`requireUser`, `apiHandler`, envelope)                                                                                                                |
| 56     | TRIM    | N4      | "Copy `public/` and `.next/static` into the standalone output"  | Word-for-word repeat of L51                                                                                                                                                                  |
| 63–73  | MOVE    | —       | Runbook (owner account, password reset)                         | Operator procedure, about 610 tokens, rarely relevant to coding turns. Proposed home `.ai/docs/runbook.md` with a pointer. **Not applied**, needs your approval                                 |
| 85     | TRIM    | N6/N4   | "TypeScript strict, no `any`, no `console.log` … bug fixes ship a regression test" | `no-explicit-any` and `no-console` are errors in `eslint.config.mjs:18-19`, strict is in tsconfig, and both run in the gate. The regression-test clause repeats L89. Absorbed L130     |
| 92     | TRIM    | N4/N8   | CI job list                                                     | Restates the gate. Kept the trigger and the "all jobs must pass" rule                                                                                                                        |
| 96     | TRIM    | N3      | "Agents MUST use this structure."                               | The heading already says "(mandatory)" and each subsection carries its own MUST                                                                                                              |
| 98–109 | CUT     | N4/N12  | `.ai/` directory tree                                           | Each entry is restated by L111–126 (specs, runs, lessons) or L77 (`docs/`). The tree is also incomplete (no `research/`, `qa/`, `trackers/` …)                                                |
| 126    | CUT     | N4/N2   | "Keep entries factual and actionable. Update or remove …"       | `.ai/lessons.md` "How to use" says the same (check existing, update, remove wrong), and L124 makes the agent read that file first. "Factual and actionable" is unfalsifiable                  |
| 130    | MERGE   | N4      | "Verify every change: lint + build …"                           | Weaker duplicate of the L85 gate. "Manual check" and "report real results in the run log" moved into L85                                                                                     |
| 131    | MERGE   | N4      | "Record lessons after corrections"                              | Same action as L125. The triggers (user, review, CI, verification), "right away" and "rules for all work belong in this file" moved into L125                                                |
| 132    | TRIM    | N4      | "… Record the lesson afterwards."                               | Covered by L125                                                                                                                                                                              |
| 134    | TRIM    | N1      | "… specific requirements produce better results"                | Rationale filler. The counter-default instruction stays                                                                                                                                      |

## Cut lines, verbatim

Every removed sentence or fragment that is not reproduced elsewhere in the rewrite, so you can restore any of them without git:

> **L22 (fragment)** — `with \`strict: true\`` (in "**TypeScript with `strict: true`**")
>
> **L45 (fragment)** — No circular dependencies.
>
> **L85 (fragment)** — TypeScript strict, no `any`, no `console.log`,
>
> **L96 (sentence)** — Agents MUST use this structure.
>
> **L98–109** —
>
> ```
> .ai/
> ├── specs/                  # Specifications for Spec-Driven Development (SDD)
> │   ├── YYYY-MM-DD-slug.md  # Active specs (not yet implemented)
> │   ├── implemented/        # Specs whose implementation is complete
> │   └── archive/            # Obsolete, rejected or superseded specs
> ├── docs/                   # Long-lived reference docs (engineering-standards.md, design-system.md)
> ├── runs/                   # Logs of autonomous AI runs
> │   └── YYYY-MM-DD-slug.md
> ├── lessons.md              # Index of lessons learned (long-term memory)
> └── lessons/                # Detailed lessons: YYYY-MM-DD-slug.md
> ```
>
> **L126** — Keep entries factual and actionable. Update or remove entries that become wrong; don't duplicate.
>
> **L134 (fragment)** — ; specific requirements produce better results.

Merged and trimmed lines keep their content in the canonical line. The diff below shows exactly where each one went.

## Kept despite looking generic

| Line    | Code  | Why it stays                                                                                                                                                |
| ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5, 7    | L6    | Managed `nextjs-agent-rules` block; L138 forbids touching it (see Observations about its "re-added by `next dev`" claim)                                     |
| 19      | L6    | "Do not swap technologies or deviate without asking": the agent would otherwise "improve" the stack                                                          |
| 24      | L1    | "Never edit an applied migration": models edit the migration they just wrote                                                                                 |
| 47, 48  | L4    | Authorization and server-only bundle rules overlap L79/L84, but security redundancy is intentional, and L48 carries the unique "mark `server-only`" instruction |
| 49      | L1/L2 | Workspace-flag installs and a single lockfile: models run `npm install` inside a package                                                                     |
| 54      | L1    | "Don't run `next build` on the VPS" counters the obvious deploy path; 1 GB / no swap is a real threshold                                                     |
| 58      | L4/L5 | Client-IP / XFF failure modes, added with #40; incident-grade knowledge                                                                                     |
| 59      | L1    | "Development uses a locally installed PostgreSQL (not Docker)": models reach for docker-compose                                                              |
| 60      | L4    | "Never commit secrets; keep a `.env.example`"                                                                                                               |
| 85      | L1    | "No dead code, comments only for non-obvious *why*": counters over-commenting and leftover code paths                                                        |
| 89      | L1    | "Never lower thresholds or widen the coverage `exclude` list": counters gaming coverage to get green                                                         |
| 114     | L5    | "Ask or note it in the run log rather than silently deviating"                                                                                              |
| 121     | L6    | Run logs are append-only                                                                                                                                    |
| 129     | L1/L5 | Plan first and get agreement; stop and re-plan if it goes sideways                                                                                          |
| 132     | L1    | "Fix bugs autonomously": counters stopping to ask for step-by-step direction                                                                               |
| 133     | L1    | "Redo mediocre fixes": counters shipping workarounds (borderline N7: "feels like" is the only trigger)                                                       |
| 134     | L1    | "Ask clarifying questions up front rather than guessing"                                                                                                    |
| 135     | L1    | "Use subagents": it **changes behavior** against Claude Code's own default (see Open questions)                                                             |
| 138     | L6    | "Do not commit unless asked": Claude Code's harness says this too, but other agents reading AGENTS.md don't get that                                         |
| 63–73   | L4/L5 | Runbook: every step is a safety or recovery rule (stop the service first, `chmod 600`, never paste the env file, exit codes). Moved, never trimmed            |

## Open questions

- **Runbook MOVE (L62–73, about 610 tokens, 16% of the file).** Move it verbatim to `.ai/docs/runbook.md` and leave one line in its place, for example: "Operator procedures (owner account, password reset): `.ai/docs/runbook.md`." Things that cite it would need updating in the same change: AGENTS.md L15 ("see Runbook"), the comment in `test/auth-set-password.integration.test.ts:34`, and `packages/ui/.storybook/docs/product/sign-in/SignUpClosed.mdx:52`. `BACKWARD_COMPATIBILITY.md:18` says deployment notes live in AGENTS.md; the deployment *constraints* (L53–60) would stay, so only the procedure moves. Do you want this?
- **L31 "(or `numeric`)".** No money column uses `numeric` (`packages/db/src`), and `.ai/docs/engineering-standards.md` §6 says "integer grosze everywhere". The rewrite keeps the alternative because a subtractive edit must not drop information. Should it go?
- **L135 "Use subagents for broad searches".** Claude Code's default is to spawn subagents only when the user asks. Because CLAUDE.md overrides defaults, this line makes Claude spawn on its own. Your saved preference "never auto-launch a review agent" points the other way for reviews. Is this line meant for all agents, or should it be scoped (e.g. "Codex/other agents") or dropped?
- **CLAUDE.md duplicates the `.ai/` workflow.** `CLAUDE.md:5-10` restates L111–126 (read lessons, run logs, record lessons, move specs), and both copies load every turn. Trim CLAUDE.md to `@AGENTS.md` plus its unique "use today's date" line? This is outside the audited file, so it is not in the rewrite.

## Observations

Not applied to the rewrite:

- **The root `nextjs-agent-rules` block is not actually re-added by `next dev`.** `npm run dev` runs `next dev` in `packages/app`, and `node_modules/next/dist/server/lib/generate-agent-files.js` writes `<projectDir>/AGENTS.md`, which is `packages/app/AGENTS.md` (that file holds the managed block). So L7's claim and L138's rationale describe the nested file, not the root one. The root copy is still load-bearing for Claude Code: Claude reads it through `CLAUDE.md`'s `@AGENTS.md` and never loads `packages/app/AGENTS.md`. Left untouched, as L138 requires.
- **`packages/app/AGENTS.md` carries an `agentFeedback` block that Claude Code never loads.** There is no `packages/app/CLAUDE.md`. Only agents that read nested AGENTS.md files see it.
- **The documented gate misses a CI job.** L85 and L92 omit the `design-system` CI job (`npm run check:tokens`, `test:storybook`, `build-storybook`), so a UI change can pass the documented gate and still fail CI. `design-system.md` mentions `check:tokens`, but the gate does not.
- **Working principles have no precedence rule.** "Plan complex tasks first … get it agreed" (L129) and "Fix bugs autonomously" (L132) give no ruling for a multi-file bug fix.
- **One historical note goes stale if the tree is cut.** `packages/ui/POSTEP.md:664` mentions "the `.ai/docs/` tree" in AGENTS.md. It is a progress log, so no update is needed.
- **Tooling note.** The skill's `scripts/analyze.py` crashes on a reference like `foo**` (`pathlib.glob` raises `ValueError`). This audit ran a patched copy from the scratchpad; the skill itself is unchanged.
- **Routing structure.** A split into per-domain files is **not** recommended beyond the Runbook. The rest is constraints that matter on most coding turns, and the detailed rules already live in `.ai/docs/engineering-standards.md` behind a "read before writing code" trigger.

## Proposed rewrite

Was written to `AGENTS.rewrite.md` (since applied to `AGENTS.md` and removed). Diff below.

```diff
@@ Stack @@
-- **Next.js (latest, App Router)** + **React** + **TypeScript with `strict: true`**. Package manager: …
+- **Next.js (latest, App Router)** + **React** + **TypeScript**. Package manager: …
-- **Zod** validates all API inputs and outputs and all AI responses.
-- **Frontend:** Tailwind CSS, shadcn/ui, **dnd-kit** for drag and drop, **TanStack Query** with optimistic updates.
-- **Ordering:** task order is stored in a `position` column using **fractional indexing**. Never renumber siblings on reorder; only the moved row changes.
+- **Frontend:** Tailwind CSS, shadcn/ui, **dnd-kit** for drag and drop, **TanStack Query**.
-- **AI:** the Claude API is called **only from server code**, never from the browser. Responses are structured JSON validated with Zod; invalid output is an error, never trusted. API keys live in server-only env vars.
-- **Money:** PLN only. Store amounts as integers in grosze (or `numeric`), never floats. Estimates are a min–max range.
-- **Tests:** **Vitest** for unit tests and for integration tests against a **real PostgreSQL** via Testcontainers (no DB mocks), **agent-browser** for browser-level integration tests.
+- **AI:** the Claude API is called **only from server code**, never from the browser; responses are structured JSON. API keys live in server-only env vars.
@@ Monorepo rules @@
-- Dependency direction: `app` → `ui`, `core`, `db`; `core` → `db` only where it must; `ui` and `db` never import `app`. No circular dependencies.
-- Business rules and authorization (…) live in `core`, not in route handlers or components. Route Handlers stay thin: parse with Zod → call `core` → respond.
+- Business rules and authorization (…) live in `core`, not in route handlers or components.
@@ Deployment @@
-- Run by **systemd** on **127.0.0.1:3000** (…); never bind publicly. Copy `public/` and `.next/static` into the standalone output.
+- Run by **systemd** on **127.0.0.1:3000** (…); never bind publicly.
@@ Engineering standards (digest) @@
-- **Layering:** `app → core → db`; `ui` imports no `@taskly/*`. Client code …
+- **Layering:** `app` → `ui`, `core`, `db`; `core` → `db` only where it must; `ui` imports no `@taskly/*`; `db` never imports `app`. Client code …
-- **Money** is integer grosze end-to-end, totals computed server-side, formatted to PLN only at the UI edge. **Order** uses fractional `position` compared with `COLLATE "C"`.
-- **Security:** … Zod-parsed input only (no mass assignment); AI output is untrusted (Zod-validate, never store invalid); …
-- **Quality:** TypeScript strict, no `any`, no `console.log`, no dead code, comments only for non-obvious *why*; tests for success/forbidden/not-found (+ concurrency); bug fixes ship a regression test. Gate: `npm run format:check`, …
+- **Money** is integer grosze (or `numeric`) end-to-end, never floats; totals computed server-side, formatted to PLN only at the UI edge. **Order** uses fractional-index `position` compared with `COLLATE "C"`; never renumber siblings, only the moved row changes.
+- **Security:** … Zod validates every API input and output (Zod-parsed input only, no mass assignment); AI output is untrusted (Zod-validate; invalid output is an error and is never stored); …
+- **Quality:** no dead code, comments only for non-obvious *why*; tests for success/forbidden/not-found (+ concurrency). Gate before calling work done (plus a manual check of the running app where relevant; report real results in the run log, including failures and anything skipped): `npm run format:check`, …
@@ Testing and CI @@
-- **Integration tests** (…) use a real PostgreSQL started by Testcontainers …
+- **Integration tests** (…) use a real PostgreSQL (no DB mocks) started by Testcontainers …
-- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every pull request (and pushes to `main`): lint/format/typecheck, unit tests with coverage, build, integration tests, and dependency audit. All jobs must pass before merging.
+- **GitHub Actions** (`.github/workflows/ci.yml`) runs these checks on every pull request (and pushes to `main`). All jobs must pass before merging.
@@ The .ai/ directory @@
-All AI-related project metadata lives in `.ai/`. Agents MUST use this structure.
-<12-line tree, see "Cut lines, verbatim">
+All AI-related project metadata lives in `.ai/`.
@@ Lessons @@
-- After fixing a bug, or whenever you learn something worth remembering (…), record it: …
-- Keep entries factual and actionable. Update or remove entries that become wrong; don't duplicate.
+- After fixing a bug, after a correction (from the user, a review, CI or a verification step), or whenever you learn something worth remembering (…), record it right away: … Rules that apply to all work belong in this file instead.
@@ Working principles @@
-- **Verify every change.** Run `npm run lint` and `npm run build` (…) before calling work done. Report real results in the run log, including failures and anything skipped.
-- **Record lessons after corrections.** When the user corrects you, … Rules that apply to all work belong in this file instead.
-- **Fix bugs autonomously.** … without waiting for step-by-step direction. Record the lesson afterwards.
+- **Fix bugs autonomously.** … without waiting for step-by-step direction.
-- **Keep specs precise.** Ask clarifying questions up front rather than guessing; specific requirements produce better results.
+- **Keep specs precise.** Ask clarifying questions up front rather than guessing.
```

Full diff: this commit's change to `AGENTS.md` in git history.
