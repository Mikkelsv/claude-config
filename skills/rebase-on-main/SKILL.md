---
name: rebase-on-main
description: Rebase current branch on main with conflict resolution, build verification, and optional merge/fast-forward/squash
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

### Track critical events

Note whether any of these occur during Phase 1 — they drive Phase 2's presentation:

- Source conflicts required manual resolution (user should verify semantics).
- Generated files resolved with `--theirs` (build must regenerate correctly).
- A commit was skipped (`git rebase --skip` used — work dropped).

## Phase 2: Merge Prompt

Five actions, identical regardless of how they're presented:

- **Merge** — `/build` (one fix attempt on failure), then `git-merge-cleanup.ps1 -Branch <branch> -Mode merge` (PR-style `--no-ff` merge commit).
- **Fast-forward** — `/build`, then `... -Mode ff` (no merge commit).
- **Squash** — `/build`, then `... -Mode squash` (single commit on main).
- **Build & test** — run `/build`, loop back to the prompt.
- **Cancel** — report "Rebase complete, not merged. Branch left as-is." Do NOT revert; the user can `git reset --hard ORIG_HEAD` if they want.

If build fails after the one fix attempt, report and loop back.

### Prompt presentation

**Default (no critical events):** `AskUserQuestion` with the five options above.

**Critical event flagged:** emit a plain-text warning first — the prompt overlay would cover it. Per `prefer-clickable-prompts.md` (exception: after long text output), use a plain numbered list:

```
Rebase completed with items worth verifying:

- <each critical event, one line of context>

Inspect before merging: git log --oneline main..<branch> and git diff main..<branch>.

(1) Merge  (2) Fast-forward  (3) Squash  (4) Build & test  (5) Cancel
```

Map the numeric reply to the same actions. Loop until a terminal choice (merge or cancel).

## Summary

Report: branch name, commits rebased, conflict count, build status, merge mode used (if merged), worktree cleanup status.
