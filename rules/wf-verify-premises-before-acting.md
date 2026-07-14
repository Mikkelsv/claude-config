# Verify Premises Before Acting

Before acting on a claimed premise — a plan's bug, an audit finding, an assumed-missing framework feature — verify it against the current code, the target's own docs, or the framework default. Premises drift; act on reality, not the claim.

## Why

Claude acts on stated premises without re-checking them, then builds machinery for a non-problem. Premises rot three predictable ways: a multi-phase plan claims a bug a later merge already fixed; an audit/hunt flags a "smell" the target's own doc comment justifies as a deliberate optimization; a requested config "enables" a feature the SDK already defaults on. Each wastes effort and can revert a considered decision.

## How

- **Plan bug-fix phase** — grep the cited files/lines for the symptom + its guards before writing fix tasks. If it no longer reproduces, demote the phase to its real (refactor/consolidation) justification or cut it.
- **Audit/hunt finding** — read the target's doc comment + nearby rationale first. If it documents the current shape as a deliberate choice (perf, correctness, a rejected alternative), skip the finding or find a fix that preserves the documented property.
- **New enabling config** — probe the effective value first (e.g. `dotnet msbuild -getProperty:X`, or check a project that doesn't set it). If it's already the desired default, don't add the config; note the finding instead.

Pairs with `wf-question-the-scope` and `wf-fix-root-cause`. Tier: always do.
