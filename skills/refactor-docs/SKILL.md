---
name: refactor-docs
description: Review and update project documentation to match code changes
---

# Documentation Sync

Check if docs match current code. Update what's stale.

## Step 1: Scope

If orchestrator provided scope, skip to Step 2.

**Mode A** (no args): run `~/.claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob relevant files, cross-reference with docs.
**Mode C** (`all`): read all docs, cross-reference full codebase.

## Step 2: Read All Docs

Read in full: `CLAUDE.md`, all `docs/` files, all `.claude/rules/` files.

## Step 3: Cross-Reference

For each changed file, check if changes affect documented info: solution structure, module descriptions, build commands, API surfaces, type definitions, conventions. Look for: new files/modules not in CLAUDE.md, renamed types/functions docs reference, new undocumented APIs, changed behavior contradicting docs, removed features still documented.

## Step 4: Apply

Update only what's stale. Match existing style. Keep concise. Note significant gaps in report but don't create new doc files unless the gap is major.

## Step 5: Report

Files updated and why. Gaps needing attention. Borderline items left alone.
