# Rebase Current Branch on Main

**Execute every step below in order. No step may be skipped.** Stop and report to the user if any step fails.

Scripts directory: `~/.claude/scripts`

## Pre-flight

Run the pre-flight check:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-preflight.ps1"
```

Returns JSON: `{"branch": "...", "isMain": false, "hasChanges": true, "staged": 0, "unstaged": 3, "untracked": 1}`

- If `isMain` is true, abort — cannot rebase main onto itself.
- If `hasChanges` is true, use `AskUserQuestion` with these options:
  - **Commit** — prompt the user for a commit message, then stage all and commit.
  - **Discard and continue** — discard all changes and proceed with the rebase.
  - **Abort** — stop the rebase entirely.

## Rebase

1. Fetch and update local `main` from origin.
2. Rebase feature branch onto `main`.
3. **Conflict strategy**: Main's code is the foundation. Start from main's version, then integrate the feature branch's changes on top. Resolve autonomously — only ask the user if completely stuck.
4. If a commit can't be resolved after 3 attempts, skip it and log a warning.
5. If the entire rebase is unrecoverable, `git rebase --abort` and explain what went wrong.

## Verify & Push

1. Run the project's build command (e.g., `dotnet build`, `npm run build`, etc.). If it fails, attempt one fix. If still failing, `git rebase --abort`.
2. `git push --force-with-lease` the feature branch. Never use `--force`.

## Conflict Summary

Only report **medium/high risk** conflicts (file, what happened, how it was resolved, risk level). Silently count low-risk ones in a single line. If no medium/high risk conflicts, state that and move on.

## Optional: Merge into Main

Use `AskUserQuestion` to ask if user wants to merge the feature branch into main and push. If yes, run the merge script:

```bash
powershell.exe -NoProfile -File "$HOME/.claude/scripts/git-merge-rename.ps1" -Branch "<branch-name>"
```

Returns JSON:

```json
{"merged": true, "pushed": true, "renamed": true, "originalBranch": "...", "mergedBranch": "merged/...", "worktreeRemoved": true, "worktreeName": "..."}
```

- If `merged` is false: the merge was not a fast-forward — inform the user.
- If `worktreeRemoved` is true: inform the user the worktree was cleaned up.
- If `worktreeRemoved` is false and the branch had a worktree: the cleanup may need manual intervention.

## Final Report

Summarize: branch name, conflict count, build status, remote updated, merged into main, worktree removed (if applicable).
