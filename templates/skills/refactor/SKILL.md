---
name: refactor
description: Review code changes for architecture, quality, and simplicity
---

# Refactor Review

Review code changes for architecture, quality, and simplicity. This is a review-only command — no changes are made unless explicitly requested.

## Step 1: Identify the Scope

Check for uncommitted changes first:

1. Run `git diff --stat` (unstaged) and `git diff --cached --stat` (staged).
2. If there are uncommitted changes: use those as the scope. Get the full diff with `git diff` and `git diff --cached`.
3. If no uncommitted changes: run the branch scope script to get the full branch diff vs main:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-branch-scope.ps1"
   ```

   Returns JSON: `{branch, base, hasMergeBase, isAhead, commitCount, commits[], files[]}`. Use `files` as the scope and `git diff main...HEAD` for the full diff.

If neither produces changes, abort — nothing to review.

## Step 2: Understand the Changes

Read all modified/added files **in full** (not just diff hunks) to understand surrounding context. Also read any files that import or depend on the changed files.

Group changes by concern:

- What feature, fix, or refactor do these changes implement?
- Which files were touched and why?

## Step 3: Architecture Review

Evaluate changes against the project's core principles from CLAUDE.md:

- Do changes respect the intended architecture boundaries and layering?
- Is logic in the right layer/module?
- Are there dependency direction violations?
- Is domain logic leaking into layers that should be thin or infrastructure-only?
- Could this be simpler? Fewer moving parts? Less indirection?

{If the project defines specific architecture rules in CLAUDE.md or .claude/rules/, check against those explicitly.}

## Step 4: Code Quality Review

Evaluate the diff against project conventions (from CLAUDE.md):

- **Naming**: Do types, functions, and variables follow the project's naming conventions?
- **Abstractions**: Are there premature abstractions or missing ones? Is complexity justified?
- **Duplication**: Is there copy-paste code that should be consolidated?
- **Performance**: Are there obvious optimization opportunities? Unnecessary allocations in hot paths?
- **Dead code**: Unused imports, functions, or commented-out code?
- **Consistency**: Do new patterns match existing codebase patterns?

## Step 5: Simplification Opportunities

Look specifically for:

- Code that does more than it needs to
- Abstractions with only one consumer
- Indirection that doesn't pay for itself
- Idiomatic improvements for the project's language(s)
- Configuration or feature flags where a direct approach would work

## Step 6: Report

Present findings in this format:

### Summary

One paragraph: what the changes do, how many files/lines changed, overall assessment.

### Architecture

Any concerns about boundaries, layering, or structural decisions. Skip if nothing to flag.

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

When scaffolding this skill for a project, replace the `{...}` section in Step 3 with the project's specific architecture rules. These typically come from CLAUDE.md but can be made explicit for faster review. Example:

```
- **F# ownership**: Domain logic must stay in F#, JS is thin infrastructure
- **Dependency direction**: DomainModel → App → View3D → Client (never reverse)
- **Minimal C#**: Blazor layer stays thin, never imports domain types
```

Step 4 conventions also come from CLAUDE.md. If the project has detailed coding standards, reference them explicitly.
