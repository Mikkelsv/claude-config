# No Future-State Stubs

Don't pre-declare future extension points with `NotImplementedException`-style stubs (throwing switch arms, unused parameters, single-impl abstractions). Leave a comment describing the future shape; add the type/parameter when the implementation lands.

## Why

Stubs look like "leaving room to grow" but they force every consumer to thread dead parameters or pattern-match dead cases — even in tests. The stub's signature rarely fits the real implementation when it arrives, so it gets rewritten anyway. A comment preserves the design intent ("this mode exists in the spec", "audit §X notes the future case") without asking the type system to reserve space.

## How

**Instead of:**

```csharp
public enum LayeringStrategy { Proportional, TopConformable, BottomConformable }

public Layers Build(..., LayeringStrategy strategy) => strategy switch
{
    LayeringStrategy.Proportional      => BuildProportional(...),
    LayeringStrategy.TopConformable    => throw new NotImplementedException(),
    LayeringStrategy.BottomConformable => throw new NotImplementedException(),
    _ => throw new ArgumentOutOfRangeException(nameof(strategy)),
};
```

**Write:**

```csharp
// Future extension: alternative layering modes (top-conformable, bottom-conformable)
// exist in the spec but aren't wired in production (audit §B5).
// Add a LayeringStrategy enum + parameter when one is actually implemented.
internal sealed class MultiZoneBuilder
{
    public Layers Build(...) => BuildProportional(...);  // proportional only
}
```

Comment goes at the type/member where the extension would attach. Name the future shape, cite the source, signal "when implemented" (not "TODO for now").

## Exceptions

- Large codebase where adding the enum case later would force edits to dozens of sites — keeping it and defaulting unused cases is defensible. Rare.
- Third-party API contracts you don't own.
