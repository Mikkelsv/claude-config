---
name: audit
description: Deep architecture review — catches overengineering, boundary violations, and considers simpler alternatives
---

# Architecture Audit

Evaluate structural decisions — not line-by-line code review, but whether the right things exist in the right places.

## Step 1: Scope

**Mode A — Changes** (no args): run `~/claude-config/Claude/scripts/git-diff-scope.ps1`. Abort if `MODE: none`.
**Mode B — Focused** (path/module/area): Glob+Grep the specified area. Read in full.
**Mode C — General** (`all`): scan solution structure from CLAUDE.md, pick 2-3 areas with most coupling/complexity.

Also factor in conversation context (recent edits, discussion).

## Step 2: Build Context

Read all in-scope files in full, plus their consumers/dependencies. Also read CLAUDE.md, relevant `.claude/rules/`, and `Claude/docs/`.

## Step 3: Parallel Analysis

Launch **4 background agents** with the scope summary:

**Agent A — Boundaries**: Module responsibilities bleeding? Dependency direction violations? Reverse/circular deps? Abstraction level mismatches?

{PROJECT_SPECIFIC_BOUNDARIES}

**Agent B — Overengineering**: Interfaces/abstractions with one consumer? Wrappers that just delegate? Speculative generality? Over-parameterization? Ask: "if I inlined this, what breaks?" If nothing — it's overengineered.

**Agent C — File Organization**: Folders >6 files need splitting. Files in wrong module? Depth >4 levels = over-categorization? Naming consistency with neighbors?

**Agent D — Alternatives**: Less code possible? More idiomatic approach? Existing module handles 80% already? Wrong data model causing complexity? What's the simplest thing that works?

## Step 4: Report

**Summary** — one paragraph: what changed, overall assessment.
**Boundary Violations** — where, what, why, fix. Skip if none.
**Overengineering** — where, what, cost, simpler alternative.
**File Organization** — oversized folders (path, count, suggested split), misplaced files. Skip if clean.
**Alternative Approaches** — current vs alternative, trade-off, effort. Only genuinely simpler alternatives.
**Verdict**: **Sound** / **Minor issues** / **Overengineered** / **Rethink**. If not Sound, ask via `AskUserQuestion` whether to apply fixes.

---

## Customization Guide

Replace `{PROJECT_SPECIFIC_BOUNDARIES}` in Agent A with project-specific boundary rules from CLAUDE.md. Shell must include `$ARGUMENTS`.
