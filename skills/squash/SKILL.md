---
name: squash
description: Squash commits on the current branch since divergence (default main, or a custom base) into a single commit, using /commit's bracket tag format and a synthesized message
---

# Squash Branch Commits

**Execute mechanically.** Follow the steps; no need to weigh alternatives or deliberate.

Collapse every commit ahead of a base ref into one. Format and tag selection mirror `/commit`.

Scripts: `$HOME/.claude/skills/squash/scripts`

## Modes

- **Interactive (default)**: invoked by user; runs steps 1–5 with confirmation. Base = `main`.
- **Automated**: invoked by another skill (e.g., `/implement` for per-phase squash). `$ARGUMENTS` carries `base=<sha>` and `message=<text>`. Skips confirmation, executes directly.

Argument format when called by another skill:

```text
base=<commit-sha-or-ref>
message=<single-line subject; for multi-line, use \n separator>
push=true
```

## Steps

1. **Parse arguments**. If `$ARGUMENTS` contains `base=...` and `message=...`, enter automated mode → skip to step 5 with those values. Otherwise interactive.
2. **Inventory** — `git-squash-inventory.ps1 -Base <base-or-main>`. Handle `status`:
   - `on-main` / `detached` / `dirty` / `none` / `single` → report the reason and stop. (`single` → suggest `/commit` amend.)
   - `ok` → continue with `commitCount`, `subjects`, `log`, `stat`.
3. **Pick tag** — apply `/commit`'s tag-selection rules verbatim (`$ARGUMENTS` → respect; big coherent change → propose custom via `AskUserQuestion`; else standard).
4. **Draft message** — one imperative subject describing the *result* (not a concatenation). Body optional: `Squashed from N commits:` + bullet list of original subjects, only when worth preserving.
5. **Confirm** (interactive only) via `AskUserQuestion`: **Squash & push** (Recommended) / **Squash, don't push** / **Cancel**. In automated mode, push is determined by the `push=true|false` arg (default true).
6. **Execute** — `git-squash-execute.ps1 -Base <base> -Message "<full message>"` (add `-Push` if pushing). Use a bash heredoc + command substitution for multi-line messages, mirroring `/commit`. Report `commit` and `pushed` from the JSON result.

## Rules

- Never run on `main` when squashing onto `main` (inventory enforces this; non-main bases are fine).
- Never use `git rebase -i` — interactive editor not supported.
- Always `--force-with-lease`, never `--force`.
