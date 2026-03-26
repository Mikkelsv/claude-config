---
name: refactor-docs
description: Review and update project documentation to match code changes
---

# Documentation Sync

Check whether project documentation is still accurate given the current code changes, and update anything that's stale.

## Step 1: Identify the Scope

Check for uncommitted changes first:

1. Run `git diff --stat` (unstaged) and `git diff --cached --stat` (staged).
2. If there are uncommitted changes: use those as the scope. Get the full diff with `git diff` and `git diff --cached`.
3. If no uncommitted changes: fall back to branch diff. Run:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-branch-scope.ps1"
```

Then get the diff: `git diff {base}..HEAD`

If neither produces changes, abort — nothing to review.

## Step 2: Read All Documentation

Read these files in full:

- `CLAUDE.md` — project overview, structure, conventions, build instructions
- Every file in `.claude/docs/` — architecture docs, API references, pipeline docs
- Every file in `.claude/rules/` — coding rules, patterns, conventions

## Step 3: Cross-Reference Changes Against Docs

For each changed file, check whether the changes affect anything documented:

- **CLAUDE.md**: Solution structure, project descriptions, build commands, common issues, conventions
- **Architecture docs** (`.claude/docs/`): Module responsibilities, data flow, API surfaces, type definitions
- **Rules** (`.claude/rules/`): Coding patterns, naming conventions, pipeline invariants

Specific things to look for:

- New files/modules not mentioned in CLAUDE.md's Solution Structure
- Renamed or moved types/functions that docs reference
- New public APIs or commands not documented
- Changed behavior that contradicts existing docs
- Removed features still documented
- New patterns that should be added to rules

## Step 4: Apply Updates

For each stale section:

1. Read the current doc section
2. Read the relevant source code
3. Update the doc to match reality

**Rules:**

- Only update what's actually stale — don't rewrite docs that are fine
- Match the existing style and tone of each doc
- Keep descriptions concise — docs are reference material, not tutorials
- If a new module/feature needs documentation and no existing doc covers it, note it in your report but don't create new doc files unless the gap is significant

## Step 5: Report

Summarize what you updated (or that everything was already in sync):

- Which files were updated and why
- Any documentation gaps that need attention but weren't auto-fixable
- Anything you left alone that's borderline stale
