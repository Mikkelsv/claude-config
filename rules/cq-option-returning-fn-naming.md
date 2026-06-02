# Option-Returning Function Naming (F#)

F# functions or members that return `option` MUST be named with the `try` prefix — `tryGetX`, `tryFindX`, `tryParseX`. Never `getX` / `findX` / `parseX` for option-returning helpers.

## Why

`get` implies totality — if the call succeeds, you have a value. A `getX : ... -> 'a option` shape contradicts the prefix; readers reasonably assume the result is a value, not a search result. Callers then forget to pattern-match the `None` arm, or write awkward `(getX ...).Value` shortcuts that crash on the silent path.

## How

- New helpers returning `option`: name `tryX`.
- Refactoring a total `getX` to return `option`: rename to `tryGetX` in the same change, fix call sites. Don't leave the old name as an alias — that re-creates the ambiguity.
- Total helpers (always succeed) keep `getX` / `findX` — the convention only applies to option-returning shapes.

## Exceptions

- Framework conventions: overriding/implementing an interface whose member is named `Get*`. (F# stdlib already follows the rule — `Map.tryFind`, `List.tryHead`, `Option.tryPick`.)
- Property accessors on classes (`Length`, `Count`) — properties don't carry the prefix.

Tier: always do.
