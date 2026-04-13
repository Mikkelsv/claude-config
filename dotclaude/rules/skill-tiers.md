# Skill Tiers

Skills must have a shell in `.claude/skills/` for Claude Code discovery. Three tiers:

## Tier 1 — Global skills (private)

Shell: `~/.claude/skills/<name>/SKILL.md` (junctioned from `dotclaude/skills/`)
Implementation: `~/claude-config/Claude/skills/<name>/SKILL.md`

Generic workflows and meta-tooling. Available only to devs with the personal config.

Current global skills: `claude-sync`, `claude-refactor`, `claude-push`, `allow`, `build`, `rebase-on-main`, `plan`, `implement`, `refactor`, `refactor-docs`, `audit-architecture`, `commit`, `teach`.

Global workflow skills read project context (`CLAUDE.md`, `.claude/rules/`, `Claude/docs/`) at runtime — no scaffolding needed.

## Tier 2 — Project skills (shared, committed)

Shell: `<project>/.claude/skills/<name>/SKILL.md`
Implementation: `<project>/Claude/skills/<name>/SKILL.md`
Scaffolded by `/claude-sync` from `~/claude-config/Claude/templates/skills/`.

For skills embedding project-specific knowledge that can't live in `CLAUDE.md` (test scripts, framework wiring, boundary definitions).

Current project skills: `test`, `refactor-code`, `refactor-tests`.

## Tier 3 — Local skill config (private, gitignored)

Path: `<project>/Claude/local/skills/<name>/config.md` (or similar).

For per-machine config a global skill needs at runtime. The global skill hardcodes the path; `/claude-sync` scaffolds it.

Currently only `build` uses this (`Claude/local/skills/build/config.md` for build commands and server config).

`Claude/local/` must be in `.gitignore`.

## Decision guide

When creating a skill:

1. **Generic workflow or meta-tool?** → Tier 1. Make it read `CLAUDE.md` + `.claude/rules/` for project context.
2. **Embeds multi-line project knowledge?** → Tier 2 from template.
3. **Needs per-machine runtime config?** → Add Tier 3 local config.
