# Prefer Records and Sealed Classes

Immutable data carriers (DTOs, commands, events, value objects) → `record` (or `record struct` for small value types). Mark every class `sealed` unless it's explicitly designed for inheritance.

## Why

`sealed` by default is the .NET team's own guidance — prevents accidental inheritance, enables devirtualization, and changes what Claude proposes (no more reflex virtual/override hierarchies). `record` eliminates equality/hashing/`ToString`/with-expression boilerplate.

## How

- DTO / command / event / VO → `public sealed record Foo(int X, string Y);`
- Small value type → `public readonly record struct Foo(int X, int Y);`
- Regular service class → `internal sealed class FooService`.
- Inheritance-intended base → unsealed with a comment naming the extension point.

## Exceptions

- Frameworks requiring unsealed classes (serialization, some ORM bases, older `Controller`).
- EF entities — records work, but init-only props can fight materialization in some configs.
