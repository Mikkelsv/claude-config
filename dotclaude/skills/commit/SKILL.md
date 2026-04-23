---
name: commit
description: Commit all changes with a typed message (FEAT/FIX/REFAC/DOCS), optionally amend small changes, and push
---

# Commit

Stage, commit, and push. Overrides `no-commit` rule when invoked.

## Message format

`TYPE: Imperative message.` with optional body for multi-file changes.

Types: **FEAT** (new features), **FIX** (fixes/minor improvements), **REFAC** (renaming, moving, cleanup), **DOCS** (docs/Claude setup).

## Steps

1. Run `~/.claude/scripts/git-preflight.ps1`. Stop if no changes.
2. Read the diff (`git diff` + `git diff --cached`) to pick TYPE and write the message.
3. **Branch check** — read `.claude/rules/git-workflow.md` if it exists.
   - **Feature branches workflow** + on `main`: stop and ask the user to switch to a branch first (or confirm they really want to commit to main).
   - **Direct to main workflow**: proceed silently regardless of branch.
   - No rule file: behave as feature-branch (safer default — warn if on main).
4. If changes are very small (≤5 lines, ≤2 files), ask via `AskUserQuestion`: **Amend last commit** vs **New commit**. Skip for larger changes.
5. **Stage, commit, push** — run these git commands directly:
   - `git add .`
   - `git commit -m "TYPE: msg"` (use HEREDOC for multi-line). Add `--amend` if amending.
   - `git push` (or `git push --force-with-lease` if amending)
6. Report the commit hash. If push failed, tell the user.

`$ARGUMENTS` = hint for the message. Determine TYPE automatically; respect it if the hint already includes a valid prefix.

## Rules

- No Co-Authored-By — use the user's git auth only
- Do not confirm — commit and push immediately
- Always push. Amend uses `--force-with-lease`, never `--force`
- Imperative mood: "Add user auth" not "Added user auth"
- **No plan references in commit messages.** Never include task IDs, phase labels, or plan names (e.g., "A1 —", "Task 3:", "Phase 2:"). The message describes what the code does, not which plan item it came from. Bad: `FEAT: A1 — Add user auth`. Good: `FEAT: Add user auth`.
