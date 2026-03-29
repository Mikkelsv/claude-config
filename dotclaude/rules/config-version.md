# Config Version Check

At session start in any project, compare global vs project config versions:

1. Read `~/Documents/Code/claude-config/Claude/config-version.json` for the global `version`.
2. If the project has `Claude/config-version.json`, read its `globalConfigVersion`.
3. If versions differ, mention it once: "Global config is vX.Y.Z but this project uses vX.Y.W. Run `/claude-setup` to sync."
4. Informational only — do not block work.
5. If no project version file exists, skip silently.
