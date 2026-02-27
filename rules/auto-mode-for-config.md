# Tactical Auto Mode for Config Editing

When a task involves multiple edits to files inside `~/.claude/` (commands, scripts, rules, docs, README):

1. **Before starting**: Ask the user if they want to temporarily switch to auto mode to avoid repeated permission prompts on `.claude/` edits.
2. **If they agree**: Update `~/.claude/settings.json` to `"defaultMode": "auto"`, then proceed with the work.
3. **When finished**: Switch back to `"defaultMode": "acceptEdits"` and inform the user.

Do NOT prompt for single quick edits — only when the task will clearly involve multiple `.claude/` file changes (e.g., creating a new command + script + README update).
