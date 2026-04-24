# No Future-State Stubs

Don't pre-declare future extension points with `NotImplementedException`-style stubs. When the code path isn't implemented, leave a module-level comment describing what the future extension looks like, then add the type/parameter when the implementation actually lands.

## Why

Stub DU cases, throwing switch branches, or unused parameters look like "leaving room to grow," but they cost more than they help:

- Every consumer has to thread the dead parameter or handle the dead case — even in tests.
- Exhaustiveness checks force everyone downstream to pattern-match a branch that will never execute in production.
- The stub encodes a speculative API shape; when the real implementation arrives, the stub's signature rarely fits and gets rewritten anyway.
- The intent (why this extension is noted) ends up as a `NotImplementedException` message that's hard to search.

A comment is cheaper. It preserves the design intent — "this mode exists in the spec", "audit §X notes the future case" — without asking the type system to reserve space for it.

## How to apply

**Instead of:**

```fsharp
type LayeringStrategy = Proportional | TopConformable | BottomConformable

let build ... (strategy: LayeringStrategy) ... =
    match strategy with
    | Proportional -> ()
    | TopConformable -> raise (NotImplementedException "…")
    | BottomConformable -> raise (NotImplementedException "…")
    ...
```

**Write:**

```fsharp
/// Future extension: alternative layering modes (top-conformable, bottom-conformable)
/// exist in the spec but aren't wired in production (audit §B5).
/// Add a `LayeringStrategy` DU + parameter when one is actually implemented.
module MultiZoneBuilder =
    let build ... = ...  // proportional only
```

The comment goes at the module (or function) level where the extension would attach. It names the future shape (DU + param), cites the source of the idea (spec, audit, design note), and says "when it's actually implemented" to signal this isn't a TODO for now.

## When it fires

- A DU case that only throws.
- A parameter that only has one real value.
- An abstract method / interface with one concrete impl and an "add more later" note.
- A feature flag that nothing flips.

## Exceptions

- **Breaking exhaustive pattern matches across a large codebase**: if the DU is imported everywhere and adding a case later would force edits to dozens of sites, keeping the DU and defaulting unused cases is defensible. Rare.
- **Third-party API contracts**: if the signature is dictated by an interface you don't own, the shape isn't yours to prune.
