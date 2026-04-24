# Fix the Root Cause

When a test fails or a bug lands, diagnose the root cause before patching. Don't adjust the test to match broken behavior, don't wrap the symptom in try/catch, don't special-case the failing input. Real workarounds get labeled and a follow-up.

## Why

Classic AI symptom-over-cause: Claude will edit a test assertion to make it green, add `?.` to paper over an invariant violation, or swallow an exception that was correctly surfacing a bug. Each "fix" compounds.

## How

- Test failing? First ask: *"Is the test right or the code right?"* Explain before editing either.
- `NullReferenceException`? Find out *why* it's null — don't sprinkle `?.`.
- Intermittent failure? Assume a real race until proven otherwise. Retry is not the first move.
- Real workaround? `// WORKAROUND: [thing] hits [bug]. Remove when [condition].` Open a follow-up via `/todo`.

## Exceptions

- Unfixable upstream (third-party bug, OS behavior) — workaround is legitimate with the comment and a linked issue.
