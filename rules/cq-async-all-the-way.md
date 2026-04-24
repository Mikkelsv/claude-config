# Async All The Way

Once any method in a call chain is `async`, make every caller async too. Never bridge sync→async with `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`, or `Task.Run(...).Result`.

## Why

Sync-over-async deadlocks under a sync context (classic ASP.NET, WPF, Unity main thread) and starves the thread pool without one. Symptoms appear under load. Half-converted chains during refactoring are the usual cause.

## Exceptions

- Forced boundaries without async support (legacy `Main`, COM interop). Isolate the bridge in one place, comment why.
- Fire-and-forget: `_ = FooAsync();` with an observed-failure helper. Never `async void`.
