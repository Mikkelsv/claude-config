# No Future-State Stubs

Don't pre-declare future extension points with `NotImplementedException`-style stubs (throwing DU cases, unused parameters, single-impl abstractions). Leave a module-level comment describing the future shape; add the type/parameter when the implementation lands.

## Why

Stubs look like "leaving room to grow" but they force every consumer to thread dead parameters or pattern-match dead cases — even in tests. The stub's signature rarely fits the real implementation when it arrives, so it gets rewritten anyway. A comment preserves the design intent ("this mode exists in the spec", "audit §X notes the future case") without asking the type system to reserve space.

## How

**Instead of:**

```fsharp
type LayeringStrategy = Proportional | TopConformable | BottomConformable

let build ... (strategy: LayeringStrategy) ... =
    match strategy with
    | Proportional -> ()
    | TopConformable -> raise (NotImplementedException "…")
    | BottomConformable -> raise (NotImplementedException "…")
```

**Write:**

```fsharp
/// Future extension: alternative layering modes (top-conformable, bottom-conformable)
/// exist in the spec but aren't wired in production (audit §B5).
/// Add a `LayeringStrategy` DU + parameter when one is actually implemented.
module MultiZoneBuilder =
    let build ... = ...  // proportional only
```

Comment goes at the module/function where the extension would attach. Name the future shape, cite the source, signal "when implemented" (not "TODO for now").

## Exceptions

- Large codebase where adding the DU case later would force edits to dozens of sites — keeping the DU and defaulting unused cases is defensible. Rare.
- Third-party API contracts you don't own.
