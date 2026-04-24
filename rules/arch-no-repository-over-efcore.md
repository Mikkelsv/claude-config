# No Repository Over EF Core

Don't wrap EF Core `DbContext` in `IRepository<T>` / `IUnitOfWork`. `DbSet<T>` is a repository, `SaveChangesAsync` is the UoW commit, `IQueryable<T>` lets callers compose queries. Inject the context directly.

## Why

Pass-through repository interfaces come from Claude's pre-EF-Core training data (when `ObjectContext` was awkward). In EF Core they add zero behavior, strip away query composition, and force every new query to touch multiple files.

## How

- New project: inject `MyDbContext`, use LINQ directly.
- Real boundary needed (testing, caching, bounded context)? Write a **specific** interface (`IUserQueries`, `IOrderRepository` with aggregate invariants) — not a generic one.

## Exceptions

- DDD aggregate repositories that enforce invariants and hide the persistence model.
- Tests: in-memory `DbContext` or SQLite usually beats mocking `IRepository`.
