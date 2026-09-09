# Verify Premises Before Acting

Before acting on a claimed premise — a plan's bug, an audit finding, an assumed-missing framework feature — verify it against the current code, the target's own docs, or the framework default. Premises drift; act on reality, not the claim.

## Why

Claude acts on stated premises without re-checking them, then builds machinery for a non-problem. Premises rot three predictable ways: a multi-phase plan claims a bug a later merge already fixed; an audit/hunt flags a "smell" the target's own doc comment justifies as a deliberate optimization; a requested config "enables" a feature the SDK already defaults on. Each wastes effort and can revert a considered decision.

## How

- **Plan bug-fix phase** — grep the cited files/lines for the symptom + its guards before writing fix tasks. If it no longer reproduces, demote the phase to its real (refactor/consolidation) justification or cut it.
- **Audit/hunt finding** — read the target's doc comment + nearby rationale first. If it documents the current shape as a deliberate choice (perf, correctness, a rejected alternative), skip the finding or find a fix that preserves the documented property.
- **New enabling config** — probe the effective value first (e.g. `dotnet msbuild -getProperty:X`, or check a project that doesn't set it). If it's already the desired default, don't add the config; note the finding instead.
- **A filename you are about to cite** — `Glob` or `ls` it first, especially before repeating it. A recalled `plans/*.md` or `docs/*.md` name that no longer exists propagates into comments and briefs as an authoritative-looking dead pointer.
- **A claim you are about to relay into someone else's brief** — grep the file-specific part before passing it on. Acting on an unverified premise costs you one wasted step; *propagating* it hands a sub-agent a false starting point it has no reason to question.
- **"Already shipped" in a handoff** — grep for the feature's signature symbol before building on it. A handoff reconstructed from indirect evidence (a plan marked done, a commit subject) can assert a state the code doesn't hold.
- **"It's just flaky / the environment"** — that is a hypothesis, not an explanation. Eliminate the variable and re-measure before accepting it. Don't run a build fan-out concurrently with a perf gate and then blame the machine for the numbers.

Pairs with `wf-question-the-scope` and `wf-fix-root-cause`. Tier: always do.
