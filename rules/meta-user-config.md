# User-level Config Rules

Skill placement is covered by `meta-skill-tiers.md`. This file covers what's left.

## Check before duplicating

Before creating project-level commands, rules, or docs, check `~/.claude/commands/`, `~/.claude/rules/`, and `~/.claude/docs/` for existing user-level equivalents. Prefer extending over duplicating.

## Setup script is one-time

`~/.claude/setup.ps1` is for fresh machine setup only. Do not run it for routine config changes.

## Prefer scripts over inline shell

For mechanical shell work (git, file I/O, process management), create/update a PowerShell script in `~/.claude/scripts/` instead of constructing inline commands. Reusable, testable, saves tokens.

## No absolute user paths

Never hardcode absolute user paths. Use portable alternatives:

- **Bash**: `$HOME/.claude/...`
- **PowerShell**: `$env:USERPROFILE\.claude\...` or `$PSScriptRoot`
- **Permissions**: `**` globs like `**/Code/**`, `**/.claude/**`
- **Docs**: `~/` shorthand

Exception: `settings.json` hook commands need real paths (gitignored, per-machine).

## Keep templates in sync

When improving a project-scaffolded skill, propagate generic improvements back to `~/.claude/templates/skills/<name>/`. Project-specific tweaks stay local. Templates are the source of truth for new projects.

## Keep the README up to date

When adding/removing/changing commands, scripts, rules, skills, or other config, update `~/.claude/README.md`.

## Config version check (session start)

At session start in any project, compare global vs project config versions:

1. Read `~/.claude/config-version.json` for the global `version`.
2. If the project has `.claude/local/config-version.json`, read its `globalConfigVersion`.
3. If versions differ:
   a. Read `~/.claude/CHANGELOG.md` and summarize entries between the project version and the current global version. Focus on lines marked **Project action**.
   b. If the version file has a `skills` map, compare each skill's `templateHash` against the current template's hash to identify which skills drifted.
   c. Mention it once: "Global config is vX.Y.Z but this project uses vX.Y.W. N skills have template updates. Run `/claude-sync` to sync." followed by a brief changelog summary.
4. Informational only — do not block work.
5. If no project version file exists, skip silently.

## Version bump awareness (when running `/claude-push`)

`sync-config.ps1` auto-bumps the version when staged changes touch `templates/`, `rules/`, `skills/`, or `commands/`. The bump is a *signal* that something projects might care about changed — projects with mirrored/duplicated globals see the version mismatch on next session.

- Do **not** assume a version bump occurred — check the script output or compare `config-version.json` before and after.
- Add a changelog entry **only** when project action is actually required: re-scaffolding templates, manually re-copying duplicated skills/rules, new gitignore entries, new local config files. Most rule/skill edits propagate automatically (auto-loaded globals) and don't need an entry — the bump alone is enough signal.
- Skip the changelog for: bug fixes/edits to globals projects don't duplicate, internal tooling changes (`/claude-push`, `/claude-sync`, `/claude-refactor`), and anything obvious from the commit message.
