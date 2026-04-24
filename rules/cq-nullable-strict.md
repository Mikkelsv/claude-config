# Nullable Reference Types, Strict

Treat NRT warnings as errors. Don't use `!` (null-forgiving) without a comment explaining the invariant. Don't widen a parameter to `T?` just to dodge a warning — fix the caller.

## Why

NRT is the biggest modern-C# safety win, but only if warnings fail the build. Claude's default is to sprinkle `!` and `?` until the compiler is quiet, converting real bugs into silent nulls.

## How

- `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` or at least `<WarningsAsErrors>Nullable</WarningsAsErrors>`.
- `!` needs a comment: `result!.Data  // EF include guarantees Data loaded here`.
- Required parameter → non-nullable, validate at entry.
- Generic `T?` for reference types needs `where T : class` or `where T : notnull`.

## Exceptions

- Un-annotated third-party APIs — confine `?` to the boundary; don't leak into domain code.
