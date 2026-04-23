---
name: build
description: Build and serve the application
---

# Build & Serve

Execute user instructions, then build and serve the application. Reads project-specific config from `.claude/local/skills/build/config.md`.

## Phase 1 — User Task

If the user provided instructions after `/build`, execute them fully first:

> $ARGUMENTS

If no instructions were provided, skip to Phase 2.

## Phase 2 — Build & Serve

Once the task is complete (or immediately if no task was given):

1. Read `.claude/launch.json` for the server config (name, port, command).
2. If `.claude/local/skills/build/config.md` exists, read it for overrides (e.g., a separate build command that differs from the serve command). This file is optional.
3. Stop any existing preview server (use `preview_stop` if one is running, check with `preview_list` first).
4. Kill any orphaned processes on the port:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/kill-port.ps1" -Port <port>
   ```

5. Build using the build command from config.md if present, otherwise infer from `launch.json` (can run in parallel with steps 3–4).
6. If the build **fails**, fix the errors and rebuild. If it still fails after 2 attempts, stop and report.
7. If the build **succeeds**, start the dev server via `preview_start` with the server name from `launch.json`.
8. Report: "Build OK. Dev server running in preview."

## Auto-build Rule

Whenever you make code changes (bug fixes, feature additions, refactoring, etc.), **always build and serve automatically** using the Phase 2 steps above. Do not wait for the user to type `/build` — if you changed code, build it.
