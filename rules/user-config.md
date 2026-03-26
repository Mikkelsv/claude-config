# User-level Config Rules

## Check before duplicating

Before creating project-level commands, rules, or docs, always check `~/.claude/commands/`, `~/.claude/rules/`, and `~/.claude/docs/` for existing user-level equivalents. Prefer using or extending existing user-level files over creating project-local duplicates.

## Edit in place and commit

When modifying user-level Claude config (commands, rules, docs, CLAUDE.md), edit the files in `~/.claude/` directly. After making changes, commit and push so other machines can pull the updates.

## Run the setup script for fresh installs

The setup script `setup.ps1` is in the repo root (`~/.claude/setup.ps1`). It is only needed for fresh machine setup — cloning the repo and configuring the environment. Do not run it for routine config changes.

## Prefer scripts over inline shell

When a command or workflow involves mechanical shell work (git operations, file I/O, process management, launching applications), prefer creating or updating a PowerShell script in `~/.claude/scripts/` rather than having Claude construct and run shell commands inline. Scripts are reusable, testable, and save tokens. See `~/.claude/README.md` for the full script catalog and conventions.

## No absolute paths

Never use absolute user paths in commands, scripts, rules, or docs. Use portable alternatives:

- **Bash (commands)**: `$HOME/.claude/scripts/...`
- **PowerShell (scripts)**: `$env:USERPROFILE\.claude\...` or `$PSScriptRoot` for inter-script references
- **Permissions (settings)**: `**` globs like `**/Code/**`, `**/.claude/**`
- **Documentation**: `~/` or `~/.claude/` as shorthand

The only exception is `settings.json` hook commands, which need real paths — these are gitignored and machine-specific.

## Keep templates and project skills in sync

Project-level skills (in `<project>/.claude/skills/`) are scaffolded from global templates (in `~/.claude/templates/skills/`). When improving a project-level skill:

1. **Propagate improvements back to the global template** — if the change is generic (not project-specific), apply the same edit to `~/.claude/templates/skills/<name>/`.
2. **Update `/claude-setup`** — if a new skill is added that should be available for all projects, add a template and register it in `~/.claude/commands/claude-setup.md`.
3. **Project-specific customizations stay local** — changes tied to a specific project's build system, test framework, or architecture stay in the project skill only.

When in doubt, check the global template before finishing. The global template is the source of truth for new projects.

## Keep the README up to date

When adding, removing, or modifying commands, scripts, rules, or other config in `~/.claude/`, update `~/.claude/README.md` to reflect the change. Both the human section (command descriptions) and the Claude section (script catalog, directory layout) must stay accurate.
