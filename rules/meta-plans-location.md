# Plan File Location

When creating or updating plan files, always use a `plans/` directory at the **project root** (e.g., `./plans/`), never inside `.claude/plans/`.

**Why:** Plans are project artifacts, not Claude config. They describe work specific to the project and should live alongside the code they affect — discoverable to the whole team, versioned with the project, reviewable without needing to know about Claude-specific directories. `.claude/plans/` conflates them with Claude Code's own runtime plan-mode artifacts (stored at `~/.claude/plans/` by the runtime), which is a confusing overlap.

**How to apply:** When entering plan mode or writing a plan file, ensure the path resolves to `<project-root>/plans/<plan-name>.md`. Create the `plans/` directory if it doesn't exist. This applies to all projects.
