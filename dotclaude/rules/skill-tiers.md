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

**When to use:** The skill depends on the user's environment (OS, terminal, installed tools) or is meta-tooling for managing Claude config. Only available to devs who have them in their personal config.

| Skill | Why global |
| --- | --- |
| `build` | Platform-dependent scripts (kill-port.ps1, terminal). Reads project config from `Claude/local/skills/build/config.md`. |
| `rebase-on-main` | Platform-dependent scripts (PowerShell). References global worktree/merge scripts. |
| `claude-sync` | Meta-skill — scaffolds other skills |
| `claude-refactor` | Meta-skill — audits Claude config |
| `claude-push` / `claude-pull` | Config sync — personal git repo |

## Tier 2 — Project skills (shared, committed to repo)

Discovery: `<project>/.claude/skills/` (thin shell)
Implementation: `<project>/Claude/skills/` (full skill)
Scaffolded from global templates in `~/.claude/templates/skills/`.

**When to use:** The skill encodes project-specific knowledge that all team members share, and is environment-independent. Any dev on any OS can use it as-is.

| Skill | Why project |
| --- | --- |
| `test` | Test definitions, smoke-test scripts, and execution are deeply project-specific |
| `refactor` | Orchestrator — spawns project-level sub-skills |
| `refactor-code` | Review criteria tied to project architecture |
| `refactor-docs` | Doc structure is project-specific |
| `refactor-tests` | Test patterns are project-specific |
| `audit` | Architecture boundaries are project-specific |
| `plan` | Plan conventions and directory are project-specific |
| `implement` | Build/test/refactor gates are project-specific |

## Tier 3 — Local skill config (private, gitignored)

The local counterpart of a Tier 1 global skill. Lives in `Claude/local/skills/<name>/` in the project, mirroring the global skill's name. Gitignored. Scaffolded by `/claude-sync`.

**Convention:** A global skill knows to check `Claude/local/skills/<name>/config.md` for project-specific config. The path is predetermined — the global skill hardcodes it, `/claude-sync` scaffolds it.

| Path | Global skill | Why local |
| --- | --- | --- |
| `Claude/local/skills/build/config.md` | `build` | Build commands and server config may vary by dev setup |

**Important:** `Claude/local/` must be in `.gitignore`. If it's missing, `/claude-sync` should add it.

## Decision guide

When creating or modifying a skill, ask:

1. **Does it depend on OS, terminal, or installed tools?** → Tier 1 (global skill + Tier 3 local reference for project config)
2. **Does it encode project-specific knowledge that all devs share?** → Tier 2 (project skill from template)
3. **Is the skill deeply project-specific but also environment-dependent?** → Prefer Tier 2 if the project content dominates (like `test`). Only use Tier 1 if the environment dependency is the primary concern (like `build`).
