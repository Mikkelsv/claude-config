# User-level Config Rules

Skill placement is covered by `skill-tiers.md`. This file covers what's left.

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

## Version tracking

Global version in `~/.claude/config-version.json`. Projects track scaffold version in `.claude/local/config-version.json` (gitignored). `/claude-push` auto-bumps global version when templates change.

## Keep the README up to date

When adding/removing/changing commands, scripts, rules, skills, or other config, update `~/.claude/README.md`.
