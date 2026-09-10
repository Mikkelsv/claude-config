# A Build-Error List Is a Frontier, Not a Work List

During a compiler-driven sweep (a type change, a rename, a signature migration), a shrinking error list measures *progress through the frontier*, not remaining scope. Only a solution-wide zero-error build proves the sweep is complete.

## Why

The build stops descending when an upstream project fails, so every downstream project's errors are hidden — including projects with zero current errors that will acquire them once the upstream compiles. "Down to 12 errors" can mean the sweep is nearly done, or that eight unbuilt projects are queued behind one broken file. The list cannot distinguish those, and it always reads like the former.

Same shape as `wf-blanket-rename-safety`'s "build green != verified": here it is "build *red and shrinking* != scope known."

## How

Fix the frontier, rebuild, and expect the error count to *rise* when a blocking project starts compiling — that is the sweep working, not regressing. Report scope only from a full-solution build; until then say "frontier at N errors, scope unknown" rather than quoting a remaining-work number. Don't estimate completion from the trend.

Tier: always do — during any multi-project compiler-driven sweep.
