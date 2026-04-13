# Skill Tiers

Skills fall into three tiers based on audience and environment dependency.

## Discovery constraint

Claude Code only discovers skills from `.claude/skills/`. Files in `Claude/local/` are invisible to discovery. This means:

- **Global skills** need a shell in `~/.claude/skills/` (via the junction from `~/claude-config/dotclaude/skills/`) for discovery. The implementation lives in `~/claude-config/Claude/skills/` and reads project config from `Claude/local/skills/<name>/`.
- **Project skills** need a shell in `<project>/.claude/skills/` for discovery. The implementation lives in `<project>/Claude/skills/`.

A skill without a discoverable shell in `.claude/skills/` simply doesn't exist to Claude.

## Tier 1 — Global skills (private, not in project repos)

Discovery: `~/.claude/skills/` (global, via junction)
Implementation: `~/claude-config/Claude/skills/`
Project config: `Claude/local/` (gitignored, Tier 3)

**When to use:** The skill is a generic workflow, depends on the user's environment, or is meta-tooling. Only available to devs who have them in their personal config.

### Config management

| Skill | Why global |
| --- | --- |
| `claude-sync` | Meta-skill — pulls config and scaffolds/syncs project skills |
| `claude-refactor` | Meta-skill — audits Claude config |
| `claude-push` | Config sync — commit and push personal git repo |
| `allow` | Edits `~/.claude/settings.json` — user-level config |

### Workflow skills

| Skill | Why global |
| --- | --- |
| `build` | Platform-dependent scripts (kill-port.ps1, terminal). Reads project config from `Claude/local/skills/build/config.md`. |
| `rebase-on-main` | Platform-dependent scripts (PowerShell). References global worktree/merge scripts. |
| `plan` | Generic workflow. Uses `plans/` by convention. |
| `implement` | Generic workflow. Delegates commits to `/commit`. Invokes project-level `/test`, `/refactor`, `/audit-architecture`. |
| `refactor` | Orchestrator — invokes refactor-code, refactor-docs, refactor-tests. No customization. |
| `refactor-docs` | Generic doc sync — reads CLAUDE.md and `Claude/docs/`. No customization. |
| `audit-architecture` | Architecture review. Derives boundary rules from CLAUDE.md and `.claude/rules/`. |

## Tier 2 — Project skills (shared, committed to repo)

Discovery: `<project>/.claude/skills/` (thin shell)
Implementation: `<project>/Claude/skills/` (full skill)
Scaffolded from global templates in `~/claude-config/Claude/templates/skills/`.

**When to use:** The skill embeds project-specific knowledge (architecture rules, test patterns, boundary definitions) that all team members share.

| Skill | Why project |
| --- | --- |
| `test` | Smoke-test scripts, perf baselines, preview server config are deeply project-specific |
| `refactor-code` | Architecture check criteria are project-specific (multi-line block content) |
| `refactor-tests` | Test framework files and test mapping are project-specific |

## Tier 3 — Local skill config (private, gitignored)

The local counterpart of a Tier 1 global skill. Lives in `Claude/local/skills/<name>/` in the project, mirroring the global skill's name. Gitignored. Scaffolded by `/claude-sync`.

**Convention:** A global skill knows to check `Claude/local/skills/<name>/config.md` for project-specific config. The path is predetermined — the global skill hardcodes it, `/claude-sync` scaffolds it.

| Path | Global skill | Why local |
| --- | --- | --- |
| `Claude/local/skills/build/config.md` | `build` | Build commands and server config vary by dev setup |

Only `build` uses runtime local config. Other global skills (`plan`, `implement`, `audit-architecture`, `refactor`, `refactor-docs`) read project context from `CLAUDE.md` and `.claude/rules/` at runtime instead.

**Important:** `Claude/local/` must be in `.gitignore`. If it's missing, `/claude-sync` should add it.

## Decision guide

When creating or modifying a skill, ask:

1. **Is it a generic workflow or meta-tool?** → Tier 1 (global skill). Make sure it reads `CLAUDE.md` and `.claude/rules/` for project context.
2. **Does it embed multi-line project knowledge (architecture rules, test patterns)?** → Tier 2 (project skill from template).
3. **Does it need per-machine config (build commands, paths)?** → Add Tier 3 local config in `Claude/local/skills/<name>/`.
