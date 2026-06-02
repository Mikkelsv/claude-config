---
name: audit-branch
description: Branch-level audit. Runs audit-architecture + refactor-code + refactor-docs + refactor-tests against main..HEAD in parallel; sub-skills apply mechanical findings inline and defer judgment to a unified report. Use to review a feature branch before merge or as a Final Audit gate.
---

# Audit Branch

Branch-level review combining architecture audit and the full refactor trio. Spawns up to 4 parallel sonnet sub-agents; each applies its own mechanical findings inline and returns judgment findings in a structured note. Orchestrator synthesizes deferred findings into one report and prompts once for disposition. After inline edits land, verifies the build.

## Phase 1 — Scope

Run `~/.claude/scripts/git-diff-scope.ps1` to capture the `main..HEAD` diff scope. Abort if `MODE: none`. Pass the captured scope to every sub-agent so each skips its own scope-detection step.

## Phase 2 — Resolve Sub-Skills

For each of the four reviews, look up the SKILL.md (project-first, global fallback):

- `audit-architecture` — global available.
- `refactor-code` — typically project-scoped (no global fallback).
- `refactor-docs` — global available.
- `refactor-tests` — typically project-scoped.

If a sub-skill is unavailable (no project copy and no global copy), **skip its agent and note the absence in the report**. Do not error.

## Phase 3 — Parallel Audit (inline-small + defer-big)

Spawn all available sub-skills in **parallel** (one message, multiple `Agent` calls) with `model: "sonnet"`. Each agent's prompt:

1. Prepend the captured scope output so the agent skips its own scope-detection step.
2. Pass the sub-skill's SKILL.md contents as the procedure.
3. **Apply mechanical findings inline** per the sub-skill's own inline tier — comment hygiene, stale references, typos, unused imports, trivial dead code, etc. Stay strictly within the sub-skill's file partition (audit-architecture: read-mostly; refactor-code: source files; refactor-docs: `.md` files; refactor-tests: test files) so two agents never edit the same file concurrently.
4. **Defer judgment findings** — architectural restructures, public API changes, removal decisions, ambiguous test assertions, etc. — to the structured note. Do NOT call `AskUserQuestion` (that's the orchestrator's job at Phase 5).
5. Return two halves in the structured note: `## Applied inline` (counts + brief `file:line` list of what landed) and `## Deferred` (full detail per finding: file path, description, recommended fix). Also `## Rule candidates` as before.

## Phase 4 — Unified Report

Each agent returns two halves. Synthesize:

### Applied inline

One line per area summarizing what already landed in the diff (e.g. `refactor-code: 8 inline fixes (unused imports × 5, stale comments × 3)`).

### Deferred (judgment findings)

One section per area listing remaining findings:

- **Architecture** — audit-architecture findings (boundaries, overengineering, alternatives).
- **Code Quality** — refactor-code judgment findings (extractions, structural changes).
- **Documentation** — refactor-docs reorg / new-doc findings.
- **Tests** — refactor-tests coverage gaps + assertion debates.

### Overall verdict

**Sound** / **Minor issues** / **Needs work** / **Rethink** — synthesize across both halves. Be direct.

## Phase 5 — Disposition (deferred items only)

If every sub-agent returned `Sound` or all findings landed in `## Applied inline` — just report; no prompt.

Otherwise, prompt via `AskUserQuestion` against the deferred set only:

- **Apply inline** — orchestrator iterates the deferred findings and applies via `Edit`/`Write` directly. For complex changes that can't be reduced to a precise edit, note "left to user" with the recommendation in the summary. Report what changed.
- **Defer to plan** — write `plans/post-audit-{slug}.md` using `plan-template.md` from the implement skill directory. Each deferred finding becomes one Task with `**Files:**`, `**Acceptance:**`, and the agent's recommended fix as `**Context:**`. Slug = current branch name (sans `implement/` prefix) or a short description. Report the plan path.
- **Skip** — note in report only.

## Phase 6 — Build Verify

After inline fixes have landed (whether from agents in Phase 3 or orchestrator in Phase 5), invoke `/build`. Report if the build broke — comment-only edits shouldn't affect the build, so a break signals an agent slip-up where a comment edit accidentally crossed into code. `/build` returns success in no-build repos via its graceful-skip path, so this step is a no-op there. The user reviews the diff before committing regardless.

## Phase 7 — Rule Candidates

Pool the `## Rule candidates` blocks from all sub-agents. Per `wf-surface-rule-candidates.md`, surface up to 3 candidates in one batched prompt at the end. Skip this phase if nothing qualifies — don't fabricate.
