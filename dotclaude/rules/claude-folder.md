# Prefer Claude/ Over .claude/ for Editable Content

`.claude/` is a protected folder in Claude Code — every edit prompts for permission. To avoid constant prompts, use a `Claude/` folder for content that gets edited frequently.

## Project-level

| Location | Content | Why |
| --- | --- | --- |
| `.claude/rules/` | Project rules | Must stay — auto-loaded by Claude Code |
| `.claude/skills/*/SKILL.md` | Thin shells (frontmatter + redirect) | Must stay — skill discovery |
| `.claude/settings*.json` | Config | Must stay — Claude Code reads these |
| `.claude/launch.json` | Preview config | Must stay — Claude Preview reads this |
| `Claude/docs/` | Architecture docs | Editable without prompts |
| `Claude/skills/` | Full skill implementations, scripts, templates | Editable without prompts |

## Global-level

The global config uses the same pattern at `~/Documents/Code/claude-config/`:

| Location | Content | Why |
| --- | --- | --- |
| `dotclaude/rules/` | Global rules | Junction to `~/.claude/rules/` — auto-loaded |
| `dotclaude/commands/` | Slash commands | Junction to `~/.claude/commands/` — discovery |
| `dotclaude/skills/*/SKILL.md` | Thin shells | Junction to `~/.claude/skills/` — discovery |
| `dotclaude/settings*.json` | Config | Junction to `~/.claude/` — Claude Code reads |
| `Claude/scripts/` | PowerShell scripts | Editable without prompts |
| `Claude/templates/` | Skill templates | Editable without prompts |
| `Claude/skills/` | Full global skill implementations | Editable without prompts |

## Skill shell pattern

`.claude/skills/<name>/SKILL.md` contains only:

```markdown
---
name: <name>
description: <description>
---

$ARGUMENTS

Read and follow `Claude/skills/<name>/SKILL.md`.
```

For global skills, the redirect uses the full path: `~/Documents/Code/claude-config/Claude/skills/<name>/SKILL.md`.

The actual instructions live in `Claude/skills/<name>/SKILL.md`. Include `$ARGUMENTS` in the shell only for skills that accept user arguments.

## How to apply

- When creating or editing skills, always edit in `Claude/skills/`.
- When creating or editing architecture docs, use `Claude/docs/`.
- `/claude-setup` scaffolds into both locations automatically.
- When referencing docs from skill templates, use `Claude/docs/` not `.claude/docs/`.
