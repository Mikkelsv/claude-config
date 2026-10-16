# Verify Premises Before Acting

Before acting on a claimed premise — a plan's bug, an audit finding, an assumed-missing framework feature — verify it against the current code, the target's own docs, or the framework default. Premises drift; act on reality, not the claim.

## Why

Claude acts on stated premises without re-checking them, then builds machinery for a non-problem — or reverts a considered decision.

## How

- **Plan bug-fix phase** — grep the cited files/lines for the symptom + its guards before writing fix tasks. Not reproducing → demote the phase to its real justification or cut it.
- **Audit/hunt finding** — read the target's doc comment + nearby rationale first. Documented as deliberate → skip, or preserve the documented property.
- **New enabling config** — probe the effective value first (e.g. `dotnet msbuild -getProperty:X`). Already the default → don't add it; note the finding.
- **A filename you are about to cite** — `Glob` or `ls` it first.
- **A claim you are about to relay into someone else's brief** — grep the file-specific part before passing it on.
- **"Already shipped" in a handoff** — grep for the feature's signature symbol before building on it.
- **"It's just flaky / the environment"** — that is a hypothesis, not an explanation. Eliminate the variable and re-measure before accepting it.

Pairs with `wf-question-the-scope` and `wf-fix-root-cause`. Tier: always do.
