---
paths:
  - "**/*.js"
---

# JS Setup Listener Idempotent

A JS setup function that adds DOM event listeners must be idempotent or caller-guarded. Callers may invoke it on every state-update cycle, accumulating N listener copies over N cycles.

## Why

`addEventListener` does not deduplicate — only passing the same function reference with `{ once: true }` avoids a second registration. A setup function called per state cycle silently multiplies handlers: N state updates give N move listeners, N dispatches per pointer event, and stacked in-flight invocations that defeat any backpressure gate. Nothing errors; the app just gets progressively slower.

## How

Either guard inside the setup function (`if (el._setupDone) return;`) or track the flag on the caller and gate before crossing into JS. Either is fine — the requirement is **one registration per mount, reset on dispose**.

Tier: always do.
