---
name: commit
description: Stage all changes with a bracket-tagged message ([FEAT]/[FIX]/[REFAC]/[DOCS] or a custom feature tag for bigger changes), optionally amend, and push
---

# Commit

Stage, commit, and push. Overrides `no-commit` rule when invoked.

## Message format

`[TAG] Imperative message.` with optional body for multi-file changes.

**Standard tags:** `FEAT` (new features), `FIX` (fixes/minor improvements), `REFAC` (renaming, moving, cleanup), `DOCS` (docs/Claude setup).

**Custom tags (PascalCase feature names):** for bigger changes that belong to a specific feature area, use the feature name instead of `FEAT`. Examples: `[GridCreation]`, `[WebXr]`, `[AuthFlow]`. One tag per commit — either standard or custom.

## Tag selection

Parse `$ARGUMENTS`:

- Starts with `[...]` → respect as-is; rest = message hint.
- Single PascalCase word (no spaces, e.g. `GridCreation`) → treat as custom tag; Claude drafts the message from the diff.
- Longer text → treat as message hint; Claude picks the tag per below.

When Claude picks the tag:

- **Small/moderate** change (≲ 100 lines or < 5 files, or diffuse/routine work) → standard tag. No confirmation.
- **Big coherent change** (≳ 100 lines AND ≥ ~5 files clustered around one feature area) → propose a custom tag via `AskUserQuestion`:
  - **Use `[<Proposed>]`** (Recommended)
  - **Use `[FEAT]`**
  - **Edit** (free-text override)

  Wait for the answer before committing.
- **Big but scattered** change (no coherent feature) → best-fit standard tag, no confirm.

## Steps

1. Run `~/.claude/scripts/git-preflight.ps1`. Stop if no changes.
2. Read the diff (`git diff` + `git diff --cached`) to pick tag and write the message.
3. **Branch check** — read `.claude/rules/git-workflow.md` if it exists.
   - **Feature branches** + on `main`: stop and ask the user to switch or confirm.
   - **Direct to main**: proceed silently regardless of branch.
   - No rule file: feature-branch default (warn if on main).
4. If changes are very small (≤5 lines, ≤2 files), ask via `AskUserQuestion`: **Amend last commit** vs **New commit**. Skip for larger changes.
5. **Stage, commit, push** directly:
   - `git add .`
   - `git commit -m "[TAG] msg"` (HEREDOC for multi-line). Add `--amend` if amending.
   - `git push` (or `git push --force-with-lease` if amending).
6. Report the commit hash. If push failed, tell the user.

## Rules

- No Co-Authored-By — use the user's git auth only.
- Do not confirm standard tags — commit and push immediately.
- Custom-tag **proposals** confirm via `AskUserQuestion`. User-supplied tags (in `$ARGUMENTS`) do not.
- Always push. Amend uses `--force-with-lease`, never `--force`.
- Imperative mood: "Add user auth" not "Added user auth".
- **No plan references in commit messages.** Never include task IDs, phase labels, or plan names (e.g. `A1 —`, `Task 3:`). Bad: `[FEAT] A1 — Add user auth`. Good: `[FEAT] Add user auth`.
