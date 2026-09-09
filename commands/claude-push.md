# Push Claude Config

Commit and push all changes in the `~/.claude/` config repo.

Scripts directory: `~/.claude/scripts`

## Steps

1. Run `sync-config.ps1` to stage all changes and handle version bumping:

   ```bash
   pwsh -NoProfile -File "$HOME/.claude/scripts/sync-config.ps1"
   ```

   Returns JSON: `{"hasChanges": true, "staged": [...], "versionBump": bool, "newVersion": "..."}` or `{"hasChanges": false, "reason": "nothing to commit"}`.

   If no changes, report "nothing to commit" and stop.

   The script auto-bumps the version when staged changes touch `templates/`, `rules/`, `skills/`, or `commands/`. **Don't assume a bump happened** — read `versionBump` from the output, or compare `config-version.json` before and after. The bump is a signal to projects that mirror globals, which see the mismatch on their next session.

2. Run `/commit` to commit and push. The commit skill analyzes the staged diff, picks the tag, and pushes.

3. **Update the changelog** only if `sync-config.ps1` reported `versionBump: true` **and** the changes require project action — re-scaffolding templates, manually re-copying duplicated skills or rules, new gitignore entries, new local config files. Skip it for anything that propagates automatically (rules, scripts, global skills, since those auto-load), for internal tooling changes to `/claude-push`, `/claude-sync` or `/claude-refactor`, and for anything already obvious from the commit message. The bump alone is enough signal in those cases. When an entry is warranted, append a bullet list to `~/.claude/CHANGELOG.md` with the new version, date, and the actionable items only. Then stage and amend:

   ```bash
   git -C ~/.claude add CHANGELOG.md
   git -C ~/.claude commit --amend --no-edit
   git -C ~/.claude push --force-with-lease
   ```

4. Report the result to the user: commit hash and message, or "nothing to commit" if clean. Mention the version bump if one occurred.
