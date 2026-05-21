# Skill Tiers

Skills live in `.claude/skills/<name>/SKILL.md` as a single self-contained file. Three tiers by where that file lives:

## Tier 1 — Global skills (private)

Path: `~/.claude/skills/<name>/SKILL.md`. Generic workflows and meta-tooling. Available in every project. Read `CLAUDE.md` + `.claude/rules/` at runtime — no scaffolding.

## Tier 2 — Project skills (shared, committed)

Path: `<project>/.claude/skills/<name>/SKILL.md`. Scaffolded by `/claude-sync` from `~/.claude/templates/skills/<name>/SKILL.md`. For skills embedding project-specific knowledge that can't live in `CLAUDE.md` (test scripts, framework wiring, boundary definitions).

## Tier 3 — Local skill config (private, gitignored)

Path: `<project>/.claude/local/skills/<name>/config.md`. `<project>/.claude/local/` must be in `.gitignore`. For per-machine config a global skill needs at runtime; the skill hardcodes the path, `/claude-sync` scaffolds the skeleton.

## Decision guide

1. **Generic workflow or meta-tool?** → Tier 1.
2. **Embeds multi-line project knowledge?** → Tier 2 from template.
3. **Needs per-machine runtime config?** → Add Tier 3 local config.
