# Browser Tab Throttling

Chrome severely throttles background tabs:

- `setTimeout`/`setInterval` clamped to minimum 1s intervals
- WASM CPU budgets significantly reduced
- `requestAnimationFrame` paused entirely

## Impact on tests

If the preview tab is not in the foreground during loading, expect 3-5x slower load times and unreliable perf numbers. Poll intervals get clamped to 1s+, and computational work barely runs.

## Detection

If `ready.loadMs > 15000` on a warm start, the tab was likely backgrounded. Warn the user:

> "Load times appear elevated — the preview tab may have been in the background. Bring the preview tab to the foreground and re-run for accurate results."
