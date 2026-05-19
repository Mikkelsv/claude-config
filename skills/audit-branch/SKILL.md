---
name: audit-branch
description: Branch-level audit. Runs audit-architecture + refactor-code + refactor-docs + refactor-tests against main..HEAD in parallel, synthesizes findings, presents a single Apply / Defer / Skip prompt. Use to review a feature branch before merge or as a Final Audit gate.
---

# Audit Branch

Branch-level review combining architecture audit and the full refactor trio. Spawns up to 4 parallel sonnet sub-agents, synthesizes findings into one report, and prompts once for disposition. Replaces the previous `/refactor` + `/audit-architecture` two-step.

## Phase 1 — Scope

Run `~/.claude/scripts/git-diff-scope.ps1` to capture the `main..HEAD` diff scope. Abort if `MODE: none`. Pass the captured scope to every sub-agent so each skips its own scope-detection step.

## Phase 2 — Resolve Sub-Skills

For each of the four reviews, look up the SKILL.md (project-first, global fallback):

- `audit-architecture` — global only.
- `refactor-code` — typically project-scoped (no global fallback).
- `refactor-docs` — global available.
- `refactor-tests` — typically project-scoped.

If a sub-skill is unavailable (no project copy and no global copy), **skip its agent and note the absence in the report**. Do not error.

## Phase 3 — Parallel Audit (report-only)

Spawn all available sub-skills in **parallel** (one message, multiple `Agent` calls) with `model: "sonnet"`. Each agent's prompt:

1. Prepend the captured scope output so the agent skips its own scope step.
2. Pass the sub-skill's SKILL.md contents as the procedure.
3. **Override the sub-skill's action / fix-prompt step**: the agent must analyze and report findings only — do NOT prompt the user, do NOT apply fixes, do NOT defer. Return a structured note with `## Findings`, `## Suggested fixes` (each with file path + description), and `## Rule candidates`.

## Phase 4 — Unified Report

Synthesize the four agent reports into one section-per-area presentation:

### Architecture
Findings from audit-architecture — boundaries, overengineering, alternatives.

### Code Quality
refactor-code findings.

### Documentation
refactor-docs findings.

### Tests
refactor-tests findings.

### Overall verdict
**Sound** / **Minor issues** / **Needs work** / **Rethink** — synthesize across all four. Be direct.

## Phase 5 — Disposition

Skip the prompt entirely if every sub-agent returned `Sound` with no actionable findings — just report.

Otherwise, prompt via `AskUserQuestion`:

- **Apply inline** — orchestrator iterates through each finding's `## Suggested fixes` and applies via `Edit`/`Write` directly. For complex changes that can't be reduced to a precise edit, note "left to user" with the recommendation in the summary. Report what changed.
- **Defer to plan** — write `plans/post-audit-{slug}.md` using `plan-template.md` from the implement skill directory. Each finding becomes one Task with `**Files:**`, `**Acceptance:**`, and the agent's recommended fix as `**Context:**`. Slug = current branch name (sans `implement/` prefix) or a short description. Report the plan path.
- **Skip** — no action; report only.

## Phase 6 — Rule Candidates

Pool the `## Rule candidates` blocks from all sub-agents. Per `wf-surface-rule-candidates.md`, surface up to 3 candidates in one batched prompt at the end. Skip this phase if nothing qualifies — don't fabricate.
