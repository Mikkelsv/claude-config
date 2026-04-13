# Always Use /plan for Feature Work

When the user describes work that warrants a plan, notify them ("This looks like it needs a plan — running /plan.") and invoke `/plan` with their description as the argument. Use your best judgment on scope.

## When to plan

- Multi-file changes or new features with design decisions
- Work that would benefit from task breakdown (3+ distinct steps)
- Architecture changes or cross-cutting concerns
- The user explicitly asks to plan

## When NOT to plan

- Trivial tasks: single-line fixes, typos, config tweaks, renaming
- Small focused changes: adding a field, updating a string, tweaking styles
- Already inside `/plan` or `/implement`
- Pure questions or exploration: "how does X work?"
- The user explicitly says they don't want a plan

## Why

Plans feed directly into `/implement`. Skipping `/plan` means ad-hoc notes that `/implement` can't parse. The skill also handles scope checks, multi-phase splitting, and parallel analysis.
