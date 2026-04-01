---
name: refactor-tests
description: Review test coverage against code changes and flag gaps
---

# Test Coverage Review

Check if the test suite covers touched functionality. Only make straightforward additions.

## Step 1: Load Test Framework

Read project test patterns and conventions:

{TEST_FRAMEWORK_FILES}

## Step 2: Scope

If orchestrator provided scope, skip to Step 3.

**Mode A** (no args): run `~/claude-config/Claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob relevant files, map to testable behavior.
**Mode C** (`all`): review full test suite vs full codebase.

## Step 3: Map Changes to Testable Behavior

For each changed file: new public APIs? Changed behavior? New types/components? New state transitions? Removed functionality?

## Step 4: Cross-Reference Tests

{EXISTING_TEST_MAPPING}

Look for: new functionality without tests, stale tests referencing removed APIs, partial coverage.

## Step 5: Report

**Coverage Summary** — per area: covered, partial, or uncovered.
**Gaps** — what's untested, severity (high/med/low), suggested test, effort (trivial/small/significant).
**Stale Tests** — tests referencing removed/renamed APIs.
**Verdict**: **Covered** / **Minor gaps** / **Needs new tests**. For trivial gaps (adding a check to existing test), apply directly.

---

## Customization Guide

Replace `{TEST_FRAMEWORK_FILES}` and `{EXISTING_TEST_MAPPING}`. Shell must include `$ARGUMENTS`.
