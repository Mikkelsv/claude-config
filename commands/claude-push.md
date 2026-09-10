# Push Claude Config

Commit and push all changes in the `~/.claude/` config repo.

Scripts directory: `~/.claude/scripts`

## Steps

1. **Check that cited references resolve** — before staging anything:

   ```bash
   pwsh -NoProfile -File "$HOME/.claude/scripts/check-config-references.ps1"
   ```

   Returns `{"missingRules": [...], "missingAgents": [...], "filesScanned": N, "ok": bool}`. Config cross-references are prose, so nothing else type-checks them: a citation to a rule that was never promoted, renamed, or retired reads as authoritative and does nothing.

   **Report-only — never block on it.** One false-positive class is expected: slugs used as illustrative examples rather than citations. Fix the real ones, name the ones you're dismissing and why, then carry on.

2. Run `sync-config.ps1` to stage all changes and handle version bumping:

   ```bash
   pwsh -NoProfile -File "$HOME/.claude/scripts/sync-config.ps1"
   ```

   Returns JSON: `{"hasChanges": true, "staged": [...], "versionBump": bool, "newVersion": "..."}` or `{"hasChanges": false, "reason": "nothing to commit"}`.

   If no changes, report "nothing to commit" and stop.

   The script auto-bumps the version when staged changes touch `rules/`, `skills/`, or `commands/`. **Don't assume a bump happened** — read `versionBump` from the output, or compare `config-version.json` before and after. The bump is a signal to projects that mirror globals, which see the mismatch on their next session.

3. Run `/commit` to commit and push. The commit skill analyzes the staged diff, picks the tag, and pushes.

4. **Update the changelog** only if `sync-config.ps1` reported `versionBump: true` **and** the changes require project action — refreshing a fork, manually re-copying duplicated skills or rules, new gitignore entries, a new committed skill config. Skip it for anything that propagates automatically (rules, scripts, global skills, since those auto-load), for internal tooling changes to `/claude-push`, `/claude-sync` or `/claude-refactor`, and for anything already obvious from the commit message. The bump alone is enough signal in those cases. When an entry is warranted, append a bullet list to `~/.claude/CHANGELOG.md` with the new version, date, and the actionable items only. Then stage and amend:

   ```bash
   git -C ~/.claude add CHANGELOG.md
   git -C ~/.claude commit --amend --no-edit
   git -C ~/.claude push --force-with-lease
   ```

5. Report the result to the user: commit hash and message, or "nothing to commit" if clean. Mention the version bump if one occurred.
