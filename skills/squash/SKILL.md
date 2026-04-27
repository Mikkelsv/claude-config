---
name: squash
description: Squash all commits on the current branch since it diverged from main into a single commit, using /commit's bracket tag format and a synthesized message
---

# Squash Branch Commits

Collapse every commit ahead of `main` into one. Format and tag selection mirror `/commit`.

Scripts: `$HOME/.claude/skills/squash/scripts`

## Steps

1. **Inventory** — `git-squash-inventory.ps1`. Handle `status`:
   - `on-main` / `detached` / `dirty` / `none` / `single` → report the reason and stop. (`single` → suggest `/commit` amend.)
   - `ok` → continue with `commitCount`, `subjects`, `log`, `stat`.
2. **Pick tag** — apply `/commit`'s tag-selection rules verbatim (`$ARGUMENTS` → respect; big coherent change → propose custom via `AskUserQuestion`; else standard).
3. **Draft message** — one imperative subject describing the *result* (not a concatenation). Body optional: `Squashed from N commits:` + bullet list of original subjects, only when worth preserving.
4. **Confirm** via `AskUserQuestion`: **Squash & push** (Recommended) / **Squash, don't push** / **Cancel**.
5. **Execute** — `git-squash-execute.ps1 -Message "<full message>"` (add `-Push` for Squash & push). Use a bash heredoc + command substitution for multi-line messages, mirroring `/commit`. Report `commit` and `pushed` from the JSON result.

## Rules

- Never run on `main`. Hard stop (inventory enforces this).
- Never use `git rebase -i` — interactive editor not supported.
- Always `--force-with-lease`, never `--force`.
