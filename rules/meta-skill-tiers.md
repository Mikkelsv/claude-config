# Skill Tiers

Skills live in `.claude/skills/<name>/SKILL.md` as a single self-contained file. Three tiers by where that file lives:

## Tier 1 — Global skills (private)

Path: `~/.claude/skills/<name>/SKILL.md`. Generic workflows and meta-tooling. Available in every project. Read `CLAUDE.md` + `.claude/rules/` at runtime — no scaffolding.

## Tier 2 — Project-local forks (shared, committed)

Path: `<project>/.claude/skills/<name>/SKILL.md`. A **copy of a global skill**, committed so colleagues without their own `~/.claude/` get the workflow on clone. Only for shared repos — see `meta-project-local-skill-copies`. `/claude-sync` scaffolds and drift-checks these; project additions go in `<ProjectSpecific>` blocks.

**Not a template tier.** Skills are never authored per-project from a template with `{PLACEHOLDER}` substitution — that tier was retired. A skill needing project values is Tier 1 plus a Tier 3 config.

## Tier 3 — Local skill config (private, gitignored)

Path: `<project>/.claude/local/skills/<name>/config.md`. `<project>/.claude/local/` must be in `.gitignore`. The skill hardcodes the path.

**Shape:** one `##` section per project fact. Values are **commands, paths, names, or small tables** — never architecture prose. `/test`'s config is the reference: build command, a tier table (name → command → result shape), baseline path, and a per-tier drift mapping.

```markdown
## Build
`dotnet build`

## Test Tiers
| Tier | Command | Result shape |
| --- | --- | --- |
| unit | `pwsh -File .claude/scripts/run-tests.ps1` | `{total,passed,failed,results:[{name,outcome}]}` |
```

**Config vs `<ProjectSpecific>`.** Config carries *values* a generic skill needs at runtime — per-machine, gitignored, differs by developer. A `<ProjectSpecific>` block carries *knowledge* every developer on the repo shares — committed, same for all. If two developers would write it differently, it's config; if they'd write it identically, it's a block.

**Every skill reading a config must degrade honestly when it's absent** — infer what it can, state what it couldn't find, and never report success for a step it skipped. `/build` and `/test` both treat the file as optional.

## Decision guide

1. **Generic workflow or meta-tool?** → Tier 1.
2. **Needs per-machine runtime values?** → Tier 1 + a Tier 3 config. This is the normal answer when a skill needs project specifics: one skill beats N forks.
3. **Shared repo whose colleagues lack `~/.claude/`?** → additionally fork to Tier 2 so they get it on clone.
