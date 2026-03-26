---
name: audit
description: Deep architecture review — catches overengineering, boundary violations, and considers simpler alternatives
---

# Architecture Audit

Step back from the code and evaluate the structural decisions. This is not a line-by-line code review — it's a critical look at whether the right things exist in the right places, and whether the approach itself is sound.

## Step 1: Identify the Scope

Check for uncommitted changes first:

1. Run `git diff --stat` (unstaged) and `git diff --cached --stat` (staged).
2. If there are uncommitted changes: use those as the scope. Get the full diff with `git diff` and `git diff --cached`.
3. If no uncommitted changes: fall back to branch diff. Run:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-branch-scope.ps1"
```

Then get the diff: `git diff {base}..HEAD`

If neither produces changes, abort — nothing to audit.

## Step 2: Build the Full Picture

Read all changed files **in full**. Then read their consumers and dependencies — the files that import them, the modules that call into them. You need the full context of where this code sits in the system.

Also read:

- `CLAUDE.md` — core principles, solution structure, layering rules
- Any `.claude/rules/` files relevant to the changed areas
- Any `.claude/docs/` files that describe the architecture of the changed modules

## Step 3: Architecture Boundaries

Evaluate whether the changes respect the project's structural boundaries. Refer to CLAUDE.md for the project's core principles and layering rules. Common concerns:

- **Module responsibilities**: Is each module doing one thing? Is responsibility bleeding across boundaries?
- **Dependency direction**: Do changes respect the project's layering? Any reverse dependencies or circular references?
- **Abstraction levels**: Are high-level modules depending on low-level details they shouldn't know about?
- **Language/technology boundaries**: Is logic in the right language/layer per the project's conventions?

{PROJECT_SPECIFIC_BOUNDARIES}

## Step 4: Overengineering Check

Look hard for unnecessary complexity:

- **Premature abstractions**: Interfaces, base classes, or generic helpers with only one consumer. If there's only one implementation, the abstraction is overhead.
- **Unnecessary indirection**: Wrappers that just delegate, factories that create one thing, dispatchers with one case. Every layer of indirection must pay for itself.
- **Speculative generality**: Code designed for hypothetical future requirements that don't exist yet. Feature flags, configuration options, or extension points that nothing uses.
- **Over-parameterization**: Functions with many parameters or options that could be simpler with hardcoded values for the actual use case.
- **Ceremony**: Boilerplate that could be eliminated. Types that exist only to satisfy a pattern rather than to model something real.

Ask for each abstraction: **if I deleted this and inlined the logic, what would break?** If the answer is "nothing, it would just be more direct" — it's overengineered.

## Step 5: Alternative Approaches

For each significant piece of new functionality, ask:

- **Could this be done with less code?** Not fewer lines for vanity — genuinely fewer moving parts, fewer types, fewer files.
- **Is there a more idiomatic way?** Does the language/framework have patterns that could replace elaborate structures?
- **Could an existing module handle this?** Before adding new infrastructure, check if something already in the codebase does 80% of what's needed.
- **Is the data model right?** Sometimes complexity comes from fighting the wrong data shape. A different representation might make the logic trivial.
- **What would the lazy approach look like?** The simplest thing that could possibly work — would it actually be worse, or just less "elegant"?

## Step 6: Report

### Summary

One paragraph: what the changes do and your overall architectural assessment.

### Boundary Violations

Any places where code crosses boundaries it shouldn't. Each with:

- **Where**: file + line range
- **What**: the violation
- **Why it matters**: what principle it breaks
- **Fix**: how to restructure

Skip if none found.

### Overengineering

Each instance of unnecessary complexity:

- **Where**: file + line range
- **What**: the unnecessary abstraction/indirection
- **Cost**: what complexity it adds (extra types, files, indirection levels)
- **Simpler alternative**: what to do instead

### Alternative Approaches

If you identified a fundamentally simpler way to achieve the same result:

- **Current approach**: brief description
- **Alternative**: what you'd do differently
- **Trade-off**: what you gain and what you lose
- **Effort**: how much work to switch

Only include alternatives that are genuinely simpler, not just different.

### Verdict

One of:

- **Sound** — architecture is clean, no significant issues
- **Minor issues** — a few boundary or complexity issues worth fixing
- **Overengineered** — significant unnecessary complexity that should be simplified
- **Rethink** — the fundamental approach has structural problems (explain the alternative)

If the verdict is not "Sound", use `AskUserQuestion` to ask if the user wants you to apply fixes or explore the alternative approach.

---

## Customization Guide

When scaffolding this skill for a project, replace `{PROJECT_SPECIFIC_BOUNDARIES}` in Step 3 with the project's specific boundary rules. Derive these from CLAUDE.md's core principles. Examples:

- Language ownership (e.g., "F# owns domain logic, JS is infrastructure only")
- Layer dependencies (e.g., "DomainModel -> App -> View3D -> Client")
- Technology boundaries (e.g., "Blazor layer stays thin, no domain imports")
