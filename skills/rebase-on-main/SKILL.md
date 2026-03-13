---
name: rebase-on-main
description: Rebase current branch on main with conflict resolution, build verification, and optional merge
---

# Rebase Current Branch on Main

**Execute every step below in order. No step may be skipped.** Stop and report to the user if any step fails unexpectedly.

Skill scripts: `${CLAUDE_SKILL_DIR}/scripts`

---

## Phase 1: Rebase

Run the rebase script (includes preflight checks):

```bash
powershell.exe -NoProfile -File "${CLAUDE_SKILL_DIR}/scripts/git-rebase-onto.ps1"
```

Returns JSON with `status`:

- **"worktree"** → `cd` into `mainRepoRoot`, `git checkout <branch>`, inform user, then **re-run this script**.
- **"error"** → Report the `reason`. Stop.
- **"dirty"** → List the dirty files and tell the user to commit or stash them. Then use `AskUserQuestion` with two options:
  - **Continue** — Re-run this script from the top.
  - **Cancel** — Stop entirely.
- **"up-to-date"** → Inform user, skip to Phase 2.
- **"success"** → Continue to Phase 2.
- **"conflicts"** → Enter **Conflict Resolution** below.

### Conflict Resolution

Main's code is the foundation. Start from main's version, integrate the feature branch's intent on top.

1. Read each conflicted file, understand both sides.
2. Resolve: favor main's structure, apply the feature's changes on top.
3. Stage resolved files, `git rebase --continue`.
4. If new conflicts appear on subsequent commits, repeat.
5. **Bail-out**: If a single commit can't be resolved after 3 attempts, `git rebase --skip` and log a warning.
6. **Full bail-out**: If the entire rebase is unrecoverable, `git rebase --abort` and explain what went wrong. Stop here.

After all conflicts resolved → Continue to Phase 2.

---

## Phase 2: Merge Prompt

Use `AskUserQuestion` with three options:

- **Merge** → Go to Build & Merge.
- **Build & test** → Go to Build & Test.
- **Cancel** → Report "No merge performed." Done.

### Build & Test

Invoke the project's `/build` command if one exists, otherwise fall back to the project's build command (e.g., `dotnet build`). Once running, loop back to the same three-option prompt (Merge / Build & test / Cancel).

### Build & Merge

1. Run the project's build command (e.g., `dotnet build`).
   - **Build fails** → Attempt one fix. If still failing, report and stop. Do NOT abort the rebase — the code is rebased and valid, only the build broke.
   - **Build succeeds** → Continue to merge.

2. Run the merge script:

```bash
powershell.exe -NoProfile -File "${CLAUDE_SKILL_DIR}/scripts/git-merge-cleanup.ps1" -Branch "<branch-name>"
```

Returns JSON: `{"merged": true, "pushed": true, "branch": "...", "localDeleted": true, "remoteDeleted": true, "worktreeRemoved": false, "worktreeName": null}`

- **merged = false** → Not a fast-forward. Inform user. Stop.
- **merged = true** → Report:
  - Main updated and pushed.
  - Branch `<branch>` deleted (local + remote).
  - If `worktreeRemoved = true`: worktree `<worktreeName>` cleaned up.

Done.

---

## Summary

After rebase and/or merge, report:
- Branch name, commits rebased, whether main was behind.
- Conflict count (if any): list file, what happened, resolution, risk level. Only detail medium/high — count low-risk in one line.
- Build status.
