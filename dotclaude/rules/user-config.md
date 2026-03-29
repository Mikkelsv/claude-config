# User-level Config Rules

## Repository structure

The global Claude config lives at `~/Documents/Code/claude-config/` as a git repo with two directories:

- **`dotclaude/`** — maps to `~/.claude/` via a Windows junction. Contains rules, commands, skill shells, settings, and CLAUDE.md. Claude Code discovers these at `~/.claude/`.
- **`Claude/`** — freely editable. Contains scripts, templates, and full skill implementations.

Inner junctions (`dotclaude/scripts/` → `Claude/scripts/`, `dotclaude/templates/` → `Claude/templates/`) maintain backward compat so `~/.claude/scripts/...` paths still resolve.

## Check before duplicating

Before creating project-level commands, rules, or docs, always check `~/.claude/commands/`, `~/.claude/rules/`, and `~/.claude/docs/` for existing user-level equivalents. Prefer using or extending existing user-level files over creating project-local duplicates.

## Edit in place

When modifying user-level Claude config, edit through the real paths in `~/Documents/Code/claude-config/`:

- **Rules, commands, CLAUDE.md** → `~/Documents/Code/claude-config/dotclaude/`
- **Scripts, templates, skill implementations** → `~/Documents/Code/claude-config/Claude/`

Do NOT edit through `~/.claude/` paths — that triggers permission prompts. After making changes, use `/claude-push` to commit and sync.

## Git operations use the repo root

All git commands target `~/Documents/Code/claude-config/`, not `~/.claude/` (which is a junction, not a git root).

## Run the setup script for fresh installs

The setup script is at `~/Documents/Code/claude-config/Claude/setup.ps1`. It is only needed for fresh machine setup — cloning the repo and creating junctions. Do not run it for routine config changes.

## Prefer scripts over inline shell

When a command or workflow involves mechanical shell work (git operations, file I/O, process management, launching applications), prefer creating or updating a PowerShell script in `~/Documents/Code/claude-config/Claude/scripts/` rather than having Claude construct and run shell commands inline. Scripts are reusable, testable, and save tokens. See `~/.claude/README.md` for the full script catalog and conventions.

## No absolute paths

Never use absolute user paths in commands, scripts, rules, or docs. Use portable alternatives:

- **Bash (commands)**: `$HOME/.claude/scripts/...` (resolves through junction chain)
- **PowerShell (scripts)**: `$env:USERPROFILE\Documents\Code\claude-config\...` or `$PSScriptRoot` for inter-script references
- **Permissions (settings)**: `**` globs like `**/Code/**`, `**/.claude/**`
- **Documentation**: `~/` or `~/Documents/Code/claude-config/` as shorthand

The only exception is `settings.json` hook commands, which need real paths — these are gitignored and machine-specific.

## Keep templates and project skills in sync

Project-level skills (in `<project>/.claude/skills/`) are scaffolded from global templates (in `~/.claude/templates/skills/`). When improving a project-level skill:

1. **Propagate improvements back to the global template** — if the change is generic (not project-specific), apply the same edit to `~/Documents/Code/claude-config/Claude/templates/skills/<name>/`.
2. **Update `/claude-setup`** — if a new skill is added that should be available for all projects, add a template and register it in the claude-setup command.
3. **Project-specific customizations stay local** — changes tied to a specific project's build system, test framework, or architecture stay in the project skill only.

When in doubt, check the global template before finishing. The global template is the source of truth for new projects.

## Version tracking

Global config has a version in `~/Documents/Code/claude-config/Claude/config-version.json`. Projects track which version they were scaffolded against in `Claude/config-version.json`. A pre-commit hook auto-bumps the global version when rules, commands, skills, scripts, or templates change.

## Keep the README up to date

When adding, removing, or modifying commands, scripts, rules, or other config, update `~/.claude/README.md` to reflect the change. Both the human section (command descriptions) and the Claude section (script catalog, directory layout) must stay accurate.
