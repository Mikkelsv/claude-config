# Skill Tiers

Skills live in `.claude/skills/<name>/SKILL.md` as a single self-contained file (frontmatter + body). Three tiers by where that file lives:

## Tier 1 — Global skills (private)

Path: `~/.claude/skills/<name>/SKILL.md`

Generic workflows and meta-tooling. Available in every project for users with the personal config.

Current global skills: `claude-sync`, `claude-refactor`, `claude-push`, `allow`, `capture-rule`, `build`, `rebase-on-main`, `plan`, `implement`, `refactor`, `refactor-docs`, `audit-architecture`, `commit`, `teach`.

Global workflow skills read project context (`CLAUDE.md`, `.claude/rules/`) at runtime — no scaffolding needed.

## Tier 2 — Project skills (shared, committed)

Path: `<project>/.claude/skills/<name>/SKILL.md`

Scaffolded by `/claude-sync` from `~/.claude/templates/skills/<name>/SKILL.md`. For skills embedding project-specific knowledge that can't live in `CLAUDE.md` (test scripts, framework wiring, boundary definitions).

Current project skills: `test`, `refactor-code`, `refactor-tests`.

## Tier 3 — Local skill config (private, gitignored)

Path: `<project>/.claude/local/skills/<name>/config.md` (or similar). `<project>/.claude/local/` must be in `.gitignore`.

For per-machine config a global skill needs at runtime. The global skill hardcodes the path; `/claude-sync` scaffolds the skeleton.

Currently only `build` uses this (`.claude/local/skills/build/config.md` for build commands and server config).

## Decision guide

When creating a skill:

1. **Generic workflow or meta-tool?** → Tier 1. Read `CLAUDE.md` + `.claude/rules/` for project context.
2. **Embeds multi-line project knowledge?** → Tier 2 from template.
3. **Needs per-machine runtime config?** → Add Tier 3 local config.
