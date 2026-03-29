# Worktree Cleanup on Merge

When merging a branch that belongs to a worktree (detected via `git worktree list`), always remove the associated worktree after the merge completes:

1. After any successful merge into main (whether via `/rebase-on-main`, manual merge, or any other flow), check `git worktree list` for a worktree on the merged branch.
2. If found, remove it with `git worktree remove <path>`. Use `--force` if needed — the code is already merged.
3. Inform the user that the worktree was cleaned up.

This applies globally to all projects using worktrees.
