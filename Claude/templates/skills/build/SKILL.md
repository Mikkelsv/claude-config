---
name: build
description: Template for scaffolding project build reference
---

# Build Template — Scaffolding Guide

The build skill is **global** (lives in `~/claude-config/`). Projects provide a **build reference** at `Claude/local/skills/build/config.md` with project-specific config.

## What `/claude-sync` scaffolds for build

**Project file only** — no project-level skill shell or implementation:

- `Claude/local/skills/build/config.md` — project-specific build config

The global skill at `~/claude-config/Claude/skills/build/SKILL.md` reads this file at runtime.

## Template for `Claude/local/skills/build/config.md`

```markdown
# Build Config

## Build Command

\`\`\`
{BUILD_COMMAND}
\`\`\`

## Preview Server

- **Name**: `{PREVIEW_SERVER_NAME}` (matches `.claude/launch.json`)
- **Port**: Read from `.claude/launch.json`
```

## Placeholders

| Placeholder | Example | Description |
| --- | --- | --- |
| `{BUILD_COMMAND}` | `dotnet build` | Command to compile the project |
| `{PREVIEW_SERVER_NAME}` | `gridpreview` | Name from `.claude/launch.json` |

## What to ask the user

1. **Build command** — e.g., `dotnet build`, `npm run build`, `cargo build`
2. **Dev server** — does the project use one? If yes:
   - Launch command and port
   - Preview server name (must match `.claude/launch.json`)

## Prerequisites

The global build skill and `kill-port.ps1` script must exist at:
- `~/claude-config/Claude/skills/build/SKILL.md`
- `~/claude-config/Claude/scripts/kill-port.ps1`

If missing, the skill will fail at runtime. These are set up once per dev machine, not per project.
