# Prefer Claude/ Over .claude/ for Editable Content

`.claude/` paths trigger permission prompts on every write (including via the `dotclaude/` junction). Always edit in `Claude/` instead.

## Where things live

**Must stay in `.claude/` / `dotclaude/`** (auto-loaded or discovered by Claude Code):
- `rules/` — global rules
- `skills/*/SKILL.md` — thin shells (frontmatter + redirect)
- `commands/` — slash commands
- `settings*.json`, `launch.json` — config

**Edit in `Claude/`** (no prompts):
- `Claude/skills/<name>/SKILL.md` — full skill implementations
- `Claude/scripts/` — PowerShell scripts
- `Claude/templates/` — skill templates
- `Claude/docs/` — architecture docs

## Skill shell pattern

`.claude/skills/<name>/SKILL.md`:

```markdown
---
name: <name>
description: <description>
---

$ARGUMENTS

Read and follow `Claude/skills/<name>/SKILL.md`.
```

For global skills use `~/claude-config/Claude/skills/<name>/SKILL.md`. Omit `$ARGUMENTS` for skills that don't take args.

## Permission glob syntax

`Read(**)` is CWD-relative. To allow reads of global config from any project, use `~/` anchored patterns: `Read(~/claude-config/**)`.
