# Open VS Code

**Execute mechanically.** Follow the steps; no need to weigh alternatives or deliberate.

Open the current session's project folder in VS Code. The title bar colour is chosen by the script from a fixed per-project palette, so windows for different projects stay tellable apart across sessions. Worktrees get a brighter variant of their project's colour.

**Must run as a background agent** with `model: "haiku"` so the main conversation isn't blocked. Task is trivially mechanical — run script, report — no reasoning needed.

## Steps

1. Run the launch script with the current working directory:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-vscode.ps1" -Path "<cwd>"
   ```

2. Report the script's output line verbatim.

## Palette

Colours live in the script's `$palette` hashtable, keyed on exact leaf directory name. Add a project by adding a row there — don't pick colours here.
