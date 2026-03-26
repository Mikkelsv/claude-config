---
name: refactor-code
description: Review code changes for architecture, quality, and simplicity
---

# Code Review

Review code changes for architecture, quality, and simplicity. This is a review-only command — no changes are made unless explicitly requested.

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

## Step 2: Understand the Changes

Read all modified/added files **in full** (not just diff hunks) to understand surrounding context. Also read any files that import or depend on the changed files.

Group changes by concern:

- What feature, fix, or refactor do these changes implement?
- Which files were touched and why?

## Step 3: Architecture Review

Start with the big picture. Evaluate changes against the project's core principles (from CLAUDE.md):

{PROJECT_ARCHITECTURE_CHECKS}

- **Could this be simpler?** Is there a more straightforward approach? Fewer moving parts? Less indirection?

## Step 4: Code Quality Review

Evaluate the diff against project conventions:

- **Naming**: Do types, functions, and variables follow project naming conventions?
- **Abstractions**: Are there premature abstractions or missing ones? Is complexity justified?
- **Duplication**: Is there copy-paste code that should be consolidated?
- **Performance**: Are there obvious optimization opportunities? Unnecessary allocations in hot paths? Large buffers held longer than needed?
- **Dead code**: Unused imports, functions, or commented-out code?
- **Consistency**: Do new patterns match existing codebase patterns?

## Step 5: Simplification Opportunities

Look specifically for:

- Code that does more than it needs to
- Abstractions with only one consumer
- Indirection that doesn't pay for itself
- Language patterns that could be more idiomatic
- Configuration or feature flags where a direct approach would work

## Step 6: Report

Present findings in this format:

### Summary

One paragraph: what the changes do, how many files/lines changed, overall assessment.

### Architecture

Any concerns about structural boundaries, layering, or design decisions. Skip if nothing to flag.

### Quality Issues

List each issue with:

- **File + line range**
- **Severity**: low / medium / high
- **What**: description of the issue
- **Why**: why it matters
- **Suggestion**: concrete fix (code snippet if helpful)

Skip low-severity issues if there are more than 5 — summarize them in one line.

### Simplifications

Concrete opportunities to make the code simpler. Each with before/after or a description of the change.

### Verdict

One of:

- **Ship it** — clean, no action needed
- **Minor tweaks** — a few small fixes, then good to go
- **Refactor recommended** — quality or architecture issues worth addressing
- **Rethink** — fundamental approach should be reconsidered (explain why and suggest alternative)

If the verdict is not "Ship it", use `AskUserQuestion` to ask if the user wants you to apply the suggested fixes.

---

## Customization Guide

When scaffolding this skill for a project, replace `{PROJECT_ARCHITECTURE_CHECKS}` in Step 3 with the project's specific architecture review points. Derive these from CLAUDE.md's core principles. Examples:

- Language ownership checks
- Layer dependency direction
- Technology boundary enforcement
