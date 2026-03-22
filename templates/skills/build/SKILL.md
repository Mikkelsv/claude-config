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

1. Kill any existing server:

   ```bash
   powershell.exe -NoProfile -File "${CLAUDE_SKILL_DIR}/scripts/kill-port.ps1" -Port {SERVER_PORT}
   ```

2. Build: `{BUILD_COMMAND}` (can run in parallel with step 1)
3. If the build **fails**, fix the errors and rebuild. If it still fails after 2 attempts, stop and report.
4. If the build **succeeds**, launch the dev server:

   ```bash
   powershell.exe -NoProfile -File "${CLAUDE_SKILL_DIR}/scripts/launch-dev-server.ps1" -Project {PROJECT_NAME} -Port {SERVER_PORT}
   ```

   Report: "Build OK. Dev server running at {SERVER_URL}"

## Auto-build Rule

Whenever you make code changes (bug fixes, feature additions, refactoring, etc.), **always build and serve automatically** using the Phase 2 steps above. Do not wait for the user to type `/build` — if you changed code, build it.

---

## Customization Guide

When scaffolding this skill for a project, replace these placeholders:

| Placeholder | Example | Description |
|---|---|---|
| `{BUILD_COMMAND}` | `dotnet build MySolution.slnx` | Command to compile the project |
| `{SERVER_PORT}` | `5163` | Dev server port |
| `{PROJECT_NAME}` | `GridPreviewPoc` | Project name for server launch |
| `{SERVER_URL}` | `http://localhost:5163` | Dev server URL |

Scripts in `scripts/` must also be generated for the target platform. See `/setup-project` for automated scaffolding.

### Required Scripts

| Script | Purpose | Platform-specific |
|---|---|---|
| `scripts/kill-port.ps1` | Kill process on a given port | Yes — PowerShell/Windows |
| `scripts/launch-dev-server.ps1` | Start dev server in a new terminal tab | Yes — Windows Terminal |

On non-Windows platforms, replace these with equivalent bash scripts or inline commands.
