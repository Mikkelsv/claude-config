---
name: rebase-on-main
description: Rebase current branch on main with conflict resolution, build verification, and optional merge
---

# Rebase on Main

Execute every step in order. Stop and report on unexpected failure.

Scripts: `$HOME/.claude/skills/rebase-on-main/scripts`

## Phase 1: Rebase

Run: `powershell.exe -NoProfile -File "$HOME/.claude/skills/rebase-on-main/scripts/git-rebase-onto.ps1"`

Handle `status`:
- **worktree** → `ExitWorktree` (keep), `git checkout <branch>`, re-run script.
- **error** → report `reason`, stop.
- **dirty** → list files, ask via `AskUserQuestion`: **Retry** / **Cancel**.
- **up-to-date** → skip to Phase 2.
- **success** → Phase 2.
- **conflicts** → resolve (see below).

### Conflict Resolution

Main is the foundation — start from main's version, apply feature's intent on top.

**Generated files** (e.g., `wwwroot/app.tailwind.css`): `git checkout --theirs <file>`, stage, move on. Build will regenerate.

For source conflicts: read both sides, resolve favoring main's structure + feature's changes, stage, `git rebase --continue`. Repeat for subsequent commits. Bail after 3 failed attempts on one commit (`git rebase --skip`). Full bail if unrecoverable (`git rebase --abort`).

## Phase 2: Merge Prompt

`AskUserQuestion` with options:
- **Merge** → build via `/build` (one fix attempt if it fails), then run `powershell.exe -NoProfile -File "$HOME/.claude/skills/rebase-on-main/scripts/git-merge-cleanup.ps1" -Branch "<branch>"`. Report result (merged, pushed, branch deleted, worktree cleaned).
- **Push branch** → `git push --force-with-lease`. Report result. Loop back.
- **Build & test** → run `/build`. Loop back.
- **Done** → report "Rebase complete. Branch left as-is."
- **Revert** → `git reset --hard ORIG_HEAD`. Report "Rebase reverted."

## Summary

Report: branch name, commits rebased, conflict count (detail medium/high, count low in one line), build status.
