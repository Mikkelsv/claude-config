---
name: refactor-tests
description: Review test coverage against code changes and flag gaps
---

# Test Coverage Review

Check if the test suite covers touched functionality. Only make straightforward additions.

## Step 1: Load Test Framework

Read project test patterns and conventions from `.claude/rules/` and the test source(s) listed in **Project rules** below.

## Step 2: Scope

If orchestrator provided scope, skip to Step 3.

**Mode A** (no args): run `~/.claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob relevant files, map to testable behavior.
**Mode C** (`all`): review full test suite vs full codebase.

## Step 3: Map Changes to Testable Behavior

For each changed file: new public APIs / handlers / commands? Changed behavior in existing APIs? New types / components / scene elements? New / modified state transitions? Removed functionality that existing tests reference?

## Step 4: Cross-Reference Tests

Read the test source(s) for the current inventory. Categorize tests by concern (state roundtrips, perf instrumentation, command serialization, UI interaction, domain logic, etc.) — derive the categories from what's actually in the test files; don't rely on a hardcoded list.

Look for:

- New functionality without tests.
- Stale tests referencing removed/renamed APIs.
- Partial coverage (only happy-path tested; edge cases missing).

## Step 5: Report

**Coverage Summary** — per area: covered, partial, or uncovered.
**Gaps** — what's untested, severity (high/med/low), suggested test, effort (trivial/small/significant).
**Stale Tests** — tests referencing removed/renamed APIs.
**Verdict**: **Covered** / **Minor gaps** / **Needs new tests**. For trivial gaps (adding a check to existing test), apply directly.

## Project rules

<ProjectSpecific>
{TEST_FRAMEWORK_FILES}
</ProjectSpecific>

---

## Customization Guide

Replace `{TEST_FRAMEWORK_FILES}` at scaffold time with the project's test-framework file references — typically: relevant `.claude/rules/` test-pattern rules, the test source directory, and heuristics for which kinds of changes warrant which kinds of tests (e.g. "new command → serialization test; new state field → roundtrip test").

The `<ProjectSpecific>` block under "Project rules" is preserved by `/claude-sync` re-syncs; layer additional test-coverage notes there without losing them on update.
