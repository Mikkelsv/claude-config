# Think Clearly About Architectural Decisions

For decisions that touch architecture — module boundaries, data shape, API surface, schema, file format, abstraction layers — pause to think clearly before committing. Default: surface the trade-off to the user and let them decide on long-term direction. Note the decision in the session summary / commit message so it's traceable.

## When this fires

- Decision affects multiple modules or files in a way that's hard to undo.
- Choice between two competing architectures with different downstream costs.
- Adding a new abstraction layer / interface / wrapper that didn't already exist.
- Changing data shape, persisted format, or public API.
- Decision contradicts an existing pattern in the codebase.

## What to do

1. Articulate the trade-off — at least two options with their costs.
2. State which one you'd pick and why, citing existing code if applicable.
3. **Defer to the user** when the choice has long-term implications you can't fully scope.
4. Note the decision in the session summary or commit message body so it's traceable later.

## What this is NOT

- Not a hard halt. The orchestrator proceeds on reversible decisions on its own.
- Not "ask for every line of code". Most code is reversible — refactor, rename, swap. Only architectural shape changes warrant surfacing the trade-off.

## Why

Architectural decisions compound silently. The failure mode is making them implicitly mid-implementation, then discovering the choice was wrong weeks later when unwinding is expensive. Surfacing the trade-off keeps it visible and the user in the decision loop.
