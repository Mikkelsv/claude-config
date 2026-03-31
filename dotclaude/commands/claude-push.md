# Push Claude Config

Commit and push all changes in the `~/claude-config/` config repo.

Scripts directory: `~/claude-config/Claude/scripts`

## Steps

1. Run `sync-config.ps1` to stage all changes and handle version bumping:

   ```bash
   powershell.exe -NoProfile -File "$HOME/claude-config/Claude/scripts/sync-config.ps1"
   ```

   Returns JSON: `{"hasChanges": true, "staged": [...], "versionBump": bool, "newVersion": "..."}` or `{"hasChanges": false, "reason": "nothing to commit"}`.

   If no changes, report "nothing to commit" and stop.

2. Run `/commit` to commit and push. The commit skill will analyze the staged diff, pick the right TYPE, and push. Since this is config work, it will typically be `DOCS:`.

3. **Update the changelog** if `sync-config.ps1` reported `versionBump: true` AND the changes require project action (e.g., template changes that need re-scaffolding, new gitignore entries, new local config files). Skip the changelog for changes that are picked up automatically (rules, scripts, global skills). Append a bullet-list entry to `~/claude-config/Claude/CHANGELOG.md` with the new version, date, and actionable items only. Then stage and amend:

   ```bash
   git -C ~/claude-config add Claude/CHANGELOG.md
   git -C ~/claude-config commit --amend --no-edit
   git -C ~/claude-config push --force-with-lease
   ```

4. Report the result to the user: commit hash and message, or "nothing to commit" if clean. Mention the version bump if one occurred.
