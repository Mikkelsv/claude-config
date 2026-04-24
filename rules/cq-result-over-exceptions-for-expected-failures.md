# Result Over Exceptions for Expected Failures

Exceptions are for *unexpected* failures. For expected failure modes — validation, not-found, domain rule violations — return `Result<T>` / a discriminated union. Don't use try/catch as control flow.

## Why

Throwing for expected outcomes is slow, loses type info at the caller, and scatters error-handling logic. `Result<T, Error>` puts the failure in the signature so callers can't forget it. Claude defaults to throwing because training data does.

## How

- **Unexpected** (bug, infra failure): throw. E.g. DB unreachable, `ArgumentNullException` for required-missing, unexpected HTTP status.
- **Expected** (caller wants to handle): `Result<T>`. E.g. `UserNotFound`, `InvalidEmailFormat`, `InsufficientFunds`.
- Pick one Result type per project (FluentResults / OneOf / ErrorOr / hand-rolled). Don't mix.

## Exceptions

- Framework boundaries requiring thrown exceptions (ASP.NET model validation, MediatR behaviors) — throw at the edge, keep the domain Result-based.
