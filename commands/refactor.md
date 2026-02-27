# Refactor Review

Analyze recent feature branch work for code quality and separability. This is a review-only command — no changes are made unless explicitly requested.

Scripts directory: `~/.claude/scripts`

## Step 1: Identify the Scope

Run the branch scope script to gather all git info at once:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-branch-scope.ps1"
```

Returns JSON:

```json
{"branch": "...", "base": "...", "hasMergeBase": true, "isAhead": true, "commitCount": 5, "commits": [...], "files": [...]}
```

- If `hasMergeBase` is true and `isAhead` is true: use the scope as-is (diff from base to HEAD).
- If `hasMergeBase` is false or `isAhead` is false: the script falls back to the last 10 commits. Use `AskUserQuestion` to ask the scope:
  - **Latest commits** — review only the last 10 commits
  - **Whole project** — review the entire codebase (read all source files, no diff-based scope)
- If `commitCount` is 0: abort — nothing to review.

Get the diff for the resolved scope: `git diff <base>..HEAD`

## Step 2: Understand the Changes

Read all modified/added files in full (not just the diff hunks) to understand the surrounding context. Group changes by concern:

- What feature or fix do these commits implement?
- Which files were touched and why?
- Are there distinct logical units of work mixed together?

## Step 3: Code Quality Review

Evaluate the diff against the project's conventions (from CLAUDE.md and rules). Focus on:

- **Naming**: Do types, functions, and variables follow project conventions?
- **Abstractions**: Are there premature abstractions or missing ones? Is complexity justified?
- **Duplication**: Is there copy-paste code that should be consolidated?
- **Error handling**: Is it appropriate — not excessive, not missing at boundaries?
- **Side effects**: Are pure and impure functions clearly separated?
- **Dead code**: Are there unused imports, functions, or commented-out code?
- **Consistency**: Do new patterns match existing codebase patterns?

## Step 4: Separability Review

Evaluate whether the changes are well-structured for review and maintainability:

- **Single responsibility**: Does each file change serve one purpose?
- **Mixed concerns**: Are unrelated changes (e.g., feature + refactor + formatting) tangled in the same commits?
- **Commit hygiene**: Could the work be split into smaller, independently reviewable commits?
- **Dependency direction**: Do the changes respect the project's dependency flow, or do they introduce unexpected coupling?
- **Extractable units**: Are there pieces that could be standalone PRs (e.g., a utility extracted, a type renamed, a bug fix)?

## Step 5: Report

Present findings in this format:

### Summary

One paragraph: what the branch does, how many files/lines changed, overall assessment.

### Quality Issues

List each issue with:

- **File + line range**
- **Severity**: low / medium / high
- **What**: description of the issue
- **Why**: why it matters
- **Suggestion**: concrete fix (code snippet if helpful)

Skip low-severity issues if there are more than 5 — summarize them in one line.

### Separability

- Can the branch be merged as-is, or should it be split?
- If splitting is recommended, propose the split with concrete commit groupings.

### Verdict

One of:

- **Ship it** — clean, no action needed
- **Minor tweaks** — a few small fixes, then good to go
- **Refactor recommended** — quality issues worth addressing before merge
- **Split recommended** — changes should be separated into distinct branches/PRs

If the verdict is not "Ship it", use `AskUserQuestion` to ask if the user wants you to apply the suggested fixes.
