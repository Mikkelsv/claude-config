# Config Version Check

At session start in any project, compare global vs project config versions:

1. Read `~/.claude/config-version.json` for the global `version`.
2. If the project has `Claude/local/config-version.json`, read its `globalConfigVersion`.
3. If versions differ:
   a. Read `~/.claude/CHANGELOG.md` and summarize entries between the project version and the current global version. Focus on lines marked **Project action**.
   b. If the version file has a `skills` map, compare each skill's `templateHash` against the current template's hash to identify which skills drifted.
   c. Mention it once: "Global config is vX.Y.Z but this project uses vX.Y.W. N skills have template updates. Run `/claude-sync` to sync." followed by a brief changelog summary.
4. Informational only — do not block work.
5. If no project version file exists, skip silently.

## Version bump awareness

`sync-config.ps1` auto-bumps the version only when `Claude/templates/` files are staged. Most config changes (global rules, scripts, skills, settings) do **not** trigger a bump.

When running `/claude-push`:
- Do **not** assume a version bump occurred — check the script output or compare `config-version.json` before and after.
- Only add a changelog entry if the version actually changed **and** the change requires project action.
- Changes picked up automatically via junction (rules, global skills, scripts) never need changelog entries.
