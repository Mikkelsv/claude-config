---
name: refactor-code
description: Review code changes for architecture, quality, and simplicity. Applies mechanical findings inline; defers judgment calls to the report.
---

# Code Review

Reviews code changes; applies mechanical findings inline and defers judgment to the report. When called by `audit-branch`, returns the two-half contract; standalone invocation applies inline then asks once for the deferred set.

## Step 1: Scope

If orchestrator provided scope, skip to Step 2.

**Mode A** (no args): run `~/.claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob+Grep relevant files.
**Mode C** (`all`): scan solution from CLAUDE.md, pick 2-3 areas with most quality risk.

## Step 2: Read Code

Read all in-scope files in full (not just diff hunks), plus files that import/depend on them.

## Step 3: Architecture

Evaluate against project principles from CLAUDE.md and `.claude/rules/`. Could this be simpler? Fewer moving parts, less indirection?

## Step 4: Quality

- **Naming**: follows project conventions?
- **Abstractions**: premature or missing? Complexity justified?
- **Duplication**: consolidate copy-paste?
- **Performance**: unnecessary allocations in hot paths, large buffers held too long?
- **Dead code**: unused imports, functions, commented-out code?
- **Consistency**: new patterns match existing ones?

## Step 5: Simplification

Code doing more than needed? Abstractions with one consumer? Indirection that doesn't pay for itself? Less idiomatic than it could be?

## Step 6: Apply mechanical, defer judgment

Apply mechanical fixes inline; defer judgment to the report.

**Apply inline** — the rubric uniquely determines the action:

- Unused imports, dead local bindings, trivial dead code (no callers).
- Stale comments / doc-comments contradicting the code (per `cq-comments-track-code`).
- Naming nits per project conventions.
- Trivial duplication consolidation (local + obvious).
- Typos in identifiers, comments, or strings.

**Defer to the report** — a real judgment call exists:

- Extract helper, split function, restructure module.
- Public API change, new abstraction, interface introduction.
- Behavior change, error-handling reshape.
- Architectural concerns (never in scope for auto-apply).

When called by `audit-branch`, return both halves in the structured response (Phase 3 contract). When invoked standalone, apply inline first, then ask via `AskUserQuestion` (Apply / Defer to plan / Skip) for the deferred set only.

## Step 7: Report

**Summary** — one paragraph.
**Applied inline** — counts + brief `file:line` list. Skip if none.
**Architecture** — deferred structural concerns. Skip if none.
**Quality Issues** — deferred findings: file+line, severity (low/med/high), what, why, suggestion. Summarize low-severity if >5.
**Simplifications** — deferred concrete before/after or description.
**Verdict**: **Ship it** / **Minor tweaks** / **Refactor recommended** / **Rethink**.

## Project rules

<ProjectSpecific>
Additional project-specific rules to apply during review.
</ProjectSpecific>

---

## Customization Guide

This template's `<ProjectSpecific>` block under "Project rules" is preserved by `/claude-sync` re-syncs — layer the project's specific `arch-*` / `cq-*` rule references there. No other placeholders.
