# Repro Test First

Always write the test before the change: a bug fix starts with a test that reproduces the bug; a new feature starts with a test that specifies the new behavior. Watch it fail (red) for the right reason, then implement, then watch it go green — in the same change.

## Why

A fix without a repro test proves nothing — the symptom may be masked rather than fixed, and nothing stops it regressing. Writing the test first also forces picking a testable seam, which is where design problems surface earliest.

## How

- Reproduce at the lowest seam that exhibits the bug: pure domain and application logic over service-level tests, service-level over end-to-end browser tests. The cheapest seam that still shows the bug is the right one.
- Run the new test BEFORE implementing and confirm it fails with the failure mode the bug predicts — a test that already passes reproduces nothing.
- After the fix, the same test goes green with no test edits. If the test had to change to pass, record why (red-driven-edit provenance lives in `/verify`).
- New feature: same flow; red = "behavior not implemented yet".

## Exceptions

- Docs / config / comment-only changes.
- Pure visual or UX tweaks with no assertable seam — cover with a manual test-script entry instead.
