# CLAUDE.md Is an Index

Keep a project's `CLAUDE.md` an orientation index: it says **where** a thing lives and **what** it is called, while `docs/<area>.md` says **how** it works. Architecture, rationale, and cross-cutting invariants go in `docs/`; `CLAUDE.md` keeps the pointer.

## How

- **One area per file in `docs/`**, named after the area — `docs/database.md`, `docs/media-storage.md`. Project root, not nested under a config directory.
- **An index entry is one line**: what the thing is, where it lives, which doc explains it. A `CLAUDE.md` section needing a second paragraph to make sense belongs in `docs/`.
- **`##` headings in `docs/` are stable.** Code comments cite `docs/<file>.md "<section>"` per `arch-docs-over-inline`, so renaming a heading silently breaks every citation aimed at it. Rename only with a grep for the old heading.
- Build commands, project layout, and conventions stay in `CLAUDE.md` — those answer *where* and *what*.

## Retirement

A doc describing code that no longer exists gets retired or folded into its successor, in the same change that removes the code. `cq-comments-track-code` covers the comment half of this; `docs/` is the other half. A stale doc is worse than a missing one, because it reads as current.

## Why

`CLAUDE.md` loads in full, every session. `docs/` is fetched on demand. Prose that matters only when you touch one area is otherwise charged to every session that never goes near it.

Tier: always do.
