---
name: audit-architecture
description: Deep architecture review — catches overengineering, boundary violations, and considers simpler alternatives
---

# Architecture Audit

Step back from the code and evaluate the structural decisions. This is not a line-by-line code review — it's a critical look at whether the right things exist in the right places, and whether the approach itself is sound.

## Step 1: Determine Scope

Check the arguments and conversation context to decide the review mode.

**Mode A — Changes** (no arguments provided):

Run the scope script:

```bash
powershell.exe -NoProfile -File "$HOME/claude-config/Claude/scripts/git-diff-scope.ps1"
```

If `MODE: none`, abort — nothing to audit.

**Mode B — Focused** (arguments are a path, module name, or description of an area):

The arguments describe where to focus. Use Glob to find the relevant files and Grep to locate related references. Read those files in full. Do not run git-diff-scope — the user is pointing you at specific code regardless of what changed.

**Mode C — General** (argument is `all`):

Scan the full solution structure from CLAUDE.md. For each project/folder, use Glob to count files and identify large modules. Use your judgment to pick the 2–3 areas that would benefit most from architectural review (biggest folders, most complex modules, areas with the most coupling). Read those areas in full.

**Conversation context**: In all modes, also consider what the user was working on or discussing in this conversation. If the conversation provides relevant context — recent edits, questions about a module, a bug being debugged — factor that into your scope even if it's not in the git diff or the explicit arguments.

## Step 2: Build the Full Picture

Read all in-scope files **in full**. Then read their consumers and dependencies — the files that import them, the modules that call into them. You need the full context of where this code sits in the system.

Also read:

- `CLAUDE.md` — core principles, solution structure, layering rules
- Any `.claude/rules/` files relevant to the in-scope areas
- Any `Claude/docs/` files that describe the architecture of the in-scope modules

## Step 3: Parallel Analysis

Launch **4 background agents** in a single message. Each agent receives a summary of the scope (list of in-scope files, the mode, and any conversation context) and performs its own file reading and analysis independently.

**Agent A — Architecture Boundaries**: Evaluate whether the code respects the project's structural boundaries. Refer to CLAUDE.md for the project's core principles and layering rules. Check:

- **Module responsibilities**: Is each module doing one thing? Is responsibility bleeding across boundaries?
- **Dependency direction**: Do changes respect the project's layering? Any reverse dependencies or circular references?
- **Abstraction levels**: Are high-level modules depending on low-level details they shouldn't know about?
- **Language/technology boundaries**: Is logic in the right language/layer per the project's conventions?

If `Claude/local/skills/audit-architecture/config.md` exists, read it for project-specific boundary rules and include those checks here. Otherwise, derive boundary rules from CLAUDE.md's core principles.

Report: list of boundary violations with file, line range, what, why, and fix.

**Agent B — Overengineering Check**: Look hard for unnecessary complexity:

- **Premature abstractions**: Interfaces, base classes, or generic helpers with only one consumer. If there's only one implementation, the abstraction is overhead.
- **Unnecessary indirection**: Wrappers that just delegate, factories that create one thing, dispatchers with one case. Every layer of indirection must pay for itself.
- **Speculative generality**: Code designed for hypothetical future requirements that don't exist yet. Feature flags, configuration options, or extension points that nothing uses.
- **Over-parameterization**: Functions with many parameters or options that could be simpler with hardcoded values for the actual use case.
- **Ceremony**: Boilerplate that could be eliminated. Types that exist only to satisfy a pattern rather than to model something real.

Ask for each abstraction: **if I deleted this and inlined the logic, what would break?** If the answer is "nothing, it would just be more direct" — it's overengineered.

Report: list of overengineering instances with file, line range, what, cost, and simpler alternative.

**Agent C — File Organization**: Evaluate whether files landed in the right place and whether the folder structure is clean:

- **Folder size**: Folders should have **6 files or fewer**. If a file lands in a folder with 7+, flag it — the folder likely needs splitting by concern.
- **File placement**: Does each new/moved file sit in the module it belongs to? Check against the solution structure in CLAUDE.md. A file in the wrong project or folder creates invisible coupling.
- **Folder depth**: Deep nesting (4+ levels below the project root) usually means over-categorization. Prefer flat structures with clear names over deep hierarchies.
- **Naming consistency**: Do new files follow the naming conventions of their neighbors? Inconsistent names make the folder harder to scan.

For each folder in scope, count the files. Report any that exceed 6 and suggest how to split them.

Report: list of folder issues (path, file count, suggested split) and misplaced files.

**Agent D — Alternative Approaches**: For each significant piece of functionality in scope, ask:

- **Could this be done with less code?** Not fewer lines for vanity — genuinely fewer moving parts, fewer types, fewer files.
- **Is there a more idiomatic way?** Does the language/framework have patterns that could replace elaborate structures?
- **Could an existing module handle this?** Before adding new infrastructure, check if something already in the codebase does 80% of what's needed.
- **Is the data model right?** Sometimes complexity comes from fighting the wrong data shape. A different representation might make the logic trivial.
- **What would the lazy approach look like?** The simplest thing that could possibly work — would it actually be worse, or just less "elegant"?

Report: list of alternatives with current approach, alternative, trade-off, and effort.

**When all 4 agents return**, merge their findings into the report.

## Step 4: Report

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

### File Organization

Folders touched by the changes that exceed 6 files, or files that appear misplaced:

- **Folder**: path — N files — suggested split or reorganization
- **Misplaced file**: path — belongs in X because Y

Skip if all folders are clean.

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



## Local Config

If `Claude/local/skills/audit-architecture/config.md` exists, read it for:
- **Architecture boundary rules** (module responsibilities, dependency direction, layer ownership)
