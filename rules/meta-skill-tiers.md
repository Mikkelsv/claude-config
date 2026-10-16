# Skill Tiers

Skills live in `.claude/skills/<name>/SKILL.md` as a single self-contained file. Three tiers by where that file lives:

## Tier 1 — Global skills (private)

Path: `~/.claude/skills/<name>/SKILL.md`. Generic workflows and meta-tooling. Available in every project. Read `CLAUDE.md` + `.claude/rules/` at runtime — no scaffolding.

## Tier 2 — Project-local forks (shared, committed)

Path: `<project>/.claude/skills/<name>/SKILL.md`. A **copy of a global skill**, committed so colleagues without their own `~/.claude/` get the workflow on clone. Only for shared repos — see `meta-project-local-skill-copies`. `/claude-sync` scaffolds and drift-checks these; project additions go in `<ProjectSpecific>` blocks. **Not a template tier:** Skills are never authored per-project from a template with `{PLACEHOLDER}` substitution — that tier was retired. A skill needing project values is Tier 1 plus a Tier 3 config.

**Precedence: global wins.** With the same skill name in both places, the **global** `~/.claude/skills/<name>/SKILL.md` loads; the project copy does not shadow it. A fork drifted ahead of global runs only for colleagues, never for you. Never rely on a Tier 2 fork to override a global skill; change the global one, or give the fork a different name.

## Tier 3 — Skill config (committed)

Path: `<project>/.claude/skill-config/<name>.md`, **committed**. The skill hardcodes the path and treats the file as optional. Carries the values a *generic* skill can't guess about a *specific* project — build command, test tiers, a baseline path, a server name. Project parameters, not machine config.

**Why not a rule or `CLAUDE.md`?** Those are **always-on**; a skill config is **read on demand**, so `/test`'s tier table costs nothing until `/test` runs. The axis is always-loaded vs read-when-needed, not committed vs ignored.

**Committed, because colleagues need it.** A build command is repo-wide truth, identical for every developer. Gitignored, a cloned repo gets a skill that silently degrades. Corollary: never put a machine-specific path in one; there is no gitignored shadowing layer.

**Shape:** one `##` section per project fact. Values are **commands, paths, names, or small tables** — never architecture prose. `/test`'s config is the reference: build command, a tier table (name → command → result shape), baseline path, and a per-tier drift mapping. **A stated result shape must be what the command actually returns**, verified by running it (see `/test`).

**Project facts only — a colleague reads this file.** No provenance or dates, no reference to anyone's personal `~/.claude`, no notes about which skill shadows which. Owner-side notes belong in a gitignored file such as `.claude/local/skill-config-notes.md`.

```markdown
## Test Tiers
| Tier | Command | Result shape |
| --- | --- | --- |
| unit | `pwsh -File .claude/scripts/run-tests.ps1` | `{total,passed,failed,results:[{name,outcome}]}` |
```

**Config vs a `<ProjectSpecific>` block.** Both are committed project knowledge, so the test is *when it needs to be in context*. A parameter one skill reads at runtime → config. Standing behaviour that should shape every session → a project rule or `CLAUDE.md`. A `<ProjectSpecific>` block inside a Tier 2 fork is a third thing and mostly a trap: since global wins, a block you add to a fork never reaches you. **Prefer moving that content to a project rule** where both you and your colleagues load it.

**Every skill reading a config must degrade honestly when it's absent** — infer what it can, state what it couldn't find, and never report success for a step it skipped. `/build` and `/test` both treat the file as optional.

## Decision guide

1. **Generic workflow or meta-tool?** → Tier 1.
2. **Needs project-specific values?** → Tier 1 + a committed Tier 3 config. This is the normal answer: one skill beats N forks.
3. **Shared repo whose colleagues lack `~/.claude/`?** → additionally fork to Tier 2 so they get it on clone. Keep the fork **byte-identical** to global and put every project-specific thing in the config or a project rule — then refreshing it is a copy, with no drift to reconcile.
