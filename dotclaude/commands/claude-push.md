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

3. **Update the changelog** if the version was bumped AND the changes require project action (e.g., template changes that need re-scaffolding, new gitignore entries, new local config files). Skip the changelog for changes that are picked up automatically (rules, scripts, global skills). Append a bullet-list entry to `~/claude-config/Claude/CHANGELOG.md` with the new version, date, and actionable items only. Then stage the changelog and amend the commit:

   ```bash
   git -C ~/claude-config add Claude/CHANGELOG.md
   git -C ~/claude-config commit --amend --no-edit
   git -C ~/claude-config push --force-with-lease
   ```

4. Report the result to the user: commit hash and message, or "nothing to commit" if clean. Note: `sync-config.ps1` auto-bumps the config version when staged files touch rules, commands, skills, scripts, or templates — mention the version bump if it occurred.
