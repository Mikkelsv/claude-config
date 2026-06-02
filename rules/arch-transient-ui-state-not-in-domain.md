# Transient UI State Doesn't Belong in Domain Model

Per-session UI toggles (visibility flags, expanded/collapsed state, hover state, "show advanced" booleans) must NOT live on domain records. Put them in application-layer state, session state, or per-component view state instead.

## Why

Domain records represent persistent, durable state — what's loaded, what's named, what gets saved. UI toggles are session/local and intentionally not persisted; putting them on a domain record:

- Pollutes serialization paths with fields that must be explicitly excluded from save/load.
- Confuses readers about which fields participate in the persistence contract.
- Mixes "data the user authored" with "UI display state" at the type level, making both harder to reason about.

Heuristic: if a domain field needs a doc comment saying "not persisted across save/load," it doesn't belong on the persisted type. The comment is the giveaway.

## How

- Per-object UI flag → app-state map keyed by object id, or a per-object UI record colocated with the relevant view/scene node.
- Per-viewport / per-window UI state → that viewport's local state.
- App-wide UI state → top-level session state.
- Domain records carry persistent state only.

## Exceptions

- Computed derived state (e.g. cached metric) — already understood not to persist; keep on the domain record if it's intrinsic to the type.
- Fields the user authored and DOES want persisted (e.g. user-chosen radius, color) — those ARE domain state.

Tier: ask first — the boundary call ("is this persistent or transient?") is sometimes genuinely ambiguous; surfacing it as a question keeps the line clear.
