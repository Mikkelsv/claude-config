# Git workflow templates

Read by `/claude-sync` Step 2.1. Write the chosen one to `.claude/rules/git-workflow.md`.

## Template — Feature branches

```markdown
# Git Workflow: Feature Branches

This project uses feature branches with PR-based merging to main.

## How to apply

- `/implement` creates a new branch `implement/{plan-name}` before starting work.
- `/commit` pushes to the current feature branch — never directly to main.
- After implementation completes, the user opens a PR to merge into main.
- Use `/rebase-on-main` to keep feature branches current before merging.
```

## Template — Direct to main

```markdown
# Git Workflow: Direct to Main

Solo project — commits go directly to main, no branches.

## How to apply

- `/implement` does NOT create a branch. It works on main directly.
- `/commit` pushes to main without confirmation (it's already the working branch).
- Skip `/rebase-on-main` — there are no feature branches to rebase.
- Worktrees are still allowed for parallel work, but each writes back to main on merge.
```

## Template — Worktree per feature

```markdown
# Git Workflow: Worktree per Feature

This project uses git worktrees + feature branches for parallel development.

## How to apply

- `/implement` defaults to creating a worktree (with branch `implement/{plan-name}`).
- `/commit` pushes to the worktree's branch.
- After implementation completes, user opens a PR.
- `/rebase-on-main` cleans up the worktree after merge.
```
