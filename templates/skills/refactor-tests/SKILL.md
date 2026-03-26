---
name: refactor-tests
description: Review test coverage against code changes and flag gaps
---

# Test Coverage Review

Check whether the test suite still covers the functionality touched by the current code changes, and flag gaps.

Only make changes if they are straightforward test additions or updates.

## Step 1: Load the Test Framework

Read the project's test patterns and conventions before doing anything:

{TEST_FRAMEWORK_FILES}

## Step 2: Identify the Scope

Check for uncommitted changes first:

1. Run `git diff --stat` (unstaged) and `git diff --cached --stat` (staged).
2. If there are uncommitted changes: use those as the scope. Get the full diff with `git diff` and `git diff --cached`.
3. If no uncommitted changes: fall back to branch diff. Run:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-branch-scope.ps1"
```

Then get the diff: `git diff {base}..HEAD`

If neither produces changes, abort — nothing to review.

## Step 3: Map Changes to Testable Behavior

For each changed file, identify:

- New public APIs, commands, or dispatch actions
- Changed behavior in existing APIs
- New module types or components
- New or modified state transitions
- Removed functionality that existing tests might reference

## Step 4: Cross-Reference with Existing Tests

Check whether the existing tests cover the changed behavior.

{EXISTING_TEST_MAPPING}

Look for:

- New functionality not covered by any test
- Existing tests that reference removed or renamed APIs
- Areas where test coverage is partial

## Step 5: Report

### Coverage Summary

For each area of change, state whether it's covered, partially covered, or uncovered by existing tests.

### Gaps

For each gap:

- **What's untested**: the specific behavior
- **Severity**: high (core feature), medium (supporting feature), low (edge case)
- **Suggested test**: brief description of what a test would do
- **Effort**: trivial (add a check to existing test) / small (new test function) / significant (new test infrastructure needed)

### Stale Tests

Any existing tests that reference removed/renamed APIs or test behavior that no longer exists.

### Verdict

- **Covered** — existing tests adequately cover the changes
- **Minor gaps** — a few easy additions would close coverage
- **Needs new tests** — significant new behavior lacks coverage (list the tests to write)

If the verdict is "Minor gaps" and the additions are trivial (adding a check to an existing test), go ahead and make the changes. For anything larger, just report.

---

## Customization Guide

When scaffolding this skill for a project, replace:

- `{TEST_FRAMEWORK_FILES}` — list of files to read for test patterns, conventions, and existing tests
- `{EXISTING_TEST_MAPPING}` — list of existing tests and what they cover, so the review can cross-reference
