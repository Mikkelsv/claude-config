# Flow Cancellation Tokens

Every async method doing I/O, calling another cancellable async method, or running a long loop must accept `CancellationToken` and pass it through. Don't default to `CancellationToken.None` except at framework entry points.

## Why

Cancellation is a chain — any dropped link silently breaks timeouts, shutdown, and ASP.NET request-aborted propagation above it. Claude routinely omits the parameter on new methods.

## How

- Signature: `async Task<T> Foo(..., CancellationToken cancellationToken)`. Last parameter, no default on internal APIs.
- Pass to every async call inside. `ThrowIfCancellationRequested()` at the top of long loops.
- Public library surface may use `= default` for ergonomics.
