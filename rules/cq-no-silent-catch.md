# No Silent Catch

Don't catch exceptions only to swallow them, log-and-continue, or return a default. Let them propagate. If you must catch, rethrow with `throw;` or wrap with `throw new ...(ex)` adding context.

## Why

Defensive try/catch is the top AI antipattern for hiding root causes. Claude adds it reflexively on uncertain code paths, turning real bugs into silent data loss.

## How

- No empty catch. No bare `catch (Exception)` without a comment justifying it.
- Log-and-continue needs a reason in the comment (e.g. `// best-effort telemetry`).
- Expected failures → `Result<T>`, not try/catch. See `cq-result-over-exceptions-for-expected-failures.md`.

## Exceptions

- Top-level error boundaries (ASP.NET middleware, Hangfire wrappers, Unity root handlers, `BackgroundService` loops).
- `catch when (...)` filters that narrow scope legitimately.
