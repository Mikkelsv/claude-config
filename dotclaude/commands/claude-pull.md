# Pull Claude Config

Pull the latest changes from the remote `~/claude-config/` config repo.

Scripts directory: `~/.claude/scripts`

## Steps

1. Run `pull-config.ps1`:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/pull-config.ps1"
   ```

   Returns: `{"pulled": true, "before": "...", "after": "...", "commits": [...]}` on success, or `{"pulled": false, "reason": "already up to date"}` if nothing new.

2. Report the result to the user: new commits pulled, or "already up to date" if clean.
