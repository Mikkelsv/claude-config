# Overengineering, Not Volume

Critique overengineering, not code volume. Substantial code is fine when each piece earns its keep — flag abstractions without a current consumer, indirection without justification, premature generalization, and speculative configurability. Do not cut just for line count.

## Why

Critique skills (`/audit-architecture`, `/refactor-code`, `/plan-optimizer`) reflexively reach for "could this be 30% less code?" That conflates two different things: a 400-line file doing one clear thing well is fine; a 50-line file with 3 interfaces and a factory is not. The first is volume, the second is overengineering — only the second is a problem. Cutting for volume punishes substantial-but-justified code and lets compact-but-speculative abstractions through.

## How

When reviewing, ask "does each piece have a current consumer / justification?" — not "is this a lot of code?". Specifically flag:

- Abstractions (interfaces, wrappers, base classes) with one implementation and no near-term second
- Indirection (factories, providers, options patterns) that simplifies nothing for current callers
- Generalizations (generics, configurability, hooks) without a concrete second use case
- "Future extension points" — see `cq-no-future-state-stubs`

Keep file-size caps (400/800) as a *reviewability* check, separate from the design critique. A file can be large AND well-designed; it can be small AND overengineered.

## Exceptions

- Published library APIs where flexibility is the contract — but say so explicitly.
- Framework-mandated structure (DI, middleware, MAUI lifecycle) — not optional, not overengineering.

<!-- Captured: 2026-06-04 from plan-optimizer authoring session — user clarified they accept substantial changes but not overengineering. Generalizes to audit-architecture and refactor-code. -->
