# Plan File Location

When creating or updating plan files, always use a `plans/` directory at the **project root** (e.g., `./plans/`), never inside `.claude/plans/`.

**Why:** Files inside `.claude/plans/` trigger Claude Code safeguards that require the user to manually accept every edit, which breaks flow during planning.

**How to apply:** When entering plan mode or writing a plan file, ensure the path resolves to `<project-root>/plans/<plan-name>.md`. Create the `plans/` directory if it doesn't exist. This applies to all projects.
