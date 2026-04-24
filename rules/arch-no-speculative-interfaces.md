# No Speculative Interfaces

Don't create an interface for a single-implementation class unless it's needed *now* for DI substitution or real polymorphism. Default: `internal sealed class Foo`, not `IFoo + Foo`.

## Why

Single-impl interfaces are overhead: two files per API change, extra indirection, no abstraction benefit. Claude generates them reflexively from training data. Pairs with `cq-no-future-state-stubs.md`.

## How

Add `IFoo` only when:

- A test needs substitution *now* and a real test double isn't practical (network, filesystem, time).
- A second implementation exists or is planned in this PR.
- The class crosses a module boundary with a specific reason to hide the implementation type.

Extracting an interface later is trivial. Waiting costs nothing.

## Exceptions

- Framework-mandated interfaces (`IHostedService`, `IMiddleware`, DI-resolved handlers).
- Published library APIs intended for future flexibility — comment *why*.
