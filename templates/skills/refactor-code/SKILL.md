---
name: refactor-code
description: Review code changes for architecture, quality, and simplicity
---

# Code Review

Review-only — no changes unless requested.

## Step 1: Scope

If orchestrator provided scope, skip to Step 2.

**Mode A** (no args): run `~/.claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob+Grep relevant files.
**Mode C** (`all`): scan solution from CLAUDE.md, pick 2-3 areas with most quality risk.

## Step 2: Read Code

Read all in-scope files in full (not just diff hunks), plus files that import/depend on them.

## Step 3: Architecture

Evaluate against project principles from CLAUDE.md:

{PROJECT_ARCHITECTURE_CHECKS}

- Could this be simpler? Fewer moving parts, less indirection?

## Step 4: Quality

- **Naming**: follows conventions?
- **Abstractions**: premature or missing? Complexity justified?
- **Duplication**: consolidate copy-paste?
- **Performance**: unnecessary allocations, large buffers held too long?
- **Dead code**: unused imports, functions, commented-out code?
- **Consistency**: new patterns match existing ones?

## Step 5: Simplification

Code doing more than needed? Abstractions with one consumer? Indirection that doesn't pay for itself? Less idiomatic than it could be?

## Step 6: Report

**Summary** — one paragraph.
**Architecture** — structural concerns. Skip if none.
**Quality Issues** — file+line, severity (low/med/high), what, why, suggestion. Summarize low-severity if >5.
**Simplifications** — concrete before/after or description.
**Verdict**: **Ship it** / **Minor tweaks** / **Refactor recommended** / **Rethink**. If not Ship it, ask via `AskUserQuestion` to apply fixes.

---

## Customization Guide

Replace `{PROJECT_ARCHITECTURE_CHECKS}` with project-specific review points from CLAUDE.md. Shell must include `$ARGUMENTS`.
