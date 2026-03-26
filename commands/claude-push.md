# Push Claude Config

Commit and push all changes in the `~/.claude/` config repo.

Scripts directory: `~/.claude/scripts`

## Steps

1. Run `sync-config.ps1` with a commit message summarizing the changes:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/sync-config.ps1" -Message "<message>"
   ```

   Returns: `{"committed": true, "pushed": true, "hash": "...", "message": "..."}` on success, or `{"committed": false, "reason": "nothing to commit"}` if clean.

2. Before calling the script, review what changed using `git -C ~/.claude diff` and `git -C ~/.claude status --porcelain` to write a good commit message. Keep it concise (one line, imperative mood).

3. Report the result to the user: commit hash and message, or "nothing to commit" if clean.
