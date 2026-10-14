@AGENTS.md

# Claude Code notes

The `.ai/` workflow described in AGENTS.md is mandatory for Claude Code:

1. Start of task: read `.ai/lessons.md` and any relevant spec in `.ai/specs/`.
2. Autonomous/long runs: create `.ai/runs/YYYY-MM-DD-slug.md` and keep it updated.
3. After a bug fix or new insight: record it in `.ai/lessons.md` (+ `.ai/lessons/YYYY-MM-DD-slug.md` for details).
4. When a spec is fully implemented: move it to `.ai/specs/implemented/`; obsolete ones go to `.ai/specs/archive/`.

Use today's date (from the session context) for all `YYYY-MM-DD` prefixes.
