---
name: rebase-on-main
description: Rebase current branch on main with conflict resolution, build verification, and optional merge
---

# Rebase Current Branch on Main

**Execute every step below in order. No step may be skipped.** Stop and report to the user if any step fails unexpectedly.

Skill scripts: `~/claude-config/Claude/skills/rebase-on-main/scripts`

---

## Phase 1: Rebase

Run the rebase script (includes preflight checks):

```bash
powershell.exe -NoProfile -File "~/claude-config/Claude/skills/rebase-on-main/scripts/git-rebase-onto.ps1"
```

Returns JSON with `status`:

- **"worktree"** → Call `ExitWorktree` (action: `"keep"`) to leave the worktree and return to the main repo. Then `git checkout <branch>`, inform user, and **re-run this script**.
- **"error"** → Report the `reason`. Stop.
- **"dirty"** → List the dirty files and tell the user: "Uncommitted changes found. Please commit or stash these before rebasing." Then use `AskUserQuestion` with two options:
  - **Retry** — I've handled it, rebase now (re-run this script from the top)
  - **Cancel** — Stop entirely.
- **"up-to-date"** → Inform user, skip to Phase 2.
- **"success"** → Continue to Phase 2.
- **"conflicts"** → Enter **Conflict Resolution** below.

### Conflict Resolution

Main's code is the foundation. Start from main's version, integrate the feature branch's intent on top.

**Generated file shortcut**: If a conflicted file is a build artifact (e.g., `wwwroot/app.tailwind.css` or any generated CSS output), do NOT read or manually resolve it. Instead: `git checkout --theirs <file>` (accept feature branch version — will be regenerated anyway), stage it, and move on. The build step in Phase 2 will regenerate the correct output.

1. Read each conflicted file, understand both sides. (Skip reading for generated files — see above.)
2. Resolve: favor main's structure, apply the feature's changes on top.
3. Stage resolved files, `git rebase --continue`.
4. If new conflicts appear on subsequent commits, repeat.
5. **Bail-out**: If a single commit can't be resolved after 3 attempts, `git rebase --skip` and log a warning.
6. **Full bail-out**: If the entire rebase is unrecoverable, `git rebase --abort` and explain what went wrong. Stop here.

After all conflicts resolved → Continue to Phase 2.

---

## Phase 2: Merge Prompt

Use `AskUserQuestion` with five options (no "Other" escape hatch needed — user can dismiss the prompt and type freely):

- **Merge** → Go to Build & Merge.
- **Push branch** → Go to Push Rebased Branch.
- **Build & test** → Go to Build & Test.
- **Done** → Report "Rebase complete. Branch left as-is." Done.
- **Revert** → `git reset --hard ORIG_HEAD`, report "Rebase reverted." Done.

### Push Rebased Branch

Force-push the rebased branch to the remote with lease (safe — rejects if someone else pushed):

```bash
git push --force-with-lease
```

- **Success** → Report "Branch pushed (force-with-lease)." Loop back to the same prompt.
- **Failure** → Report the error. The branch may have been updated by someone else. Loop back to prompt.

### Build & Test

Invoke the project's `/build` skill if one exists. If no `/build` skill is available, ask the user for the build command. Once running, loop back to the same prompt (Merge / Build & test / Done / Revert).

### Build & Merge

1. Invoke the project's `/build` skill. If no `/build` skill exists, ask the user for the build command.
   - **Build fails** → Attempt one fix. If still failing, report and stop. Do NOT abort the rebase — the code is rebased and valid, only the build broke.
   - **Build succeeds** → Continue to merge.

2. Run the merge script:

```bash
powershell.exe -NoProfile -File "~/claude-config/Claude/skills/rebase-on-main/scripts/git-merge-cleanup.ps1" -Branch "<branch-name>"
```

Returns JSON: `{"merged": true, "pushed": true, "branch": "...", "localDeleted": true, "remoteDeleted": true, "worktreeRemoved": false, "worktreeName": null}`

- **merged = false** → Not a fast-forward. Inform user. Stop.
- **pushed = false** → Merge succeeded but push failed. Report the `reason`. The branch is merged locally but not pushed — tell user to push manually or retry.
- **merged = true, pushed = true** → Report:
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
