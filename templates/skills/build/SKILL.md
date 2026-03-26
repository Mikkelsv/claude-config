---
name: build
description: Build and serve the application
---

# Build & Serve

Execute user instructions, then build and serve the application.

## Phase 1 — User Task

If the user provided instructions after `/build`, execute them fully first:

> $ARGUMENTS

If no instructions were provided, skip to Phase 2.

## Phase 2 — Build & Serve

Once the task is complete (or immediately if no task was given):

1. Read the server port from `.claude/launch.json` (the `port` field of the first configuration).
2. Stop any existing preview server (use `preview_stop` if one is running, check with `preview_list` first).
3. Kill any orphaned processes on that port:

   ```bash
   powershell.exe -NoProfile -File "${CLAUDE_SKILL_DIR}/scripts/kill-port.ps1" -Port <port>
   ```

4. Build: `{BUILD_COMMAND}` (can run in parallel with steps 2–3)
5. If the build **fails**, fix the errors and rebuild. If it still fails after 2 attempts, stop and report.
6. If the build **succeeds**, start the dev server via `preview_start` with name `"{PREVIEW_SERVER_NAME}"` (uses `.claude/launch.json`).
7. Report: "Build OK. Dev server running in preview."

## Auto-build Rule

Whenever you make code changes (bug fixes, feature additions, refactoring, etc.), **always build and serve automatically** using the Phase 2 steps above. Do not wait for the user to type `/build` — if you changed code, build it.

---

## Customization Guide

When scaffolding this skill for a project, replace these placeholders:

| Placeholder | Example | Description |
| --- | --- | --- |
| `{BUILD_COMMAND}` | `dotnet build MySolution.slnx` | Command to compile the project |
| `{PREVIEW_SERVER_NAME}` | `my-app` | Name from `.claude/launch.json` |

The server port is read at runtime from `.claude/launch.json` — no placeholder needed.

Scripts in `scripts/` must also be generated for the target platform. See `/claude-setup` for automated scaffolding.

### Required Scripts

| Script | Purpose | Platform-specific |
| --- | --- | --- |
| `scripts/kill-port.ps1` | Kill orphaned process on a given port | Yes — PowerShell/Windows |

On non-Windows platforms, replace with an equivalent bash script or inline command.
