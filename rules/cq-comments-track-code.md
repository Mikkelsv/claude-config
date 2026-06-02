# Comments Track Code

When code changes, update or delete every comment describing the old contract — in the same commit. A stale comment is worse than none: it describes a contract that no longer exists and misleads the next reader into "fixing" the code back to match it.

## Always do

- **Behavior / throttle / bypass changes** — search the file, the rule files, and `CLAUDE.md` for the old verbs ("bypasses X", "pointer-up only", "interim — Stage N retires") and reconcile every match.
- **Migration shipped** — delete "interim — Stage N retires this" notes and references to deleted fields the moment Stage N lands. Until then the note is a load-bearing TODO.
- **Doc claims about side-effect properties** (rendering props, transactional flags, async-cancellation behavior, retry counts) — the body must set what the doc claims. Grep the body for each property named in the comment; set it or drop the claim.
- **Documented architecture entries** — when a handler / command / endpoint's behavior changes, update the architecture doc entry that names it (`docs/<area>.md`, design-decisions, etc.).

## Exceptions

- Pure refactors (rename, extract) that preserve behavior don't need a doc touch.
