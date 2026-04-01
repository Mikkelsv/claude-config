---
name: refactor
description: Review code changes for architecture, quality, and simplicity
---

# Refactor Review (Orchestrator)

Runs three review passes in parallel: code review, documentation sync, and test coverage.

## Execution

1. Determine scope:
   - **Mode A** (no args): run `~/claude-config/Claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
   - **Mode B** (path/area): Glob relevant files. Build scope summary.
   - **Mode C** (`all`): scan solution from CLAUDE.md, pick 2-3 areas. Build scope summary.
   - Also factor in conversation context.

2. Read all three sub-skill files (check project first, fall back to global):
   - `Claude/skills/refactor-code/SKILL.md`
   - `Claude/skills/refactor-docs/SKILL.md`
   - `Claude/skills/refactor-tests/SKILL.md`

3. Spawn all three as **parallel background agents**, prepending scope output so they skip their scope step.

4. Present unified report: **Code Review** (summary, issues, verdict), **Documentation Sync** (updates, gaps), **Test Coverage** (verdict, gaps, stale tests), **Overall Verdict** (ship or needs work). If issues flagged, ask via `AskUserQuestion` to apply fixes.

---

## Customization Guide

Replace scope script path with project-local version for teammate copies. Ensure all three sub-skills are scaffolded.
