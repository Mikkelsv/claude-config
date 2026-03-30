# Push Claude Config

Commit and push all changes in the `~/claude-config/` config repo.

Scripts directory: `~/.claude/scripts`

## Steps

1. Review what changed using `git -C ~/claude-config diff` and `git -C ~/claude-config status --porcelain` to write a good commit message. Keep it concise (one line, imperative mood).

2. Run `sync-config.ps1` with the commit message:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/sync-config.ps1" -Message "<message>"
   ```

   Returns: `{"committed": true, "pushed": true, "hash": "...", "message": "..."}` on success, or `{"committed": false, "reason": "nothing to commit"}` if clean.

3. Report the result to the user: commit hash and message, or "nothing to commit" if clean. Note: `sync-config.ps1` auto-bumps the config version when staged files touch rules, commands, skills, scripts, or templates — mention the version bump if it occurred.
