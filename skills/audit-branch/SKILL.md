---
name: audit-branch
description: Branch-level audit across architecture, code, docs, tests, file-sizes, and comments. Phase 3a runs all 6 sub-skills in parallel (audits + refactors). Phase 3b conditionally runs refactor-file-sizes if 3a flagged cap violations. Mechanical findings inline; judgment routes to /resolve-audit-findings. Self-paces 1-3 passes.
---

# Audit Branch

Branch-level review combining architecture audit + refactor sweeps across code, docs, tests, file-sizes, and comments. Spawns up to 6 parallel sonnet sub-agents in Phase 3a; each applies its own mechanical findings inline and returns judgment findings in a structured note. Orchestrator synthesizes deferred findings into one report and hands disposition to `/resolve-audit-findings`. After inline edits land, verifies the build.

**Multi-pass — decided mid-stride.** Always runs at least 1 pass. After each pass, decide whether another is warranted based on what the pass actually surfaced — not the diff size upfront. Re-pass triggers (any one is enough):

- Verdict was **Needs work** or **Rethink**
- 5+ findings landed (applied or deferred) across the sub-agents
- A single sub-agent reported a structural finding that touched files outside its original scope (e.g. refactor-code applied changes that may have invalidated refactor-tests' assertions)
- **Phase 3b ran at all** — file splits create new files with potentially stale top-of-file comments, carryover imports, and fresh refactoring opportunities; the next pass re-audits the post-split structure

Stop conditions:

- Verdict **Sound** with no deferred findings → done
- The latest pass surfaced nothing new (verdict OK, < 5 minor findings) → done
- Phase 6 build failed → stop and surface the break, don't compound it
- Hard cap at **3 passes** regardless

Phase 7 (rule candidates) runs once after the final pass — pool candidates from all passes.

## Phase 1 — Scope

Run `~/.claude/scripts/git-diff-scope.ps1` to capture the `main..HEAD` diff scope. Abort if `MODE: none`. Pass the captured scope to every sub-agent so each skips its own scope-detection step.

## Phase 2 — Resolve Sub-Skills

For each review, look up the SKILL.md (project-first, global fallback):

- `audit-architecture` — global available.
- `refactor-code` — typically project-scoped.
- `refactor-docs` — global available.
- `refactor-tests` — typically project-scoped.
- `audit-file-sizes` — global available.
- `refactor-comments` — typically project-scoped.
- `refactor-file-sizes` — typically project-scoped.

If a sub-skill is unavailable (no project copy, no global copy), **skip its agent and note the absence in the report**. Do not error.

## Phase 3a — Parallel Audit

Spawn all available sub-skills below in **parallel** (one message, multiple `Agent` calls) with `model: "sonnet"`:

- `audit-architecture` — read-only
- `refactor-code` — source files (writes)
- `refactor-docs` — `.md` files (writes)
- `refactor-tests` — test files (writes)
- `audit-file-sizes` — read-only scan
- `refactor-comments` — source-file comments (writes)

`refactor-code` and `refactor-comments` both write source files. They coexist safely because the `Edit` tool's `old_string` match is fail-on-mismatch — a collided edit fails and the agent retries with a fresh read. No silent lost updates, just transient retries.

Each agent's prompt:

1. Prepend the captured scope so the agent skips its own scope-detection step.
2. Pass the sub-skill's SKILL.md as the procedure.
3. **Apply mechanical findings inline** per the sub-skill's inline tier — comment hygiene, stale references, typos, unused imports, trivial dead code, etc. Read-only agents (`audit-architecture`, `audit-file-sizes`) apply nothing; they report.
4. **Defer judgment findings** to the structured note. Do NOT call `AskUserQuestion` (orchestrator owns Phase 5).
5. Return: `## Applied inline` (counts + brief `file:line` list), `## Deferred` (file, description, recommended fix per finding), `## Rule candidates`.

## Phase 3b — Conditional File-Size Refactor

Run only if Phase 3a's `audit-file-sizes` reported cap violations. File splits change the file structure mid-run (one file becomes two), which would invalidate any other agent's in-flight reads — that's why this can't live in 3a.

- `refactor-file-sizes` — applies splits inline.

If audit-file-sizes had no findings, skip 3b entirely. The agent merges its `## Applied inline` and `## Deferred` halves into the unified report.

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

If every sub-agent returned `Sound` or all findings landed in `## Applied inline` — just report; no further action this pass.

Otherwise, **invoke `/resolve-audit-findings`** with the deferred set. The skill researches each finding, applies inline when the solution is obviously better, and defers substantial findings to `plans/post-audit-{slug}.md`. Slug = current branch name (sans `implement/` prefix) or a short feature name. Surface its report (applied / deferred / skipped counts + paths) as part of this pass's output.

No `AskUserQuestion` prompt here — `/resolve-audit-findings` owns the apply/defer decision per finding. The user reviews the diff before committing.

## Phase 6 — Build Verify

After inline fixes have landed (whether from agents in Phase 3 or orchestrator in Phase 5), invoke `/build`. Report if the build broke — comment-only edits shouldn't affect the build, so a break signals an agent slip-up where a comment edit accidentally crossed into code. `/build` returns success in no-build repos via its graceful-skip path, so this step is a no-op there. The user reviews the diff before committing regardless.

## Phase 7 — Rule Candidates

Pool the `## Rule candidates` blocks from all sub-agents. Per `wf-surface-rule-candidates.md`, surface up to 3 candidates in one batched prompt at the end. Skip this phase if nothing qualifies — don't fabricate.
