---
paths:
  - "**/*.razor"
  - "**/*.razor.cs"
---

# High-Frequency EventCallback Re-Renders Its Owner — Watch the Render Path

A Blazor `EventCallback` invocation **auto-triggers `StateHasChanged` on the component that supplied it**. So a high-frequency callback — slider `OnInput`, drag, wheel, even coalesced to ~60 Hz — re-renders its owner every tick. If that component's render reads an **unmemoized O(scene) projection**, the per-tick re-render becomes a projection storm that saturates the WASM thread and freezes the UI.

## Why

The trap is that the cost sits in the *render path*, not the dispatch. Throttling the dispatch changes nothing, and neither does moving the expensive projection inside the handler — the EventCallback re-renders the owner regardless, and the render reads the projection again. A component reading such a projection several times per render multiplies it further.

## How

- If the visual result updates outside Blazor anyway (GPU, canvas, WebGL), suppress the component's re-render for the duration of the gesture — `ShouldRender() => !_isDragging` — and let the non-Blazor path repaint live. Re-enable on gesture end.
- Better long-term: **memoize the projection** by reference equality, so any render reading it is cheap. The `ShouldRender` guard then becomes belt-and-braces rather than the fix.
- Never read an unmemoized O(scene) projection from a render path that fires per tick.

## Exceptions

- Low-frequency callbacks (a button click) — the per-render projection cost is irrelevant.

Tier: always do — when wiring a continuous or high-frequency `EventCallback`.
