# Fallthrough Guards on Every Branch

When a routing function branches on a validated input range (`if idx in 3..6 then ... else ...`), the `else` branch must also assert its expected sub-range — not silently inherit behavior from the pre-existing path. A `fail`-loudly + comment-justified arm is preferable to an open-ended catch-all.

## Why

Open-ended `else` branches silently absorb inputs the author didn't intend. Common pattern: a routing function originally split as `if cond then A, else B`, then someone tightens `cond`'s range. The `else` now absorbs inputs that should have been a new third path — but the routing function happily routes them to B, masking a real bug.

The pattern repeats anywhere a function gates on "expected range" of a discrete input — handle indices, axis enums encoded as ints, version tags, message-kind codes. The fix is the same: every branch asserts its own sub-range; the routing function trusts callers but verifies its own gates.

## How

```csharp
// Bad — `else` silently absorbs idx >= 7
if (idx >= 3 && idx <= 6) RouteNew(idx);
else                       RouteLegacy(idx);

// Good — both branches narrow + throw on outside
if      (idx >= 3 && idx <= 6) RouteNew(idx);
else if (idx >= 0 && idx <= 2) RouteLegacy(idx);
else throw new ArgumentOutOfRangeException(nameof(idx), $"outside 0..6: {idx}");
```

For discriminated-union / sum-type matches the compiler enforces exhaustiveness already (F# `match`, Rust `match`, TypeScript `switch (true)` with `never`). The rule applies to integer / string / bool gates where the compiler doesn't enforce coverage.

## Exceptions

- Mature public API surfaces with documented fallback semantics — the open `else` IS the contract. Comment the why.
- Performance-critical hot paths where the assert cost is measurable. Rare.

Tier: always do.
