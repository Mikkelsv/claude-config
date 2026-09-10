---
paths:
  - "**/*.razor.css"
  - "**/*.css"
---

# Promote CSS-Isolation Duplicates to a Utility

When the same single-purpose CSS rule must be repeated verbatim across 2+ `.razor.css` files purely because Blazor's CSS isolation doesn't cross component boundaries, promote it to a utility class in the global stylesheet rather than duplicating the scoped rule.

## Why

A global stylesheet loads regardless of component boundaries, so it sidesteps isolation entirely. A verbatim duplicate drifts the moment one copy is tweaked and the other isn't — the same failure `cq-no-alias-functions-as-documentation` and ordinary duplication rules target, one layer down in the styling stack.

## How

Trigger: 2+ `.razor.css` files carrying byte-identical rules for the same class, usually with a comment admitting isolation forced the duplication. Extract it following the existing utility-class naming pattern and reference it from both components' markup.

**If the project documents its utilities as a closed set, update that doc in the same change** — its count, its table, and any superlative naming a specific class ("the one class that…"). A correct in-file CSS comment makes the change feel self-documenting, which is exactly why the doc gets skipped and then states something false.

Tier: always do.
