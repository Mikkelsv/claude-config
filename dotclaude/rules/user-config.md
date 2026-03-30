# User-level Config Rules

## Repository structure

The global Claude config lives at `~/claude-config/` as a git repo with two directories:

- **`dotclaude/`** — maps to `~/.claude/` via a Windows junction. Contains rules, commands, skill shells, settings, and CLAUDE.md. Claude Code discovers these at `~/.claude/`.
- **`Claude/`** — freely editable. Contains scripts, templates, and full skill implementations.

Scripts and templates live directly in `Claude/scripts/` and `Claude/templates/`. Reference them via `~/claude-config/Claude/scripts/...` paths.

## Check before duplicating

Before creating project-level commands, rules, or docs, always check `~/.claude/commands/`, `~/.claude/rules/`, and `~/.claude/docs/` for existing user-level equivalents. Prefer using or extending existing user-level files over creating project-local duplicates.

## Edit in place

When modifying user-level Claude config, edit through the real paths in `~/claude-config/`:

- **Rules, commands, CLAUDE.md** → `~/claude-config/dotclaude/`
- **Scripts, templates, skill implementations** → `~/claude-config/Claude/`

Do NOT edit through `~/.claude/` paths — that triggers permission prompts. After making changes, use `/claude-push` to commit and sync.

## Git operations use the repo root

All git commands target `~/claude-config/`, not `~/.claude/` (which is a junction, not a git root).

## Run the setup script for fresh installs

The setup script is at `~/claude-config/Claude/setup.ps1`. It is only needed for fresh machine setup — cloning the repo and creating junctions. Do not run it for routine config changes.

## Prefer scripts over inline shell

When a command or workflow involves mechanical shell work (git operations, file I/O, process management, launching applications), prefer creating or updating a PowerShell script in `~/claude-config/Claude/scripts/` rather than having Claude construct and run shell commands inline. Scripts are reusable, testable, and save tokens. See `~/claude-config/Claude/README.md` for the full script catalog and conventions.

## No absolute paths

Never use absolute user paths in commands, scripts, rules, or docs. Use portable alternatives:

- **Bash (commands)**: `$HOME/claude-config/Claude/scripts/...`
- **PowerShell (scripts)**: `$env:USERPROFILE\claude-config\...` or `$PSScriptRoot` for inter-script references
- **Permissions (settings)**: `**` globs like `**/Code/**`, `**/.claude/**`
- **Documentation**: `~/` or `~/claude-config/` as shorthand

The only exception is `settings.json` hook commands, which need real paths — these are gitignored and machine-specific.

## Keep templates and project skills in sync

Project-level skills (in `<project>/.claude/skills/`) are scaffolded from global templates (in `~/claude-config/Claude/templates/skills/`). When improving a project-level skill:

1. **Propagate improvements back to the global template** — if the change is generic (not project-specific), apply the same edit to `~/claude-config/Claude/templates/skills/<name>/`.
2. **Update `/claude-sync`** — if a new skill is added that should be available for all projects, add a template and register it in the claude-sync command.
3. **Project-specific customizations stay local** — changes tied to a specific project's build system, test framework, or architecture stay in the project skill only.

When in doubt, check the global template before finishing. The global template is the source of truth for new projects.

**Important:** Not all skills are project-level. See `skill-tiers.md` for which skills are global-only, project-scaffolded, or local references.

## Version tracking

Global config has a version in `~/claude-config/Claude/config-version.json`. Projects track which version they were scaffolded against in `Claude/local/config-version.json` (gitignored, per-developer). The `/claude-push` command (via `sync-config.ps1`) auto-bumps the global version when changes touch templates.

## Keep the README up to date

When adding, removing, or modifying commands, scripts, rules, or other config, update `~/claude-config/Claude/README.md` to reflect the change. Both the human section (command descriptions) and the Claude section (script catalog, directory layout) must stay accurate.
