# No Alias Functions as Documentation

When a function only delegates to another with identical semantics for "caller-intent clarity," prefer a doc comment (or a comment at the call site) over a named alias.

## Why

An alias with no behavioral distinction adds a false-interface surface, needs an identity test to prove it does nothing, and rots the moment the two callers actually want different behavior. The intent signal it is meant to carry belongs in a comment, not a second name.

## How

Trigger: a one-line function body that is a passthrough to another function with the same argument list. Action: inline the call site; if several callers benefit from the intent signal, add a comment at each. Re-introduce a real function only if the behaviour actually diverges.
