# Open VS Code

Open the current session's project folder in VS Code with a random title bar color.

**Must run as a background agent** so the main conversation isn't blocked.

## Steps

1. Pick a random saturated color (avoid greys/whites — pick from hues like `#2d7d9a`, `#7b2d8e`, `#2d8e4f`, `#8e6b2d`, `#8e2d4f`, etc.).
2. Run the launch script:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-vscode.ps1" -Path "<cwd>" -Color "<color>"
   ```

   Use the current working directory as the path.

3. Report: "VS Code opened at `<path>` with color `<color>`."
