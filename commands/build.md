# Build & Serve

Execute the user's instructions, then build and serve the application.

Scripts directory: `~/.claude/scripts`

## Phase 1 — User Task

If the user provided instructions after `/build`, execute them fully first:

> $ARGUMENTS

If no instructions were provided, skip to Phase 2.

## Phase 2 — Build & Serve

Once the task is complete (or immediately if no task was given):

1. Kill any existing server:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/kill-port.ps1" -Port 5163
   ```

2. Build: `dotnet build GridPreviewPoc.slnx` (can run in parallel with step 1)
3. If the build **fails**, fix the errors and rebuild. If it still fails after 2 attempts, stop and report.
4. If the build **succeeds**, launch the dev server and open the browser:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-dev-server.ps1" -Project GridPreviewPoc -Port 5163
   ```

   Report: "Build OK. Dev server running in a new tab at http://localhost:5163"

## Auto-build Rule

Whenever you make code changes (bug fixes, feature additions, refactoring, etc.), **always build and serve automatically** using the Phase 2 steps above. Do not wait for the user to type `/build` — if you changed code, build it.
