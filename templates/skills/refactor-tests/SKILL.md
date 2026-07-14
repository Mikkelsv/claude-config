---
name: refactor-tests
description: "Audit test coverage after a code change and apply trivial test additions directly, deferring heavier gaps to a plan. Use whenever the user asks \"are we covered?\", \"do we need tests?\", adds a new command/handler/type, or after /audit-branch flags a test gap."
---

# Test Coverage Review

Check if the test suite covers touched functionality. Trivial additions (adding a check to an existing test, one small new test) are applied directly inline. Heavier gaps — new test files, significant scaffolding, or coverage that requires design decisions — are deferred to a plan.

## Step 1: Load Test Framework

Read project test patterns and conventions from `.claude/rules/` and the test source(s) listed in **Project rules** below.

## Step 2: Scope

If orchestrator provided scope, skip to Step 3.

**Mode A** (no args): run `~/.claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B** (path/area): Glob relevant files, map to testable behavior.
**Mode C** (`all`): review full test suite vs full codebase.

## Step 3: Map Changes to Testable Behavior

For each changed file, ask: Are there new public APIs, handlers, or commands? Did existing API behavior change? Are there new types, components, or scene elements? Were state transitions added or modified? Did any removed functionality leave existing tests referencing dead code? These are thinking prompts, not a fixed checklist — let what's actually in the diff shape the questions.

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
